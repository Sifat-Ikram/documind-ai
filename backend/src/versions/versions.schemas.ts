import { z } from 'zod';

export const saveVersionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine((n) => !/[\\/]/.test(n), 'Title cannot contain slashes')
    .optional(),
  html: z.string().min(1).max(3_000_000),
  basedOn: z.number().int().min(1),
  expectedCurrentVersion: z.number().int().min(1),
  force: z.boolean().optional(),
});
export type SaveVersionDto = z.infer<typeof saveVersionSchema>;

export const compareQuerySchema = z.object({
  from: z.coerce.number().int().min(1),
  to: z.coerce.number().int().min(1),
});
export type CompareQuery = z.infer<typeof compareQuerySchema>;

export const editorQuerySchema = z.object({
  version: z.coerce.number().int().min(1).optional(),
});
export type EditorQuery = z.infer<typeof editorQuerySchema>;
