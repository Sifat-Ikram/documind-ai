import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  addDocumentsSchema,
  createCollectionSchema,
  updateCollectionSchema,
  type AddDocumentsDto,
  type CreateCollectionDto,
  type UpdateCollectionDto,
} from './collections.schemas';
import { CollectionsService } from './collections.service';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.collections.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createCollectionSchema))
    body: CreateCollectionDto,
  ) {
    return this.collections.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collections.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCollectionSchema))
    body: UpdateCollectionDto,
  ) {
    return this.collections.update(user.id, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collections.remove(user.id, id);
  }

  @HttpCode(200)
  @Post(':id/documents')
  addDocuments(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addDocumentsSchema)) body: AddDocumentsDto,
  ) {
    return this.collections.addDocuments(user.id, id, body);
  }

  @Delete(':id/documents/:documentId')
  removeDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.collections.removeDocument(user.id, id, documentId);
  }
}
