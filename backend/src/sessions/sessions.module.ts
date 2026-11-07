import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../config/env';
import { SessionCookies } from './session-cookies.service';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES_SECONDS', { infer: true }),
        },
      }),
    }),
  ],
  providers: [SessionsService, SessionCookies],
  exports: [SessionsService, SessionCookies, JwtModule],
})
export class SessionsModule {}
