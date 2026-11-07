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
      recentDocuments,
      recentAnalyses,
      recentConversations,
    ] = await this.prisma.$transaction([
      this.prisma.document.count({ where: { userId } }),
      this.prisma.analysis.count({ where: { userId } }),
      this.prisma.conversation.count({ where: { userId } }),
      this.prisma.document.aggregate({
        where: { userId },
        _sum: { fileSize: true },
      }),
      this.prisma.document.findMany({
        where: { userId },
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
        where: { userId },
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
        where: { userId },
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
      },
      recentDocuments,
      recentActivity,
    };
  }
}
