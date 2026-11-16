import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { userFolder } from '../cloudinary/cloudinary.constants';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ChunkService } from '../documents/chunk.service';
import { summarySelect, withUserData } from '../documents/document-select';
import { DocumentsService } from '../documents/documents.service';
import {
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
} from '../documents/documents.constants';
import { ParserService } from '../documents/parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { blocksToDocx } from '../versions/docx-builder';
import { blocksToText } from '../versions/html-model';
import { markdownToBlocks } from './export.service';
import { TYPE_CATEGORY, type DocType } from './generator.constants';
import type {
  HistoryQuery,
  SaveHistoryDto,
  UpdateHistoryDto,
} from './generator.schemas';

const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean).length;

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly parser: ParserService,
    private readonly chunker: ChunkService,
    private readonly documents: DocumentsService,
  ) {}

  async list(userId: string, q: HistoryQuery) {
    const where = { userId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.generatedDocument.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true,
          title: true,
          docType: true,
          length: true,
          createdAt: true,
          updatedAt: true,
          savedDocumentId: true,
          content: true,
        },
      }),
      this.prisma.generatedDocument.count({ where }),
    ]);

    return {
      items: rows.map(({ content, ...r }) => ({
        ...r,
        preview: content.replace(/\s+/g, ' ').slice(0, 200),
        words: wordsOf(content),
      })),
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  async get(userId: string, id: string) {
    const item = await this.prisma.generatedDocument.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        docType: true,
        length: true,
        language: true,
        prompt: true,
        content: true,
        savedDocumentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!item) throw new NotFoundException('Generated document not found');
    return { item };
  }

  async update(userId: string, id: string, dto: UpdateHistoryDto) {
    const { count } = await this.prisma.generatedDocument.updateMany({
      where: { id, userId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
    });
    if (count === 0)
      throw new NotFoundException('Generated document not found');
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    const { count } = await this.prisma.generatedDocument.deleteMany({
      where: { id, userId },
    });
    if (count === 0)
      throw new NotFoundException('Generated document not found');
    return { message: 'Deleted' };
  }

  /** "Save to documents": turns the text into a real DOCX or TXT document in the user's library. */
  async save(userId: string, id: string, dto: SaveHistoryDto) {
    const gen = await this.prisma.generatedDocument.findFirst({
      where: { id, userId },
    });
    if (!gen) throw new NotFoundException('Generated document not found');

    if (gen.savedDocumentId) {
      const existing = await this.prisma.document.findFirst({
        where: { id: gen.savedDocumentId, trashedAt: null },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException({
          message: 'This document is already saved to your documents.',
          documentId: existing.id,
        });
      }
    }

    const blocks = markdownToBlocks(gen.content);
    const plain = blocksToText(blocks);
    const text = this.parser.normalize(plain);
    if (text.length < 20)
      throw new BadRequestException('The document is too short to save');
    if (text.length > MAX_TEXT_CHARS)
      throw new BadRequestException('The document is too long to save');

    const ext = dto.format;
    const buffer =
      ext === 'txt' ? Buffer.from(plain, 'utf8') : await blocksToDocx(blocks);
    if (buffer.length > MAX_FILE_BYTES)
      throw new BadRequestException('The file would be larger than 5 MB');

    let categoryId: string | null;
    if (dto.categoryId !== undefined) {
      categoryId = dto.categoryId;
      if (categoryId) {
        const ok = await this.prisma.category.findUnique({
          where: { id: categoryId },
          select: { id: true },
        });
        if (!ok) throw new NotFoundException('Category not found');
      }
    } else {
      const slug = TYPE_CATEGORY[gen.docType as DocType] ?? 'other';
      categoryId =
        (
          await this.prisma.category.findUnique({
            where: { slug },
            select: { id: true },
          })
        )?.id ?? null;
    }

    const publicId = `${userFolder(userId)}/${randomUUID()}.${ext}`;
    await this.cloudinary.uploadBuffer(publicId, buffer, userFolder(userId));

    try {
      const chunks = this.chunker.chunk(text);
      const document = await this.prisma.document.create({
        data: {
          userId,
          originalName: gen.title,
          fileUrl: this.cloudinary.buildUrl(publicId),
          publicId,
          fileType: ext === 'txt' ? 'TXT' : 'DOCX',
          fileSize: buffer.length,
          extractedText: text,
          wordCount: wordsOf(text),
          source: 'GENERATED',
          categoryId,
          chunks: {
            createMany: {
              data: chunks.map((content, index) => ({ index, content })),
            },
          },
        },
        select: summarySelect(userId),
      });
      await this.prisma.generatedDocument.update({
        where: { id },
        data: { savedDocumentId: document.id },
      });
      await this.documents.touch(userId, document.id);
      return { document: withUserData(document) };
    } catch (err) {
      await this.cloudinary.delete(publicId);
      throw err;
    }
  }
}
