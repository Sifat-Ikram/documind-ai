import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AddDocumentsDto,
  CreateCollectionDto,
  UpdateCollectionDto,
} from './collections.schemas';

const activeDocuments = {
  where: { document: { trashedAt: null, archivedAt: null } },
};

const collectionSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { documents: activeDocuments } },
} as const;

function present(c: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { documents: number };
}) {
  const { _count, ...rest } = c;
  return { ...rest, documentCount: _count.documents, isOwner: true };
}

function isDuplicate(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.collection.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: collectionSelect,
    });
    return { items: rows.map(present) };
  }

  async get(userId: string, id: string) {
    const row = await this.prisma.collection.findFirst({
      where: { id, userId },
      select: collectionSelect,
    });
    if (!row) throw new NotFoundException('Collection not found');
    return { collection: present(row) };
  }

  async create(userId: string, dto: CreateCollectionDto) {
    try {
      const row = await this.prisma.collection.create({
        data: { userId, name: dto.name, description: dto.description || null },
        select: collectionSelect,
      });
      return { collection: present(row) };
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
        select: collectionSelect,
      });
      return { collection: present(row) };
    } catch (err) {
      if (isDuplicate(err))
        throw new ConflictException(
          'You already have a collection with this name',
        );
      throw err;
    }
  }

  /** Deleting a collection never deletes its documents. */
  async remove(userId: string, id: string) {
    const { count } = await this.prisma.collection.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException('Collection not found');
    return { message: 'Collection deleted' };
  }

  async addDocuments(userId: string, id: string, dto: AddDocumentsDto) {
    await this.assertOwner(userId, id);
    const docs = await this.prisma.document.findMany({
      where: { id: { in: dto.documentIds }, userId, trashedAt: null },
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

  private async assertOwner(userId: string, id: string): Promise<void> {
    const found = await this.prisma.collection.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Collection not found');
  }
}
