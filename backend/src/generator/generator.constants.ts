export const DOC_TYPES = [
  'Report',
  'Essay',
  'Letter',
  'Email',
  'Resume',
  'Cover letter',
  'Meeting minutes',
  'Proposal',
  'Blog post',
] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** Category used when a generated document is saved to My Documents (the user can change it). */
export const TYPE_CATEGORY: Record<DocType, string> = {
  Report: 'report',
  Essay: 'other',
  Letter: 'letter',
  Email: 'other',
  Resume: 'resume',
  'Cover letter': 'other',
  'Meeting minutes': 'meeting-notes',
  Proposal: 'proposal',
  'Blog post': 'other',
};

export const TYPE_HINTS: Record<DocType, string> = {
  Report:
    'A title, a short summary, headed sections (background, findings, analysis) and a conclusion with recommendations.',
  Essay:
    'An introduction with a clear thesis, body paragraphs with one idea each, and a conclusion. Mostly flowing paragraphs.',
  Letter:
    'Sender and date placeholders, a greeting, a clear body in short paragraphs, a closing line and a sign-off with a name placeholder.',
  Email:
    'A "Subject:" line, a greeting, a short clear body, a closing and a sign-off. Keep it concise.',
  Resume:
    'Name and contact placeholders, a short profile, skills, experience and education as bullet lists. Use placeholders for every personal detail.',
  'Cover letter':
    'Sender and employer placeholders, a greeting, an opening that names the role, two short paragraphs about fit, and a closing with a sign-off.',
  'Meeting minutes':
    'Meeting title, date, attendees and agenda placeholders, discussion points, decisions, and action items with owner and deadline.',
  Proposal:
    'A title, summary, problem or opportunity, proposed solution, scope and timeline, budget placeholders, and next steps.',
  'Blog post':
    'A catchy title, a short introduction, headed sections with practical points, and a closing takeaway.',
};

export type Length = 'SHORT' | 'MEDIUM' | 'LONG';

export const LENGTH_SPEC = {
  SHORT: { words: 300, maxWords: 380, maxTokens: 2500 },
  MEDIUM: { words: 700, maxWords: 850, maxTokens: 4500 },
  LONG: { words: 1500, maxWords: 1800, maxTokens: 2500 }, // per section
} as const;

export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const GUEST_COOKIE = 'documind_guest';
export const TIME_BUDGET_MS = 270_000;
