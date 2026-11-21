import { z } from 'zod';

export const createFeedbackSchema = z.object({
  type: z.enum(['FEEDBACK', 'BUG_REPORT']).default('FEEDBACK'),
  subject: z.string().trim().min(3, 'Subject is too short').max(120),
  message: z
    .string()
    .trim()
    .min(10, 'Please describe it in at least 10 characters')
    .max(4000),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});
export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;
