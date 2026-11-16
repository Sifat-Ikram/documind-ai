import { z } from 'zod';
import { DOC_TYPES } from './generator.constants';

const docType = z.enum(DOC_TYPES);
const language = z.string().trim().min(1).max(40).optional();
const tone = z.enum(['neutral', 'formal', 'friendly']).optional();

export const generateSchema = z.object({
  docType,
  length: z.enum(['SHORT', 'MEDIUM', 'LONG']),
  instructions: z
    .string()
    .trim()
    .min(5, 'Describe what the document should be about')
    .max(2000),
  title: z.string().trim().min(1).max(150).optional(),
  language,
  tone,
});
export type GenerateDto = z.infer<typeof generateSchema>;

export const continueSchema = z.object({
  content: z.string().min(20).max(60000),
  docType: docType.optional(),
  instructions: z.string().trim().max(2000).optional(),
  language,
  tone,
  generatedId: z.string().min(1).max(60).optional(),
});
export type ContinueDto = z.infer<typeof continueSchema>;

export const exportSchema = z.object({
  format: z.enum(['pdf', 'docx', 'txt']),
  title: z.string().trim().max(150).optional(),
  content: z.string().min(1).max(200000),
});
export type ExportDto = z.infer<typeof exportSchema>;

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

export const updateHistorySchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    content: z.string().min(1).max(200000).optional(),
  })
  .refine(
    (d) => d.title !== undefined || d.content !== undefined,
    'Nothing to update',
  );
export type UpdateHistoryDto = z.infer<typeof updateHistorySchema>;

export const saveHistorySchema = z.object({
  format: z.enum(['docx', 'txt']).default('docx'),
  categoryId: z.string().min(1).max(60).nullable().optional(),
});
export type SaveHistoryDto = z.infer<typeof saveHistorySchema>;
