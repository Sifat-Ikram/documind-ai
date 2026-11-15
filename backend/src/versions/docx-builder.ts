import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { Block, Run } from './html-model';

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
];
const indent = (level: number) => ({ left: 720 * (level + 1), hanging: 360 });

const toRun = (r: Run) =>
  r.lineBreak
    ? new TextRun({ break: 1 })
    : new TextRun({
        text: r.text,
        bold: r.bold,
        italics: r.italic,
        underline: r.underline ? {} : undefined,
        strike: r.strike,
      });

const rule = { style: BorderStyle.SINGLE, size: 6, space: 1, color: 'AAAAAA' };

export async function blocksToDocx(blocks: Block[]): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  let orderedInstance = 0;
  let previousWasOrdered = false;

  for (const b of blocks) {
    const ordered = b.type === 'listItem' && b.ordered;
    if (ordered && !previousWasOrdered) orderedInstance++;
    previousWasOrdered = ordered;

    switch (b.type) {
      case 'heading':
        children.push(
          new Paragraph({
            heading: HEADING_LEVELS[b.level - 1],
            children: b.runs.map(toRun),
          }),
        );
        break;
      case 'paragraph':
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: b.runs.map(toRun),
          }),
        );
        break;
      case 'quote':
        children.push(
          new Paragraph({
            indent: { left: 720 },
            border: {
              left: {
                style: BorderStyle.SINGLE,
                size: 6,
                space: 8,
                color: 'AAAAAA',
              },
            },
            children: b.runs.map(toRun),
          }),
        );
        break;
      case 'listItem':
        children.push(
          new Paragraph({
            children: b.runs.map(toRun),
            numbering: b.ordered
              ? {
                  reference: 'numbers',
                  level: Math.min(b.level, 2),
                  instance: orderedInstance,
                }
              : { reference: 'bullets', level: Math.min(b.level, 2) },
          }),
        );
        break;
      case 'table': {
        const rows = b.rows.filter((r) => r.length > 0);
        if (rows.length === 0) break;
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rows.map(
              (row) =>
                new TableRow({
                  children: row.map(
                    (cell) =>
                      new TableCell({
                        children: [
                          new Paragraph({ children: cell.map(toRun) }),
                        ],
                      }),
                  ),
                }),
            ),
          }),
        );
        break;
      }
      case 'rule':
        children.push(new Paragraph({ border: { bottom: rule } }));
        break;
    }
  }

  if (children.length === 0) children.push(new Paragraph({ children: [] }));

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.BULLET,
            text: ['•', '◦', '▪'][level],
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: indent(level) } },
          })),
        },
        {
          reference: 'numbers',
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: indent(level) } },
          })),
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 } } },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
