import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';
import { TrashService } from '../trash/trash.service';
import type { BulkDto } from './bulk.schemas';

@Injectable()
export class BulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trash: TrashService,
    private readonly tags: TagsService,
  ) {}

  async run(userId: string, dto: BulkDto) {
    const requested = new Set(dto.documentIds).size;

    const docs = await this.prisma.document.findMany({
      where: { id: { in: dto.documentIds }, userId, trashedAt: null },
      select: {
        id: true,
        originalName: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
      },
    });
    if (docs.length === 0)
      throw new NotFoundException('No matching documents found');
    const ids = docs.map((d) => d.id);

    const summary = (processed: number) => ({
      action: dto.action,
      requested,
      processed,
      skipped: requested - processed,
    });

    switch (dto.action) {
      case 'trash': {
        const { count } = await this.trash.moveMany(userId, ids);
        return summary(count);
      }

      case 'archive':
      case 'unarchive': {
        await this.prisma.document.updateMany({
          where: { id: { in: ids } },
          data: { archivedAt: dto.action === 'archive' ? new Date() : null },
        });
        return summary(ids.length);
      }

      case 'favorite': {
        await this.prisma.favorite.createMany({
          data: ids.map((documentId) => ({ userId, documentId })),
          skipDuplicates: true,
        });
        return summary(ids.length);
      }

      case 'unfavorite': {
        await this.prisma.favorite.deleteMany({
          where: { userId, documentId: { in: ids } },
        });
        return summary(ids.length);
      }

      case 'move': {
        const wanted = [dto.collectionId, dto.fromCollectionId].filter(
          (v): v is string => Boolean(v),
        );
        if (wanted.length === 0) {
          throw new BadRequestException(
            'Give a target collection or the collection to remove from',
          );
        }
        const owned = await this.prisma.collection.findMany({
          where: { id: { in: wanted }, userId },
          select: { id: true },
        });
        if (owned.length !== new Set(wanted).size)
          throw new NotFoundException('Collection not found');

        if (dto.collectionId) {
          await this.prisma.collectionDocument.createMany({
            data: ids.map((documentId) => ({
              collectionId: dto.collectionId as string,
              documentId,
            })),
            skipDuplicates: true,
          });
        }
        if (dto.fromCollectionId && dto.fromCollectionId !== dto.collectionId) {
          await this.prisma.collectionDocument.deleteMany({
            where: {
              collectionId: dto.fromCollectionId,
              documentId: { in: ids },
            },
          });
        }
        return summary(ids.length);
      }

      case 'add_tags': {
        const tags = await this.tags.ensure(userId, dto.tagNames);
        await this.prisma.documentTag.createMany({
          data: ids.flatMap((documentId) =>
            tags.map((t) => ({ documentId, tagId: t.id })),
          ),
          skipDuplicates: true,
        });
        return summary(ids.length);
      }

      case 'remove_tags': {
        await this.prisma.documentTag.deleteMany({
          where: {
            documentId: { in: ids },
            tagId: { in: dto.tagIds },
            tag: { userId },
          },
        });
        return summary(ids.length);
      }

      case 'set_category': {
        if (dto.categoryId) {
          const exists = await this.prisma.category.findUnique({
            where: { id: dto.categoryId },
            select: { id: true },
          });
          if (!exists) throw new NotFoundException('Category not found');
        }
        await this.prisma.document.updateMany({
          where: { id: { in: ids } },
          data: { categoryId: dto.categoryId },
        });
        return summary(ids.length);
      }

      case 'download': {
        const files = docs.map((d) => {
          const ext = d.fileType.toLowerCase();
          const fileName = d.originalName.toLowerCase().endsWith(`.${ext}`)
            ? d.originalName
            : `${d.originalName}.${ext}`;
          return { id: d.id, fileName, url: d.fileUrl, fileSize: d.fileSize };
        });
        return { ...summary(files.length), files };
      }
    }
  }
}
