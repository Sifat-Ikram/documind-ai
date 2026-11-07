import { Injectable } from '@nestjs/common';

@Injectable()
export class ChunkService {
  chunk(text: string, maxChars = 1500, overlap = 200): string[] {
    const chunks: string[] = [];
    let current = '';

    const flush = () => {
      const trimmed = current.trim();
      if (trimmed) chunks.push(trimmed);
      current = '';
    };

    for (const paragraph of text.split(/\n{2,}/)) {
      if (paragraph.length > maxChars) {
        flush();
        for (let i = 0; i < paragraph.length; i += maxChars - overlap) {
          chunks.push(paragraph.slice(i, i + maxChars).trim());
          if (i + maxChars >= paragraph.length) break;
        }
        continue;
      }
      if (current.length + paragraph.length + 2 > maxChars) flush();
      current += (current ? '\n\n' : '') + paragraph;
    }
    flush();

    return chunks.filter(Boolean);
  }
}
