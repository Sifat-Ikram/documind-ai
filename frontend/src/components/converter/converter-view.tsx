"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import {
  FiAlertTriangle,
  FiDownload,
  FiRepeat,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { saveFromUrl } from "@/lib/download";
import { fileTypeOf, validateFile } from "@/lib/files";
import { uploadWithSignature, type SignatureResponse } from "@/lib/upload";
import { formatBytes, formatDateTime, formatRelative } from "@/lib/utils";
import type { FileType } from "@/types/api";

type Format = "pdf" | "docx" | "txt";

interface Conversion {
  from: Format;
  to: Format;
  note: string;
}

interface Job {
  id: string;
  sourceName: string;
  sourceFormat: string;
  targetFormat: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  warnings: string[];
  createdAt: string;
  expiresAt: string;
  hoursLeft: number;
}

interface ConvertResponse {
  job: Job;
  warnings: string[];
  preview: { text: string; truncated: boolean };
}

const SOURCE_ACCEPT = ".pdf,.docx,.txt";

const upper = (format: string) => format.toUpperCase();

function Note({ children }: { children: string }) {
  return (
    <p className="flex gap-2 text-sm text-text-muted">
      <FiAlertTriangle
        className="mt-0.5 size-4 shrink-0 text-warning"
        aria-hidden="true"
      />
      <span>{children}</span>
    </p>
  );
}

export function ConverterView() {
  const formats = useApi<{ items: Conversion[] }>("/converter/formats");
  const jobs = useApi<{ items: Job[]; keepHours: number }>("/converter/jobs");

  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<Format | "">("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"uploading" | "converting" | null>(null);
  const [progress, setProgress] = useState(0);
  const [problem, setProblem] = useState("");
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sourceType = file ? fileTypeOf(file.name) : null;
  const from = sourceType ? (sourceType.toLowerCase() as Format) : null;

  const conversions = useMemo(
    () => (formats.data?.items ?? []).filter((c) => c.from === from),
    [formats.data, from],
  );
  const chosen = (
    conversions.some((c) => c.to === target) ? target : conversions[0]?.to ?? ""
  ) as Format | "";
  const chosenNote = conversions.find((c) => c.to === chosen)?.note;

  function pick(next: File | null) {
    if (!next) return;
    const invalid = validateFile(next);
    if (invalid) {
      setProblem(invalid);
      return;
    }
    setProblem("");
    setResult(null);
    setTarget("");
    setFile(next);
  }

  async function convert() {
    if (!file || !chosen) return;
    setProblem("");
    setResult(null);
    setBusy("uploading");
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const sig = await api<SignatureResponse>("/converter/upload-signature", {
        method: "POST",
        body: { fileName: file.name, fileSize: file.size },
      });
      await uploadWithSignature(sig, file, setProgress, controller.signal);

      setBusy("converting");
      const data = await api<ConvertResponse>("/converter/convert", {
        method: "POST",
        body: {
          publicId: sig.publicId,
          originalName: file.name,
          target: chosen,
        },
      });
      setResult(data);
      jobs.reload();
      toast.success("Converted. The file is ready to download.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setProblem(errorMessage(err));
    } finally {
      abortRef.current = null;
      setBusy(null);
      setProgress(0);
    }
  }

  async function remove(job: Job) {
    setDeleting(job.id);
    try {
      await api(`/converter/jobs/${job.id}`, { method: "DELETE" });
      if (result?.job.id === job.id) setResult(null);
      jobs.reload();
      toast.success("Converted file deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(null);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0] ?? null);
  }

  const keepHours = jobs.data?.keepHours ?? 24;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Document Converter
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
          Convert a document to another format. Upload a PDF, DOCX or TXT file
          up to 5 MB, pick the format you need and download the result. Files
          stay available for {keepHours} hours.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-text">
          1. Choose a file
        </h2>

        <div
          role="button"
          tabIndex={0}
          aria-label="Choose a file to convert. Drop a file here or press Enter to browse."
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null))
              setDragging(false);
          }}
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
              ? "Drop to select"
              : "Drag and drop a file here, or click to browse"}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            PDF, DOCX or TXT · up to 5 MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={SOURCE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border p-3">
            <FileTypeBadge
              type={(sourceType ?? "TXT") as FileType}
              className="h-9 w-12"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">
                {file.name}
              </p>
              <p className="text-xs text-text-muted">
                {formatBytes(file.size)} · {upper(from ?? "")}
              </p>
            </div>
            <button
              type="button"
              aria-label="Remove this file"
              onClick={() => {
                setFile(null);
                setResult(null);
                setProblem("");
              }}
              className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text"
            >
              <FiX className="size-4" />
            </button>
          </div>
        )}

        <h2 className="mt-6 text-[15px] font-semibold text-text">
          2. Convert to
        </h2>

        {formats.error && !formats.data ? (
          <div className="mt-3">
            <ErrorState error={formats.error} onRetry={formats.reload} />
          </div>
        ) : formats.loading && !formats.data ? (
          <Skeleton className="mt-3 h-11 w-64 rounded-md" />
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end">
            <div>
              <Select
                aria-label="Target format"
                value={chosen}
                disabled={!file || busy !== null || conversions.length === 0}
                onChange={(e) => setTarget(e.target.value as Format)}
              >
                {!file && <option value="">Choose a file first</option>}
                {file && conversions.length === 0 && (
                  <option value="">No conversion available</option>
                )}
                {conversions.map((c) => (
                  <option key={c.to} value={c.to}>
                    {upper(c.from)} to {upper(c.to)}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              size="md"
              disabled={!file || !chosen}
              loading={busy !== null}
              onClick={() => void convert()}
            >
              <FiRepeat className="size-4" aria-hidden="true" />
              {busy === "uploading"
                ? `Uploading ${progress}%`
                : busy === "converting"
                  ? "Converting…"
                  : "Convert"}
            </Button>
          </div>
        )}

        {chosenNote && (
          <p className="mt-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-muted">
            {chosenNote}
          </p>
        )}

        {problem && (
          <p role="alert" className="mt-3 text-sm text-error-text">
            {problem}
          </p>
        )}

        <ul className="mt-5 grid gap-x-6 gap-y-2 border-t border-border pt-5 text-sm text-text-muted sm:grid-cols-2">
          <li>Only the five supported conversions are offered.</li>
          <li>Scanned PDFs have no text, so they cannot be converted.</li>
          <li>Layout, images and fonts may not be kept exactly.</li>
          <li>
            The uploaded file is removed from storage after conversion.
          </li>
        </ul>
      </section>

      {result && (
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-text">
                Your converted file
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                {result.job.fileName} · {formatBytes(result.job.fileSize)} ·{" "}
                {upper(result.job.sourceFormat)} to{" "}
                {upper(result.job.targetFormat)}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Available for {result.job.hoursLeft} more hours.
              </p>
            </div>
            <Button
              onClick={() => void saveFromUrl(result.job.fileUrl, result.job.fileName)}
            >
              <FiDownload className="size-4" aria-hidden="true" />
              Download
            </Button>
          </div>

          {result.warnings.length > 0 && (
            <div className="mt-4 space-y-1.5 rounded-xl bg-warning-soft px-4 py-3">
              {result.warnings.map((w) => (
                <Note key={w}>{w}</Note>
              ))}
            </div>
          )}

          {result.preview.text && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-text">
                Preview of the text
              </h3>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl border border-border bg-surface-muted p-4 text-sm leading-relaxed text-text">
                {result.preview.text}
              </pre>
              {result.preview.truncated && (
                <p className="mt-1 text-xs text-text-muted">
                  Only the beginning of the text is shown.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="recent-conversions">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="recent-conversions"
            className="text-lg font-semibold tracking-tight text-text"
          >
            Recent conversions
          </h2>
        </div>

        {jobs.loading && !jobs.data ? (
          <Skeleton className="mt-4 h-32 rounded-2xl" />
        ) : jobs.error && !jobs.data ? (
          <div className="mt-4">
            <ErrorState error={jobs.error} onRetry={jobs.reload} />
          </div>
        ) : jobs.data && jobs.data.items.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-surface">
            <EmptyState
              icon={FiRepeat}
              title="No conversions yet"
              description={`Converted files appear here and stay available for ${keepHours} hours.`}
            />
          </div>
        ) : jobs.data ? (
          <ul className="mt-4 space-y-2.5">
            {jobs.data.items.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <FileTypeBadge
                  type={upper(job.targetFormat) as FileType}
                  className="h-9 w-12"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {job.fileName}
                  </p>
                  <p className="text-xs text-text-muted">
                    {upper(job.sourceFormat)} to {upper(job.targetFormat)} ·{" "}
                    {formatBytes(job.fileSize)} · converted{" "}
                    {formatRelative(job.createdAt)}
                  </p>
                  <p className="text-xs text-text-muted">
                    Expires {formatDateTime(job.expiresAt)} ({job.hoursLeft}h
                    left)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void saveFromUrl(job.fileUrl, job.fileName)}
                  >
                    <FiDownload className="size-3.5" aria-hidden="true" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={deleting === job.id}
                    aria-label={`Delete ${job.fileName}`}
                    onClick={() => void remove(job)}
                  >
                    {deleting !== job.id && (
                      <FiTrash2 className="size-3.5" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
