import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { Env } from '../config/env';
import { UsersService } from '../users/users.service';
import { AUTH_COOKIE } from './auth.constants';
import {
  loginSchema,
  registerSchema,
  type LoginDto,
  type RegisterDto,
} from './auth.schemas';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';

// register/login এ কড়া limit: মিনিটে ১০ request
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.register(body);
    this.setAuthCookie(res, token);
    return { user };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.login(body);
    this.setAuthCookie(res, token);
    return { user };
  }

  // Public: session শেষ হয়ে গেলেও cookie মোছা যাবে
  @Public()
  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, this.cookieBaseOptions());
    return { message: 'Logged out' };
  }

  @Get('me')
  async me(@CurrentUser() current: AuthUser) {
    return { user: await this.users.getProfile(current.id) };
  }

  private cookieBaseOptions() {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  private setAuthCookie(res: Response, token: string) {
    const days = this.config.get('JWT_EXPIRES_IN_DAYS', { infer: true });
    res.cookie(AUTH_COOKIE, token, {
      ...this.cookieBaseOptions(),
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }
}
