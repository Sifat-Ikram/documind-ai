export const baseSummary = {
  id: true,
  originalName: true,
  fileType: true,
  fileSize: true,
  wordCount: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  currentVersion: true,
  source: true,
  category: { select: { id: true, slug: true, name: true, icon: true } },
} as const;

/** Favorites, tags and collections are personal, so they are filtered by the current user. */
export const summarySelect = (userId: string) =>
  ({
    ...baseSummary,
    favorites: { where: { userId }, select: { userId: true } },
    tags: {
      where: { tag: { userId } },
      select: { tag: { select: { id: true, name: true } } },
    },
    collections: {
      where: { collection: { userId } },
      select: { collection: { select: { id: true, name: true } } },
    },
  }) as const;

interface UserData {
  favorites: unknown[];
  tags: { tag: { id: string; name: string } }[];
  collections: { collection: { id: string; name: string } }[];
}

export function withUserData<T extends UserData>(row: T) {
  const { favorites, tags, collections, ...rest } = row;
  return {
    ...rest,
    isFavorite: favorites.length > 0,
    tags: tags.map((t) => t.tag),
    collections: collections.map((c) => c.collection),
  };
}
