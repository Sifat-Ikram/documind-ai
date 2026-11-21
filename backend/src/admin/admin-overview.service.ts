import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RangeQueryDto } from './admin.schemas';
import {
  activeUsersCount,
  countByBucket,
  fillSeries,
  rangeStart,
} from './admin.utils';

export const FEATURE_LABELS = {
  WRITER: 'AI Writer',
  ANALYSIS: 'Document Analysis',
  CHAT: 'AI Chat',
  SEARCH: 'AI Search',
} as const;

@Injectable()
export class AdminOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(q: RangeQueryDto) {
    const start = rangeStart(q.range);

    const [
      totalUsers,
      activeUsers,
      totalDocuments,
      aiTotals,
      newUsers,
      growthRows,
      uploadRows,
      featureRows,
      recentDocuments,
      recentAnalyses,
      recentUsers,
      recentFeedback,
    ] = await Promise.all([
      this.prisma.user.count(),
      activeUsersCount(this.prisma, start),
      this.prisma.document.count({ where: { trashedAt: null } }),
      this.prisma.aiUsage.aggregate({
        _count: { _all: true },
        _sum: { totalTokens: true },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: start } } }),
      countByBucket(this.prisma, 'User', start, q.interval),
      countByBucket(this.prisma, 'Document', start, q.interval),
      this.prisma.aiUsage.groupBy({
        by: ['feature'],
        _count: { _all: true },
        _sum: { totalTokens: true },
      }),
      this.prisma.document.findMany({
        where: { trashedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          originalName: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.analysis.findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          originalInstruction: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          document: { select: { originalName: true } },
        },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      this.prisma.feedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          subject: true,
          type: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const activities = [
      ...recentDocuments.map((d) => ({
        id: `document-${d.id}`,
        type: 'document' as const,
        title: `Uploaded "${d.originalName}"`,
        user: d.user,
        at: d.createdAt,
      })),
      ...recentAnalyses.map((a) => ({
        id: `analysis-${a.id}`,
        type: 'analysis' as const,
        title: `Analyzed "${a.document.originalName}"`,
        description: a.originalInstruction.slice(0, 120),
        user: a.user,
        at: a.createdAt,
      })),
      ...recentUsers.map((u) => ({
        id: `user-${u.id}`,
        type: 'registration' as const,
        title: `${u.name} joined`,
        user: { id: u.id, name: u.name, email: u.email },
        at: u.createdAt,
      })),
      ...recentFeedback.map((f) => ({
        id: `feedback-${f.id}`,
        type: 'feedback' as const,
        title:
          f.type === 'BUG_REPORT'
            ? `Bug report: ${f.subject}`
            : `Feedback: ${f.subject}`,
        user: f.user,
        at: f.createdAt,
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 12);

    return {
      range: q.range,
      interval: q.interval,
      stats: {
        totalUsers,
        activeUsers,
        totalDocuments,
        totalAiRequests: aiTotals._count._all,
        totalTokens: aiTotals._sum.totalTokens ?? 0,
        newUsers,
      },
      userGrowth: fillSeries(growthRows, start, q.interval),
      documentUploads: fillSeries(uploadRows, start, q.interval),
      aiDistribution: featureRows
        .map((row) => ({
          key: row.feature,
          label: FEATURE_LABELS[row.feature],
          requests: row._count._all,
          tokens: row._sum.totalTokens ?? 0,
        }))
        .sort((a, b) => b.requests - a.requests),
      recentActivities: activities,
    };
  }
}
