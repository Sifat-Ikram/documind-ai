import { z } from 'zod';

const name = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(60, 'Name must be at most 60 characters');
const description = z
  .string()
  .trim()
  .max(300, 'Description must be at most 300 characters');

export const createCollectionSchema = z.object({
  name,
  description: description.optional(),
});
export type CreateCollectionDto = z.infer<typeof createCollectionSchema>;

export const updateCollectionSchema = z.object({
  name: name.optional(),
  description: description.nullable().optional(),
});
export type UpdateCollectionDto = z.infer<typeof updateCollectionSchema>;

export const addDocumentsSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1).max(100),
});
export type AddDocumentsDto = z.infer<typeof addDocumentsSchema>;
