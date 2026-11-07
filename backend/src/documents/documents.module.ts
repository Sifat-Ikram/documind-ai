import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ChunkSearchService } from './chunk-search.service';
import { ChunkService } from './chunk.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ParserService } from './parser.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    ParserService,
    ChunkService,
    ChunkSearchService,
  ],
  exports: [DocumentsService, ChunkSearchService],
})
export class DocumentsModule {}
