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
import { TrashService } from '../trash/trash.service';
import { ChunkSearchService } from './chunk-search.service';
import {
  confirmUploadSchema,
  listDocumentsQuerySchema,
  recentQuerySchema,
  renameDocumentSchema,
  searchQuerySchema,
  uploadSignatureSchema,
  type ConfirmUploadDto,
  type ListDocumentsQuery,
  type RecentQuery,
  type RenameDocumentDto,
  type SearchQuery,
  type UploadSignatureDto,
} from './documents.schemas';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly chunkSearch: ChunkSearchService,
    private readonly trash: TrashService,
  ) {}

  @HttpCode(200)
  @Post('upload-signature')
  uploadSignature(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(uploadSignatureSchema))
    body: UploadSignatureDto,
  ) {
    return this.documents.createUploadSignature(user.id, body);
  }

  @Post('confirm')
  confirm(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(confirmUploadSchema)) body: ConfirmUploadDto,
  ) {
    return this.documents.confirmUpload(user.id, body);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listDocumentsQuerySchema))
    query: ListDocumentsQuery,
  ) {
    return this.documents.list(user.id, query);
  }

  // must stay above ":id"
  @Get('recent')
  recent(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(recentQuerySchema)) query: RecentQuery,
  ) {
    return this.documents.listRecent(user.id, query.limit);
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return { document: await this.documents.getDetail(user.id, id) };
  }

  @Get(':id/search')
  async search(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery,
  ) {
    await this.documents.assertOwned(user.id, id);
    const { mode, chunks } = await this.chunkSearch.search(id, query.q, 5);
    return { mode, results: chunks };
  }

  @Get(':id/download')
  download(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documents.getDownload(user.id, id);
  }

  @Patch(':id')
  async rename(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(renameDocumentSchema)) body: RenameDocumentDto,
  ) {
    return { document: await this.documents.rename(user.id, id, body) };
  }

  /** "Delete" now moves the document to the trash. */
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.trash.moveToTrash(user.id, id);
  }

  @HttpCode(200)
  @Post(':id/archive')
  async archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return { document: await this.documents.setArchived(user.id, id, true) };
  }

  @HttpCode(200)
  @Post(':id/unarchive')
  async unarchive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return { document: await this.documents.setArchived(user.id, id, false) };
  }

  @HttpCode(200)
  @Post(':id/favorite')
  favorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documents.setFavorite(user.id, id, true);
  }

  @Delete(':id/favorite')
  unfavorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documents.setFavorite(user.id, id, false);
  }
}
