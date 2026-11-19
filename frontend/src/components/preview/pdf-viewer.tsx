"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import {
  FiChevronLeft,
  FiChevronRight,
  FiMaximize,
  FiMinimize,
  FiMinus,
  FiPlus,
} from "react-icons/fi";
import { cn } from "@/lib/cn";

type Zoom = "fit" | number;
const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function PdfViewer({
  url,
  onError,
}: {
  url: string;
  onError: (message: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const taskRef = useRef<RenderTask | null>(null);
  const onErrorRef = useRef(onError);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageText, setPageText] = useState("1");
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [areaWidth, setAreaWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    onErrorRef.current = onError;
  });

  // load the file
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const res = await fetch(url);
        if (!res.ok) throw new Error("The file could not be loaded.");
        const data = new Uint8Array(await res.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          void doc.loadingTask.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setPage(1);
        setPageText("1");
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        onErrorRef.current(
          err instanceof TypeError
            ? "The preview could not load this file in your browser."
            : "This PDF could not be displayed here.",
        );
      }
    })();
    return () => {
      cancelled = true;
      taskRef.current?.cancel();
      void docRef.current?.loadingTask.destroy();
      docRef.current = null;
    };
  }, [url]);

  // width of the viewing area (for "Fit")
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setAreaWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // draw the current page
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || numPages === 0) return;
    if (zoom === "fit" && areaWidth === 0) return;

    let cancelled = false;
    (async () => {
      const pdfPage = await doc.getPage(page);
      if (cancelled) return;

      taskRef.current?.cancel();
      const base = pdfPage.getViewport({ scale: 1 });
      const scale =
        zoom === "fit" ? Math.max(0.3, (areaWidth - 32) / base.width) : zoom;
      const ratio = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale: scale * ratio });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
      canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;

      const context = canvas.getContext("2d");
      if (!context) return;
      const task = pdfPage.render({ canvas, viewport });
      taskRef.current = task;
      try {
        await task.promise;
      } catch {
        // a newer drawing replaced this one
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, zoom, areaWidth, numPages]);

  // fullscreen
  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function goTo(next: number) {
    const clamped = Math.min(Math.max(1, next), Math.max(1, numPages));
    setPage(clamped);
    setPageText(String(clamped));
  }

  const effective = zoom === "fit" ? 1 : zoom;
  const zoomIn = () =>
    setZoom(STEPS.find((s) => s > effective + 0.01) ?? STEPS[STEPS.length - 1]);
  const zoomOut = () =>
    setZoom([...STEPS].reverse().find((s) => s < effective - 0.01) ?? STEPS[0]);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen?.();
  }

  return (
    <div
      ref={wrapRef}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-surface",
        fullscreen ? "h-screen rounded-none border-0 bg-bg" : "h-[75vh]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <IconButton
            label="Previous page"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
          >
            <FiChevronLeft className="size-4" />
          </IconButton>
          <label className="flex items-center gap-1.5 text-sm text-text-muted">
            <span className="sr-only">Page number</span>
            <input
              inputMode="numeric"
              value={pageText}
              onChange={(e) => setPageText(e.target.value.replace(/\D/g, ""))}
              onBlur={() => goTo(Number(pageText) || page)}
              onKeyDown={(e) =>
                e.key === "Enter" && goTo(Number(pageText) || page)
              }
              className="h-9 w-12 rounded-lg border border-border-strong bg-surface text-center text-sm text-text"
            />
            / {numPages || "…"}
          </label>
          <IconButton
            label="Next page"
            onClick={() => goTo(page + 1)}
            disabled={page >= numPages}
          >
            <FiChevronRight className="size-4" />
          </IconButton>
        </div>

        <div className="flex items-center gap-1">
          <IconButton label="Zoom out" onClick={zoomOut}>
            <FiMinus className="size-4" />
          </IconButton>
          <span className="w-12 text-center text-sm tabular-nums text-text-muted">
            {zoom === "fit" ? "Fit" : `${Math.round(zoom * 100)}%`}
          </span>
          <IconButton label="Zoom in" onClick={zoomIn}>
            <FiPlus className="size-4" />
          </IconButton>
          <button
            type="button"
            onClick={() => setZoom("fit")}
            className="h-9 rounded-lg px-3 text-sm text-text-muted hover:bg-surface-muted hover:text-text"
          >
            Fit width
          </button>
          <IconButton
            label={fullscreen ? "Exit full screen" : "Full screen"}
            onClick={toggleFullscreen}
          >
            {fullscreen ? (
              <FiMinimize className="size-4" />
            ) : (
              <FiMaximize className="size-4" />
            )}
          </IconButton>
        </div>
      </div>

      <div
        ref={areaRef}
        tabIndex={0}
        aria-label="PDF pages. Use the left and right arrow keys to change the page."
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "PageDown") goTo(page + 1);
          if (e.key === "ArrowLeft" || e.key === "PageUp") goTo(page - 1);
        }}
        className="flex-1 overflow-auto bg-surface-muted p-4 outline-none"
      >
        {loading ? (
          <p className="animate-pulse py-10 text-center text-sm text-text-muted">
            Loading the document…
          </p>
        ) : (
          <canvas
            ref={canvasRef}
            className="mx-auto block bg-white shadow-md"
          />
        )}
      </div>
    </div>
  );
}
