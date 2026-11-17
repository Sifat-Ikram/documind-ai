export type Format = 'pdf' | 'docx' | 'txt';

export const CONVERSIONS: { from: Format; to: Format; note: string }[] = [
  {
    from: 'docx',
    to: 'pdf',
    note: 'Headings, bold, italic, underline, lists and simple tables are kept. Images, headers and footers, fonts, colors and the exact page layout are not.',
  },
  {
    from: 'pdf',
    to: 'txt',
    note: 'Only the text is extracted. Layout, images and tables are not kept. Scanned PDFs have no text.',
  },
  {
    from: 'docx',
    to: 'txt',
    note: 'Only the text is kept. Headings, lists and tables become plain text.',
  },
  {
    from: 'txt',
    to: 'pdf',
    note: 'Paragraphs are kept. PDF output supports English and Bengali only.',
  },
  {
    from: 'txt',
    to: 'docx',
    note: 'Paragraphs are kept as normal Word paragraphs.',
  },
];

export const SOURCE_FOLDER = 'convert-source';
export const RESULT_FOLDER = 'converted';
export const RESULT_HOURS = 24;
export const MAX_ACTIVE_JOBS = 20;
export const PREVIEW_CHARS = 5000;
