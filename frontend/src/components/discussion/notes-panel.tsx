"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { ApiError, api, errorMessage } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { NoteData } from "@/types/api";

/** One shared note per document. If two people save at once, nothing is overwritten silently. */
export function NotesPanel({
  docId,
  canWrite,
}: {
  docId: string;
  canWrite: boolean;
}) {
  const note = useApi<{ note: NoteData }>(`/documents/${docId}/note`);
  const [draft, setDraft] = useState<string | null>(null);
  const [baseRevision, setBaseRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);

  const server = note.data?.note;
  const text = draft ?? server?.content ?? "";
  const dirty = draft !== null && draft !== (server?.content ?? "");

  function edit(value: string) {
    if (draft === null) setBaseRevision(server?.revision ?? 0);
    setDraft(value);
  }

  async function save(overwrite = false) {
    setSaving(true);
    try {
      await api(`/documents/${docId}/note`, {
        method: "PUT",
        body: {
          content: text,
          revision: overwrite ? (server?.revision ?? 0) : baseRevision,
        },
      });
      setDraft(null);
      setConflict(false);
      note.reload();
      toast.success("Note saved");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflict(true);
        note.reload();
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  if (note.loading && !note.data)
    return <Skeleton className="h-64 max-w-3xl rounded-2xl" />;
  if (note.error && !note.data)
    return <ErrorState error={note.error} onRetry={note.reload} />;

  return (
    <div className="max-w-3xl">
      <p className="mb-3 text-sm text-text-muted">
        A note that belongs to this document. Everyone with access can read it
        {canWrite
          ? ". You can edit it."
          : ", and only the owner and Editors can change it."}
      </p>

      {conflict && (
        <div
          role="alert"
          className="mb-3 rounded-xl bg-warning-soft px-4 py-3 text-sm text-text"
        >
          <p className="font-medium">
            Someone else changed this note while you were typing.
          </p>
          <p className="mt-1 text-text-muted">
            Your text is still in the box below. Choose what to do:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraft(null);
                setConflict(false);
              }}
            >
              Load their version (drop my text)
            </Button>
            <Button size="sm" onClick={() => void save(true)} loading={saving}>
              Keep my text and save over theirs
            </Button>
          </div>
        </div>
      )}

      <label htmlFor="shared-note" className="sr-only">
        Shared note
      </label>
      <textarea
        id="shared-note"
        rows={12}
        maxLength={20000}
        readOnly={!canWrite}
        value={text}
        placeholder={
          canWrite
            ? "Write a note for everyone who works on this document…"
            : "There is no note yet."
        }
        onChange={(e) => edit(e.target.value)}
        className="w-full resize-y rounded-xl border border-border-strong bg-surface px-3.5 py-3 text-sm leading-relaxed text-text placeholder:text-text-muted read-only:bg-surface-muted"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-muted">
          {server?.updatedAt
            ? `Last saved by ${server.updatedBy?.name ?? "someone"} ${formatRelative(server.updatedAt)}`
            : "Not saved yet"}
          {" · "}
          {text.length.toLocaleString("en-US")}/20,000
        </p>
        {canWrite && (
          <Button
            onClick={() => void save()}
            loading={saving}
            disabled={!dirty || conflict}
          >
            Save note
          </Button>
        )}
      </div>
    </div>
  );
}
