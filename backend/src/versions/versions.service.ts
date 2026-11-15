import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { diffLines } from 'diff';
import { AccessService } from '../access/access.service';
import { userFolder } from '../cloudinary/cloudinary.constants';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { summarySelect, withUserData } from '../documents/document-select';
import { ChunkService } from '../documents/chunk.service';
import {
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
} from '../documents/documents.constants';
import { ParserService } from '../documents/parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { blocksToDocx } from './docx-builder';
import { docxToHtml, textToHtml } from './editor-content';
import { blocksToText, htmlToBlocks } from './html-model';
import type { SaveVersionDto } from './versions.schemas';

const TEXT_PREVIEW = 20000;
const MAX_COMPARE_CHARS = 400_000;

type FileType = 'PDF' | 'DOCX' | 'TXT';

interface LoadedDoc {
  id: string;
  userId: string;
  originalName: string;
  fileType: FileType;
  fileUrl: string;
  publicId: string;
  fileSize: number;
  extractedText: string;
  wordCount: number;
  currentVersion: number;
  versionCreatedAt: Date | null;
  versionCreatedById: string | null;
  versionNote: string | null;
  createdAt: Date;
}

/** One version, whether it is the current one or an older snapshot. */
interface ResolvedVersion {
  version: number;
  isCurrent: boolean;
  title: string;
  fileType: FileType;
  fileUrl: string;
  publicId: string;
  fileSize: number;
  extractedText: string;
  wordCount: number;
  createdAt: Date;
  note: string | null;
}

export function splitTitle(title: string) {
  const m = /^(.*?)(?: \((\d+)\))?(\.[A-Za-z0-9]{1,5})?$/.exec(title.trim());
  return {
    base: m?.[1] ?? title,
    n: m?.[2] ? Number(m[2]) : 0,
    ext: m?.[3] ?? '',
  };
}

/** "Report" -> "Report (1)", "Report (1)" -> "Report (3)" when "Report (2)" already exists. */
export function nextTitle(currentTitle: string, allTitles: string[]): string {
  const { base, ext } = splitTitle(currentTitle);
  let max = 0;
  for (const t of allTitles) {
    const s = splitTitle(t);
    if (s.base === base) max = Math.max(max, s.n);
  }
  return `${base} (${max + 1})${ext}`;
}

const withExtension = (title: string, fileType: FileType) => {
  const ext = fileType.toLowerCase();
  return title.toLowerCase().endsWith(`.${ext}`) ? title : `${title}.${ext}`;
};

@Injectable()
export class VersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly cloudinary: CloudinaryService,
    private readonly parser: ParserService,
    private readonly chunker: ChunkService,
  ) {}

  // ---------------------------------------------------------------- reading

  async list(userId: string, documentId: string) {
    await this.access.require(userId, documentId, 'VIEWER');
    const doc = await this.loadDoc(documentId);

    const snapshots = await this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: {
        version: true,
        title: true,
        createdAt: true,
        fileSize: true,
        wordCount: true,
        fileType: true,
        note: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    const creator = await this.prisma.user.findUnique({
      where: { id: doc.versionCreatedById ?? doc.userId },
      select: { id: true, name: true },
    });

    return {
      items: [
        {
          version: doc.currentVersion,
          title: doc.originalName,
          createdAt: doc.versionCreatedAt ?? doc.createdAt,
          createdBy: creator,
          fileSize: doc.fileSize,
          wordCount: doc.wordCount,
          fileType: doc.fileType,
          note: doc.versionNote,
          isCurrent: true,
        },
        ...snapshots.map((s) => ({ ...s, isCurrent: false })),
      ],
    };
  }

  async get(userId: string, documentId: string, version: number) {
    await this.access.require(userId, documentId, 'VIEWER');
    const doc = await this.loadDoc(documentId);
    const v = await this.resolve(doc, version);
    const { extractedText, publicId: _publicId, ...meta } = v;
    return {
      ...meta,
      text: extractedText.slice(0, TEXT_PREVIEW),
      textLength: extractedText.length,
      truncated: extractedText.length > TEXT_PREVIEW,
    };
  }

  async download(userId: string, documentId: string, version: number) {
    await this.access.require(userId, documentId, 'VIEWER');
    const doc = await this.loadDoc(documentId);
    const v = await this.resolve(doc, version);
    return { url: v.fileUrl, fileName: withExtension(v.title, v.fileType) };
  }

  async compare(userId: string, documentId: string, from: number, to: number) {
    await this.access.require(userId, documentId, 'VIEWER');
    const doc = await this.loadDoc(documentId);
    const a = await this.resolve(doc, from);
    const b = await this.resolve(doc, to);

    if (a.extractedText.length + b.extractedText.length > MAX_COMPARE_CHARS) {
      throw new BadRequestException('These versions are too long to compare');
    }

    const parts = diffLines(a.extractedText, b.extractedText);
    const meta = (v: ResolvedVersion) => ({
      version: v.version,
      title: v.title,
      createdAt: v.createdAt,
    });
    return {
      from: meta(a),
      to: meta(b),
      stats: {
        addedLines: parts
          .filter((p) => p.added)
          .reduce((n, p) => n + (p.count ?? 0), 0),
        removedLines: parts
          .filter((p) => p.removed)
          .reduce((n, p) => n + (p.count ?? 0), 0),
      },
      changes: parts.map((p) => ({
        type: p.added ? 'added' : p.removed ? 'removed' : 'equal',
        text: p.value,
      })),
    };
  }

  // ---------------------------------------------------------------- editing

  /** The content of a version as HTML, for the rich text editor. */
  async loadEditor(userId: string, documentId: string, version?: number) {
    await this.access.require(userId, documentId, 'EDITOR');
    const doc = await this.loadDoc(documentId);
    this.assertEditable(doc.fileType);

    const v = await this.resolve(doc, version ?? doc.currentVersion);
    const html =
      v.fileType === 'TXT'
        ? textToHtml(v.extractedText)
        : await docxToHtml(
            await this.cloudinary.download(v.publicId, MAX_FILE_BYTES),
          );

    return {
      html,
      title: v.title,
      fileType: doc.fileType,
      basedOn: v.version,
      currentVersion: doc.currentVersion,
      warning:
        doc.fileType === 'DOCX'
          ? 'Only headings, bold, italic, underline, lists and simple tables are kept. Images and complex layout are not.'
          : null,
    };
  }

  /** Saves the edited content as a NEW version. The older versions stay untouched. */
  async save(userId: string, documentId: string, dto: SaveVersionDto) {
    await this.access.require(userId, documentId, 'EDITOR');
    const doc = await this.loadDoc(documentId);
    this.assertEditable(doc.fileType);

    if (!dto.force && dto.expectedCurrentVersion !== doc.currentVersion) {
      throw new ConflictException({
        message:
          'A newer version was saved by someone else while you were editing.',
        currentVersion: doc.currentVersion,
      });
    }

    const blocks = htmlToBlocks(dto.html);
    const plain = blocksToText(blocks);
    const text = this.parser.normalize(plain);
    if (text.length === 0)
      throw new BadRequestException('The document cannot be empty');
    if (text.length > MAX_TEXT_CHARS) {
      throw new BadRequestException(
        `The document is too long (maximum ${MAX_TEXT_CHARS.toLocaleString('en-US')} characters)`,
      );
    }

    const buffer =
      doc.fileType === 'TXT'
        ? Buffer.from(plain, 'utf8')
        : await blocksToDocx(blocks);
    if (buffer.length > MAX_FILE_BYTES)
      throw new BadRequestException('The edited file is larger than 5 MB');

    const title =
      dto.title ?? nextTitle(doc.originalName, await this.allTitles(doc));
    const publicId = `${userFolder(doc.userId)}/${randomUUID()}.${doc.fileType.toLowerCase()}`;
    await this.store(publicId, buffer, doc.userId);

    try {
      await this.commit(doc, {
        title,
        publicId,
        fileUrl: this.cloudinary.buildUrl(publicId),
        fileSize: buffer.length,
        text,
        userId,
        note:
          dto.basedOn !== dto.expectedCurrentVersion
            ? `Edited from v${dto.basedOn}`
            : null,
      });
    } catch (err) {
      await this.cloudinary.delete(publicId);
      throw err;
    }
    return {
      document: await this.summary(userId, documentId),
      version: doc.currentVersion + 1,
    };
  }

  /** "Make this the current version": copies an older version into a new, latest one. */
  async restore(userId: string, documentId: string, version: number) {
    await this.access.require(userId, documentId, 'EDITOR');
    const doc = await this.loadDoc(documentId);
    this.assertEditable(doc.fileType);
    if (version === doc.currentVersion)
      throw new BadRequestException('This is already the current version');

    const v = await this.resolve(doc, version);
    await this.commit(doc, {
      title: nextTitle(v.title, await this.allTitles(doc)),
      publicId: v.publicId, // the stored file is reused, nothing is uploaded again
      fileUrl: v.fileUrl,
      fileSize: v.fileSize,
      text: v.extractedText,
      userId,
      note: `Restored from v${version}`,
    });
    return {
      document: await this.summary(userId, documentId),
      version: doc.currentVersion + 1,
    };
  }

  // ---------------------------------------------------------------- helpers

  private assertEditable(fileType: FileType) {
    if (fileType === 'PDF') {
      throw new BadRequestException(
        'PDF files cannot be edited. Only TXT and DOCX files can.',
      );
    }
  }

  private async loadDoc(id: string): Promise<LoadedDoc> {
    const doc = await this.prisma.document.findFirst({
      where: { id, trashedAt: null },
      select: {
        id: true,
        userId: true,
        originalName: true,
        fileType: true,
        fileUrl: true,
        publicId: true,
        fileSize: true,
        extractedText: true,
        wordCount: true,
        currentVersion: true,
        versionCreatedAt: true,
        versionCreatedById: true,
        versionNote: true,
        createdAt: true,
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  private async resolve(
    doc: LoadedDoc,
    version: number,
  ): Promise<ResolvedVersion> {
    if (version === doc.currentVersion) {
      return {
        version,
        isCurrent: true,
        title: doc.originalName,
        fileType: doc.fileType,
        fileUrl: doc.fileUrl,
        publicId: doc.publicId,
        fileSize: doc.fileSize,
        extractedText: doc.extractedText,
        wordCount: doc.wordCount,
        createdAt: doc.versionCreatedAt ?? doc.createdAt,
        note: doc.versionNote,
      };
    }
    const snap = await this.prisma.documentVersion.findUnique({
      where: { documentId_version: { documentId: doc.id, version } },
    });
    if (!snap) throw new NotFoundException('Version not found');
    return {
      version: snap.version,
      isCurrent: false,
      title: snap.title,
      fileType: snap.fileType,
      fileUrl: snap.fileUrl,
      publicId: snap.publicId,
      fileSize: snap.fileSize,
      extractedText: snap.extractedText,
      wordCount: snap.wordCount,
      createdAt: snap.createdAt,
      note: snap.note,
    };
  }

  private async allTitles(doc: LoadedDoc): Promise<string[]> {
    const rows = await this.prisma.documentVersion.findMany({
      where: { documentId: doc.id },
      select: { title: true },
    });
    return [doc.originalName, ...rows.map((r) => r.title)];
  }

  private async store(publicId: string, buffer: Buffer, ownerId: string) {
    try {
      await this.cloudinary.uploadBuffer(publicId, buffer, userFolder(ownerId));
    } catch {
      throw new BadGatewayException(
        'Could not store the new version. Please try again.',
      );
    }
  }

  /**
   * In one transaction: put the new content into the document, keep the old state as a snapshot,
   * and rebuild the search chunks. If somebody else saved first, nothing changes (409).
   */
  private async commit(
    doc: LoadedDoc,
    next: {
      title: string;
      publicId: string;
      fileUrl: string;
      fileSize: number;
      text: string;
      userId: string;
      note: string | null;
    },
  ) {
    const chunks = this.chunker.chunk(next.text);
    const wordCount = next.text.split(/\s+/).filter(Boolean).length;

    await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.document.updateMany({
          where: { id: doc.id, currentVersion: doc.currentVersion },
          data: {
            originalName: next.title,
            fileUrl: next.fileUrl,
            publicId: next.publicId,
            fileSize: next.fileSize,
            extractedText: next.text,
            wordCount,
            currentVersion: doc.currentVersion + 1,
            versionCreatedAt: new Date(),
            versionCreatedById: next.userId,
            versionNote: next.note,
          },
        });
        if (claimed.count === 0) {
          throw new ConflictException({
            message:
              'A newer version was saved by someone else while you were editing.',
          });
        }

        await tx.documentVersion.create({
          data: {
            documentId: doc.id,
            version: doc.currentVersion,
            title: doc.originalName,
            fileUrl: doc.fileUrl,
            publicId: doc.publicId,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            extractedText: doc.extractedText,
            wordCount: doc.wordCount,
            createdById: doc.versionCreatedById ?? doc.userId,
            note: doc.versionNote,
            createdAt: doc.versionCreatedAt ?? doc.createdAt,
          },
        });

        await tx.documentChunk.deleteMany({ where: { documentId: doc.id } });
        await tx.documentChunk.createMany({
          data: chunks.map((content, index) => ({
            documentId: doc.id,
            content,
            index,
          })),
        });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  private async summary(userId: string, documentId: string) {
    const row = await this.prisma.document.findFirst({
      where: { id: documentId },
      select: summarySelect(userId),
    });
    if (!row) throw new NotFoundException('Document not found');
    return withUserData(row);
  }
}
