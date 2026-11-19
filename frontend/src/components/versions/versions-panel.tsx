"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FiDownload, FiEdit2, FiGitMerge, FiRotateCcw } from "react-icons/fi";
import { FilePreview } from "@/components/preview/file-preview";
import { DiffView } from "@/components/versions/diff-view";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { saveFromUrl } from "@/lib/download";
import { formatBytes, formatDateTime } from "@/lib/utils";
import type {
  DocumentDetail,
  VersionCompare,
  VersionDetail,
  VersionItem,
} from "@/types/api";

export function VersionsPanel({
  doc,
  canEdit,
  onChanged,
}: {
  doc: DocumentDetail;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const list = useApi<{ items: VersionItem[] }>(
    `/documents/${doc.id}/versions`,
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [compare, setCompare] = useState<{ from: number; to: number } | null>(
    null,
  );
  const [restoring, setRestoring] = useState<number | null>(null);

  const items = list.data?.items ?? [];
  const current = items.find((v) => v.isCurrent)?.version ?? doc.currentVersion;
  const shown = selected ?? current;

  const detail = useApi<VersionDetail>(
    compare ? null : `/documents/${doc.id}/versions/${shown}`,
  );
  const diff = useApi<VersionCompare>(
    compare
      ? `/documents/${doc.id}/versions/compare?from=${compare.from}&to=${compare.to}`
      : null,
  );

  const editable = canEdit && doc.fileType !== "PDF";

  function toggleChecked(version: number, on: boolean) {
    setChecked((prev) =>
      on
        ? prev.length < 2
          ? [...prev, version]
          : prev
        : prev.filter((v) => v !== version),
    );
  }

  function startCompare(a: number, b: number) {
    setCompare({ from: Math.min(a, b), to: Math.max(a, b) });
  }

  async function download(version: number) {
    try {
      const res = await api<{ url: string; fileName: string }>(
        `/documents/${doc.id}/versions/${version}/download`,
      );
      await saveFromUrl(res.url, res.fileName);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function restore(version: number) {
    await api(`/documents/${doc.id}/versions/${version}/restore`, {
      method: "POST",
    });
    setSelected(null);
    setChecked([]);
    list.reload();
    onChanged();
  }

  if (list.loading && !list.data) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }
  if (list.error && !list.data)
    return <ErrorState error={list.error} onRetry={list.reload} />;

  return (
    <div>
      {doc.fileType === "PDF" && (
        <p className="mb-4 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-muted">
          PDF files cannot be edited, so a PDF has one version only.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-text-muted">
              {items.length === 1 ? "1 version" : `${items.length} versions`}
            </p>
            {items.length > 1 && (
              <Button
                size="sm"
                variant="secondary"
                disabled={checked.length !== 2}
                onClick={() => startCompare(checked[0], checked[1])}
              >
                <FiGitMerge className="size-3.5" aria-hidden="true" />
                Compare ({checked.length}/2)
              </Button>
            )}
          </div>

          <ul className="space-y-2">
            {items.map((v) => (
              <li key={v.version}>
                <div
                  className={cn(
                    "rounded-xl border p-3",
                    !compare && shown === v.version
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-surface",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {items.length > 1 && (
                      <Checkbox
                        className="mt-1"
                        checked={checked.includes(v.version)}
                        onChange={(on) => toggleChecked(v.version, on)}
                        label={`Select version ${v.version} to compare`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCompare(null);
                        setSelected(v.version);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text">
                          v{v.version}
                        </span>
                        {v.isCurrent && (
                          <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-text">
                        {v.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-text-muted">
                        {formatDateTime(v.createdAt)} ·{" "}
                        {v.createdBy?.name ?? "Unknown"}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {formatBytes(v.fileSize)}
                      </span>
                      {v.note && (
                        <span className="mt-1 block text-xs text-text-muted">
                          {v.note}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          {compare ? (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-text">
                    Version {compare.from} → version {compare.to}
                  </h3>
                  {diff.data && (
                    <p className="mt-0.5 text-sm text-text-muted">
                      <span className="text-success">
                        +{diff.data.stats.addedLines} lines
                      </span>{" "}
                      ·{" "}
                      <span className="text-error-text">
                        −{diff.data.stats.removedLines} lines
                      </span>
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCompare(null)}
                >
                  Back to preview
                </Button>
              </div>
              {diff.loading && !diff.data ? (
                <Skeleton className="h-48 rounded-xl" />
              ) : diff.error && !diff.data ? (
                <ErrorState error={diff.error} onRetry={diff.reload} />
              ) : diff.data ? (
                diff.data.stats.addedLines === 0 &&
                diff.data.stats.removedLines === 0 ? (
                  <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-muted">
                    These two versions have the same text.
                  </p>
                ) : (
                  <DiffView changes={diff.data.changes} />
                )
              ) : null}
            </div>
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-text">
                    {detail.data
                      ? `v${detail.data.version} · ${detail.data.title}`
                      : `Version ${shown}`}
                  </h3>
                  {detail.data && (
                    <p className="mt-0.5 text-sm text-text-muted">
                      {formatDateTime(detail.data.createdAt)}
                      {detail.data.isCurrent ? " · current version" : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!detail.data?.isCurrent && items.length > 1 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => startCompare(shown, current)}
                    >
                      <FiGitMerge className="size-3.5" aria-hidden="true" />
                      Compare with current
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void download(shown)}
                  >
                    <FiDownload className="size-3.5" aria-hidden="true" />
                    Download
                  </Button>
                  {editable && (
                    <Link
                      href={`/documents/${doc.id}/edit?version=${shown}`}
                      className={buttonVariants({
                        variant: "secondary",
                        size: "sm",
                      })}
                    >
                      <FiEdit2 className="size-3.5" aria-hidden="true" />
                      Edit from this version
                    </Link>
                  )}
                  {editable && detail.data && !detail.data.isCurrent && (
                    <Button size="sm" onClick={() => setRestoring(shown)}>
                      <FiRotateCcw className="size-3.5" aria-hidden="true" />
                      Make this the current version
                    </Button>
                  )}
                </div>
              </div>

              {detail.loading && !detail.data ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : detail.error && !detail.data ? (
                <ErrorState error={detail.error} onRetry={detail.reload} />
              ) : detail.data ? (
                <FilePreview
                  key={detail.data.fileUrl}
                  fileType={detail.data.fileType}
                  fileUrl={detail.data.fileUrl}
                  text={detail.data.text}
                  textNote={
                    detail.data.truncated
                      ? "Only the first 20,000 characters of the text are shown here."
                      : undefined
                  }
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {restoring !== null && (
        <ConfirmModal
          title={`Make version ${restoring} the current version?`}
          description="A copy of this version becomes a new, latest version. Nothing is deleted, and the version that is current now stays in the history."
          confirmLabel="Make current"
          successMessage="Done. A new version was created."
          onConfirm={() => restore(restoring)}
          onClose={() => setRestoring(null)}
        />
      )}
    </div>
  );
}
