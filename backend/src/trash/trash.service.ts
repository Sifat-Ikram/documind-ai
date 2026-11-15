import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
export const TRASH_DAYS = 30;

@Injectable()
export class TrashService {
  private readonly logger = new Logger(TrashService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** The document stays in its table (all relations intact). A TrashItem row records who and when. */
  async moveMany(
    userId: string,
    ids: string[],
  ): Promise<{ count: number; purgeAt: Date }> {
    const now = new Date();
    const purgeAt = new Date(now.getTime() + TRASH_DAYS * DAY_MS);

    const docs = await this.prisma.document.findMany({
      where: { id: { in: ids }, userId, trashedAt: null },
      select: { id: true },
    });
    const valid = docs.map((d) => d.id);
    if (valid.length === 0) return { count: 0, purgeAt };

    await this.prisma.$transaction([
      this.prisma.document.updateMany({
        where: { id: { in: valid } },
        data: { trashedAt: now },
      }),
      this.prisma.trashItem.deleteMany({
        where: { documentId: { in: valid } },
      }),
      this.prisma.trashItem.createMany({
        data: valid.map((documentId) => ({
          documentId,
          trashedById: userId,
          trashedAt: now,
          purgeAt,
        })),
      }),
    ]);
    return { count: valid.length, purgeAt };
  }

  async moveToTrash(userId: string, documentId: string) {
    const { count, purgeAt } = await this.moveMany(userId, [documentId]);
    if (count === 0) throw new NotFoundException('Document not found');
    return { message: 'Moved to trash', purgeAt };
  }

  async list(userId: string) {
    // Anything past its 30 days is removed first, even if the daily cron has not run yet.
    try {
      await this.purgeExpired(userId);
    } catch (err) {
      this.logger.warn(`Lazy purge failed: ${String(err)}`);
    }

    const rows = await this.prisma.trashItem.findMany({
      where: {
        trashedById: userId,
        document: { userId, trashedAt: { not: null } },
      },
      orderBy: { trashedAt: 'desc' },
      select: {
        trashedAt: true,
        purgeAt: true,
        document: {
          select: {
            id: true,
            originalName: true,
            fileType: true,
            fileSize: true,
            wordCount: true,
            currentVersion: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      items: rows.map((r) => ({
        ...r.document,
        trashedAt: r.trashedAt,
        purgeAt: r.purgeAt,
        daysLeft: Math.max(
          0,
          Math.ceil((r.purgeAt.getTime() - Date.now()) / DAY_MS),
        ),
      })),
    };
  }

  async restore(userId: string, documentId: string) {
    const item = await this.prisma.trashItem.findFirst({
      where: {
        documentId,
        trashedById: userId,
        document: { userId, trashedAt: { not: null } },
      },
      select: { documentId: true },
    });
    if (!item) throw new NotFoundException('Document not found in the trash');

    await this.prisma.$transaction([
      this.prisma.document.update({
        where: { id: documentId },
        data: { trashedAt: null },
      }),
      this.prisma.trashItem.delete({ where: { documentId } }),
    ]);
    return { message: 'Document restored' };
  }

  /** Only documents that are already in the trash can be deleted permanently. */
  async deletePermanently(userId: string, documentId: string) {
    const item = await this.prisma.trashItem.findFirst({
      where: {
        documentId,
        trashedById: userId,
        document: { userId, trashedAt: { not: null } },
      },
      select: { documentId: true },
    });
    if (!item) throw new NotFoundException('Document not found in the trash');
    await this.destroyDocument(documentId);
    return { message: 'Deleted permanently' };
  }

  async empty(userId: string) {
    const items = await this.prisma.trashItem.findMany({
      where: { trashedById: userId, document: { userId } },
      select: { documentId: true },
    });
    for (const { documentId } of items) await this.destroyDocument(documentId);
    return { message: 'Trash emptied', deleted: items.length };
  }

  /** Deletes everything whose 30 days are over. Used by the daily cron job. */
  async purgeExpired(userId?: string): Promise<number> {
    const due = await this.prisma.trashItem.findMany({
      where: {
        purgeAt: { lte: new Date() },
        ...(userId ? { trashedById: userId } : {}),
      },
      select: { documentId: true },
      take: 100,
    });
    for (const { documentId } of due) {
      try {
        await this.destroyDocument(documentId);
      } catch (err) {
        this.logger.error(`Could not purge ${documentId}: ${String(err)}`);
      }
    }
    return due.length;
  }

  /** Removes the database rows (everything cascades) and every stored file (current and old versions). */
  private async destroyDocument(documentId: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { publicId: true, versions: { select: { publicId: true } } },
    });
    if (!doc) return;

    await this.prisma.document.delete({ where: { id: documentId } });

    const publicIds = new Set([
      doc.publicId,
      ...doc.versions.map((v) => v.publicId),
    ]);
    for (const publicId of publicIds) await this.cloudinary.delete(publicId);
  }
}
