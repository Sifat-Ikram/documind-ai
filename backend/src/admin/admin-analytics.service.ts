import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FEATURE_LABELS } from './admin-overview.service';
import type { RangeQueryDto } from './admin.schemas';
import {
  activeUsersByBucket,
  activeUsersCount,
  countByBucket,
  fillSeries,
  rangeStart,
  sumByBucket,
  userGrowthSeries,
} from './admin.utils';

const round = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async ai(q: RangeQueryDto) {
    const start = rangeStart(q.range);

    const [totals, features, usageRows, tokenRows] =
      await Promise.all([
        this.prisma.aiUsage.aggregate({
          where: { createdAt: { gte: start } },
          _count: { _all: true },
          _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
        }),
        this.prisma.aiUsage.groupBy({
          by: ['feature'],
          where: { createdAt: { gte: start } },
          _count: { _all: true },
          _sum: { totalTokens: true },
        }),
        countByBucket(this.prisma, 'AiUsage', start, q.interval),
        sumByBucket(this.prisma, 'AiUsage', 'totalTokens', start, q.interval),
      ]);

    const successRows = await this.prisma.aiUsage.groupBy({
      by: ['success'],
      where: { createdAt: { gte: start } },
      _count: { _all: true },
    });
    const successful =
      successRows.find((r) => r.success === true)?._count._all ?? 0;
    const totalRequests = totals._count._all;

    const byFeature = new Map(
      features.map((f) => [
        f.feature,
        { requests: f._count._all, tokens: f._sum.totalTokens ?? 0 },
      ]),
    );

    return {
      range: q.range,
      interval: q.interval,
      stats: {
        totalRequests,
        totalTokens: totals._sum.totalTokens ?? 0,
        promptTokens: totals._sum.promptTokens ?? 0,
        completionTokens: totals._sum.completionTokens ?? 0,
        successRate: totalRequests === 0 ? null : round((successful / totalRequests) * 100),
      },
      featureUsage: (Object.keys(FEATURE_LABELS) as (keyof typeof FEATURE_LABELS)[]).map(
        (key) => ({
          key,
          label: FEATURE_LABELS[key],
          requests: byFeature.get(key)?.requests ?? 0,
          tokens: byFeature.get(key)?.tokens ?? 0,
        }),
      ),
      usageTrend: fillSeries(usageRows, start, q.interval),
      tokenTrend: fillSeries(tokenRows, start, q.interval),
      distribution: (Object.keys(FEATURE_LABELS) as (keyof typeof FEATURE_LABELS)[])
        .map((key) => ({
          key,
          label: FEATURE_LABELS[key],
          value: byFeature.get(key)?.requests ?? 0,
        }))
        .filter((item) => item.value > 0),
    };
  }

  async system(q: RangeQueryDto) {
    const start = rangeStart(q.range);

    const [
      activeSeries,
      growthSeries,
      uploadRows,
      aiRows,
      activeCount,
      totalUsers,
      newUsers,
      documents,
      analyses,
      conversations,
      generations,
      aiRequests,
    ] = await Promise.all([
      activeUsersByBucket(this.prisma, start, q.interval),
      userGrowthSeries(this.prisma, start, q.interval),
      countByBucket(this.prisma, 'Document', start, q.interval),
      countByBucket(this.prisma, 'AiUsage', start, q.interval),
      activeUsersCount(this.prisma, start),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: start } } }),
      this.prisma.document.count({ where: { createdAt: { gte: start } } }),
      this.prisma.analysis.count({ where: { createdAt: { gte: start } } }),
      this.prisma.conversation.count({ where: { createdAt: { gte: start } } }),
      this.prisma.generatedDocument.count({
        where: { createdAt: { gte: start } },
      }),
      this.prisma.aiUsage.count({ where: { createdAt: { gte: start } } }),
    ]);

    const perUser = (value: number) => (activeCount === 0 ? 0 : round(value / activeCount));

    return {
      range: q.range,
      interval: q.interval,
      stats: {
        activeUsers: activeCount,
        totalUsers,
        newUsers,
        documents,
        aiRequests,
      },
      activeUsersTrend: fillSeries(activeSeries, start, q.interval),
      userGrowth: growthSeries,
      documentUploads: fillSeries(uploadRows, start, q.interval),
      aiRequestsTrend: fillSeries(aiRows, start, q.interval),
      engagement: [
        { key: 'documents', label: 'Documents / active user', value: perUser(documents) },
        { key: 'analyses', label: 'Analyses / active user', value: perUser(analyses) },
        { key: 'chats', label: 'Chats / active user', value: perUser(conversations) },
        { key: 'generated', label: 'Generated docs / active user', value: perUser(generations) },
        { key: 'ai', label: 'AI requests / active user', value: perUser(aiRequests) },
      ],
    };
  }
}
