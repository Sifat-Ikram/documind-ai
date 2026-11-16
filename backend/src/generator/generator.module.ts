import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { DocumentsModule } from '../documents/documents.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ActorService } from './actor.service';
import { ExportService } from './export.service';
import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
import { HistoryService } from './history.service';
import { GenerationLimitsService } from './limits.service';

@Module({
  imports: [
    AiModule,
    CloudinaryModule,
    DocumentsModule,
    PreferencesModule,
    SessionsModule,
  ],
  controllers: [GeneratorController],
  providers: [
    ActorService,
    GenerationLimitsService,
    GeneratorService,
    ExportService,
    HistoryService,
  ],
})
export class GeneratorModule {}
