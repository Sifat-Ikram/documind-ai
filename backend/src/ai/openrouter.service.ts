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

export type AiMessage = OpenAI.Chat.ChatCompletionMessageParam;

interface CompleteOptions {
  temperature?: number;
  maxTokens?: number;
}

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
  private readonly model: string;

  constructor(config: ConfigService<Env, true>) {
    this.model = config.get('OPENROUTER_MODEL', { infer: true });
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
    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2000,
      });
      const text = res.choices[0]?.message?.content;
      if (!text) {
        throw new BadGatewayException('The AI returned an empty response.');
      }
      return text;
    } catch (err) {
      throw this.toHttpError(err);
    }
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
