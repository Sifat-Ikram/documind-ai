import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChunkService } from './chunk.service';
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

const documentSummarySelect = {
  id: true,
  originalName: true,
  fileType: true,
  fileSize: true,
  wordCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PREVIEW_CHARS = 5000;

@Injectable()
export class DocumentsService {
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
      `^documind/${userId}/[0-9a-f-]{36}\\.(pdf|docx|txt)$`,
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
        select: documentSummarySelect,
      });

      return { document, warnings };
    } catch (err) {
      await this.cloudinary.delete(dto.publicId);
      throw err;
    }
  }

  async list(userId: string, q: ListDocumentsQuery) {
    const where = {
      userId,
      ...(q.type ? { fileType: q.type } : {}),
      ...(q.search
        ? { originalName: { contains: q.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        select: documentSummarySelect,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items,
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  async getDetail(userId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
      select: {
        ...documentSummarySelect,
        fileUrl: true,
        extractedText: true,
        _count: { select: { analyses: true, conversations: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const { extractedText, ...rest } = doc;
    return {
      ...rest,
      textPreview: extractedText.slice(0, PREVIEW_CHARS),
      textLength: extractedText.length,
      previewTruncated: extractedText.length > PREVIEW_CHARS,
    };
  }

  async getForAnalysis(userId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
      select: { id: true, originalName: true, extractedText: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async rename(userId: string, id: string, dto: RenameDocumentDto) {
    await this.assertOwned(userId, id);
    return this.prisma.document.update({
      where: { id },
      data: { originalName: dto.name },
      select: documentSummarySelect,
    });
  }

  async remove(userId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
      select: { id: true, publicId: true },
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.document.delete({ where: { id } });
    await this.cloudinary.delete(doc.publicId);
    return { message: 'Document deleted' };
  }

  async getDownload(userId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
      select: { originalName: true, fileUrl: true, fileType: true },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const ext = doc.fileType.toLowerCase();
    const fileName = doc.originalName.toLowerCase().endsWith(`.${ext}`)
      ? doc.originalName
      : `${doc.originalName}.${ext}`;
    return { url: doc.fileUrl, fileName };
  }

  async assertOwned(userId: string, id: string) {
    const exists = await this.prisma.document.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Document not found');
  }
}
