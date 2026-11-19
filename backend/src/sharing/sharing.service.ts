import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessService } from '../access/access.service';
import { summarySelect, withUserData } from '../documents/document-select';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SharedListQuery } from './sharing.schemas';

const person = { id: true, name: true, email: true } as const;

const shareSelect = {
  id: true,
  role: true,
  createdAt: true,
  user: { select: person },
} as const;

const SORT_FIELDS = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'originalName',
  size: 'fileSize',
} as const;

@Injectable()
export class SharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async listShares(userId: string, documentId: string) {
    await this.access.require(userId, documentId, 'OWNER');
    const [doc, shares] = await Promise.all([
      this.prisma.document.findUnique({
        where: { id: documentId },
        select: { user: { select: person } },
      }),
      this.prisma.documentShare.findMany({
        where: { documentId },
        orderBy: { createdAt: 'asc' },
        select: shareSelect,
      }),
    ]);
    return { owner: doc?.user ?? null, shares };
  }

  /** Shares with a registered user. Sharing again with the same person changes their role. */
  async share(
    userId: string,
    documentId: string,
    email: string,
    role: 'VIEWER' | 'EDITOR',
  ) {
    await this.access.require(userId, documentId, 'OWNER');

    const target = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    // Same message for "no such account" and "yourself", so nothing is revealed.
    if (!target || target.id === userId)
      throw new BadRequestException('Email not valid');

    const share = await this.prisma.documentShare.upsert({
      where: { documentId_userId: { documentId, userId: target.id } },
      create: { documentId, userId: target.id, sharedById: userId, role },
      update: { role },
      select: shareSelect,
    });
    return { share };
  }

  async updateShare(
    userId: string,
    documentId: string,
    shareId: string,
    role: 'VIEWER' | 'EDITOR',
  ) {
    await this.access.require(userId, documentId, 'OWNER');
    const { count } = await this.prisma.documentShare.updateMany({
      where: { id: shareId, documentId },
      data: { role },
    });
    if (count === 0) throw new NotFoundException('Share not found');
    const share = await this.prisma.documentShare.findUnique({
      where: { id: shareId },
      select: shareSelect,
    });
    return { share };
  }

  /** The owner can remove anyone. The person who received the share can remove themselves ("leave"). */
  async removeShare(userId: string, documentId: string, shareId: string) {
    const share = await this.prisma.documentShare.findFirst({
      where: { id: shareId, documentId },
      select: { userId: true },
    });
    if (!share) throw new NotFoundException('Share not found');

    if (share.userId !== userId)
      await this.access.require(userId, documentId, 'OWNER');
    await this.prisma.documentShare.delete({ where: { id: shareId } });
    return { message: 'Access removed' };
  }

  /** "Shared with Me": documents other people shared with this user, directly or through a shared collection. */
  async listShared(userId: string, q: SharedListQuery) {
    const where: Prisma.DocumentWhereInput = {
      ...this.access.sharedWithWhere(userId),
      ...(q.type ? { fileType: q.type } : {}),
      ...(q.search
        ? { originalName: { contains: q.search, mode: 'insensitive' } }
        : {}),
    };
    const orderBy: Prisma.DocumentOrderByWithRelationInput[] = [
      {
        [SORT_FIELDS[q.sort]]: q.order,
      } as Prisma.DocumentOrderByWithRelationInput,
      { id: 'desc' },
    ];

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        select: {
          ...summarySelect(userId),
          user: { select: { id: true, name: true } },
          shares: { where: { userId }, select: { id: true } },
        },
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    const roles = await this.access.rolesFor(
      userId,
      rows.map((r) => r.id),
    );

    const items = rows.map((r) => {
      const { user, shares, ...doc } = withUserData(r);
      return {
        ...doc,
        owner: user,
        myRole: roles.get(r.id) ?? 'VIEWER',
        shareId: shares[0]?.id ?? null,
      };
    });

    return {
      items,
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }
}
