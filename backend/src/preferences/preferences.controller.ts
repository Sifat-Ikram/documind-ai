import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  preferencesPatchSchema,
  type PreferencesPatch,
} from './preferences.schemas';
import { PreferencesService } from './preferences.service';

@Controller('users/preferences')
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  async get(@CurrentUser() user: AuthUser) {
    return { preferences: await this.preferences.get(user.id) };
  }

  @Patch()
  async update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(preferencesPatchSchema)) body: PreferencesPatch,
  ) {
    return { preferences: await this.preferences.update(user.id, body) };
  }
}
