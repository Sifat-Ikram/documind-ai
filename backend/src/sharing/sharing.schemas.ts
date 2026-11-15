import { z } from 'zod';

export const shareEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Email not valid'));
export const shareRoleSchema = z.enum(['VIEWER', 'EDITOR']);

export const shareSchema = z.object({
  email: shareEmailSchema,
  role: shareRoleSchema,
});
export type ShareDto = z.infer<typeof shareSchema>;

export const updateShareSchema = z.object({ role: shareRoleSchema });
export type UpdateShareDto = z.infer<typeof updateShareSchema>;

export const sharedListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  type: z.enum(['PDF', 'DOCX', 'TXT']).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'name', 'size']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type SharedListQuery = z.infer<typeof sharedListQuerySchema>;

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Write a comment')
    .max(2000, 'Comment must be at most 2000 characters'),
});
export type CommentDto = z.infer<typeof commentSchema>;

export const noteSchema = z.object({
  content: z.string().max(20000, 'The note must be at most 20000 characters'),
  revision: z.number().int().min(0),
});
export type NoteDto = z.infer<typeof noteSchema>;
