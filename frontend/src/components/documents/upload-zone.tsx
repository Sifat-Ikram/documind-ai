"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiFile,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ACCEPT, fileTypeOf, validateFile } from "@/lib/files";
import { uploadDocument } from "@/lib/upload";
import { formatBytes } from "@/lib/utils";

type Status =
  | "queued"
  | "preparing"
  | "uploading"
  | "processing"
  | "done"
  | "error";

interface QueueItem {
  id: string;
  name: string;
  size: number;
  status: Status;
  progress: number;
  error?: string;
  warnings?: string[];
  documentId?: string;
}

const STATUS_TEXT: Record<Status, string> = {
  queued: "Waiting",
  preparing: "Preparing…",
  uploading: "Uploading",
  processing: "Reading the text…",
  done: "Uploaded",
  error: "Failed",
};

export function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const jobs = useRef<{ id: string; file: File }[]>([]);
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const onUploadedRef = useRef(onUploaded);

  useEffect(() => {
    onUploadedRef.current = onUploaded;
  });

  useEffect(() => {
    controller.current = new AbortController();
    return () => controller.current?.abort();
  }, []);

  const patch = useCallback((id: string, changes: Partial<QueueItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }, []);

  // Files go one after another, so a slow connection is not overloaded.
  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    while (jobs.current.length > 0) {
      const signal = controller.current?.signal;
      const job = jobs.current.shift();
      if (!signal || signal.aborted || !job) break;

      try {
        const result = await uploadDocument(job.file, {
          signal,
          onStage: (status) => patch(job.id, { status }),
          onProgress: (progress) => patch(job.id, { progress }),
        });
        patch(job.id, {
          status: "done",
          progress: 100,
          documentId: result.document.id,
          warnings: result.warnings,
        });
        result.warnings.forEach((w) => toast.warning(`${job.file.name}: ${w}`));
        onUploadedRef.current();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") break;
        patch(job.id, { status: "error", error: errorMessage(err) });
      }
    }

    running.current = false;
  }, [patch]);

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const added = files.map((file): QueueItem => {
        const id = crypto.randomUUID();
        const problem = validateFile(file);
        if (problem) {
          return {
            id,
            name: file.name,
            size: file.size,
            status: "error",
            progress: 0,
            error: problem,
          };
        }
        jobs.current.push({ id, file });
        return {
          id,
          name: file.name,
          size: file.size,
          status: "queued",
          progress: 0,
        };
      });
      setItems((prev) => [...added, ...prev]);
      void drain();
    },
    [drain],
  );

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null))
      setDragging(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  const hasFinished = items.some(
    (i) => i.status === "done" || i.status === "error",
  );

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-text">Upload documents</h2>
      <p className="mt-1 text-sm text-text-muted">
        Add the files you want to work with. We read the text from each one, so
        the AI can analyze it or answer questions about it.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files. Drop files here or press Enter to browse."
        onClick={() => inputRef.current?.click()}
        onKeyDown={onKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "mt-4 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-primary bg-primary-soft"
            : "border-border-strong hover:bg-surface-muted",
        )}
      >
        <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-text-muted">
          <FiUploadCloud className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm font-semibold text-text">
          {dragging
            ? "Drop to upload"
            : "Drag and drop files here, or click to browse"}
        </p>
        <p className="mt-1 text-sm text-text-muted">
          PDF, DOCX or TXT · up to 5 MB each
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {items.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Uploads</h3>
            {hasFinished && (
              <button
                type="button"
                onClick={() =>
                  setItems((prev) =>
                    prev.filter(
                      (i) => i.status !== "done" && i.status !== "error",
                    ),
                  )
                }
                className="text-sm font-medium text-link hover:underline"
              >
                Clear finished
              </button>
            )}
          </div>
          <ul className="mt-3 space-y-2.5">
            {items.map((item) => {
              const type = fileTypeOf(item.name);
              const active =
                item.status === "preparing" ||
                item.status === "uploading" ||
                item.status === "processing";
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    {type ? (
                      <FileTypeBadge type={type} className="h-9 w-12" />
                    ) : (
                      <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg bg-surface-muted text-text-muted">
                        <FiFile className="size-4" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">
                        {item.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatBytes(item.size)} · {STATUS_TEXT[item.status]}
                        {item.status === "uploading"
                          ? ` ${item.progress}%`
                          : ""}
                      </p>
                    </div>

                    {active && <Spinner className="size-4 text-text-muted" />}
                    {item.status === "done" && (
                      <div className="flex items-center gap-3">
                        <FiCheckCircle
                          className="size-5 text-success"
                          aria-label="Uploaded"
                        />
                        {item.documentId && (
                          <Link
                            href={`/documents/${item.documentId}`}
                            className="text-sm font-medium text-link hover:underline"
                          >
                            Open
                          </Link>
                        )}
                      </div>
                    )}
                    {item.status === "error" && (
                      <FiAlertCircle
                        className="size-5 text-error"
                        aria-label="Failed"
                      />
                    )}
                    {(item.status === "done" || item.status === "error") && (
                      <button
                        type="button"
                        aria-label={`Remove ${item.name} from the list`}
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter((i) => i.id !== item.id),
                          )
                        }
                        className="grid size-7 place-items-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text"
                      >
                        <FiX className="size-4" />
                      </button>
                    )}
                  </div>

                  {item.status === "uploading" && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.error && (
                    <p className="mt-2 text-sm text-error-text">{item.error}</p>
                  )}
                  {item.warnings?.map((w) => (
                    <p key={w} className="mt-2 flex gap-2 text-sm text-warning">
                      <FiAlertTriangle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{w}</span>
                    </p>
                  ))}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ul className="mt-5 grid gap-x-6 gap-y-2 border-t border-border pt-5 text-sm text-text-muted sm:grid-cols-2">
        <li>
          The text is extracted and saved, the original file is stored securely
          for download.
        </li>
        <li>
          Scanned PDFs (pictures of pages) have no text, so they cannot be read.
        </li>
        <li>Old .doc files are not supported. Save them as .docx first.</li>
        <li>
          Files use a public link, so please do not upload sensitive documents.
        </li>
      </ul>
    </section>
  );
}
