import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  answerSchema,
  searchSchema,
  type AnswerDto,
  type SearchDto,
} from './search.schemas';
import { SearchService } from './search.service';

const AI_THROTTLE = { default: { limit: 15, ttl: 60_000 } };

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Throttle(AI_THROTTLE)
  @HttpCode(200)
  @Post()
  run(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(searchSchema)) body: SearchDto,
  ) {
    return this.search.search(user.id, body);
  }

  @Throttle(AI_THROTTLE)
  @HttpCode(200)
  @Post('answer')
  answer(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(answerSchema)) body: AnswerDto,
  ) {
    return this.search.answer(user.id, body);
  }
}
