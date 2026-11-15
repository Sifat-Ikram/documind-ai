import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_PREFERENCES,
  preferencesSchema,
  type Preferences,
  type PreferencesPatch,
} from './preferences.schemas';

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Defaults + whatever is stored. A damaged value falls back to the defaults. */
function resolve(stored: unknown): Preferences {
  const s = asObject(stored);
  const merged = {
    appearance: {
      ...DEFAULT_PREFERENCES.appearance,
      ...asObject(s.appearance),
    },
    ai: { ...DEFAULT_PREFERENCES.ai, ...asObject(s.ai) },
    documents: { ...DEFAULT_PREFERENCES.documents, ...asObject(s.documents) },
    view: { ...DEFAULT_PREFERENCES.view, ...asObject(s.view) },
  };
  const parsed = preferencesSchema.safeParse(merged);
  return parsed.success ? parsed.data : structuredClone(DEFAULT_PREFERENCES);
}

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<Preferences> {
    const row = await this.prisma.userPreference.findUnique({
      where: { userId },
      select: { data: true },
    });
    return resolve(row?.data);
  }

  async update(userId: string, patch: PreferencesPatch): Promise<Preferences> {
    const current = await this.get(userId);
    const next = resolve({
      appearance: { ...current.appearance, ...patch.appearance },
      ai: { ...current.ai, ...patch.ai },
      documents: { ...current.documents, ...patch.documents },
      view: { ...current.view, ...patch.view },
    });

    await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, data: next as unknown as Prisma.InputJsonValue },
      update: { data: next as unknown as Prisma.InputJsonValue },
    });
    return next;
  }
}
