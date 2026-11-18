import { Injectable } from '@nestjs/common';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';

const MAX_JSON_CHARS = 3_500_000; // Vercel answers up to about 4.5 MB

@Injectable()
export class UserDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async clearConversations(userId: string) {
    const { count } = await this.prisma.conversation.deleteMany({
      where: { userId },
    });
    return { deleted: count };
  }

  async clearAnalyses(userId: string) {
    const { count } = await this.prisma.analysis.deleteMany({
      where: { userId },
    });
    return { deleted: count };
  }

  async clearRecent(userId: string) {
    const { count } = await this.prisma.documentView.deleteMany({
      where: { userId },
    });
    return { deleted: count };
  }

  /** Everything the user created, as one JSON file. Very large histories are cut down. */
  async export(userId: string) {
    const [
      user,
      prefs,
      documents,
      shared,
      analyses,
      conversations,
      comments,
      generated,
      collections,
      tags,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      this.prisma.userPreference.findUnique({
        where: { userId },
        select: { data: true },
      }),
      this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: {
          id: true,
          originalName: true,
          fileType: true,
          fileSize: true,
          wordCount: true,
          source: true,
          currentVersion: true,
          createdAt: true,
          archivedAt: true,
          trashedAt: true,
          category: { select: { name: true } },
          tags: {
            where: { tag: { userId } },
            select: { tag: { select: { name: true } } },
          },
          collections: {
            where: { collection: { userId } },
            select: { collection: { select: { name: true } } },
          },
          favorites: { where: { userId }, select: { userId: true } },
        },
      }),
      this.prisma.document.findMany({
        where: this.access.sharedWithWhere(userId),
        take: 500,
        select: {
          id: true,
          originalName: true,
          user: { select: { name: true } },
        },
      }),
      this.prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 150,
        select: {
          id: true,
          createdAt: true,
          originalInstruction: true,
          detectedTasks: true,
          targetLanguage: true,
          result: true,
          document: { select: { originalName: true } },
        },
      }),
      this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          title: true,
          createdAt: true,
          document: { select: { originalName: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 100,
            select: { role: true, content: true, createdAt: true },
          },
        },
      }),
      this.prisma.comment.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 300,
        select: {
          content: true,
          createdAt: true,
          document: { select: { originalName: true } },
        },
      }),
      this.prisma.generatedDocument.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          title: true,
          docType: true,
          length: true,
          prompt: true,
          content: true,
          createdAt: true,
        },
      }),
      this.prisma.collection.findMany({
        where: { userId },
        select: {
          name: true,
          description: true,
          createdAt: true,
          _count: { select: { documents: true, members: true } },
        },
      }),
      this.prisma.tag.findMany({ where: { userId }, select: { name: true } }),
    ]);

    const base = {
      exportedAt: new Date().toISOString(),
      note: 'Document files are not included. The text and results below are your own data.',
      user,
      preferences: prefs?.data ?? null,
      documents: documents.map((d) => ({
        id: d.id,
        name: d.originalName,
        type: d.fileType,
        size: d.fileSize,
        words: d.wordCount,
        source: d.source,
        version: d.currentVersion,
        createdAt: d.createdAt,
        archived: d.archivedAt !== null,
        trashed: d.trashedAt !== null,
        category: d.category?.name ?? null,
        tags: d.tags.map((t) => t.tag.name),
        collections: d.collections.map((c) => c.collection.name),
        favorite: d.favorites.length > 0,
      })),
      sharedWithMe: shared.map((d) => ({
        id: d.id,
        name: d.originalName,
        owner: d.user.name,
      })),
      collections: collections.map((c) => ({
        name: c.name,
        description: c.description,
        createdAt: c.createdAt,
        documents: c._count.documents,
        members: c._count.members,
      })),
      tags: tags.map((t) => t.name),
      analyses: analyses.map((a) => ({
        id: a.id,
        createdAt: a.createdAt,
        document: a.document.originalName,
        instruction: a.originalInstruction,
        tasks: a.detectedTasks,
        language: a.targetLanguage,
        result: a.result,
      })),
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        document: c.document.originalName,
        messages: c.messages,
      })),
      comments: comments.map((c) => ({
        document: c.document.originalName,
        createdAt: c.createdAt,
        content: c.content,
      })),
      generatedDocuments: generated,
    };

    if (JSON.stringify(base).length <= MAX_JSON_CHARS)
      return { ...base, truncated: false };

    return {
      ...base,
      truncated: true,
      analyses: base.analyses.map((a) => ({ ...a, result: null })),
      conversations: base.conversations.map((c) => ({
        ...c,
        messages: c.messages.slice(0, 20),
      })),
      generatedDocuments: generated.map((g) => ({
        ...g,
        content: g.content.slice(0, 2000),
      })),
    };
  }
}
