import { z } from 'zod';

export const TASK_TYPES = [
  'SUMMARIZE',
  'EXTRACT_KEY_POINTS',
  'DOCUMENT_QA',
  'EXTRACT_DATA',
  'SIMPLIFY',
  'TRANSLATE',
  'EXTRACT_ACTION_ITEMS',
] as const;

export const taskTypeSchema = z.enum(TASK_TYPES);
export type TaskTypeValue = z.infer<typeof taskTypeSchema>;

export interface DetectionResult {
  tasks: TaskTypeValue[];
  targetLanguage: string | null;
  confidence: number;
  usedFallback: boolean;
}
