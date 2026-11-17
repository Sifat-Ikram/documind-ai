import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { QueryUnderstandingService } from './query-understanding.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [AiModule, PreferencesModule],
  controllers: [SearchController],
  providers: [SearchService, QueryUnderstandingService],
})
export class SearchModule {}
