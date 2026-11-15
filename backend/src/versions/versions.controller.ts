import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  compareQuerySchema,
  editorQuerySchema,
  saveVersionSchema,
  type CompareQuery,
  type EditorQuery,
  type SaveVersionDto,
} from './versions.schemas';
import { VersionsService } from './versions.service';

@Controller('documents')
export class VersionsController {
  constructor(private readonly versions: VersionsService) {}

  @Get(':id/versions')
  list(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.versions.list(user.id, id);
  }

  // must stay above ":version"
  @Get(':id/versions/compare')
  compare(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(compareQuerySchema)) query: CompareQuery,
  ) {
    return this.versions.compare(user.id, id, query.from, query.to);
  }

  @Get(':id/versions/:version')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.versions.get(user.id, id, version);
  }

  @Get(':id/versions/:version/download')
  download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.versions.download(user.id, id, version);
  }

  @Get(':id/editor')
  editor(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(editorQuerySchema)) query: EditorQuery,
  ) {
    return this.versions.loadEditor(user.id, id, query.version);
  }

  @Post(':id/versions')
  save(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveVersionSchema)) body: SaveVersionDto,
  ) {
    return this.versions.save(user.id, id, body);
  }

  @HttpCode(200)
  @Post(':id/versions/:version/restore')
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.versions.restore(user.id, id, version);
  }
}
