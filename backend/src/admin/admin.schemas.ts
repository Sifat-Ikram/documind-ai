import { z } from 'zod';
import {
  defaultIntervalFor,
  INTERVALS,
  RANGES,
  type RangeQuery,
} from './admin.utils';

const rangeSchema = z
  .object({
    range: z.enum(RANGES).default('30d'),
    interval: z.enum(INTERVALS).optional(),
  })
  .transform(
    (value): RangeQuery => ({
      range: value.range,
      interval: value.interval ?? defaultIntervalFor(value.range),
    }),
  );

export const rangeQuerySchema = rangeSchema;
export type RangeQueryDto = z.infer<typeof rangeQuerySchema>;

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  status: z.enum(['active', 'blocked']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const blockUserSchema = z.object({ blocked: z.boolean() });
export type BlockUserDto = z.infer<typeof blockUserSchema>;

export const listDocumentsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  type: z.enum(['PDF', 'DOCX', 'TXT']).optional(),
  status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListAdminDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

export const listFeedbackQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  type: z.enum(['FEEDBACK', 'BUG_REPORT']).optional(),
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED']),
});
export type UpdateFeedbackStatusDto = z.infer<
  typeof updateFeedbackStatusSchema
>;

export const listContactQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  state: z.enum(['all', 'pending', 'read']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListContactQuery = z.infer<typeof listContactQuerySchema>;

export const promoteAdminSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
});
export type PromoteAdminDto = z.infer<typeof promoteAdminSchema>;

export const adminNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters'),
});
export type AdminNameDto = z.infer<typeof adminNameSchema>;
