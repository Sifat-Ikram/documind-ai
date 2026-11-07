import type { AiMessage } from '../ai/openrouter.service';

export type ContextMode = 'full' | 'excerpts';

export interface ChatMessageDto {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: Date;
}

export interface PreparedReply {
  conversationId: string;
  title: string;
  userMessage: ChatMessageDto;
  aiMessages: AiMessage[];
  contextMode: ContextMode;
  usedChunks: number[] | null;
}

export type ChatEvent =
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
