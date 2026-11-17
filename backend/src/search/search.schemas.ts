import { z } from 'zod';

const terms = z.array(z.string().trim().min(1).max(40)).max(20);

export const searchSchema = z.object({
  query: z.string().trim().min(2, 'Write a few words to search for').max(300),
  // false = plain word matching only (no AI request)
  useAi: z.boolean().default(true),
  // send the "terms" of a previous answer to search again without asking the AI again
  terms: terms.optional(),
  scope: z.enum(['all', 'mine', 'shared']).default('all'),
  type: z.enum(['PDF', 'DOCX', 'TXT']).optional(),
  category: z.string().trim().min(1).max(40).optional(), // a category slug, or "none"
  collectionId: z.string().min(1).max(60).optional(),
  tagId: z.string().min(1).max(60).optional(),
  includeArchived: z.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});
export type SearchDto = z.infer<typeof searchSchema>;

export const answerSchema = z.object({
  query: z.string().trim().min(2).max(300),
  terms: terms.optional(),
  documentIds: z.array(z.string().min(1).max(60)).min(1).max(8),
});
export type AnswerDto = z.infer<typeof answerSchema>;
