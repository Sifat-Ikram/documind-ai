import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { FeedbackService } from './feedback.service';
import {
  createFeedbackSchema,
  type CreateFeedbackDto,
} from './feedback.schemas';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createFeedbackSchema)) body: CreateFeedbackDto,
  ) {
    return this.feedback.create(user.id, body);
  }
}
