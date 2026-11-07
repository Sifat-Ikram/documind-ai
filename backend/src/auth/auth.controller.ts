import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SessionCookies } from '../sessions/session-cookies.service';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { REFRESH_COOKIE } from './auth.constants';
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

const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
const REFRESH_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly cookies: SessionCookies,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.register(body);
    this.cookies.setSession(res, tokens);
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
    const { user, tokens } = await this.auth.login(body);
    this.cookies.setSession(res, tokens);
    return { user };
  }

  @Public()
  @Throttle(REFRESH_THROTTLE)
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.sessions.rotate(req.cookies?.[REFRESH_COOKIE]);
      if (result.refreshToken) {
        this.cookies.setSession(res, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
      } else {
        this.cookies.setAccessOnly(res, result.accessToken);
      }
      return { user: result.user };
    } catch (err) {
      if (err instanceof UnauthorizedException) this.cookies.clearSession(res);
      throw err;
    }
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.sessions.revokeByToken(req.cookies?.[REFRESH_COOKIE]);
    this.cookies.clearSession(res);
    return { message: 'Logged out' };
  }

  @Get('me')
  async me(@CurrentUser() current: AuthUser) {
    return { user: await this.users.getProfile(current.id) };
  }
}
