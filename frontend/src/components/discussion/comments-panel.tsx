"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FiMessageCircle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatRelative, initials } from "@/lib/utils";
import type { CommentItem } from "@/types/api";

const textarea =
  "w-full resize-y rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted";

export function CommentsPanel({ docId }: { docId: string }) {
  const { data, error, loading, reload } = useApi<{ items: CommentItem[] }>(
    `/documents/${docId}/comments`,
  );
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null,
  );
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState<CommentItem | null>(null);

  async function post(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      await api(`/documents/${docId}/comments`, {
        method: "POST",
        body: { content: text.trim() },
      });
      setText("");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPosting(false);
    }
  }

  async function saveEdit() {
    if (!editing || !editing.text.trim()) return;
    setSavingEdit(true);
    try {
      await api(`/comments/${editing.id}`, {
        method: "PATCH",
        body: { content: editing.text.trim() },
      });
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-sm text-text-muted">
        Everyone who can open this document can read and write comments here.
      </p>

      <form onSubmit={post}>
        <label htmlFor="new-comment" className="sr-only">
          Write a comment
        </label>
        <textarea
          id="new-comment"
          rows={3}
          maxLength={2000}
          value={text}
          placeholder="Write a comment…"
          onChange={(e) => setText(e.target.value)}
          className={textarea}
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" loading={posting} disabled={!text.trim()}>
            Post comment
          </Button>
        </div>
      </form>

      <div className="mt-6">
        {loading && !data ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data && data.items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface">
            <EmptyState
              icon={FiMessageCircle}
              title="No comments yet"
              description="Start the conversation about this document."
            />
          </div>
        ) : data ? (
          <ul className="space-y-4">
            {data.items.map((c) => (
              <li key={c.id} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-text">
                  {initials(c.author.name)}
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-medium text-text">
                      {c.author.name}
                    </span>
                    <span className="text-xs text-text-muted">
                      {formatRelative(c.createdAt)}
                      {c.edited ? " · edited" : ""}
                    </span>
                  </div>

                  {editing?.id === c.id ? (
                    <div className="mt-2">
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={editing.text}
                        aria-label="Edit your comment"
                        onChange={(e) =>
                          setEditing({ id: c.id, text: e.target.value })
                        }
                        className={textarea}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditing(null)}
                          disabled={savingEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void saveEdit()}
                          loading={savingEdit}
                          disabled={!editing.text.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm text-text">
                        {c.content}
                      </p>
                      {(c.canEdit || c.canDelete) && (
                        <div className="mt-2 flex gap-4 text-xs">
                          {c.canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditing({ id: c.id, text: c.content })
                              }
                              className="text-text-muted hover:text-text"
                            >
                              Edit
                            </button>
                          )}
                          {c.canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleting(c)}
                              className="text-text-muted hover:text-error-text"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {deleting && (
        <ConfirmModal
          title="Delete this comment?"
          description="The comment will be removed for everyone."
          successMessage="Comment deleted"
          onConfirm={async () => {
            await api(`/comments/${deleting.id}`, { method: "DELETE" });
            reload();
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
