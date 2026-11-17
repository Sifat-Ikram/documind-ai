import { z } from 'zod';

export const converterSignatureSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  fileSize: z.number().int().positive(),
});
export type ConverterSignatureDto = z.infer<typeof converterSignatureSchema>;

export const convertSchema = z.object({
  publicId: z.string().min(1).max(300),
  originalName: z.string().trim().min(1).max(200),
  target: z.enum(['pdf', 'docx', 'txt']),
});
export type ConvertDto = z.infer<typeof convertSchema>;
