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
  confirmUploadSchema,
  listDocumentsQuerySchema,
  renameDocumentSchema,
  uploadSignatureSchema,
  type ConfirmUploadDto,
  type ListDocumentsQuery,
  type RenameDocumentDto,
  type UploadSignatureDto,
} from './documents.schemas';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

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

  @Get(':id')
  async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return { document: await this.documents.getDetail(user.id, id) };
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

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documents.remove(user.id, id);
  }
}
