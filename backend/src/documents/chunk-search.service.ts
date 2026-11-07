import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface FoundChunk {
  index: number;
  content: string;
}
export type SearchMode = 'fts' | 'like' | 'start';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'these',
  'those',
  'about',
  'into',
  'have',
  'has',
  'had',
  'can',
  'could',
  'would',
  'should',
  'will',
  'you',
  'your',
  'what',
  'who',
  'whom',
  'when',
  'where',
  'which',
  'why',
  'how',
  'does',
  'did',
  'are',
  'was',
  'were',
  'been',
  'being',
  'there',
  'their',
  'them',
  'they',
  'tell',
  'give',
  'please',
  'list',
  'show',
  'find',
  'explain',
  'summarize',
  'summary',
  'document',
  'mention',
  'mentioned',
  'say',
  'says',
  'said',
  'according',
  'any',
  'all',
  'some',
  'not',
  'but',
  'its',
  'than',
  'then',
]);

const BENGALI = /[\u0980-\u09FF]/;

export function extractTerms(query: string): string[] {
  const words = query.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  const terms = words.filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return [...new Set(terms)].slice(0, 12);
}

@Injectable()
export class ChunkSearchService {
  private readonly logger = new Logger(ChunkSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(
    documentId: string,
    query: string,
    limit = 5,
  ): Promise<{ mode: SearchMode; chunks: FoundChunk[] }> {
    const terms = extractTerms(query);

    if (terms.length > 0) {
      if (!BENGALI.test(query)) {
        const fts = await this.fullText(documentId, terms, limit);
        if (fts.length) return { mode: 'fts', chunks: fts };
      }
      const like = await this.likeSearch(documentId, terms, limit);
      if (like.length) return { mode: 'like', chunks: like };
    }

    const start = await this.prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { index: 'asc' },
      take: Math.min(limit, 4),
      select: { index: true, content: true },
    });
    return { mode: 'start', chunks: start };
  }

  private async fullText(
    documentId: string,
    terms: string[],
    limit: number,
  ): Promise<FoundChunk[]> {
    const tsQuery = terms.join(' | ');
    try {
      return await this.prisma.$queryRaw<FoundChunk[]>`
        SELECT c."index" AS "index", c."content" AS "content"
        FROM "DocumentChunk" c, to_tsquery('simple', ${tsQuery}) AS q(query)
        WHERE c."documentId" = ${documentId}
          AND to_tsvector('simple', c."content") @@ q.query
        ORDER BY ts_rank(to_tsvector('simple', c."content"), q.query) DESC,
                 c."index" ASC
        LIMIT ${limit}`;
    } catch (err) {
      this.logger.warn(`Full-text search failed, using ILIKE: ${String(err)}`);
      return [];
    }
  }

  private async likeSearch(
    documentId: string,
    terms: string[],
    limit: number,
  ): Promise<FoundChunk[]> {
    const conditions = Prisma.join(
      terms.map((t) => Prisma.sql`c."content" ILIKE ${`%${t}%`}`),
      ' OR ',
    );
    const rows = await this.prisma.$queryRaw<FoundChunk[]>(Prisma.sql`
      SELECT c."index" AS "index", c."content" AS "content"
      FROM "DocumentChunk" c
      WHERE c."documentId" = ${documentId} AND (${conditions})
      ORDER BY c."index" ASC
      LIMIT 300`);

    return rows
      .map((row) => {
        const lower = row.content.toLowerCase();
        return { row, score: terms.filter((t) => lower.includes(t)).length };
      })
      .sort((a, b) => b.score - a.score || a.row.index - b.row.index)
      .slice(0, limit)
      .map((s) => s.row);
  }
}
