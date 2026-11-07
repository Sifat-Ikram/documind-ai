export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_TEXT_CHARS = 500_000;

export type FileTypeValue = 'PDF' | 'DOCX' | 'TXT';

export function resolveFileType(fileName: string): FileTypeValue | null {
  const dot = fileName.lastIndexOf('.');
  const ext = dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (ext === 'docx') return 'DOCX';
  if (ext === 'txt') return 'TXT';
  return null;
}
