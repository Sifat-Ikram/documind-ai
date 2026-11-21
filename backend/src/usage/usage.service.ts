import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AiFeatureName = 'WRITER' | 'ANALYSIS' | 'CHAT' | 'SEARCH';

export interface AiUsageEntry {
  userId?: string | null;
  feature: AiFeatureName;
  model?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  success?: boolean;
  error?: string | null;
}

export interface RequestLogEntry {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userId?: string | null;
}

/**
 * Writes the analytics rows the admin panel reads. Every write is best effort:
 * tracking must never break the feature that produced it.
 */
@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordAiUsage(entry: AiUsageEntry): Promise<void> {
    try {
      await this.prisma.aiUsage.create({
        data: {
          userId: entry.userId ?? null,
          feature: entry.feature,
          model: entry.model ?? null,
          promptTokens: entry.promptTokens ?? 0,
          completionTokens: entry.completionTokens ?? 0,
          totalTokens: entry.totalTokens ?? 0,
          latencyMs: entry.latencyMs ?? 0,
          success: entry.success ?? true,
          error: entry.error ? entry.error.slice(0, 500) : null,
        },
      });
      if (entry.userId) {
        await this.prisma.user.update({
          where: { id: entry.userId },
          data: { lastActiveAt: new Date() },
        });
      }
    } catch (err) {
      this.logger.warn(`Could not record AI usage: ${String(err)}`);
    }
  }

  async recordRequest(entry: RequestLogEntry): Promise<void> {
    try {
      await this.prisma.apiRequestLog.create({
        data: {
          method: entry.method.slice(0, 10),
          path: entry.path.slice(0, 300),
          status: entry.status,
          durationMs: Math.max(0, Math.round(entry.durationMs)),
          userId: entry.userId ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(`Could not record API request: ${String(err)}`);
    }
  }
}
