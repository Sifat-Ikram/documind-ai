import { Module } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';
import { TaskDetectorService } from './task-detector.service';
import { WorkflowsService } from './workflows.service';

@Module({
  providers: [OpenRouterService, TaskDetectorService, WorkflowsService],
  exports: [OpenRouterService, TaskDetectorService, WorkflowsService],
})
export class AiModule {}
