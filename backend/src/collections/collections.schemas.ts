import { z } from 'zod';
import { shareEmailSchema, shareRoleSchema } from '../sharing/sharing.schemas';

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

export const addMemberSchema = z.object({
  email: shareEmailSchema,
  role: shareRoleSchema,
});
export type AddMemberDto = z.infer<typeof addMemberSchema>;

export const updateMemberSchema = z.object({ role: shareRoleSchema });
export type UpdateMemberDto = z.infer<typeof updateMemberSchema>;

export const collectionDocsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'name', 'size']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type CollectionDocsQuery = z.infer<typeof collectionDocsQuerySchema>;
