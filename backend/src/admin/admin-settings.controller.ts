import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SessionCookies } from '../sessions/session-cookies.service';
import { SessionsService } from '../sessions/sessions.service';
import {
  changePasswordSchema,
  type ChangePasswordDto,
  type UpdateProfileDto,
} from '../users/users.schemas';
import { UsersService } from '../users/users.service';
import { AdminGuard } from './admin.guard';
import {
  adminNameSchema,
  promoteAdminSchema,
  type AdminNameDto,
  type PromoteAdminDto,
} from './admin.schemas';
import { AdminSettingsService } from './admin-settings.service';

@Controller('admin/settings')
@UseGuards(AdminGuard)
export class AdminSettingsController {
  constructor(
    private readonly settings: AdminSettingsService,
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly cookies: SessionCookies,
  ) {}

  @Get('profile')
  profile(@CurrentUser() current: AuthUser) {
    return this.settings.profile(current.id);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() current: AuthUser,
    @Body(new ZodValidationPipe(adminNameSchema)) body: AdminNameDto,
  ) {
    const dto: UpdateProfileDto = { name: body.name };
    return { user: await this.users.updateProfile(current.id, dto) };
  }

  @Patch('password')
  async changePassword(
    @CurrentUser() current: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.users.changePassword(current.id, body);
    await this.sessions.revokeAllForUser(current.id);
    const tokens = await this.sessions.issueSession(current.id, current.email);
    this.cookies.setSession(res, tokens);
    return result;
  }

  @Get('admins')
  admins() {
    return this.settings.listAdmins();
  }

  @Post('admins')
  promote(@Body(new ZodValidationPipe(promoteAdminSchema)) body: PromoteAdminDto) {
    return this.settings.promote(body.email);
  }

  @Delete('admins/:id')
  demote(@CurrentUser() current: AuthUser, @Param('id') id: string) {
    return this.settings.demote(current.id, id);
  }
}
