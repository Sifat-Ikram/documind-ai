import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminDocumentsService } from './admin-documents.service';
import { AdminGuard } from './admin.guard';
import {
  listDocumentsQuerySchema,
  rangeQuerySchema,
  type ListAdminDocumentsQuery,
  type RangeQueryDto,
} from './admin.schemas';

@Controller('admin/documents')
@UseGuards(AdminGuard)
export class AdminDocumentsController {
  constructor(private readonly documents: AdminDocumentsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listDocumentsQuerySchema))
    q: ListAdminDocumentsQuery,
  ) {
    return this.documents.list(q);
  }

  @Get('analytics')
  analytics(@Query(new ZodValidationPipe(rangeQuerySchema)) q: RangeQueryDto) {
    return this.documents.analytics(q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.documents.detail(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documents.remove(id);
  }
}
