import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ChunkService } from './chunk.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ParserService } from './parser.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, ParserService, ChunkService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
