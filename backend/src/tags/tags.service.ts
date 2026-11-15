import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
  ) {}

  async list(userId: string) {
    const tags = await this.prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: {
          select: { documents: { where: { document: { trashedAt: null } } } },
        },
      },
    });
    return {
      items: tags.map((t) => ({
        id: t.id,
        name: t.name,
        documentCount: t._count.documents,
      })),
    };
  }

  /** Finds or creates tags by name. Names are matched without regard to upper/lower case. */
  async ensure(userId: string, names: string[]) {
    const unique: string[] = [];
    for (const name of names) {
      if (!unique.some((u) => u.toLowerCase() === name.toLowerCase()))
        unique.push(name);
    }
    if (unique.length === 0) return [];

    const find = () =>
      this.prisma.tag.findMany({
        where: {
          userId,
          OR: unique.map((name) => ({
            name: { equals: name, mode: 'insensitive' as const },
          })),
        },
      });

    let found = await find();
    const missing = unique.filter(
      (n) => !found.some((t) => t.name.toLowerCase() === n.toLowerCase()),
    );
    if (missing.length > 0) {
      await this.prisma.tag.createMany({
        data: missing.map((name) => ({ userId, name })),
        skipDuplicates: true,
      });
      found = await find();
    }

    return unique
      .map((n) => found.find((t) => t.name.toLowerCase() === n.toLowerCase()))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }

  async create(userId: string, name: string) {
    const [tag] = await this.ensure(userId, [name]);
    return { tag: { id: tag.id, name: tag.name } };
  }

  async rename(userId: string, id: string, name: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!tag) throw new NotFoundException('Tag not found');

    const clash = await this.prisma.tag.findFirst({
      where: {
        userId,
        id: { not: id },
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (clash)
      throw new ConflictException('You already have a tag with this name');

    const updated = await this.prisma.tag.update({
      where: { id },
      data: { name },
      select: { id: true, name: true },
    });
    return { tag: updated };
  }

  async remove(userId: string, id: string) {
    const { count } = await this.prisma.tag.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException('Tag not found');
    return { message: 'Tag deleted' };
  }

  /** Replaces the current user's tags on a document with exactly this list. */
  async setForDocument(userId: string, documentId: string, names: string[]) {
    await this.documents.assertOwned(userId, documentId);
    const tags = await this.ensure(userId, names);

    await this.prisma.$transaction([
      this.prisma.documentTag.deleteMany({
        where: { documentId, tag: { userId } },
      }),
      this.prisma.documentTag.createMany({
        data: tags.map((t) => ({ documentId, tagId: t.id })),
        skipDuplicates: true,
      }),
    ]);
    return { tags: tags.map((t) => ({ id: t.id, name: t.name })) };
  }
}
