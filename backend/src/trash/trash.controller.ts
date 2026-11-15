import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { TrashService } from './trash.service';

@Controller('trash')
export class TrashController {
  constructor(private readonly trash: TrashService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.trash.list(user.id);
  }

  @HttpCode(200)
  @Post(':id/restore')
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.trash.restore(user.id, id);
  }

  @Delete(':id')
  deletePermanently(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.trash.deletePermanently(user.id, id);
  }

  @Delete()
  empty(@CurrentUser() user: AuthUser) {
    return this.trash.empty(user.id);
  }
}
