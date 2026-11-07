import { z } from 'zod';
import { taskTypeSchema } from '../ai/ai.types';

const instruction = z
  .string()
  .trim()
  .min(3, 'Write what you want to do with the document')
  .max(1000, 'Instruction must be at most 1000 characters');

export const detectTaskSchema = z.object({ instruction });
export type DetectTaskDto = z.infer<typeof detectTaskSchema>;

export const analyzeSchema = z.object({
  instruction,
  tasks: z.array(taskTypeSchema).min(1).max(7).optional(),
  targetLanguage: z.string().trim().min(1).max(40).nullable().optional(),
  usedFallback: z.boolean().optional(),
});
export type AnalyzeDto = z.infer<typeof analyzeSchema>;

export const listAnalysesQuerySchema = z.object({
  documentId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type ListAnalysesQuery = z.infer<typeof listAnalysesQuerySchema>;
