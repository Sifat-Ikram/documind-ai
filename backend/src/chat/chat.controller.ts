import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createConversationSchema,
  sendMessageSchema,
  type CreateConversationDto,
  type SendMessageDto,
} from './chat.schemas';
import { ChatService } from './chat.service';
import type { ChatEvent } from './chat.types';

const AI_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('documents/:id/conversations')
  list(@CurrentUser() user: AuthUser, @Param('id') documentId: string) {
    return this.chat.listConversations(user.id, documentId);
  }

  @Post('documents/:id/conversations')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') documentId: string,
    @Body(new ZodValidationPipe(createConversationSchema))
    body: CreateConversationDto,
  ) {
    return this.chat.createConversation(user.id, documentId, body.title);
  }

  @Get('conversations/:id/messages')
  messages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.getMessages(user.id, id);
  }

  @Delete('conversations/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.remove(user.id, id);
  }

  @Throttle(AI_THROTTLE)
  @Post('conversations/:id/messages')
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    const prepared = await this.chat.prepareReply(user.id, id, body.content);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) abort.abort();
    });

    const send = (event: ChatEvent) => {
      if (!res.writableEnded && !res.destroyed) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };

    send({
      type: 'start',
      userMessage: prepared.userMessage,
      conversationTitle: prepared.title,
      contextMode: prepared.contextMode,
      usedChunks: prepared.usedChunks,
    });

    for await (const event of this.chat.streamReply(prepared, abort.signal)) {
      send(event);
    }
    if (!res.writableEnded) res.end();
  }
}
