import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from './admin.guard';
import {
  blockUserSchema,
  listUsersQuerySchema,
  rangeQuerySchema,
  type BlockUserDto,
  type ListUsersQuery,
  type RangeQueryDto,
} from './admin.schemas';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listUsersQuerySchema)) q: ListUsersQuery) {
    return this.users.list(q);
  }

  @Get('stats')
  stats(@Query(new ZodValidationPipe(rangeQuerySchema)) q: RangeQueryDto) {
    return this.users.stats(q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.users.detail(id);
  }

  @Patch(':id/block')
  block(
    @CurrentUser() current: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(blockUserSchema)) body: BlockUserDto,
  ) {
    return this.users.setBlocked(current.id, id, body.blocked);
  }

  @Delete(':id')
  remove(@CurrentUser() current: AuthUser, @Param('id') id: string) {
    return this.users.remove(current.id, id);
  }
}
