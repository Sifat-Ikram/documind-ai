import {
  Controller,
  Get,
  Headers,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../auth/public.decorator';
import type { Env } from '../config/env';
import { TrashService } from '../trash/trash.service';

@Controller('cron')
export class CronController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly trash: TrashService,
  ) {}

  @Public()
  @Get('purge')
  async purge(@Headers('authorization') authorization?: string) {
    const secret = this.config.get('CRON_SECRET', { infer: true });
    if (!secret)
      throw new ServiceUnavailableException('Cron is not configured');

    const expected = Buffer.from(`Bearer ${secret}`);
    const given = Buffer.from(authorization ?? '');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new UnauthorizedException('Invalid cron secret');
    }

    const purgedTrash = await this.trash.purgeExpired();
    return { ok: true, purgedTrash };
  }
}
