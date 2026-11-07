import { Body, Controller, Get, Patch, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SessionCookies } from '../sessions/session-cookies.service';
import { SessionsService } from '../sessions/sessions.service';
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordDto,
  type UpdateProfileDto,
} from './users.schemas';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly cookies: SessionCookies,
  ) {}

  @Get('profile')
  async getProfile(@CurrentUser() current: AuthUser) {
    return { user: await this.users.getProfile(current.id) };
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() current: AuthUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileDto,
  ) {
    return { user: await this.users.updateProfile(current.id, body) };
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
}
