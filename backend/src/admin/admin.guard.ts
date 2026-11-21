import { ForbiddenException, Injectable } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Server-side admin check. The role is read from the database on every admin
 * request, so a role change or a block takes effect immediately.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) throw new ForbiddenException('Admin access required');

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, isBlocked: true },
    });

    if (!user || user.isBlocked) {
      throw new ForbiddenException('This account cannot access the admin panel');
    }
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
