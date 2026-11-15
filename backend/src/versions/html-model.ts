import { HTMLElement, NodeType, parse, type Node } from 'node-html-parser';

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  lineBreak?: boolean;
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; runs: Run[] }
  | { type: 'paragraph'; runs: Run[] }
  | { type: 'quote'; runs: Run[] }
  | { type: 'listItem'; ordered: boolean; level: number; runs: Run[] }
  | { type: 'table'; rows: Run[][][] }
  | { type: 'rule' };

type Style = Pick<Run, 'bold' | 'italic' | 'underline' | 'strike'>;

const IGNORED = new Set([
  'script',
  'style',
  'img',
  'head',
  'title',
  'meta',
  'link',
]);
const CONTAINERS = new Set([
  'div',
  'section',
  'article',
  'main',
  'body',
  'html',
  'figure',
  'header',
  'footer',
]);
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const tagOf = (el: HTMLElement) => el.tagName?.toLowerCase() ?? '';
const isElement = (n: Node): n is HTMLElement =>
  n.nodeType === NodeType.ELEMENT_NODE;

function styleFor(tag: string, base: Style): Style {
  switch (tag) {
    case 'strong':
    case 'b':
      return { ...base, bold: true };
    case 'em':
    case 'i':
      return { ...base, italic: true };
    case 'u':
    case 'ins':
      return { ...base, underline: true };
    case 's':
    case 'strike':
    case 'del':
      return { ...base, strike: true };
    default:
      return base;
  }
}

function inlineRuns(nodes: Node[], style: Style = {}): Run[] {
  const runs: Run[] = [];
  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = node.text.replace(/\s+/g, ' ');
      if (text) runs.push({ text, ...style });
    } else if (isElement(node)) {
      const tag = tagOf(node);
      if (IGNORED.has(tag)) continue;
      if (tag === 'br') {
        runs.push({ text: '', lineBreak: true });
      } else if (tag === 'p' || tag === 'div') {
        if (runs.length > 0) runs.push({ text: '', lineBreak: true });
        runs.push(...inlineRuns(node.childNodes, style));
      } else {
        runs.push(...inlineRuns(node.childNodes, styleFor(tag, style)));
      }
    }
  }
  return runs;
}

/** Removes empty edges and the spaces at the start and end of a block. */
function tidy(runs: Run[]): Run[] {
  const out = runs.filter((r) => r.lineBreak || r.text !== '');
  while (out.length && (out[0].lineBreak || out[0].text.trim() === ''))
    out.shift();
  while (
    out.length &&
    (out[out.length - 1].lineBreak || out[out.length - 1].text.trim() === '')
  )
    out.pop();
  if (out.length) {
    out[0] = { ...out[0], text: out[0].text.replace(/^\s+/, '') };
    const last = out.length - 1;
    out[last] = { ...out[last], text: out[last].text.replace(/\s+$/, '') };
  }
  return out;
}

const hasContent = (runs: Run[]) =>
  runs.some((r) => !r.lineBreak && r.text.trim() !== '');

function preRuns(text: string): Run[] {
  const runs: Run[] = [];
  text.split('\n').forEach((line, i) => {
    if (i > 0) runs.push({ text: '', lineBreak: true });
    if (line) runs.push({ text: line });
  });
  return runs;
}

function listBlocks(list: HTMLElement, out: Block[], level: number) {
  const ordered = tagOf(list) === 'ol';
  for (const child of list.childNodes) {
    if (!isElement(child) || tagOf(child) !== 'li') continue;

    const inline: Node[] = [];
    const nested: HTMLElement[] = [];
    for (const c of child.childNodes) {
      if (isElement(c) && (tagOf(c) === 'ul' || tagOf(c) === 'ol'))
        nested.push(c);
      else inline.push(c);
    }
    out.push({
      type: 'listItem',
      ordered,
      level,
      runs: tidy(inlineRuns(inline)),
    });
    nested.forEach((n) => listBlocks(n, out, level + 1));
  }
}

function tableBlock(table: HTMLElement): Block {
  const rows: Run[][][] = [];
  for (const tr of table.querySelectorAll('tr')) {
    const cells = tr.childNodes.filter(
      (n): n is HTMLElement => isElement(n) && ['td', 'th'].includes(tagOf(n)),
    );
    if (cells.length > 0)
      rows.push(cells.map((c) => tidy(inlineRuns(c.childNodes))));
  }
  return { type: 'table', rows };
}

function walk(nodes: Node[], out: Block[], quote: boolean) {
  let loose: Run[] = [];
  const flush = () => {
    const runs = tidy(loose);
    if (hasContent(runs))
      out.push({ type: quote ? 'quote' : 'paragraph', runs });
    loose = [];
  };

  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = node.text.replace(/\s+/g, ' ');
      if (text) loose.push({ text });
      continue;
    }
    if (!isElement(node)) continue;

    const tag = tagOf(node);
    if (IGNORED.has(tag)) continue;

    if (HEADINGS.has(tag)) {
      flush();
      out.push({
        type: 'heading',
        level: Math.min(3, Number(tag[1])) as 1 | 2 | 3,
        runs: tidy(inlineRuns(node.childNodes)),
      });
    } else if (tag === 'p') {
      flush();
      out.push({
        type: quote ? 'quote' : 'paragraph',
        runs: tidy(inlineRuns(node.childNodes)),
      });
    } else if (tag === 'ul' || tag === 'ol') {
      flush();
      listBlocks(node, out, 0);
    } else if (tag === 'blockquote') {
      flush();
      walk(node.childNodes, out, true);
    } else if (tag === 'table') {
      flush();
      out.push(tableBlock(node));
    } else if (tag === 'hr') {
      flush();
      out.push({ type: 'rule' });
    } else if (tag === 'pre') {
      flush();
      out.push({ type: 'paragraph', runs: preRuns(node.text) });
    } else if (tag === 'br') {
      loose.push({ text: '', lineBreak: true });
    } else if (CONTAINERS.has(tag)) {
      flush();
      walk(node.childNodes, out, quote);
    } else {
      loose.push(...inlineRuns([node]));
    }
  }
  flush();
}

/** Turns the editor's HTML into a small, safe list of blocks. Anything unknown is reduced to plain text. */
export function htmlToBlocks(html: string): Block[] {
  const out: Block[] = [];
  walk(parse(html).childNodes, out, false);
  return out;
}

export const runsToText = (runs: Run[]): string =>
  runs.map((r) => (r.lineBreak ? '\n' : r.text)).join('');

export function blocksToText(blocks: Block[]): string {
  const parts: { text: string; list: boolean }[] = [];
  const counters: number[] = [];

  for (const b of blocks) {
    if (b.type === 'listItem') {
      const prefix = b.ordered
        ? `${(counters[b.level] = (counters[b.level] ?? 0) + 1)}. `
        : '- ';
      counters.length = b.level + 1;
      parts.push({
        text: `${'  '.repeat(b.level)}${prefix}${runsToText(b.runs)}`,
        list: true,
      });
      continue;
    }

    counters.length = 0;
    if (b.type === 'rule') {
      parts.push({ text: '---', list: false });
    } else if (b.type === 'table') {
      const text = b.rows
        .map((row) =>
          row.map((cell) => runsToText(cell).replace(/\n/g, ' ')).join(' | '),
        )
        .join('\n');
      if (text.trim()) parts.push({ text, list: false });
    } else {
      const text = runsToText(b.runs);
      if (!text.trim()) continue;
      parts.push({
        text:
          b.type === 'quote'
            ? text
                .split('\n')
                .map((l) => `> ${l}`)
                .join('\n')
            : text,
        list: false,
      });
    }
  }

  return parts
    .map((p, i) =>
      i === 0
        ? p.text
        : `${p.list && parts[i - 1].list ? '\n' : '\n\n'}${p.text}`,
    )
    .join('');
}
