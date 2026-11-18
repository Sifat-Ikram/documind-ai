import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string) {
    const [
      documents,
      analyses,
      conversations,
      storage,
      archived,
      trashed,
      recentDocuments,
      recentAnalyses,
      recentConversations,
    ] = await this.prisma.$transaction([
      this.prisma.document.count({
        where: { userId, trashedAt: null, archivedAt: null },
      }),
      this.prisma.analysis.count({
        where: { userId, document: { trashedAt: null } },
      }),
      this.prisma.conversation.count({
        where: { userId, document: { trashedAt: null } },
      }),
      this.prisma.document.aggregate({
        where: { userId, trashedAt: null },
        _sum: { fileSize: true },
      }),
      this.prisma.document.count({
        where: { userId, trashedAt: null, archivedAt: { not: null } },
      }),
      this.prisma.document.count({
        where: { userId, trashedAt: { not: null } },
      }),
      this.prisma.document.findMany({
        where: { userId, trashedAt: null, archivedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          originalName: true,
          fileType: true,
          fileSize: true,
          wordCount: true,
          createdAt: true,
        },
      }),
      this.prisma.analysis.findMany({
        where: { userId, document: { trashedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          documentId: true,
          originalInstruction: true,
          detectedTasks: true,
          createdAt: true,
          document: { select: { originalName: true } },
        },
      }),
      this.prisma.conversation.findMany({
        where: { userId, document: { trashedAt: null } },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          documentId: true,
          title: true,
          updatedAt: true,
          document: { select: { originalName: true } },
        },
      }),
    ]);

    const grouped = await this.prisma.document.groupBy({
      by: ['categoryId'],
      where: { userId, trashedAt: null, archivedAt: null },
      _count: { _all: true },
    });
    const categories = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true, name: true, icon: true },
    });
    const counts = new Map<string | null, number>(
      grouped.map((g) => [g.categoryId, g._count._all]),
    );
    const byCategory = [
      ...categories
        .map((c) => ({
          slug: c.slug as string,
          name: c.name,
          icon: c.icon as string | null,
          count: counts.get(c.id) ?? 0,
        }))
        .filter((c) => c.count > 0),
      ...((counts.get(null) ?? 0) > 0
        ? [
            {
              slug: 'none',
              name: 'Uncategorized',
              icon: null as string | null,
              count: counts.get(null) ?? 0,
            },
          ]
        : []),
    ];

    const recentActivity = [
      ...recentAnalyses.map((a) => ({
        type: 'analysis' as const,
        id: a.id,
        documentId: a.documentId,
        documentName: a.document.originalName,
        title: a.originalInstruction,
        tasks: a.detectedTasks as string[],
        at: a.createdAt,
      })),
      ...recentConversations.map((c) => ({
        type: 'chat' as const,
        id: c.id,
        documentId: c.documentId,
        documentName: c.document.originalName,
        title: c.title,
        tasks: [] as string[],
        at: c.updatedAt,
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 8);

    return {
      stats: {
        documents,
        analyses,
        conversations,
        storageBytes: storage._sum.fileSize ?? 0,
        archived,
        trashed,
      },
      recentDocuments,
      recentActivity,
      byCategory
    };
  }
}
