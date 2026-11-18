"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FiRotateCcw, FiTrash2 } from "react-icons/fi";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatBytes, formatRelative, plural } from "@/lib/utils";
import type { TrashedDocument } from "@/types/api";

function daysText(days: number): string {
  if (days <= 0) return "Deleted for good today";
  return `${plural(days, "day")} left`;
}

export function TrashView() {
  const { data, error, loading, reload } = useApi<{ items: TrashedDocument[] }>(
    "/trash",
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TrashedDocument | null>(null);
  const [emptying, setEmptying] = useState(false);

  async function restore(item: TrashedDocument) {
    setBusyId(item.id);
    try {
      await api(`/trash/${item.id}/restore`, { method: "POST" });
      toast.success(`"${item.originalName}" was restored`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Trash
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
            Deleted documents stay here for 30 days. You can restore them, or
            delete them for good. After 30 days they are removed automatically,
            together with their analyses, chats and files.
          </p>
        </div>
        {data && data.items.length > 0 && (
          <Button variant="secondary" onClick={() => setEmptying(true)}>
            <FiTrash2 className="size-4" aria-hidden="true" />
            Empty Trash
          </Button>
        )}
      </header>

      {loading && !data ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data && data.items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            icon={FiTrash2}
            title="Trash is empty"
            description="Documents you delete are kept here for 30 days before they are removed for good."
          />
        </div>
      ) : data ? (
        <ul className="space-y-2">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3"
            >
              <FileTypeBadge type={item.fileType} className="h-9 w-12" />
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate text-sm font-semibold text-text">
                  {item.originalName}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {formatBytes(item.fileSize)} · deleted{" "}
                  {formatRelative(item.trashedAt)} ·{" "}
                  <span
                    className={cn(
                      item.daysLeft <= 3 && "font-medium text-error-text",
                    )}
                  >
                    {daysText(item.daysLeft)}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={busyId === item.id}
                  onClick={() => void restore(item)}
                >
                  {busyId !== item.id && (
                    <FiRotateCcw className="size-3.5" aria-hidden="true" />
                  )}
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-error-text"
                  onClick={() => setDeleting(item)}
                >
                  <FiTrash2 className="size-3.5" aria-hidden="true" />
                  Delete forever
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {deleting && (
        <ConfirmModal
          title="Delete this document forever?"
          description={`"${deleting.originalName}" will be removed permanently, with its analyses, chats, versions and file. This cannot be undone.`}
          confirmLabel="Delete forever"
          successMessage="Deleted permanently"
          onConfirm={async () => {
            await api(`/trash/${deleting.id}`, { method: "DELETE" });
            reload();
          }}
          onClose={() => setDeleting(null)}
        />
      )}
      {emptying && (
        <ConfirmModal
          title="Empty Trash?"
          description="Every document in Trash will be removed permanently, with its analyses, chats, versions and files. This cannot be undone."
          confirmLabel="Empty Trash"
          successMessage="Trash emptied"
          onConfirm={async () => {
            await api("/trash", { method: "DELETE" });
            reload();
          }}
          onClose={() => setEmptying(false)}
        />
      )}
    </div>
  );
}
