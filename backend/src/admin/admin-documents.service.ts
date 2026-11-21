import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ListAdminDocumentsQuery, RangeQueryDto } from './admin.schemas';
import { countByBucket, fillSeries, rangeStart } from './admin.utils';
import type { Prisma } from '../generated/prisma/client';

const PREVIEW_CHARS = 4000;

@Injectable()
export class AdminDocumentsService {
  private readonly logger = new Logger(AdminDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async list(q: ListAdminDocumentsQuery) {
    const where: Prisma.DocumentWhereInput = {
      ...(q.search
        ? {
            OR: [
              { originalName: { contains: q.search, mode: 'insensitive' } },
              { user: { email: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(q.type ? { fileType: q.type } : {}),
      ...(q.status ? { processingStatus: q.status } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true,
          originalName: true,
          fileType: true,
          fileSize: true,
          wordCount: true,
          source: true,
          processingStatus: true,
          currentVersion: true,
          createdAt: true,
          archivedAt: true,
          trashedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: rows,
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  async detail(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        originalName: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        wordCount: true,
        source: true,
        processingStatus: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        trashedAt: true,
        extractedText: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isBlocked: true,
            createdAt: true,
          },
        },
        _count: {
          select: { analyses: true, conversations: true, versions: true, shares: true },
        },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const [recentAnalyses, recentConversations] = await Promise.all([
      this.prisma.analysis.findMany({
        where: { documentId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          originalInstruction: true,
          detectedTasks: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.conversation.findMany({
        where: { documentId: id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          _count: { select: { messages: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const { extractedText, _count, ...rest } = doc;
    return {
      document: {
        ...rest,
        analysisCount: _count.analyses,
        conversationCount: _count.conversations,
        versionCount: _count.versions,
        shareCount: _count.shares,
        textLength: extractedText.length,
        textPreview: extractedText.slice(0, PREVIEW_CHARS),
      },
      recentAnalyses,
      recentConversations,
    };
  }

  async remove(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        publicId: true,
        versions: { select: { publicId: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const ids = [doc.publicId, ...doc.versions.map((v) => v.publicId)];
    const results = await Promise.allSettled(
      ids.map((publicId) => this.cloudinary.delete(publicId)),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) this.logger.warn(`Could not delete ${failed} file(s)`);

    await this.prisma.document.delete({ where: { id } });
    return { message: 'Document deleted' };
  }

  async analytics(q: RangeQueryDto) {
    const start = rangeStart(q.range);

    const [uploadRows, statusRows, totalDocuments, totalBytes, failures] =
      await Promise.all([
        countByBucket(this.prisma, 'Document', start, q.interval),
        this.prisma.document.groupBy({
          by: ['processingStatus'],
          _count: { _all: true },
        }),
        this.prisma.document.count(),
        this.prisma.document.aggregate({ _sum: { fileSize: true } }),
        this.prisma.failedProcessingLog.count({
          where: { createdAt: { gte: start } },
        }),
      ]);

    const statusMap = new Map(
      statusRows.map((r) => [r.processingStatus, r._count._all]),
    );

    return {
      range: q.range,
      interval: q.interval,
      uploadTrend: fillSeries(uploadRows, start, q.interval),
      statusDistribution: [
        {
          key: 'COMPLETED',
          label: 'Completed',
          value: statusMap.get('COMPLETED') ?? 0,
        },
        {
          key: 'PROCESSING',
          label: 'Processing',
          value: statusMap.get('PROCESSING') ?? 0,
        },
        {
          key: 'FAILED',
          label: 'Failed',
          // Uploads that failed before a document row existed are logged separately.
          value: (statusMap.get('FAILED') ?? 0) + failures,
        },
      ],
      stats: {
        totalDocuments,
        storageBytes: totalBytes._sum.fileSize ?? 0,
        failedProcessing: failures,
      },
    };
  }
}
