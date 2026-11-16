import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { AnalysesController } from './analyses.controller';
import { AnalysesService } from './analyses.service';
import { PreferencesModule } from '../preferences/preferences.module';

@Module({
  imports: [DocumentsModule, AiModule, PreferencesModule],
  controllers: [AnalysesController],
  providers: [AnalysesService],
})
export class AnalysesModule {}
