"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { AdminInterval, AdminRange } from "@/types/admin";

interface Entry<T> {
  key: string;
  data?: T;
  error?: unknown;
}

export function useAdminData<T>(path: string | null) {
  const [nonce, setNonce] = useState(0);
  const key = `${path ?? "none"}#${nonce}`;
  const [entry, setEntry] = useState<Entry<T> | null>(null);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    api<T>(path)
      .then((data) => {
        if (alive) setEntry({ key, data });
      })
      .catch((error: unknown) => {
        if (alive) setEntry({ key, error });
      });
    return () => {
      alive = false;
    };
  }, [path, key]);

  const current = entry?.key === key ? entry : null;
  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: Boolean(path) && !current,
    reload,
  };
}

export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function useRangeFilter(
  initial: AdminRange = "30d",
  initialInterval?: AdminInterval,
) {
  const [range, setRangeState] = useState<AdminRange>(initial);
  const [interval, setInterval] = useState<AdminInterval>(
    initialInterval ?? (initial === "12m" ? "month" : "day"),
  );

  const setRange = useCallback((next: AdminRange) => {
    setRangeState(next);
    setInterval(next === "12m" ? "month" : "day");
  }, []);

  const query = useMemo(
    () => buildQuery({ range, interval }),
    [range, interval],
  );
  return { range, interval, setRange, setInterval, query };
}
