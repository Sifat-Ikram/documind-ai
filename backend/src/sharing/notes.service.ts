import { ConflictException, Injectable } from '@nestjs/common';
import { AccessService } from '../access/access.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  private async read(documentId: string) {
    const note = await this.prisma.documentNote.findUnique({
      where: { documentId },
      select: {
        content: true,
        revision: true,
        updatedAt: true,
        updatedBy: { select: { id: true, name: true } },
      },
    });
    return (
      note ?? { content: '', revision: 0, updatedAt: null, updatedBy: null }
    );
  }

  async get(userId: string, documentId: string) {
    await this.access.require(userId, documentId);
    return { note: await this.read(documentId) };
  }

  async save(
    userId: string,
    documentId: string,
    content: string,
    revision: number,
  ) {
    await this.access.require(userId, documentId, 'EDITOR');

    const conflict = async () =>
      new ConflictException({
        message:
          'The note was changed by someone else. Reload to see the latest version.',
        current: await this.read(documentId),
      });

    if (revision === 0) {
      try {
        await this.prisma.documentNote.create({
          data: { documentId, content, revision: 1, updatedById: userId },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw await conflict();
        }
        throw err;
      }
    } else {
      const { count } = await this.prisma.documentNote.updateMany({
        where: { documentId, revision },
        data: { content, revision: { increment: 1 }, updatedById: userId },
      });
      if (count === 0) throw await conflict();
    }
    return { note: await this.read(documentId) };
  }
}
