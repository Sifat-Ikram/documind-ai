import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ZodType } from 'zod';
import type { Env } from '../config/env';
import { UsageService, type AiFeatureName } from '../usage/usage.service';

export type AiMessage = OpenAI.Chat.ChatCompletionMessageParam;

interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface AiUsageContext {
  userId?: string | null;
  feature: AiFeatureName;
}

interface CompleteOptions {
  temperature?: number;
  maxTokens?: number;
  /** Where the request came from; used for the admin usage analytics. */
  usage?: AiUsageContext;
}

/** Provider errors where another model may still answer. */
const RETRYABLE_STATUS = new Set([402, 404, 408, 429, 500, 502, 503, 504]);

/** Fallback estimate for providers that do not report token usage. */
const estimateTokens = (chars: number) => Math.max(0, Math.ceil(chars / 4));

function parseJsonLoose(raw: string): unknown {
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object found');
  return JSON.parse(text.slice(start, end + 1));
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly client: OpenAI;
  /** Primary model first, then the configured fallbacks. */
  private readonly models: string[];

  constructor(
    config: ConfigService<Env, true>,
    private readonly usage: UsageService,
  ) {
    const primary = config.get('OPENROUTER_MODEL', { infer: true });
    const fallbacks = (config.get('OPENROUTER_FALLBACK_MODELS', { infer: true }) ?? '')
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
    this.models = [primary, ...fallbacks.filter((model) => model !== primary)];
    this.client = new OpenAI({
      apiKey: config.get('OPENROUTER_API_KEY', { infer: true }),
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 60_000,
      maxRetries: 1,
      defaultHeaders: {
        'HTTP-Referer': config.get('FRONTEND_URL', { infer: true }),
        'X-Title': 'DocuMind AI',
      },
    });
  }

  async complete(
    messages: AiMessage[],
    options: CompleteOptions = {},
  ): Promise<string> {
    let lastError: unknown;
    const startedAt = Date.now();
    let lastModel = this.models[0];

    for (const [index, model] of this.models.entries()) {
      lastModel = model;
      try {
        const res = await this.client.chat.completions.create({
          model,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 2000,
        });
        const text = res.choices[0]?.message?.content;
        if (text) {
          if (index > 0) this.logger.log(`Answered with fallback model ${model}`);
          await this.recordSuccess(
            options.usage,
            model,
            startedAt,
            res.usage,
            JSON.stringify(messages).length,
            text.length,
          );
          return text;
        }
        lastError = new BadGatewayException(
          'The AI returned an empty response.',
        );
        if (!this.canFallback(null, index)) {
          await this.recordFailure(options.usage, model, startedAt, lastError);
          throw this.toHttpError(lastError);
        }
        this.logger.warn(`Model ${model} returned nothing; trying next model`);
      } catch (err) {
        lastError = err;
        if (!this.canFallback(err, index)) {
          await this.recordFailure(options.usage, model, startedAt, err);
          throw this.toHttpError(err);
        }
        this.logFallback(model, index, err);
      }
    }

    await this.recordFailure(options.usage, lastModel, startedAt, lastError);
    throw this.toHttpError(lastError);
  }

  async completeJson<T>(
    messages: AiMessage[],
    schema: ZodType<T>,
    options: CompleteOptions = {},
  ): Promise<T> {
    let current = messages;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.complete(current, options);
      try {
        return schema.parse(parseJsonLoose(raw));
      } catch (err) {
        const problem = (
          err instanceof Error ? err.message : 'invalid JSON'
        ).slice(0, 300);
        this.logger.warn(
          `Invalid AI JSON (attempt ${attempt + 1}): ${problem}`,
        );
        current = [
          ...messages,
          { role: 'assistant', content: raw },
          {
            role: 'user',
            content: `That reply was not valid (${problem}). Reply again with ONLY the corrected JSON object, no other text.`,
          },
        ];
      }
    }
    throw new BadGatewayException(
      'The AI returned an invalid response. Please try again.',
    );
  }

  async *streamText(
    messages: AiMessage[],
    options: CompleteOptions = {},
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const startedAt = Date.now();
    const promptChars = JSON.stringify(messages).length;

    for (const [index, model] of this.models.entries()) {
      let started = false;
      let chars = 0;
      let reported: TokenUsage | undefined;

      try {
        const stream = await this.client.chat.completions.create(
          {
            model,
            messages,
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxTokens ?? 2000,
            stream: true,
            stream_options: { include_usage: true },
          },
          { signal },
        );
        for await (const chunk of stream) {
          if (chunk.usage) reported = chunk.usage;
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            started = true;
            chars += delta.length;
            yield delta;
          }
        }
      } catch (err) {
        if (signal?.aborted) {
          if (started) {
            await this.recordSuccess(
              options.usage,
              model,
              startedAt,
              reported,
              promptChars,
              chars,
            );
          }
          return;
        }
        // Once text has been sent the caller already shows it, so a retry
        // would duplicate the answer instead of repairing it.
        if (started || !this.canFallback(err, index)) {
          await this.recordFailure(options.usage, model, startedAt, err);
          throw this.toHttpError(err);
        }
        this.logFallback(model, index, err);
        continue;
      }

      if (started) {
        await this.recordSuccess(
          options.usage,
          model,
          startedAt,
          reported,
          promptChars,
          chars,
        );
        return;
      }
      // An empty stream is a failure, not a finished document.
      if (!this.canFallback(null, index)) {
        const error = new BadGatewayException(
          'The AI returned an empty response. Please try again.',
        );
        await this.recordFailure(options.usage, model, startedAt, error);
        throw error;
      }
      this.logger.warn(`Model ${model} streamed nothing; trying next model`);
    }
  }

  private async recordSuccess(
    context: AiUsageContext | undefined,
    model: string,
    startedAt: number,
    reported: TokenUsage | undefined,
    promptChars: number,
    completionChars: number,
  ): Promise<void> {
    if (!context) return;
    const promptTokens = reported?.prompt_tokens ?? estimateTokens(promptChars);
    const completionTokens =
      reported?.completion_tokens ?? estimateTokens(completionChars);
    await this.usage.recordAiUsage({
      userId: context.userId ?? null,
      feature: context.feature,
      model,
      promptTokens,
      completionTokens,
      totalTokens: reported?.total_tokens ?? promptTokens + completionTokens,
      latencyMs: Date.now() - startedAt,
      success: true,
    });
  }

  private async recordFailure(
    context: AiUsageContext | undefined,
    model: string,
    startedAt: number,
    err: unknown,
  ): Promise<void> {
    if (!context) return;
    const message =
      err instanceof HttpException
        ? err.message
        : err instanceof Error
          ? err.message
          : 'AI request failed';
    await this.usage.recordAiUsage({
      userId: context.userId ?? null,
      feature: context.feature,
      model,
      latencyMs: Date.now() - startedAt,
      success: false,
      error: message,
    });
  }

  /** Another model is queued, so this failure is worth retrying. */
  private canFallback(err: unknown, index: number): boolean {
    if (index + 1 >= this.models.length) return false;
    if (err === null) return true;
    if (err instanceof OpenAI.APIError) {
      return RETRYABLE_STATUS.has(err.status ?? 0);
    }
    return false;
  }

  private logFallback(model: string, index: number, err: unknown) {
    const status = err instanceof OpenAI.APIError ? err.status : undefined;
    const next = this.models[index + 1];
    this.logger.warn(
      `Model ${model} failed${status ? ` (${status})` : ''}; falling back to ${next}`,
    );
  }

  private toHttpError(err: unknown): HttpException {
    if (err instanceof HttpException) return err;
    if (err instanceof OpenAI.APIError) {
      this.logger.error(`OpenRouter error ${err.status}: ${err.message}`);
      if (err.status === 429) {
        return new ServiceUnavailableException(
          'The AI model is busy or rate limited. Please try again in a moment.',
        );
      }
      if (err.status === 401 || err.status === 402) {
        return new BadGatewayException(
          'The AI provider rejected the request (check the API key or credits).',
        );
      }
    } else {
      this.logger.error(err);
    }
    return new BadGatewayException(
      'The AI service did not respond correctly. Please try again.',
    );
  }
}
