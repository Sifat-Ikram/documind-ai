import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type DocRole = 'VIEWER' | 'EDITOR' | 'OWNER';
const RANK: Record<DocRole, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };

const best = (roles: (DocRole | undefined | null)[]): DocRole | null =>
  roles.reduce<DocRole | null>(
    (acc, r) => (r && (!acc || RANK[r] > RANK[acc]) ? r : acc),
    null,
  );

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  accessibleWhere(userId: string): Prisma.DocumentWhereInput {
    return {
      trashedAt: null,
      OR: [
        { userId },
        { shares: { some: { userId } } },
        {
          collections: {
            some: { collection: { members: { some: { userId } } } },
          },
        },
      ],
    };
  }

  sharedWithWhere(userId: string): Prisma.DocumentWhereInput {
    return {
      trashedAt: null,
      userId: { not: userId },
      OR: [
        { shares: { some: { userId } } },
        {
          collections: {
            some: { collection: { members: { some: { userId } } } },
          },
        },
      ],
    };
  }

  async getRole(userId: string, documentId: string): Promise<DocRole | null> {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, trashedAt: null },
      select: { userId: true },
    });
    if (!doc) return null;
    if (doc.userId === userId) return 'OWNER';

    const [share, memberships] = await Promise.all([
      this.prisma.documentShare.findUnique({
        where: { documentId_userId: { documentId, userId } },
        select: { role: true },
      }),
      this.prisma.collectionMember.findMany({
        where: { userId, collection: { documents: { some: { documentId } } } },
        select: { role: true },
      }),
    ]);
    return best([share?.role, ...memberships.map((m) => m.role)]);
  }

  async require(
    userId: string,
    documentId: string,
    min: DocRole = 'VIEWER',
  ): Promise<DocRole> {
    const role = await this.getRole(userId, documentId);
    if (!role) throw new NotFoundException('Document not found');
    if (RANK[role] < RANK[min]) {
      throw new ForbiddenException('You do not have permission to do this');
    }
    return role;
  }

  async rolesFor(
    userId: string,
    documentIds: string[],
  ): Promise<Map<string, DocRole>> {
    const map = new Map<string, DocRole>();
    if (documentIds.length === 0) return map;

    const [shares, memberships] = await Promise.all([
      this.prisma.documentShare.findMany({
        where: { userId, documentId: { in: documentIds } },
        select: { documentId: true, role: true },
      }),
      this.prisma.collectionMember.findMany({
        where: {
          userId,
          collection: {
            documents: { some: { documentId: { in: documentIds } } },
          },
        },
        select: {
          role: true,
          collection: {
            select: {
              documents: {
                where: { documentId: { in: documentIds } },
                select: { documentId: true },
              },
            },
          },
        },
      }),
    ]);

    const add = (id: string, role: DocRole) => {
      const current = map.get(id);
      if (!current || RANK[role] > RANK[current]) map.set(id, role);
    };
    shares.forEach((s) => add(s.documentId, s.role));
    memberships.forEach((m) =>
      m.collection.documents.forEach((d) => add(d.documentId, m.role)),
    );
    return map;
  }
}
