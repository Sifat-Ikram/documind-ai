import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CommentsService } from './comments.service';
import { NotesService } from './notes.service';
import {
  commentSchema,
  noteSchema,
  shareSchema,
  sharedListQuerySchema,
  updateShareSchema,
  type CommentDto,
  type NoteDto,
  type ShareDto,
  type SharedListQuery,
  type UpdateShareDto,
} from './sharing.schemas';
import { SharingService } from './sharing.service';

@Controller()
export class SharingController {
  constructor(
    private readonly sharing: SharingService,
    private readonly comments: CommentsService,
    private readonly notes: NotesService,
  ) {}

  @Get('documents/:id/shares')
  listShares(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sharing.listShares(user.id, id);
  }

  @HttpCode(200)
  @Post('documents/:id/shares')
  share(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(shareSchema)) body: ShareDto,
  ) {
    return this.sharing.share(user.id, id, body.email, body.role);
  }

  @Patch('documents/:id/shares/:shareId')
  updateShare(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
    @Body(new ZodValidationPipe(updateShareSchema)) body: UpdateShareDto,
  ) {
    return this.sharing.updateShare(user.id, id, shareId, body.role);
  }

  @Delete('documents/:id/shares/:shareId')
  removeShare(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
  ) {
    return this.sharing.removeShare(user.id, id, shareId);
  }

  @Get('shared')
  shared(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(sharedListQuerySchema)) query: SharedListQuery,
  ) {
    return this.sharing.listShared(user.id, query);
  }

  @Get('documents/:id/comments')
  listComments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.comments.list(user.id, id);
  }

  @Post('documents/:id/comments')
  createComment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(commentSchema)) body: CommentDto,
  ) {
    return this.comments.create(user.id, id, body.content);
  }

  @Patch('comments/:commentId')
  updateComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(commentSchema)) body: CommentDto,
  ) {
    return this.comments.update(user.id, commentId, body.content);
  }

  @Delete('comments/:commentId')
  deleteComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
  ) {
    return this.comments.remove(user.id, commentId);
  }

  @Get('documents/:id/note')
  getNote(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notes.get(user.id, id);
  }

  @Put('documents/:id/note')
  saveNote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(noteSchema)) body: NoteDto,
  ) {
    return this.notes.save(user.id, id, body.content, body.revision);
  }
}
