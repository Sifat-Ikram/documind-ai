import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Enter a valid email address')),
  subject: z.string().trim().min(3, 'Enter a subject').max(120),
  message: z.string().trim().min(10, 'Write a few more words').max(3000),
  // a hidden field real people never fill in; bots do
  website: z.string().max(200).optional(),
});
export type ContactDto = z.infer<typeof contactSchema>;
