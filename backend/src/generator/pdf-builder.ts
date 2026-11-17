import { BadRequestException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { runsToText, type Block, type Run } from '../versions/html-model';
import { EMBEDDED_FONTS } from './embedded-fonts';

const FONT_DIR = join(process.cwd(), 'assets', 'fonts');
const FILES = {
  latin: 'NotoSans-Regular.ttf',
  latinBold: 'NotoSans-Bold.ttf',
  latinItalic: 'NotoSans-Italic.ttf',
  latinBoldItalic: 'NotoSans-BoldItalic.ttf',
  bn: 'NotoSansBengali-Regular.ttf',
  bnBold: 'NotoSansBengali-Bold.ttf',
} as const;
type FontKey = keyof typeof FILES;

const decoded = new Map<FontKey, Buffer>();

/** A font as bytes (the embedded copy always ships with the build) or, failing that, a file path. */
function fontSource(key: FontKey): Buffer | string | null {
  const embedded = EMBEDDED_FONTS[key];
  if (embedded) {
    let bytes = decoded.get(key);
    if (!bytes) {
      bytes = Buffer.from(embedded, 'base64');
      decoded.set(key, bytes);
    }
    return bytes;
  }
  const path = join(FONT_DIR, FILES[key]);
  return existsSync(path) ? path : null;
}
const has = (key: FontKey) => fontSource(key) !== null;

const MARGIN = 56;
const BASE = 11;
const BENGALI = /[\u0980-\u09FF]/;
const BENGALI_CHAR = /[\u0980-\u09FF\u200C\u200D]/;
const NEUTRAL = /[\s\d\p{P}\p{S}]/u;
// Scripts this PDF export cannot draw (Bengali is handled separately)
const UNSUPPORTED =
  /[\u0590-\u08FF\u0900-\u097F\u0A00-\u0DFF\u0E00-\u1FFF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/;
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

function toWinAnsi(text: string): string {
  return Array.from(text)
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return (code >= 0x20 && code <= 0x7e) ||
        (code >= 0xa0 && code <= 0xff) ||
        WIN_ANSI_EXTRA.includes(ch) ||
        ch === '\n'
        ? ch
        : '?';
    })
    .join('');
}

function splitScripts(text: string): { text: string; bengali: boolean }[] {
  const out: { text: string; bengali: boolean }[] = [];
  let current: { text: string; bengali: boolean } | null = null;
  for (const ch of text) {
    const isBn = BENGALI_CHAR.test(ch);
    const bengali: boolean = isBn
      ? true
      : NEUTRAL.test(ch) && current !== null
        ? current.bengali
        : false;
    if (current && current.bengali === bengali) current.text += ch;
    else {
      current = { text: ch, bengali };
      out.push(current);
    }
  }
  return out;
}

interface Fonts {
  unicode: boolean;
  pick: (bold: boolean, italic: boolean, bengali: boolean) => string;
}

function registerFonts(doc: PDFKit.PDFDocument): Fonts {
  const names = {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
    boldItalic: 'Helvetica-BoldOblique',
  };
  let unicode = false;
  const reg = (name: string, key: FontKey) => {
    doc.registerFont(name, fontSource(key) as Buffer | string);
    return name;
  };

  if (has('latin')) {
    unicode = true;
    names.regular = reg('latin', 'latin');
    names.bold = has('latinBold') ? reg('latin-b', 'latinBold') : names.regular;
    names.italic = has('latinItalic')
      ? reg('latin-i', 'latinItalic')
      : names.regular;
    names.boldItalic = has('latinBoldItalic')
      ? reg('latin-bi', 'latinBoldItalic')
      : names.bold;
  }

  const bn = has('bn') ? reg('bn', 'bn') : null;
  const bnBold = bn && has('bnBold') ? reg('bn-b', 'bnBold') : bn;

  return {
    unicode,
    pick: (bold, italic, bengali) => {
      if (bengali) return (bold ? bnBold : bn) ?? names.regular;
      if (bold && italic) return names.boldItalic;
      if (bold) return names.bold;
      if (italic) return names.italic;
      return names.regular;
    },
  };
}

interface Piece {
  text: string;
  bold: boolean;
  italic: boolean;
  underline?: boolean;
  strike?: boolean;
  bengali: boolean;
}

function writeRuns(
  doc: PDFKit.PDFDocument,
  fonts: Fonts,
  runs: Run[],
  o: {
    size: number;
    x: number;
    width: number;
    color?: string;
    prefix?: string;
    bold?: boolean;
  },
) {
  const pieces: Piece[] = [];
  if (o.prefix)
    pieces.push({ text: o.prefix, bold: false, italic: false, bengali: false });

  for (const r of runs) {
    const raw = r.lineBreak ? '\n' : r.text;
    const text = fonts.unicode ? raw : toWinAnsi(raw);
    for (const seg of splitScripts(text)) {
      if (!seg.text) continue;
      pieces.push({
        text: seg.text,
        bold: Boolean(r.bold || o.bold),
        italic: Boolean(r.italic),
        underline: r.underline,
        strike: r.strike,
        bengali: seg.bengali,
      });
    }
  }
  if (pieces.length === 0) return;

  doc.fillColor(o.color ?? '#111111');
  pieces.forEach((p, i) => {
    doc.font(fonts.pick(p.bold, p.italic, p.bengali)).fontSize(o.size);
    const last = i === pieces.length - 1;
    const opts: PDFKit.Mixins.TextOptions = {
      continued: !last,
      underline: p.underline,
      strike: p.strike,
      lineGap: 3,
      ...(i === 0 ? { width: o.width } : {}),
    };
    if (i === 0) doc.text(p.text, o.x, doc.y, opts);
    else doc.text(p.text, opts);
  });
}

function drawTable(
  doc: PDFKit.PDFDocument,
  fonts: Fonts,
  rows: Run[][][],
  width: number,
) {
  const cols = Math.max(...rows.map((r) => r.length), 1);
  const colW = width / cols;
  const pad = 5;

  rows.forEach((row, rowIndex) => {
    const cells = Array.from({ length: cols }, (_, c) => {
      const text = runsToText(row[c] ?? []).replace(/\n/g, ' ');
      return fonts.unicode ? text : toWinAnsi(text);
    });
    const fontFor = (text: string) =>
      fonts.pick(rowIndex === 0, false, BENGALI.test(text));

    const heights = cells.map((t) => {
      doc.font(fontFor(t)).fontSize(10);
      return doc.heightOfString(t, { width: colW - pad * 2 });
    });
    const rowH = Math.max(...heights, 12) + pad * 2;

    if (doc.y + rowH > doc.page.height - MARGIN) doc.addPage();
    const y = doc.y;

    cells.forEach((t, c) => {
      const x = MARGIN + c * colW;
      if (rowIndex === 0) doc.rect(x, y, colW, rowH).fill('#f1f1f1');
      doc.rect(x, y, colW, rowH).lineWidth(0.5).stroke('#cccccc');
      doc
        .fillColor('#111111')
        .font(fontFor(t))
        .fontSize(10)
        .text(t, x + pad, y + pad, { width: colW - pad * 2 });
    });
    doc.y = y + rowH;
  });
  doc.x = MARGIN;
  doc.moveDown(0.6);
}

const blockText = (b: Block): string =>
  b.type === 'table'
    ? b.rows.flat().map(runsToText).join(' ')
    : b.type === 'rule'
      ? ''
      : runsToText(b.runs);

export async function blocksToPdf(
  blocks: Block[],
  title: string,
): Promise<Buffer> {
  const all = blocks.map(blockText).join(' ');
  if (UNSUPPORTED.test(all)) {
    throw new BadRequestException(
      'PDF export supports English and Bengali only. For other languages use DOCX or TXT, or print the page from your browser.',
    );
  }
  if (BENGALI.test(all) && !has('bn')) {
    throw new BadRequestException(
      'PDF export of Bengali text needs the Noto Sans Bengali font on the server. Use "Save as PDF" from your browser, or export DOCX.',
    );
  }

  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    info: { Title: title || 'Document' },
  });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const fonts = registerFonts(doc);
  const width = doc.page.width - MARGIN * 2;
  const counters: number[] = [];

  for (const b of blocks) {
    if (b.type !== 'listItem') counters.length = 0;

    switch (b.type) {
      case 'heading':
        doc.moveDown(0.5);
        writeRuns(doc, fonts, b.runs, {
          size: [22, 17, 14][b.level - 1],
          x: MARGIN,
          width,
          bold: true,
        });
        doc.moveDown(0.3);
        break;

      case 'paragraph':
        writeRuns(doc, fonts, b.runs, { size: BASE, x: MARGIN, width });
        doc.moveDown(0.5);
        break;

      case 'quote': {
        const y0 = doc.y;
        writeRuns(doc, fonts, b.runs, {
          size: BASE,
          x: MARGIN + 16,
          width: width - 16,
          color: '#555555',
        });
        if (doc.y > y0)
          doc
            .moveTo(MARGIN + 4, y0)
            .lineTo(MARGIN + 4, doc.y)
            .lineWidth(2)
            .stroke('#aaaaaa');
        doc.moveDown(0.5);
        break;
      }

      case 'listItem': {
        const prefix = b.ordered
          ? `${(counters[b.level] = (counters[b.level] ?? 0) + 1)}. `
          : b.level === 0
            ? '• '
            : '– ';
        counters.length = b.level + 1;
        const indent = 16 + b.level * 16;
        writeRuns(doc, fonts, b.runs, {
          size: BASE,
          x: MARGIN + indent,
          width: width - indent,
          prefix,
        });
        doc.moveDown(0.2);
        break;
      }

      case 'table':
        if (b.rows.length > 0) drawTable(doc, fonts, b.rows, width);
        break;

      case 'rule': {
        doc.moveDown(0.3);
        const y = doc.y;
        doc
          .moveTo(MARGIN, y)
          .lineTo(MARGIN + width, y)
          .lineWidth(0.5)
          .stroke('#aaaaaa');
        doc.moveDown(0.6);
        break;
      }
    }
  }

  doc.end();
  return finished;
}
