import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createTagSchema,
  renameTagSchema,
  setDocumentTagsSchema,
  type CreateTagDto,
  type RenameTagDto,
  type SetDocumentTagsDto,
} from './tags.schemas';
import { TagsService } from './tags.service';

@Controller()
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get('tags')
  list(@CurrentUser() user: AuthUser) {
    return this.tags.list(user.id);
  }

  @Post('tags')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createTagSchema)) body: CreateTagDto,
  ) {
    return this.tags.create(user.id, body.name);
  }

  @Patch('tags/:id')
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(renameTagSchema)) body: RenameTagDto,
  ) {
    return this.tags.rename(user.id, id, body.name);
  }

  @Delete('tags/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tags.remove(user.id, id);
  }

  @Put('documents/:id/tags')
  setForDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setDocumentTagsSchema))
    body: SetDocumentTagsDto,
  ) {
    return this.tags.setForDocument(user.id, id, body.tags);
  }
}
