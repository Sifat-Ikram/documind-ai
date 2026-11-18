"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { api, errorMessage } from "@/lib/api";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_PREFERENCES,
  applyAppearance,
  mergePreferences,
  readStoredAppearance,
  storeAppearance,
  type Preferences,
  type PreferencesPatch,
} from "@/lib/preferences";

interface PreferencesContextValue {
  preferences: Preferences;
  /** true once this user's saved settings have been loaded from the server */
  ready: boolean;
  /** Applies the change at once, then saves it. Rolls back (and shows an error) if saving fails. */
  update: (patch: PreferencesPatch) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(() => ({
    ...DEFAULT_PREFERENCES,
    appearance: readStoredAppearance(),
  }));
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const current = useRef(preferences);

  const commit = useCallback((next: Preferences) => {
    current.current = next;
    setPreferences(next);
  }, []);

  const userId = user?.id ?? null;

  // load this user's settings from the server
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api<{ preferences: Preferences }>("/users/preferences")
      .then(({ preferences: p }) => {
        if (cancelled) return;
        commit(p);
        applyAppearance(p.appearance);
        storeAppearance(p.appearance);
        setLoadedFor(userId);
      })
      .catch(() => {
        if (!cancelled) setLoadedFor(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, commit]);

  // "System" theme follows the device while the page is open
  const theme = preferences.appearance.theme;
  useEffect(() => {
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance(current.current.appearance);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  // another tab changed the appearance
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== APPEARANCE_STORAGE_KEY) return;
      const appearance = readStoredAppearance();
      commit({ ...current.current, appearance });
      applyAppearance(appearance);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [commit]);

  const update = useCallback(
    async (patch: PreferencesPatch) => {
      const previous = current.current;
      const optimistic = mergePreferences(previous, patch);
      commit(optimistic);
      if (patch.appearance) {
        applyAppearance(optimistic.appearance);
        storeAppearance(optimistic.appearance);
      }
      try {
        const res = await api<{ preferences: Preferences }>(
          "/users/preferences",
          {
            method: "PATCH",
            body: patch,
          },
        );
        commit(res.preferences);
        applyAppearance(res.preferences.appearance);
        storeAppearance(res.preferences.appearance);
      } catch (err) {
        commit(previous);
        applyAppearance(previous.appearance);
        storeAppearance(previous.appearance);
        toast.error(errorMessage(err), { id: "prefs-error" });
        throw err;
      }
    },
    [commit],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      ready: userId !== null && loadedFor === userId,
      update,
    }),
    [preferences, userId, loadedFor, update],
  );

  return (
    <PreferencesContext.Provider value={value}>
      <MotionConfig
        reducedMotion={preferences.appearance.reduceMotion ? "always" : "user"}
      >
        {children}
      </MotionConfig>
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx)
    throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return ctx;
}
