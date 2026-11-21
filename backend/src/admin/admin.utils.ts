import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export const RANGES = ['7d', '30d', '90d', '12m'] as const;
export const INTERVALS = ['day', 'week', 'month'] as const;
export type RangeKey = (typeof RANGES)[number];
export type IntervalKey = (typeof INTERVALS)[number];

export interface RangeQuery {
  range: RangeKey;
  interval: IntervalKey;
}

export function defaultIntervalFor(range: RangeKey): IntervalKey {
  return range === '12m' ? 'month' : 'day';
}

/** First moment of the window, in UTC, so bucket labels line up everywhere. */
export function rangeStart(range: RangeKey): Date {
  const now = new Date();
  if (range === '12m') {
    return new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Every bucket in the window, oldest first, so empty periods still show as zero. */
export function bucketKeys(start: Date, interval: IntervalKey): string[] {
  const cursor = new Date(start);
  if (interval === 'week') {
    const offset = (cursor.getUTCDay() + 6) % 7; // weeks start on Monday
    cursor.setUTCDate(cursor.getUTCDate() - offset);
  }
  if (interval === 'month') cursor.setUTCDate(1);

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const keys: string[] = [];

  while (cursor <= today) {
    keys.push(iso(cursor));
    if (interval === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (interval === 'week') cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

export type SeriesPoint = { bucket: string; value: number };

export function fillSeries(
  rows: { bucket: string; value: number }[],
  start: Date,
  interval: IntervalKey,
): SeriesPoint[] {
  const found = new Map(rows.map((r) => [r.bucket.slice(0, 10), Number(r.value)]));
  return bucketKeys(start, interval).map((bucket) => ({
    bucket,
    value: found.get(bucket) ?? 0,
  }));
}

export async function countByBucket(
  prisma: PrismaService,
  table: string,
  start: Date,
  interval: IntervalKey,
  extra?: Prisma.Sql,
): Promise<SeriesPoint[]> {
  return prisma.$queryRaw<SeriesPoint[]>(Prisma.sql`
    SELECT to_char(date_trunc(${Prisma.raw(`'${interval}'`)}, "createdAt"), 'YYYY-MM-DD') AS bucket,
           COUNT(*)::int AS value
    FROM ${Prisma.raw(`"${table}"`)}
    WHERE "createdAt" >= ${start} ${extra ?? Prisma.empty}
    GROUP BY 1
    ORDER BY 1`);
}

export async function sumByBucket(
  prisma: PrismaService,
  table: string,
  column: string,
  start: Date,
  interval: IntervalKey,
): Promise<SeriesPoint[]> {
  return prisma.$queryRaw<SeriesPoint[]>(Prisma.sql`
    SELECT to_char(date_trunc(${Prisma.raw(`'${interval}'`)}, "createdAt"), 'YYYY-MM-DD') AS bucket,
           COALESCE(SUM(${Prisma.raw(`"${column}"`)}), 0)::int AS value
    FROM ${Prisma.raw(`"${table}"`)}
    WHERE "createdAt" >= ${start}
    GROUP BY 1
    ORDER BY 1`);
}

/**
 * Users who did something in the window: an AI request, opening a document,
 * an upload, a generated document or an analysis. Built from existing tables.
 */
const ACTIVE_UNION = (unit: string, start: Date) =>
  Prisma.sql`(
    SELECT to_char(date_trunc(${Prisma.raw(`'${unit}'`)}, "createdAt"), 'YYYY-MM-DD') AS bucket, "userId" AS uid
      FROM "AiUsage" WHERE "createdAt" >= ${start} AND "userId" IS NOT NULL
    UNION ALL
    SELECT to_char(date_trunc(${Prisma.raw(`'${unit}'`)}, "createdAt"), 'YYYY-MM-DD'), "userId"
      FROM "Document" WHERE "createdAt" >= ${start}
    UNION ALL
    SELECT to_char(date_trunc(${Prisma.raw(`'${unit}'`)}, "lastAccessedAt"), 'YYYY-MM-DD'), "userId"
      FROM "DocumentView" WHERE "lastAccessedAt" >= ${start}
    UNION ALL
    SELECT to_char(date_trunc(${Prisma.raw(`'${unit}'`)}, "createdAt"), 'YYYY-MM-DD'), "userId"
      FROM "GeneratedDocument" WHERE "createdAt" >= ${start}
    UNION ALL
    SELECT to_char(date_trunc(${Prisma.raw(`'${unit}'`)}, "createdAt"), 'YYYY-MM-DD'), "userId"
      FROM "Analysis" WHERE "createdAt" >= ${start}
  )`;

export async function activeUsersByBucket(
  prisma: PrismaService,
  start: Date,
  interval: IntervalKey,
): Promise<SeriesPoint[]> {
  const union = ACTIVE_UNION(interval, start);
  return prisma.$queryRaw<SeriesPoint[]>(Prisma.sql`
    SELECT bucket, COUNT(DISTINCT uid)::int AS value
    FROM ${union} AS activity
    GROUP BY bucket
    ORDER BY bucket`);
}

export async function activeUsersCount(
  prisma: PrismaService,
  start: Date,
): Promise<number> {
  const union = ACTIVE_UNION('day', start);
  const rows = await prisma.$queryRaw<{ value: number }[]>(Prisma.sql`
    SELECT COUNT(DISTINCT uid)::int AS value FROM ${union} AS activity`);
  return Number(rows[0]?.value ?? 0);
}

/** Cumulative number of registered users, for the growth area chart. */
export async function userGrowthSeries(
  prisma: PrismaService,
  start: Date,
  interval: IntervalKey,
): Promise<SeriesPoint[]> {
  const [before, rows] = await Promise.all([
    prisma.user.count({ where: { createdAt: { lt: start } } }),
    countByBucket(prisma, 'User', start, interval),
  ]);

  let running = before;
  return bucketKeys(start, interval).map((bucket) => {
    const found = rows.find((r) => r.bucket.slice(0, 10) === bucket);
    running += found ? Number(found.value) : 0;
    return { bucket, value: running };
  });
}
