import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { AUTH_COOKIE, SESSION_FLAG_COOKIE } from '../auth/auth.constants';
import type { JwtPayload } from '../auth/auth.types';
import type { Env } from '../config/env';
import { GUEST_COOKIE } from './generator.constants';
import type { Actor } from './limits.service';

@Injectable()
export class ActorService {
  private readonly secure: boolean;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.secure = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  async resolve(req: Request, res: Response): Promise<Actor> {
    const token: unknown = req.cookies?.[AUTH_COOKIE];
    if (typeof token === 'string' && token) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token);
        return { kind: 'USER', userId: payload.sub, actorKey: payload.sub };
      } catch {
        // expired or invalid: handled below
      }
    }

    if (req.cookies?.[SESSION_FLAG_COOKIE]) {
      throw new UnauthorizedException('Session expired');
    }

    let guestId: unknown = req.cookies?.[GUEST_COOKIE];
    if (typeof guestId !== 'string' || !/^[0-9a-f-]{36}$/.test(guestId)) {
      guestId = randomUUID();
      res.cookie(GUEST_COOKIE, guestId, {
        httpOnly: true,
        secure: this.secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });
    }
    return {
      kind: 'GUEST',
      userId: null,
      actorKey: createHash('sha256')
        .update(guestId as string)
        .digest('hex'),
    };
  }
}
