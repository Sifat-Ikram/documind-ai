import { BadRequestException, Injectable } from '@nestjs/common';
import { marked } from 'marked';
import { blocksToDocx } from '../versions/docx-builder';
import { blocksToText, htmlToBlocks, type Block } from '../versions/html-model';
import { blocksToPdf } from './pdf-builder';
import type { ExportDto } from './generator.schemas';

export function markdownToBlocks(markdown: string): Block[] {
  const html = marked.parse(markdown, { async: false }) as string;
  return htmlToBlocks(html);
}

const CONTENT_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain; charset=utf-8',
} as const;

@Injectable()
export class ExportService {
  async export(dto: ExportDto) {
    const blocks = markdownToBlocks(dto.content);
    if (blocks.length === 0)
      throw new BadRequestException('There is nothing to export');

    const heading = blocks.find((b) => b.type === 'heading');
    const title =
      dto.title?.trim() ||
      (heading?.type === 'heading'
        ? heading.runs.map((r) => r.text).join('')
        : '') ||
      'document';
    const base =
      title
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || 'document';

    let buffer: Buffer;
    if (dto.format === 'pdf') buffer = await blocksToPdf(blocks, title);
    else if (dto.format === 'docx') buffer = await blocksToDocx(blocks);
    else buffer = Buffer.from(blocksToText(blocks), 'utf8');

    return {
      buffer,
      contentType: CONTENT_TYPES[dto.format],
      fileName: `${base}.${dto.format}`,
    };
  }
}
