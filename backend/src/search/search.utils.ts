import { STOP_WORDS } from '../documents/chunk-search.service';

/** Keeps only letters and digits, so nothing from the AI or the user can reach SQL or the search syntax. */
export function cleanTerms(raw: string[]): string[] {
  const out = new Set<string>();
  for (const item of raw) {
    for (const w of item.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []) {
      if (w.length >= 3 && w.length <= 30 && !STOP_WORDS.has(w)) out.add(w);
    }
  }
  return [...out].slice(0, 20);
}

/** A short piece of the text around the first matching word. */
export function makeSnippet(content: string, terms: string[]) {
  const text = content.replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();

  let first = -1;
  const matchedTerms: string[] = [];
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1) {
      matchedTerms.push(t);
      if (first === -1 || i < first) first = i;
    }
  }

  const start = first === -1 ? 0 : Math.max(0, first - 80);
  const end = Math.min(text.length, start + 240);
  let slice = text.slice(start, end);

  if (start > 0) {
    const space = slice.indexOf(' ');
    if (space > 0 && space < 30) slice = slice.slice(space + 1);
    slice = `…${slice}`;
  }
  if (end < text.length) {
    const space = slice.lastIndexOf(' ');
    if (space > slice.length - 30) slice = slice.slice(0, space);
    slice = `${slice}…`;
  }
  return { text: slice, matchedTerms };
}
