import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as mammoth from 'mammoth';
import { parse } from 'node-html-parser';
import {
  CLOUDINARY_ROOT_FOLDER,
  userFolder,
} from '../cloudinary/cloudinary.constants';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  MAX_FILE_BYTES,
  resolveFileType,
} from '../documents/documents.constants';
import { ParserService } from '../documents/parser.service';
import { blocksToPdf } from '../generator/pdf-builder';
import { PrismaService } from '../prisma/prisma.service';
import { blocksToDocx } from '../versions/docx-builder';
import {
  blocksToText,
  htmlToBlocks,
  type Block,
  type Run,
} from '../versions/html-model';
import {
  CONVERSIONS,
  MAX_ACTIVE_JOBS,
  PREVIEW_CHARS,
  RESULT_FOLDER,
  RESULT_HOURS,
  SOURCE_FOLDER,
  type Format,
} from './converter.constants';
import type { ConvertDto, ConverterSignatureDto } from './converter.schemas';

const HOUR_MS = 60 * 60 * 1000;

interface Output {
  buffer: Buffer;
  warnings: string[];
  text: string;
}

const baseName = (name: string) =>
  name.replace(/\.[A-Za-z0-9]{1,5}$/, '').trim() || 'document';

function textToBlocks(text: string): Block[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p): Block => {
      const runs: Run[] = [];
      p.split('\n').forEach((line, i) => {
        if (i > 0) runs.push({ text: '', lineBreak: true });
        runs.push({ text: line });
      });
      return { type: 'paragraph', runs };
    });
}

@Injectable()
export class ConverterService {
  private readonly logger = new Logger(ConverterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly parser: ParserService,
  ) {}

  formats() {
    return { items: CONVERSIONS };
  }

  createUploadSignature(userId: string, dto: ConverterSignatureDto) {
    const type = resolveFileType(dto.fileName);
    if (!type)
      throw new BadRequestException(
        'Only PDF, DOCX and TXT files can be converted',
      );
    if (dto.fileSize > MAX_FILE_BYTES)
      throw new BadRequestException('File must be 5 MB or smaller');
    return this.cloudinary.createUploadSignature(
      userId,
      type.toLowerCase(),
      SOURCE_FOLDER,
    );
  }

  async convert(userId: string, dto: ConvertDto) {
    const pattern = new RegExp(
      `^${CLOUDINARY_ROOT_FOLDER}/${userId}/${SOURCE_FOLDER}/[0-9a-f-]{36}\\.(pdf|docx|txt)$`,
    );
    if (!pattern.test(dto.publicId))
      throw new BadRequestException('Invalid upload reference');

    const sourceType = resolveFileType(dto.publicId);
    if (!sourceType) throw new BadRequestException('Invalid upload reference');
    const from = sourceType.toLowerCase() as Format;

    // From here on the uploaded source file is always removed again.
    let resultPublicId: string | null = null;
    try {
      if (!CONVERSIONS.some((c) => c.from === from && c.to === dto.target)) {
        throw new BadRequestException(
          `Converting ${from.toUpperCase()} to ${dto.target.toUpperCase()} is not supported`,
        );
      }

      try {
        await this.purgeExpired(userId);
      } catch (err) {
        this.logger.warn(`Lazy purge failed: ${String(err)}`);
      }
      const active = await this.prisma.conversionJob.count({
        where: { userId, expiresAt: { gt: new Date() } },
      });
      if (active >= MAX_ACTIVE_JOBS) {
        throw new HttpException(
          'You have too many converted files. Delete some, or wait until they expire.',
          429,
        );
      }

      const buffer = await this.cloudinary.download(
        dto.publicId,
        MAX_FILE_BYTES,
      );
      this.parser.verifySignature(sourceType, buffer);

      const base = baseName(dto.originalName);
      const out = await this.run(from, dto.target, buffer, base);
      if (out.buffer.length > MAX_FILE_BYTES * 2) {
        throw new BadRequestException('The converted file would be too large');
      }

      resultPublicId = `${userFolder(userId)}/${RESULT_FOLDER}/${randomUUID()}.${dto.target}`;
      try {
        await this.cloudinary.uploadBuffer(
          resultPublicId,
          out.buffer,
          `${userFolder(userId)}/${RESULT_FOLDER}`,
        );
      } catch {
        throw new BadGatewayException(
          'Could not store the converted file. Please try again.',
        );
      }

      const job = await this.prisma.conversionJob.create({
        data: {
          userId,
          sourceName: dto.originalName,
          sourceFormat: from,
          targetFormat: dto.target,
          publicId: resultPublicId,
          fileUrl: this.cloudinary.buildUrl(resultPublicId),
          fileSize: out.buffer.length,
          warnings: out.warnings,
          expiresAt: new Date(Date.now() + RESULT_HOURS * HOUR_MS),
        },
      });

      return {
        job: this.present(job),
        warnings: out.warnings,
        preview: {
          text: out.text.slice(0, PREVIEW_CHARS),
          truncated: out.text.length > PREVIEW_CHARS,
        },
      };
    } catch (err) {
      if (resultPublicId) await this.cloudinary.delete(resultPublicId);
      throw err;
    } finally {
      await this.cloudinary.delete(dto.publicId);
    }
  }

  async list(userId: string) {
    try {
      await this.purgeExpired(userId);
    } catch (err) {
      this.logger.warn(`Lazy purge failed: ${String(err)}`);
    }
    const jobs = await this.prisma.conversionJob.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return { items: jobs.map((j) => this.present(j)), keepHours: RESULT_HOURS };
  }

  async remove(userId: string, id: string) {
    const job = await this.prisma.conversionJob.findFirst({
      where: { id, userId },
      select: { id: true, publicId: true },
    });
    if (!job) throw new NotFoundException('Converted file not found');
    await this.prisma.conversionJob.delete({ where: { id } });
    await this.cloudinary.delete(job.publicId);
    return { message: 'Deleted' };
  }

  /** Removes converted files whose 24 hours are over (files and rows). Used by the daily cron job. */
  async purgeExpired(userId?: string): Promise<number> {
    const due = await this.prisma.conversionJob.findMany({
      where: { expiresAt: { lte: new Date() }, ...(userId ? { userId } : {}) },
      select: { id: true, publicId: true },
      take: 100,
    });
    for (const job of due) {
      await this.prisma.conversionJob.delete({ where: { id: job.id } });
      await this.cloudinary.delete(job.publicId);
    }
    return due.length;
  }

  // ---------------------------------------------------------------- conversion

  private async run(
    from: Format,
    to: Format,
    buffer: Buffer,
    title: string,
  ): Promise<Output> {
    const warnings: string[] = [];

    if (from === 'pdf') {
      // the only PDF conversion: PDF -> TXT
      const text = this.parser.normalize(
        await this.parser.extractText('PDF', buffer),
      );
      if (text.length < 20) {
        throw new BadRequestException(
          'No readable text found. Scanned or image-only PDFs cannot be converted.',
        );
      }
      if (this.parser.looksGarbled(text)) {
        warnings.push(
          'The extracted text looks corrupted. This can happen with old Bangla fonts.',
        );
      }
      warnings.push(
        'Only the text was extracted. Layout, images and tables are not kept.',
      );
      return { buffer: Buffer.from(text, 'utf8'), warnings, text };
    }

    if (from === 'docx') {
      const { blocks, hadImages } = await this.docxBlocks(buffer);
      if (blocks.length === 0)
        throw new BadRequestException(
          'No readable text found in this document',
        );
      if (hadImages)
        warnings.push(
          'The document contains images. They are not included in the result.',
        );

      const text = blocksToText(blocks);
      if (to === 'txt') {
        warnings.push(
          'Only the text was kept. Headings, lists and tables became plain text.',
        );
        return { buffer: Buffer.from(text, 'utf8'), warnings, text };
      }
      warnings.push(
        'Images, headers and footers, fonts, colors and the exact page layout are not kept in the PDF.',
      );
      return { buffer: await blocksToPdf(blocks, title), warnings, text };
    }

    // from txt
    const text = this.parser.normalize(
      buffer.toString('utf8').replace(/^\uFEFF/, ''),
    );
    if (!text) throw new BadRequestException('The file is empty');
    const blocks = textToBlocks(text);
    if (to === 'docx')
      return { buffer: await blocksToDocx(blocks), warnings, text };
    return { buffer: await blocksToPdf(blocks, title), warnings, text };
  }

  private async docxBlocks(buffer: Buffer) {
    let html: string;
    try {
      html = (await mammoth.convertToHtml({ buffer })).value;
    } catch {
      throw new BadRequestException('Could not read this DOCX file.');
    }
    const root = parse(html);
    const hadImages = root.querySelectorAll('img').length > 0;
    root.querySelectorAll('img,script,style').forEach((n) => n.remove());
    return { blocks: htmlToBlocks(root.toString()), hadImages };
  }

  private present(job: {
    id: string;
    sourceName: string;
    sourceFormat: string;
    targetFormat: string;
    fileUrl: string;
    fileSize: number;
    warnings: string[];
    createdAt: Date;
    expiresAt: Date;
  }) {
    return {
      id: job.id,
      sourceName: job.sourceName,
      sourceFormat: job.sourceFormat,
      targetFormat: job.targetFormat,
      fileName: `${baseName(job.sourceName)}.${job.targetFormat}`,
      fileUrl: job.fileUrl,
      fileSize: job.fileSize,
      warnings: job.warnings,
      createdAt: job.createdAt,
      expiresAt: job.expiresAt,
      hoursLeft: Math.max(
        0,
        Math.ceil((job.expiresAt.getTime() - Date.now()) / HOUR_MS),
      ),
    };
  }
}
