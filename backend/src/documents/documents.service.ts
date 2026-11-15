import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CLOUDINARY_ROOT_FOLDER } from '../cloudinary/cloudinary.constants';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChunkService } from './chunk.service';
import { summarySelect, withUserData } from './document-select';
import {
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
  resolveFileType,
} from './documents.constants';
import type {
  ConfirmUploadDto,
  ListDocumentsQuery,
  RenameDocumentDto,
  UploadSignatureDto,
} from './documents.schemas';
import { ParserService } from './parser.service';

const PREVIEW_CHARS = 5000;

const SORT_FIELDS = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'originalName',
  size: 'fileSize',
} as const;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly parser: ParserService,
    private readonly chunker: ChunkService,
  ) {}

  createUploadSignature(userId: string, dto: UploadSignatureDto) {
    const fileType = resolveFileType(dto.fileName);
    if (!fileType) {
      throw new BadRequestException(
        'Only PDF, DOCX and TXT files are supported (old .doc files are not).',
      );
    }
    if (dto.fileSize > MAX_FILE_BYTES) {
      throw new BadRequestException('File must be 5 MB or smaller');
    }
    return this.cloudinary.createUploadSignature(
      userId,
      fileType.toLowerCase(),
    );
  }

  async confirmUpload(userId: string, dto: ConfirmUploadDto) {
    const pattern = new RegExp(
      `^${CLOUDINARY_ROOT_FOLDER}/${userId}/[0-9a-f-]{36}\\.(pdf|docx|txt)$`,
    );
    if (!pattern.test(dto.publicId)) {
      throw new BadRequestException('Invalid upload reference');
    }
    const fileType = resolveFileType(dto.publicId);
    if (!fileType) throw new BadRequestException('Invalid upload reference');

    const already = await this.prisma.document.findFirst({
      where: { publicId: dto.publicId },
      select: { id: true },
    });
    if (already) throw new ConflictException('This upload is already saved');

    try {
      const buffer = await this.cloudinary.download(
        dto.publicId,
        MAX_FILE_BYTES,
      );
      this.parser.verifySignature(fileType, buffer);

      const text = this.parser.normalize(
        await this.parser.extractText(fileType, buffer),
      );
      if (text.length < 20) {
        throw new BadRequestException(
          'No readable text found. Scanned or image-only files are not supported.',
        );
      }

      const warnings: string[] = [];
      let stored = text;
      if (text.length > MAX_TEXT_CHARS) {
        stored = text.slice(0, MAX_TEXT_CHARS);
        warnings.push(
          `The document is very long, so only the first ${MAX_TEXT_CHARS.toLocaleString('en-US')} characters were saved.`,
        );
      }
      if (this.parser.looksGarbled(stored)) {
        warnings.push(
          'The extracted text looks corrupted. This can happen with old Bangla fonts or unusual encodings, and AI results may be poor.',
        );
      }

      const chunks = this.chunker.chunk(stored);
      const wordCount = stored.split(/\s+/).filter(Boolean).length;

      const document = await this.prisma.document.create({
        data: {
          userId,
          originalName: dto.originalName,
          fileUrl: this.cloudinary.buildUrl(dto.publicId),
          publicId: dto.publicId,
          fileType,
          fileSize: buffer.length,
          extractedText: stored,
          wordCount,
          chunks: {
            createMany: {
              data: chunks.map((content, index) => ({ index, content })),
            },
          },
        },
        select: summarySelect(userId),
      });

      await this.touch(userId, document.id);
      return { document: withUserData(document), warnings };
    } catch (err) {
      await this.cloudinary.delete(dto.publicId);
      throw err;
    }
  }

  async list(userId: string, q: ListDocumentsQuery) {
    const where: Prisma.DocumentWhereInput = {
      userId,
      trashedAt: null,
      archivedAt: q.status === 'archived' ? { not: null } : null,
      ...(q.type ? { fileType: q.type } : {}),
      ...(q.search
        ? { originalName: { contains: q.search, mode: 'insensitive' } }
        : {}),
      ...(q.favorite ? { favorites: { some: { userId } } } : {}),
      ...(q.category === 'none'
        ? { categoryId: null }
        : q.category
          ? { category: { slug: q.category } }
          : {}),
      ...(q.collectionId
        ? {
            collections: {
              some: { collectionId: q.collectionId, collection: { userId } },
            },
          }
        : {}),
      ...(q.tagId
        ? { tags: { some: { tagId: q.tagId, tag: { userId } } } }
        : {}),
    };

    const orderBy: Prisma.DocumentOrderByWithRelationInput[] = [
      {
        [SORT_FIELDS[q.sort]]: q.order,
      } as Prisma.DocumentOrderByWithRelationInput,
      { id: 'desc' },
    ];

    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        select: summarySelect(userId),
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: items.map(withUserData),
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  async listRecent(userId: string, limit: number) {
    const rows = await this.prisma.documentView.findMany({
      where: {
        userId,
        document: { userId, trashedAt: null, archivedAt: null },
      },
      orderBy: { lastAccessedAt: 'desc' },
      take: limit,
      select: {
        lastAccessedAt: true,
        document: { select: summarySelect(userId) },
      },
    });
    return {
      items: rows.map((r) => ({
        ...withUserData(r.document),
        lastAccessedAt: r.lastAccessedAt,
      })),
    };
  }

  async getDetail(userId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId, trashedAt: null },
      select: {
        ...summarySelect(userId),
        fileUrl: true,
        extractedText: true,
        _count: { select: { analyses: true, conversations: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.touch(userId, id);
    const { extractedText, ...rest } = withUserData(doc);
    return {
      ...rest,
      textPreview: extractedText.slice(0, PREVIEW_CHARS),
      textLength: extractedText.length,
      previewTruncated: extractedText.length > PREVIEW_CHARS,
    };
  }

  /** Ownership check + full text. Used by analysis and chat. */
  async getForAnalysis(userId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId, trashedAt: null },
      select: { id: true, originalName: true, extractedText: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    await this.touch(userId, id);
    return doc;
  }

  async rename(userId: string, id: string, dto: RenameDocumentDto) {
    await this.assertOwned(userId, id);
    const document = await this.prisma.document.update({
      where: { id },
      data: { originalName: dto.name },
      select: summarySelect(userId),
    });
    return withUserData(document);
  }

  async setArchived(userId: string, id: string, archived: boolean) {
    await this.assertOwned(userId, id);
    const document = await this.prisma.document.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
      select: summarySelect(userId),
    });
    return withUserData(document);
  }

  async setFavorite(userId: string, id: string, favorite: boolean) {
    await this.assertOwned(userId, id);
    if (favorite) {
      await this.prisma.favorite.upsert({
        where: { userId_documentId: { userId, documentId: id } },
        create: { userId, documentId: id },
        update: {},
      });
    } else {
      await this.prisma.favorite.deleteMany({
        where: { userId, documentId: id },
      });
    }
    return { isFavorite: favorite };
  }

  async getDownload(userId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId, trashedAt: null },
      select: { originalName: true, fileUrl: true, fileType: true },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const ext = doc.fileType.toLowerCase();
    const fileName = doc.originalName.toLowerCase().endsWith(`.${ext}`)
      ? doc.originalName
      : `${doc.originalName}.${ext}`;
    return { url: doc.fileUrl, fileName };
  }

  /** Remembers that the user opened this document (it feeds the "Recent" list). */
  async touch(userId: string, documentId: string): Promise<void> {
    try {
      await this.prisma.documentView.upsert({
        where: { userId_documentId: { userId, documentId } },
        create: { userId, documentId },
        update: { lastAccessedAt: new Date() },
      });
    } catch (err) {
      this.logger.warn(`Could not record access: ${String(err)}`);
    }
  }

  /** Only the owner, and only for documents that are not in the trash. */
  async assertOwned(userId: string, id: string): Promise<void> {
    const exists = await this.prisma.document.findFirst({
      where: { id, userId, trashedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Document not found');
  }
}
