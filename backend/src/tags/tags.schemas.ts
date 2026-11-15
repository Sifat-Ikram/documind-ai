import { z } from 'zod';

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, 'Tag cannot be empty')
  .max(30, 'Tag must be at most 30 characters')
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u,
    'Tags can contain letters, numbers, spaces, - and _',
  );

export const createTagSchema = z.object({ name: tagNameSchema });
export type CreateTagDto = z.infer<typeof createTagSchema>;

export const renameTagSchema = z.object({ name: tagNameSchema });
export type RenameTagDto = z.infer<typeof renameTagSchema>;

export const setDocumentTagsSchema = z.object({
  tags: z.array(tagNameSchema).max(20, 'A document can have at most 20 tags'),
});
export type SetDocumentTagsDto = z.infer<typeof setDocumentTagsSchema>;
