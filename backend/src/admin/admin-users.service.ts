import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import type { ListUsersQuery } from './admin.schemas';
import { countByBucket, fillSeries, rangeStart } from './admin.utils';
import type { Prisma } from '../generated/prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async list(q: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { email: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(q.role ? { role: q.role } : {}),
      ...(q.status === 'blocked'
        ? { isBlocked: true }
        : q.status === 'active'
          ? { isBlocked: false }
          : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          lastLoginAt: true,
          lastActiveAt: true,
          _count: {
            select: { documents: true, analyses: true, generations: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map(({ _count, ...user }) => ({
        ...user,
        documentCount: _count.documents,
        analysisCount: _count.analyses,
        generationCount: _count.generations,
      })),
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  async detail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        blockedAt: true,
        createdAt: true,
        lastLoginAt: true,
        lastActiveAt: true,
        _count: {
          select: {
            documents: true,
            analyses: true,
            conversations: true,
            generations: true,
            feedback: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [
      storage,
      aiTotals,
      recentDocuments,
      recentAnalyses,
      recentFeedback,
      recentSessions,
    ] = await Promise.all([
      this.prisma.document.aggregate({
        where: { userId: id, trashedAt: null },
        _sum: { fileSize: true },
      }),
      this.prisma.aiUsage.aggregate({
        where: { userId: id },
        _count: { _all: true },
        _sum: { totalTokens: true },
      }),
      this.prisma.document.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          originalName: true,
          fileType: true,
          fileSize: true,
          createdAt: true,
          trashedAt: true,
        },
      }),
      this.prisma.analysis.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          originalInstruction: true,
          createdAt: true,
          document: { select: { id: true, originalName: true } },
        },
      }),
      this.prisma.feedback.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, type: true, subject: true, status: true, createdAt: true },
      }),
      this.prisma.refreshToken.count({
        where: {
          userId: id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return {
      user: {
        ...user,
        documentCount: user._count.documents,
        analysisCount: user._count.analyses,
        conversationCount: user._count.conversations,
        generationCount: user._count.generations,
        feedbackCount: user._count.feedback,
      },
      overview: {
        storageBytes: storage._sum.fileSize ?? 0,
        aiRequests: aiTotals._count._all,
        aiTokens: aiTotals._sum.totalTokens ?? 0,
        activeSessions: recentSessions,
      },
      recentDocuments,
      recentAnalyses,
      recentFeedback,
    };
  }

  async setBlocked(actorId: string, id: string, blocked: boolean) {
    if (id === actorId) {
      throw new BadRequestException('You cannot block your own account');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isBlocked: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Admin accounts cannot be blocked');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isBlocked: blocked, blockedAt: blocked ? new Date() : null },
      select: { id: true, isBlocked: true, blockedAt: true },
    });

    // A blocked user is signed out everywhere and cannot refresh their session.
    if (blocked) await this.sessions.revokeAllForUser(id);
    return updated;
  }

  async remove(actorId: string, id: string) {
    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account here');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') {
      throw new BadRequestException(
        'Remove the Admin role before deleting this account',
      );
    }

    const files = await this.prisma.document.findMany({
      where: { userId: id },
      select: { publicId: true },
    });
    await this.deleteFiles(files.map((f) => f.publicId));

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }

  async stats(q: { range: '7d' | '30d' | '90d' | '12m'; interval: 'day' | 'week' | 'month' }) {
    const start = rangeStart(q.range);
    const since30 = new Date(Date.now() - 30 * DAY_MS);

    const [registrationRows, active, blocked, newUsers, roleRows] =
      await Promise.all([
        countByBucket(this.prisma, 'User', start, q.interval),
        this.prisma.user.count({
          where: {
            OR: [
              { lastActiveAt: { gte: since30 } },
              { lastLoginAt: { gte: since30 } },
            ],
          },
        }),
        this.prisma.user.count({ where: { isBlocked: true } }),
        this.prisma.user.count({ where: { createdAt: { gte: start } } }),
        this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      ]);

    return {
      range: q.range,
      interval: q.interval,
      registrationTrend: fillSeries(registrationRows, start, q.interval),
      statusDistribution: [
        { key: 'ACTIVE', label: 'Active', value: active },
        { key: 'BLOCKED', label: 'Blocked', value: blocked },
      ],
      stats: {
        newUsers,
        activeUsers: active,
        blockedUsers: blocked,
        admins: roleRows.find((r) => r.role === 'ADMIN')?._count._all ?? 0,
      },
    };
  }

  private async deleteFiles(publicIds: string[]) {
    if (publicIds.length === 0) return;
    const results = await Promise.allSettled(
      publicIds.map((publicId) => this.cloudinary.delete(publicId)),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(`Could not delete ${failed} Cloudinary file(s)`);
    }
  }
}
