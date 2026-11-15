import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { NotesService } from './notes.service';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';

@Module({
  controllers: [SharingController],
  providers: [SharingService, CommentsService, NotesService],
})
export class SharingModule {}
