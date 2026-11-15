import { z } from 'zod';
import { tagNameSchema } from '../tags/tags.schemas';

const documentIds = z.array(z.string().min(1).max(60)).min(1).max(100);

export const bulkSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('trash'), documentIds }),
  z.object({ action: z.literal('archive'), documentIds }),
  z.object({ action: z.literal('unarchive'), documentIds }),
  z.object({ action: z.literal('favorite'), documentIds }),
  z.object({ action: z.literal('unfavorite'), documentIds }),
  z.object({
    action: z.literal('move'),
    documentIds,
    collectionId: z.string().min(1).max(60).nullable(),
    fromCollectionId: z.string().min(1).max(60).optional(),
  }),
  z.object({
    action: z.literal('add_tags'),
    documentIds,
    tagNames: z.array(tagNameSchema).min(1).max(20),
  }),
  z.object({
    action: z.literal('remove_tags'),
    documentIds,
    tagIds: z.array(z.string().min(1).max(60)).min(1).max(20),
  }),
  z.object({
    action: z.literal('set_category'),
    documentIds,
    categoryId: z.string().min(1).max(60).nullable(),
  }),
  z.object({ action: z.literal('download'), documentIds }),
]);
export type BulkDto = z.infer<typeof bulkSchema>;
