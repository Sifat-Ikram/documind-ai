import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from './admin.guard';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminMonitoringService } from './admin-monitoring.service';
import { AdminOverviewService } from './admin-overview.service';
import {
  rangeQuerySchema,
  type RangeQueryDto,
} from './admin.schemas';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly overview: AdminOverviewService,
    private readonly analytics: AdminAnalyticsService,
    private readonly monitoring: AdminMonitoringService,
  ) {}

  @Get('overview')
  dashboard(@Query(new ZodValidationPipe(rangeQuerySchema)) q: RangeQueryDto) {
    return this.overview.overview(q);
  }

  @Get('ai')
  ai(@Query(new ZodValidationPipe(rangeQuerySchema)) q: RangeQueryDto) {
    return this.analytics.ai(q);
  }

  @Get('analytics')
  system(@Query(new ZodValidationPipe(rangeQuerySchema)) q: RangeQueryDto) {
    return this.analytics.system(q);
  }

  @Get('monitoring')
  health(@Query(new ZodValidationPipe(rangeQuerySchema)) q: RangeQueryDto) {
    return this.monitoring.monitoring(q);
  }
}
