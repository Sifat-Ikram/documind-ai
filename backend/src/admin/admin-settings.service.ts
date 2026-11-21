import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
  ) {}

  profile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  }

  listAdmins() {
    return this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  }

  /** Promotes an existing account by email. Never creates a user. */
  async promote(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, role: true, isBlocked: true },
    });
    if (!user) throw new NotFoundException('No account uses this email address');
    if (user.isBlocked) {
      throw new BadRequestException('Unblock this account before making it an admin');
    }
    if (user.role === 'ADMIN') {
      throw new ConflictException('This account is already an admin');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    });
    return { id: user.id, email: user.email, role: 'ADMIN' as const };
  }

  async demote(actorId: string, id: string) {
    if (id === actorId) {
      throw new BadRequestException('You cannot remove your own Admin role');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'ADMIN') {
      throw new BadRequestException('This account is not an admin');
    }

    const remaining = await this.prisma.user.count({
      where: { role: 'ADMIN', id: { not: id } },
    });
    if (remaining === 0) {
      throw new BadRequestException('At least one admin must remain');
    }

    await this.prisma.user.update({ where: { id }, data: { role: 'USER' } });
    await this.sessions.revokeAllForUser(id);
    return { id, role: 'USER' as const };
  }
}
