import { z } from 'zod';

export const uploadSignatureSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  fileSize: z.number().int().positive(),
});
export type UploadSignatureDto = z.infer<typeof uploadSignatureSchema>;

export const confirmUploadSchema = z.object({
  publicId: z.string().min(1).max(300),
  originalName: z.string().trim().min(1).max(200),
});
export type ConfirmUploadDto = z.infer<typeof confirmUploadSchema>;

export const renameDocumentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name must be at most 120 characters')
    .refine((n) => !/[\\/]/.test(n), 'Name cannot contain slashes'),
});
export type RenameDocumentDto = z.infer<typeof renameDocumentSchema>;

export const listDocumentsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  type: z.enum(['PDF', 'DOCX', 'TXT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
