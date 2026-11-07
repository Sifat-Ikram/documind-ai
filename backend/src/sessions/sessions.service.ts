import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { JwtPayload } from '../auth/auth.types';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { publicUserSelect } from '../users/user.select';
import type { PublicUser, RotateResult, SessionTokens } from './sessions.types';
import { generateRefreshToken, hashToken } from './token.util';

const DAY_MS = 24 * 60 * 60 * 1000;

const tokenSelect = {
  id: true,
  userId: true,
  familyId: true,
  replacedById: true,
  revokedAt: true,
  expiresAt: true,
  user: { select: publicUserSelect },
} as const;

interface LoadedToken {
  id: string;
  userId: string;
  familyId: string;
  replacedById: string | null;
  revokedAt: Date | null;
  expiresAt: Date;
  user: PublicUser;
}

@Injectable()
export class SessionsService {
  private readonly refreshMs: number;
  private readonly graceMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.refreshMs =
      config.get('JWT_REFRESH_EXPIRES_DAYS', { infer: true }) * DAY_MS;
    this.graceMs = config.get('REFRESH_GRACE_SECONDS', { infer: true }) * 1000;
  }

  async issueSession(userId: string, email: string): Promise<SessionTokens> {
    await this.deleteLongExpired(userId);

    const refreshToken = generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId: randomUUID(),
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshMs),
      },
    });
    return { accessToken: await this.signAccess(userId, email), refreshToken };
  }

  async rotate(raw: unknown): Promise<RotateResult> {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > 200) {
      throw new UnauthorizedException('Not authenticated');
    }

    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(raw) },
      select: tokenSelect,
    });
    if (!token) throw new UnauthorizedException('Invalid session');

    const now = new Date();
    if (token.revokedAt) return this.handleRevoked(token, now);
    if (token.expiresAt <= now) {
      throw new UnauthorizedException('Session expired');
    }

    const newToken = generateRefreshToken();
    const newId = randomUUID();

    const rotated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: token.id, revokedAt: null },
        data: { revokedAt: now, replacedById: newId },
      });
      if (claimed.count === 0) return false;

      await tx.refreshToken.create({
        data: {
          id: newId,
          userId: token.userId,
          familyId: token.familyId,
          tokenHash: hashToken(newToken),
          expiresAt: new Date(now.getTime() + this.refreshMs),
        },
      });
      return true;
    });

    if (!rotated) {
      const current = await this.prisma.refreshToken.findUnique({
        where: { id: token.id },
        select: tokenSelect,
      });
      if (!current) throw new UnauthorizedException('Invalid session');
      return this.handleRevoked(current, new Date());
    }

    return {
      user: token.user,
      accessToken: await this.signAccess(token.user.id, token.user.email),
      refreshToken: newToken,
    };
  }

  async revokeByToken(raw: unknown): Promise<void> {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > 200) return;

    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(raw) },
      select: { familyId: true },
    });
    if (!token) return;

    await this.prisma.refreshToken.updateMany({
      where: { familyId: token.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async handleRevoked(
    token: LoadedToken,
    now: Date,
  ): Promise<RotateResult> {
    const rotatedRecently =
      token.replacedById !== null &&
      token.revokedAt !== null &&
      now.getTime() - token.revokedAt.getTime() <= this.graceMs &&
      token.expiresAt > now;

    if (rotatedRecently && token.replacedById) {
      const replacement = await this.prisma.refreshToken.findUnique({
        where: { id: token.replacedById },
        select: { revokedAt: true, replacedById: true },
      });
      const endedByLogout =
        !replacement || (replacement.revokedAt && !replacement.replacedById);

      if (!endedByLogout) {
        return {
          user: token.user,
          accessToken: await this.signAccess(token.user.id, token.user.email),
          refreshToken: null,
        };
      }
    }

    await this.prisma.refreshToken.updateMany({
      where: { familyId: token.familyId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw new UnauthorizedException('Session is no longer valid');
  }

  private signAccess(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwt.signAsync(payload);
  }

  private async deleteLongExpired(userId: string): Promise<void> {
    try {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, expiresAt: { lt: new Date(Date.now() - DAY_MS) } },
      });
    } catch {}
  }
}
