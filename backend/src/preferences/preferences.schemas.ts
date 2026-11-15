import { z } from 'zod';

const appearance = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  density: z.enum(['comfortable', 'compact']),
  textSize: z.enum(['normal', 'large']),
  reduceMotion: z.boolean(),
});

const ai = z.object({
  language: z.string().trim().min(1).max(40),
  length: z.enum(['short', 'medium', 'detailed']),
  style: z.enum(['standard', 'simple', 'detailed', 'technical']),
  tone: z.enum(['neutral', 'formal', 'friendly']),
  format: z.enum(['paragraphs', 'bullets']),
});

const documents = z.object({
  afterUpload: z.enum(['stay', 'open_details', 'open_analyze']),
  exportFormat: z.enum(['pdf', 'docx', 'txt']),
  defaultCollectionId: z.string().min(1).nullable(),
  confirmBeforeTrash: z.boolean(),
});

const view = z.object({
  mode: z.enum(['grid', 'list']),
  sort: z.enum(['createdAt', 'updatedAt', 'name', 'size']),
  order: z.enum(['asc', 'desc']),
  perPage: z.union([z.literal(12), z.literal(24), z.literal(48)]),
});

export const preferencesSchema = z.object({ appearance, ai, documents, view });
export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  appearance: {
    theme: 'system',
    density: 'comfortable',
    textSize: 'normal',
    reduceMotion: false,
  },
  ai: {
    language: 'auto',
    length: 'medium',
    style: 'standard',
    tone: 'neutral',
    format: 'paragraphs',
  },
  documents: {
    afterUpload: 'stay',
    exportFormat: 'pdf',
    defaultCollectionId: null,
    confirmBeforeTrash: true,
  },
  view: { mode: 'grid', sort: 'createdAt', order: 'desc', perPage: 12 },
};

// Any section and any field inside it can be sent on its own.
export const preferencesPatchSchema = z.object({
  appearance: appearance.partial().optional(),
  ai: ai.partial().optional(),
  documents: documents.partial().optional(),
  view: view.partial().optional(),
});
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
