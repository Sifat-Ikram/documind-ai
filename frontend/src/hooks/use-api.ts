"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface State<T> {
  key: string | null;
  data: T | null;
  error: unknown;
}

export function useApi<T>(path: string | null) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<State<T>>({
    key: null,
    data: null,
    error: null,
  });
  const key = path === null ? null : `${path}|${nonce}`;

  useEffect(() => {
    if (path === null || key === null) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => setState({ key, data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((s) => ({ key, data: s.data, error }));
      });
    return () => controller.abort();
  }, [path, key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const settled = key !== null && state.key === key;

  return {
    data: path === null ? null : state.data,
    error: settled ? state.error : null,
    loading: key !== null && !settled,
    reload,
  };
}
