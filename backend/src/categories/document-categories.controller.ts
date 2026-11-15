import { Body, Controller, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DocumentCategoriesService } from './document-categories.service';

const setCategorySchema = z.object({
  categoryId: z.string().min(1).max(60).nullable(),
});
type SetCategoryDto = z.infer<typeof setCategorySchema>;

const AI_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('documents')
export class DocumentCategoriesController {
  constructor(private readonly service: DocumentCategoriesService) {}

  @Patch(':id/category')
  set(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setCategorySchema)) body: SetCategoryDto,
  ) {
    return this.service.set(user.id, id, body.categoryId);
  }

  @Throttle(AI_THROTTLE)
  @HttpCode(200)
  @Post(':id/suggest-category')
  suggest(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.suggest(user.id, id);
  }
}
