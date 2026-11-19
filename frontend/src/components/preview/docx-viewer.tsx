"use client";

import { useEffect, useRef, useState } from "react";

export function DocxViewer({
  url,
  onError,
}: {
  url: string;
  onError: (message: string) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const el = bodyRef.current;
    let cancelled = false;
    (async () => {
      try {
        const [{ renderAsync }, res] = await Promise.all([
          import("docx-preview"),
          fetch(url),
        ]);
        if (!res.ok) throw new Error("The file could not be loaded.");
        const buffer = await res.arrayBuffer();
        if (cancelled || !el) return;
        el.innerHTML = "";
        await renderAsync(buffer, el, undefined, {
          className: "docx",
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
        });
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        onErrorRef.current(
          err instanceof TypeError
            ? "The preview could not load this file in your browser."
            : "This Word document could not be displayed here.",
        );
      }
    })();
    return () => {
      cancelled = true;
      if (el) el.innerHTML = "";
    };
  }, [url]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {loading && (
        <p className="animate-pulse px-4 py-10 text-center text-sm text-text-muted">
          Loading the document…
        </p>
      )}
      <div ref={bodyRef} className="max-h-[75vh] overflow-auto" />
    </div>
  );
}
