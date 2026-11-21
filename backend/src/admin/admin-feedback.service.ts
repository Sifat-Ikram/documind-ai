import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ListContactQuery,
  ListFeedbackQuery,
  UpdateFeedbackStatusDto,
} from './admin.schemas';
import type { Prisma } from '../generated/prisma/client';

@Injectable()
export class AdminFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListFeedbackQuery) {
    const where: Prisma.FeedbackWhereInput = {
      ...(q.type ? { type: q.type } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.search
        ? {
            OR: [
              { subject: { contains: q.search, mode: 'insensitive' } },
              { message: { contains: q.search, mode: 'insensitive' } },
              { user: { email: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true,
          type: true,
          subject: true,
          message: true,
          rating: true,
          status: true,
          createdAt: true,
          handledAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      items,
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  async stats() {
    const [total, byStatus, byType, contactTotal, contactPending] =
      await Promise.all([
        this.prisma.feedback.count(),
        this.prisma.feedback.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.feedback.groupBy({ by: ['type'], _count: { _all: true } }),
        this.prisma.contactMessage.count(),
        this.prisma.contactMessage.count({ where: { readAt: null } }),
      ]);

    const status = new Map(byStatus.map((r) => [r.status, r._count._all]));
    const type = new Map(byType.map((r) => [r.type, r._count._all]));

    return {
      stats: {
        totalFeedback: total,
        pendingFeedback:
          (status.get('OPEN') ?? 0) + (status.get('IN_REVIEW') ?? 0),
        bugReports: type.get('BUG_REPORT') ?? 0,
        contactMessages: contactTotal,
        pendingMessages: contactPending,
      },
      statusDistribution: [
        { key: 'OPEN', label: 'Open', value: status.get('OPEN') ?? 0 },
        { key: 'IN_REVIEW', label: 'In review', value: status.get('IN_REVIEW') ?? 0 },
        { key: 'RESOLVED', label: 'Resolved', value: status.get('RESOLVED') ?? 0 },
      ],
    };
  }

  async updateStatus(id: string, dto: UpdateFeedbackStatusDto) {
    const exists = await this.prisma.feedback.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Feedback not found');

    return this.prisma.feedback.update({
      where: { id },
      data: {
        status: dto.status,
        handledAt: dto.status === 'RESOLVED' ? new Date() : null,
      },
      select: { id: true, status: true, handledAt: true },
    });
  }

  async remove(id: string) {
    const { count } = await this.prisma.feedback.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException('Feedback not found');
    return { message: 'Feedback deleted' };
  }

  async contactMessages(q: ListContactQuery) {
    const where: Prisma.ContactMessageWhereInput = {
      ...(q.state === 'pending'
        ? { readAt: null }
        : q.state === 'read'
          ? { readAt: { not: null } }
          : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { email: { contains: q.search, mode: 'insensitive' } },
              { subject: { contains: q.search, mode: 'insensitive' } },
              { message: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return {
      items,
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  async markContactRead(id: string, read: boolean) {
    const exists = await this.prisma.contactMessage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Message not found');

    return this.prisma.contactMessage.update({
      where: { id },
      data: { readAt: read ? new Date() : null },
      select: { id: true, readAt: true },
    });
  }

  async removeContact(id: string) {
    const { count } = await this.prisma.contactMessage.deleteMany({
      where: { id },
    });
    if (count === 0) throw new NotFoundException('Message not found');
    return { message: 'Message deleted' };
  }
}
