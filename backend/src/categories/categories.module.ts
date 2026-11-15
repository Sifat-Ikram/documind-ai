import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { DocumentCategoriesController } from './document-categories.controller';
import { DocumentCategoriesService } from './document-categories.service';

@Module({
  imports: [DocumentsModule, AiModule],
  controllers: [CategoriesController, DocumentCategoriesController],
  providers: [CategoriesService, DocumentCategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
