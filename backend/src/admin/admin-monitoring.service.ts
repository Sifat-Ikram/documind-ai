import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RangeQueryDto } from './admin.schemas';
import { countByBucket, daysAgo, fillSeries, rangeStart } from './admin.utils';

@Injectable()
export class AdminMonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async monitoring(q: RangeQueryDto) {
    const start = rangeStart(q.range);
    const last24h = daysAgo(1);

    const [
      requestCount,
      errorCount,
      avgLatency,
      ai24h,
      aiLastError,
      responseRows,
      errorRows,
      recentErrors,
      failures,
      dbOk,
    ] = await Promise.all([
      this.prisma.apiRequestLog.count({ where: { createdAt: { gte: start } } }),
      this.prisma.apiRequestLog.count({
        where: { createdAt: { gte: start }, status: { gte: 400 } },
      }),
      this.prisma.apiRequestLog.aggregate({
        where: { createdAt: { gte: start } },
        _avg: { durationMs: true },
      }),
      this.prisma.aiUsage.groupBy({
        by: ['success'],
        where: { createdAt: { gte: last24h } },
        _count: { _all: true },
      }),
      this.prisma.aiUsage.findFirst({
        where: { success: false },
        orderBy: { createdAt: 'desc' },
        select: { error: true, createdAt: true, feature: true },
      }),
      this.prisma.$queryRaw<{ bucket: string; value: number }[]>(Prisma.sql`
        SELECT to_char(date_trunc(${Prisma.raw(`'${q.interval}'`)}, "createdAt"), 'YYYY-MM-DD') AS bucket,
               ROUND(AVG("durationMs"))::int AS value
        FROM "ApiRequestLog"
        WHERE "createdAt" >= ${start}
        GROUP BY 1
        ORDER BY 1`),
      countByBucket(
        this.prisma,
        'ApiRequestLog',
        start,
        q.interval,
        Prisma.sql`AND "status" >= 400`,
      ),
      this.prisma.apiRequestLog.findMany({
        where: { status: { gte: 400 } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          method: true,
          path: true,
          status: true,
          durationMs: true,
          createdAt: true,
        },
      }),
      this.prisma.failedProcessingLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          fileName: true,
          fileType: true,
          reason: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma
        .$queryRaw`SELECT 1`
        .then(() => true)
        .catch(() => false),
    ]);

    const aiSuccess = ai24h.find((r) => r.success === true)?._count._all ?? 0;
    const aiTotal = ai24h.reduce((sum, r) => sum + r._count._all, 0);
    const aiRate = aiTotal === 0 ? null : aiSuccess / aiTotal;
    const errorRate = requestCount === 0 ? 0 : errorCount / requestCount;
    const latency = Math.round(avgLatency._avg.durationMs ?? 0);

    const level = (
      healthy: boolean | null,
      degraded: boolean,
    ): 'operational' | 'degraded' | 'down' =>
      healthy === null || healthy ? (degraded ? 'degraded' : 'operational') : 'down';

    return {
      range: q.range,
      interval: q.interval,
      statuses: {
        api: {
          status: level(dbOk, errorRate > 0.05 || latency > 1500),
          detail: dbOk
            ? `${requestCount.toLocaleString('en-US')} requests, ${(errorRate * 100).toFixed(1)}% errors`
            : 'Database is unreachable',
          errorRate: Math.round(errorRate * 1000) / 10,
          avgLatency: latency,
        },
        aiProvider: {
          status: level(dbOk, aiRate !== null && aiRate < 0.95),
          detail:
            aiRate === null
              ? 'No AI requests in the last 24 hours'
              : `${(aiRate * 100).toFixed(1)}% success in the last 24 hours`,
          successRate: aiRate === null ? null : Math.round(aiRate * 1000) / 10,
          lastErrorAt: aiLastError?.createdAt ?? null,
          lastError: aiLastError?.error ?? null,
        },
        server: {
          status: dbOk ? 'operational' : 'down',
          detail: dbOk ? 'Server and database responding' : 'Database is unreachable',
          uptimeSeconds: Math.round(process.uptime()),
          database: dbOk ? 'up' : 'down',
        },
      },
      stats: {
        requests: requestCount,
        errors: errorCount,
        avgLatency: latency,
      },
      responseTime: fillSeries(responseRows, start, q.interval),
      errorTrend: fillSeries(errorRows, start, q.interval),
      recentErrors,
      failedProcessing: failures,
    };
  }
}
