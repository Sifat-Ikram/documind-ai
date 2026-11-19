// Copies the PDF.js worker into public/ so the browser can load it (needed by the PDF viewer).
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const from = join(
  process.cwd(),
  'node_modules',
  'pdfjs-dist',
  'build',
  'pdf.worker.min.mjs',
);
const to = join(process.cwd(), 'public', 'pdf.worker.min.mjs');

if (!existsSync(from)) {
  console.log(
    'pdf.worker.min.mjs was not found in pdfjs-dist (run npm install first). Skipped.',
  );
} else {
  mkdirSync(join(process.cwd(), 'public'), { recursive: true });
  copyFileSync(from, to);
  console.log('Copied the PDF.js worker to public/pdf.worker.min.mjs');
}
