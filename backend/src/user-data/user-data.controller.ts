import { Controller, Delete, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserDataService } from './user-data.service';

@Controller('users/data')
export class UserDataController {
  constructor(private readonly data: UserDataService) {}

  @Delete('conversations')
  clearConversations(@CurrentUser() user: AuthUser) {
    return this.data.clearConversations(user.id);
  }

  @Delete('analyses')
  clearAnalyses(@CurrentUser() user: AuthUser) {
    return this.data.clearAnalyses(user.id);
  }

  @Delete('recent')
  clearRecent(@CurrentUser() user: AuthUser) {
    return this.data.clearRecent(user.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Get('export')
  export(@CurrentUser() user: AuthUser) {
    return this.data.export(user.id);
  }
}
