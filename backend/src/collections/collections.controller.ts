import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  addDocumentsSchema,
  addMemberSchema,
  collectionDocsQuerySchema,
  createCollectionSchema,
  updateCollectionSchema,
  updateMemberSchema,
  type AddDocumentsDto,
  type AddMemberDto,
  type CollectionDocsQuery,
  type CreateCollectionDto,
  type UpdateCollectionDto,
  type UpdateMemberDto,
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

  @Get(':id/documents')
  listDocuments(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(collectionDocsQuerySchema))
    query: CollectionDocsQuery,
  ) {
    return this.collections.listDocuments(user.id, id, query);
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

  @Get(':id/members')
  listMembers(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collections.listMembers(user.id, id);
  }

  @HttpCode(200)
  @Post(':id/members')
  addMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addMemberSchema)) body: AddMemberDto,
  ) {
    return this.collections.addMember(user.id, id, body.email, body.role);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateMemberSchema)) body: UpdateMemberDto,
  ) {
    return this.collections.updateMember(user.id, id, memberId, body.role);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.collections.removeMember(user.id, id, memberId);
  }
}
