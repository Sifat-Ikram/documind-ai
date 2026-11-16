import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { WINDOW_MS, type Length } from './generator.constants';

export interface Actor {
  kind: 'USER' | 'GUEST';
  userId: string | null;
  actorKey: string;
}

@Injectable()
export class GenerationLimitsService {
  private readonly guestPerBrowser: number;
  private readonly guestPool: number;
  private readonly userLimit: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.guestPerBrowser = config.get('GENERATE_GUEST_PER_BROWSER', {
      infer: true,
    });
    this.guestPool = config.get('GENERATE_GUEST_POOL', { infer: true });
    this.userLimit = config.get('GENERATE_USER_LIMIT', { infer: true });
  }

  allowedLengths(actor: Actor): Length[] {
    return actor.kind === 'USER'
      ? ['SHORT', 'MEDIUM', 'LONG']
      : ['SHORT', 'MEDIUM'];
  }

  /** Rolling 24 hours. Guests: a limit per browser plus a limit shared by all guests. */
  async status(actor: Actor) {
    const since = new Date(Date.now() - WINDOW_MS);
    const personalLimit =
      actor.kind === 'USER' ? this.userLimit : this.guestPerBrowser;

    const used = await this.prisma.generationLog.count({
      where: {
        kind: actor.kind,
        actorKey: actor.actorKey,
        createdAt: { gt: since },
      },
    });
    const personalRemaining = Math.max(0, personalLimit - used);

    let poolRemaining: number | null = null;
    if (actor.kind === 'GUEST') {
      const poolUsed = await this.prisma.generationLog.count({
        where: { kind: 'GUEST', createdAt: { gt: since } },
      });
      poolRemaining = Math.max(0, this.guestPool - poolUsed);
    }

    const remaining =
      poolRemaining === null
        ? personalRemaining
        : Math.min(personalRemaining, poolRemaining);
    const blockedBy: 'personal' | 'pool' | null =
      remaining > 0 ? null : personalRemaining === 0 ? 'personal' : 'pool';

    let resetsInSeconds: number | null = null;
    if (blockedBy) {
      const oldest = await this.prisma.generationLog.findFirst({
        where:
          blockedBy === 'personal'
            ? {
                kind: actor.kind,
                actorKey: actor.actorKey,
                createdAt: { gt: since },
              }
            : { kind: 'GUEST', createdAt: { gt: since } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });
      if (oldest) {
        resetsInSeconds = Math.max(
          1,
          Math.ceil(
            (oldest.createdAt.getTime() + WINDOW_MS - Date.now()) / 1000,
          ),
        );
      }
    }

    return {
      actor: actor.kind === 'USER' ? ('user' as const) : ('guest' as const),
      limit: personalLimit,
      used,
      remaining,
      blockedBy,
      resetsInSeconds,
      allowedLengths: this.allowedLengths(actor),
    };
  }

  /** Counts one generation. Throws 429 when the limit is reached. */
  async reserve(actor: Actor): Promise<string> {
    const s = await this.status(actor);
    if (s.remaining <= 0) {
      const message =
        s.blockedBy === 'pool'
          ? 'The free guest generations for today are used up. Log in to keep going.'
          : actor.kind === 'GUEST'
            ? 'You have used your free generations. Log in to get more.'
            : 'You have reached your generation limit for now.';
      throw new HttpException(
        {
          message,
          code: 'GENERATION_LIMIT',
          blockedBy: s.blockedBy,
          resetsInSeconds: s.resetsInSeconds,
        },
        429,
      );
    }
    const row = await this.prisma.generationLog.create({
      data: { kind: actor.kind, actorKey: actor.actorKey },
      select: { id: true },
    });
    return row.id;
  }

  async refund(id: string): Promise<void> {
    await this.prisma.generationLog.deleteMany({ where: { id } });
  }
}
