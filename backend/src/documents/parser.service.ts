import { BadRequestException, Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import type { FileTypeValue } from './documents.constants';

@Injectable()
export class ParserService {
  verifySignature(type: FileTypeValue, buffer: Buffer): void {
    let valid = false;
    if (type === 'PDF') {
      valid = buffer.subarray(0, 1024).toString('latin1').includes('%PDF-');
    } else if (type === 'DOCX') {
      valid =
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04;
    } else {
      valid = !buffer.subarray(0, 8000).includes(0x00);
    }
    if (!valid) {
      throw new BadRequestException(
        `The file content does not match the ${type} format.`,
      );
    }
  }

  async extractText(type: FileTypeValue, buffer: Buffer): Promise<string> {
    if (type === 'PDF') return this.extractPdf(buffer);
    if (type === 'DOCX') return this.extractDocx(buffer);
    return buffer.toString('utf8').replace(/^\uFEFF/, '');
  }

  normalize(text: string): string {
    return text
      .replace(/\r\n?/g, '\n')
      .replace(/\u0000/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  looksGarbled(text: string): boolean {
    const sample = text.slice(0, 20000);
    if (!sample.length) return false;
    const bad = sample.match(/[\uFFFD\uE000-\uF8FF]/g)?.length ?? 0;
    return bad / sample.length > 0.05;
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    let parser: InstanceType<typeof import('pdf-parse').PDFParse> | undefined;

    try {
      // Load the worker before loading pdf-parse
      const { CanvasFactory } = await import('pdf-parse/worker');
      const { PDFParse } = await import('pdf-parse');

      const parser = new PDFParse({
        data: new Uint8Array(buffer),
        CanvasFactory,
      });

      const result = await parser.getText();

      return result.text.replace(/^-- \d+ of \d+ --$/gm, '');
    } catch (err) {
      const { PasswordException } = await import('pdf-parse');

      if (err instanceof PasswordException) {
        throw new BadRequestException('This PDF is password-protected.');
      }

      throw new BadRequestException(
        'Could not read this PDF. The file may be damaged.',
      );
    } finally {
      await parser?.destroy().catch(() => undefined);
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      return value;
    } catch {
      throw new BadRequestException('Could not read this DOCX file.');
    }
  }
}
