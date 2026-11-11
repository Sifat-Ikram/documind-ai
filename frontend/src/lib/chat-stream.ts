import { ApiError, apiRaw, parseResponse } from '@/lib/api';
import type { ChatMessageDto, ContextMode } from '@/types/api';

type StreamEvent =
  | {
      type: 'start';
      userMessage: ChatMessageDto;
      conversationTitle: string;
      contextMode: ContextMode;
      usedChunks: number[] | null;
    }
  | { type: 'token'; text: string }
  | { type: 'done'; message: ChatMessageDto }
  | { type: 'error'; message: string };

export interface StreamHandlers {
  onStart?: (event: Extract<StreamEvent, { type: 'start' }>) => void;
  onToken: (text: string) => void;
  onDone?: (message: ChatMessageDto) => void;
  onError?: (message: string) => void;
}

export type StreamOutcome = 'done' | 'error' | 'aborted';

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export async function streamChatMessage(
  conversationId: string,
  content: string,
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<StreamOutcome> {
  let res: Response;
  try {
    res = await apiRaw(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content },
      signal,
    });
  } catch (err) {
    if (isAbort(err)) return 'aborted';
    throw err;
  }

  if (!res.ok) await parseResponse<never>(res);
  if (!res.body) throw new ApiError(0, 'The server sent an empty response.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let outcome: StreamOutcome | null = null;

  const startedAt = performance.now();
  let firstTokenAt = 0;
  let lastTokenAt = 0;
  let tokenCount = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let end: number;
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);

        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;

        let event: StreamEvent;
        try {
          event = JSON.parse(line.slice(5).trim()) as StreamEvent;
        } catch {
          continue;
        }

        if (event.type === 'start') {
          handlers.onStart?.(event);
        } else if (event.type === 'token') {
          const now = performance.now() - startedAt;
          if (tokenCount === 0) firstTokenAt = now;
          lastTokenAt = now;
          tokenCount++;
          handlers.onToken(event.text);
        } else if (event.type === 'done') {
          outcome = 'done';
          handlers.onDone?.(event.message);
        } else if (event.type === 'error') {
          outcome = 'error';
          handlers.onError?.(event.message);
        }
      }
    }
  } catch (err) {
    if (isAbort(err)) return 'aborted';
    throw err;
  } finally {
    if (process.env.NODE_ENV !== 'production' && tokenCount > 0) {
      console.debug(
        `[chat stream] ${tokenCount} chunks, first after ${Math.round(firstTokenAt)} ms, last after ${Math.round(lastTokenAt)} ms`,
      );
    }
  }

  if (outcome === null) {
    handlers.onError?.('The connection was interrupted before the answer was complete.');
    return 'error';
  }
  return outcome;
}