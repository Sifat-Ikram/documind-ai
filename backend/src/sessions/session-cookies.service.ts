import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  AUTH_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  SESSION_FLAG_COOKIE,
} from '../auth/auth.constants';
import type { Env } from '../config/env';
import type { SessionTokens } from './sessions.types';

@Injectable()
export class SessionCookies {
  private readonly secure: boolean;
  private readonly accessMs: number;
  private readonly refreshMs: number;

  constructor(config: ConfigService<Env, true>) {
    this.secure = config.get('NODE_ENV', { infer: true }) === 'production';
    this.accessMs =
      config.get('JWT_ACCESS_EXPIRES_SECONDS', { infer: true }) * 1000;
    this.refreshMs =
      config.get('JWT_REFRESH_EXPIRES_DAYS', { infer: true }) *
      24 *
      60 *
      60 *
      1000;
  }

  setSession(res: Response, tokens: SessionTokens): void {
    this.setAccessOnly(res, tokens.accessToken);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.base(),
      httpOnly: true,
      path: REFRESH_COOKIE_PATH,
      maxAge: this.refreshMs,
    });
    res.cookie(SESSION_FLAG_COOKIE, '1', {
      ...this.base(),
      httpOnly: false,
      path: '/',
      maxAge: this.refreshMs,
    });
  }

  /** Grace window তে শুধু access token। */
  setAccessOnly(res: Response, accessToken: string): void {
    res.cookie(AUTH_COOKIE, accessToken, {
      ...this.base(),
      httpOnly: true,
      path: '/',
      maxAge: this.accessMs,
    });
  }

  clearSession(res: Response): void {
    res.clearCookie(AUTH_COOKIE, { ...this.base(), httpOnly: true, path: '/' });
    res.clearCookie(REFRESH_COOKIE, {
      ...this.base(),
      httpOnly: true,
      path: REFRESH_COOKIE_PATH,
    });
    res.clearCookie(SESSION_FLAG_COOKIE, {
      ...this.base(),
      httpOnly: false,
      path: '/',
    });
  }

  private base() {
    return { secure: this.secure, sameSite: 'lax' as const };
  }
}
