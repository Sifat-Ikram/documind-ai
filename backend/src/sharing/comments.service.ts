import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';

const commentSelect = {
  id: true,
  documentId: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true } },
} as const;

type CommentRow = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  private present(c: CommentRow, userId: string, isOwner: boolean) {
    return {
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      edited: c.updatedAt.getTime() - c.createdAt.getTime() > 1000,
      author: c.author,
      canEdit: c.author.id === userId,
      canDelete: c.author.id === userId || isOwner,
    };
  }

  async list(userId: string, documentId: string) {
    const role = await this.access.require(userId, documentId);
    const rows = await this.prisma.comment.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: commentSelect,
    });
    return {
      items: rows.map((c) => this.present(c, userId, role === 'OWNER')),
    };
  }

  async create(userId: string, documentId: string, content: string) {
    const role = await this.access.require(userId, documentId);
    const row = await this.prisma.comment.create({
      data: { documentId, authorId: userId, content },
      select: commentSelect,
    });
    return { comment: this.present(row, userId, role === 'OWNER') };
  }

  async update(userId: string, commentId: string, content: string) {
    const found = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, documentId: true },
    });
    if (!found) throw new NotFoundException('Comment not found');
    const role = await this.access.require(userId, found.documentId);
    if (found.authorId !== userId)
      throw new ForbiddenException('You can only edit your own comments');

    const row = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
      select: commentSelect,
    });
    return { comment: this.present(row, userId, role === 'OWNER') };
  }

  async remove(userId: string, commentId: string) {
    const found = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, documentId: true },
    });
    if (!found) throw new NotFoundException('Comment not found');
    const role = await this.access.require(userId, found.documentId);
    if (found.authorId !== userId && role !== 'OWNER') {
      throw new ForbiddenException('You cannot delete this comment');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted' };
  }
}
