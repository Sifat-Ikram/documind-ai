import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordDto,
  type UpdateProfileDto,
} from './users.schemas';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

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
  changePassword(
    @CurrentUser() current: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordDto,
  ) {
    return this.users.changePassword(current.id, body);
  }
}
