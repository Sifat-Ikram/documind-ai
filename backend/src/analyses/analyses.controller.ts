import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  analyzeSchema,
  detectTaskSchema,
  listAnalysesQuerySchema,
  type AnalyzeDto,
  type DetectTaskDto,
  type ListAnalysesQuery,
} from './analyses.schemas';
import { AnalysesService } from './analyses.service';

const AI_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller()
export class AnalysesController {
  constructor(private readonly analyses: AnalysesService) {}

  @Throttle(AI_THROTTLE)
  @HttpCode(200)
  @Post('documents/:id/detect-task')
  detectTask(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(detectTaskSchema)) body: DetectTaskDto,
  ) {
    return this.analyses.detectTask(user.id, id, body.instruction);
  }

  @Throttle(AI_THROTTLE)
  @Post('documents/:id/analyze')
  analyze(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(analyzeSchema)) body: AnalyzeDto,
  ) {
    return this.analyses.analyze(user.id, id, body);
  }

  @Get('analyses')
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listAnalysesQuerySchema))
    query: ListAnalysesQuery,
  ) {
    return this.analyses.list(user.id, query);
  }

  @Get('analyses/:id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.analyses.getOne(user.id, id);
  }

  @Delete('analyses/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.analyses.remove(user.id, id);
  }
}
