import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
});
export type CreateConversationDto = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Write a message')
    .max(2000, 'Message must be at most 2000 characters'),
});
export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const listConversationsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type ListConversationsQuery = z.infer<
  typeof listConversationsQuerySchema
>;
