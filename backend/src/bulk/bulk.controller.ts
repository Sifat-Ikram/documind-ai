import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { bulkSchema, type BulkDto } from './bulk.schemas';
import { BulkService } from './bulk.service';

@Controller('documents')
export class BulkController {
  constructor(private readonly bulk: BulkService) {}

  @HttpCode(200)
  @Post('bulk')
  run(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(bulkSchema)) body: BulkDto,
  ) {
    return this.bulk.run(user.id, body);
  }
}
