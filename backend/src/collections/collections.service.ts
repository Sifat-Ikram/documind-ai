import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessService } from '../access/access.service';
import { summarySelect, withUserData } from '../documents/document-select';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AddDocumentsDto,
  CollectionDocsQuery,
  CreateCollectionDto,
  UpdateCollectionDto,
} from './collections.schemas';

const SORT_FIELDS = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'originalName',
  size: 'fileSize',
} as const;

const activeDocuments = {
  where: { document: { trashedAt: null, archivedAt: null } },
};

const collectionSelect = (userId: string) =>
  ({
    id: true,
    userId: true,
    name: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    owner: { select: { id: true, name: true } },
    members: { where: { userId }, select: { role: true } },
    _count: { select: { documents: activeDocuments, members: true } },
  }) as const;

interface Row {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  owner: { id: string; name: string };
  members: { role: 'VIEWER' | 'EDITOR' }[];
  _count: { documents: number; members: number };
}

function present(c: Row, userId: string) {
  const isOwner = c.userId === userId;
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    documentCount: c._count.documents,
    memberCount: c._count.members,
    isOwner,
    myRole: isOwner ? 'OWNER' : (c.members[0]?.role ?? 'VIEWER'),
    owner: c.owner,
  };
}

const isDuplicate = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(userId: string) {
    const rows = await this.prisma.collection.findMany({
      where: { OR: [{ userId }, { members: { some: { userId } } }] },
      select: collectionSelect(userId),
    });
    const items = rows.map((r) => present(r, userId));
    items.sort(
      (a, b) =>
        Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name),
    );
    return { items };
  }

  async get(userId: string, id: string) {
    const row = await this.prisma.collection.findFirst({
      where: { id, OR: [{ userId }, { members: { some: { userId } } }] },
      select: collectionSelect(userId),
    });
    if (!row) throw new NotFoundException('Collection not found');
    return { collection: present(row, userId) };
  }

  async create(userId: string, dto: CreateCollectionDto) {
    try {
      const row = await this.prisma.collection.create({
        data: { userId, name: dto.name, description: dto.description || null },
        select: collectionSelect(userId),
      });
      return { collection: present(row, userId) };
    } catch (err) {
      if (isDuplicate(err))
        throw new ConflictException(
          'You already have a collection with this name',
        );
      throw err;
    }
  }

  async update(userId: string, id: string, dto: UpdateCollectionDto) {
    await this.assertOwner(userId, id);
    try {
      const row = await this.prisma.collection.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description || null }
            : {}),
        },
        select: collectionSelect(userId),
      });
      return { collection: present(row, userId) };
    } catch (err) {
      if (isDuplicate(err))
        throw new ConflictException(
          'You already have a collection with this name',
        );
      throw err;
    }
  }

  async remove(userId: string, id: string) {
    const { count } = await this.prisma.collection.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException('Collection not found');
    return { message: 'Collection deleted' };
  }

  async addDocuments(userId: string, id: string, dto: AddDocumentsDto) {
    await this.assertOwner(userId, id);
    const hasMembers =
      (await this.prisma.collectionMember.count({
        where: { collectionId: id },
      })) > 0;

    const docs = await this.prisma.document.findMany({
      where: {
        id: { in: dto.documentIds },
        ...(hasMembers
          ? { userId, trashedAt: null }
          : this.access.accessibleWhere(userId)),
      },
      select: { id: true },
    });
    if (docs.length === 0) return { added: 0 };

    const result = await this.prisma.collectionDocument.createMany({
      data: docs.map((d) => ({ collectionId: id, documentId: d.id })),
      skipDuplicates: true,
    });
    return { added: result.count };
  }

  async removeDocument(userId: string, id: string, documentId: string) {
    await this.assertOwner(userId, id);
    await this.prisma.collectionDocument.deleteMany({
      where: { collectionId: id, documentId },
    });
    return { message: 'Removed from the collection' };
  }

  async listDocuments(userId: string, id: string, q: CollectionDocsQuery) {
    await this.get(userId, id); // owner or member, otherwise 404

    const where: Prisma.DocumentWhereInput = {
      AND: [
        this.access.accessibleWhere(userId),
        { collections: { some: { collectionId: id } } },
        ...(q.search
          ? [
              {
                originalName: {
                  contains: q.search,
                  mode: 'insensitive' as const,
                },
              },
            ]
          : []),
      ],
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
          userId: true,
          user: { select: { id: true, name: true } },
        },
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    const roles = await this.access.rolesFor(
      userId,
      rows.filter((r) => r.userId !== userId).map((r) => r.id),
    );
    const items = rows.map((r) => {
      const { user, userId: ownerId, ...doc } = withUserData(r);
      return {
        ...doc,
        owner: user,
        myRole: ownerId === userId ? 'OWNER' : (roles.get(r.id) ?? 'VIEWER'),
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

  async listMembers(userId: string, id: string) {
    await this.assertOwner(userId, id);
    const members = await this.prisma.collectionMember.findMany({
      where: { collectionId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return { members };
  }

  async addMember(
    userId: string,
    id: string,
    email: string,
    role: 'VIEWER' | 'EDITOR',
  ) {
    await this.assertOwner(userId, id);
    const target = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!target || target.id === userId)
      throw new BadRequestException('Email not valid');

    const foreign = await this.prisma.collectionDocument.count({
      where: { collectionId: id, document: { userId: { not: userId } } },
    });
    if (foreign > 0) {
      throw new BadRequestException(
        'Remove the documents you do not own from this collection before sharing it',
      );
    }

    const member = await this.prisma.collectionMember.upsert({
      where: { collectionId_userId: { collectionId: id, userId: target.id } },
      create: { collectionId: id, userId: target.id, role },
      update: { role },
      select: {
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return { member };
  }

  async updateMember(
    userId: string,
    id: string,
    memberId: string,
    role: 'VIEWER' | 'EDITOR',
  ) {
    await this.assertOwner(userId, id);
    const { count } = await this.prisma.collectionMember.updateMany({
      where: { collectionId: id, userId: memberId },
      data: { role },
    });
    if (count === 0) throw new NotFoundException('Member not found');
    return { message: 'Role updated' };
  }

  async removeMember(userId: string, id: string, memberId: string) {
    if (memberId !== userId) await this.assertOwner(userId, id);
    const { count } = await this.prisma.collectionMember.deleteMany({
      where: { collectionId: id, userId: memberId },
    });
    if (count === 0) throw new NotFoundException('Member not found');
    return { message: 'Access removed' };
  }

  private async assertOwner(userId: string, id: string): Promise<void> {
    const found = await this.prisma.collection.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Collection not found');
  }
}
