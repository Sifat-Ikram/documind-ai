import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [DocumentsModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
