"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface State<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
}

export function useApi<T>(path: string) {
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: true,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((s) => ({ ...s, error, loading: false }));
      });
    return () => controller.abort();
  }, [path, nonce]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, error: null, loading: true }));
    setNonce((n) => n + 1);
  }, []);

  return { ...state, reload };
}
