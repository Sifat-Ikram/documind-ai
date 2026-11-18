"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FiFolder } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/utils";
import type { BulkResult, CollectionItem } from "@/types/api";

/** Put documents into one of your own collections (add), or take them from another one (move). */
export function CollectionPickerModal({
  mode,
  ids,
  from,
  onClose,
  onDone,
}: {
  mode: "add" | "move";
  ids: string[];
  from?: { id: string; name: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const collections = useApi<{ items: CollectionItem[] }>("/collections");
  const own = (collections.data?.items ?? []).filter(
    (c) => c.isOwner && c.id !== from?.id,
  );
  const [selected, setSelected] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError("");
    try {
      const res = await api<{ collection: CollectionItem }>("/collections", {
        method: "POST",
        body: { name },
      });
      setNewName("");
      setSelected(res.collection.id);
      collections.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await api<BulkResult>("/documents/bulk", {
        method: "POST",
        body: {
          action: "move",
          documentIds: ids,
          collectionId: selected,
          ...(mode === "move" && from ? { fromCollectionId: from.id } : {}),
        },
      });
      toast.success(
        `${mode === "move" ? "Moved" : "Added"} ${plural(res.processed, "document")}`,
      );
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "move" ? "Move to collection" : "Add to collection"}
      description={
        mode === "move" && from
          ? `${plural(ids.length, "document")} will be taken out of "${from.name}".`
          : `${plural(ids.length, "document")} selected. A document can be in several collections.`
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!selected}>
            {mode === "move" ? "Move" : "Add"}
          </Button>
        </>
      }
    >
      {own.length > 0 ? (
        <div
          role="radiogroup"
          aria-label="Collection"
          className="max-h-52 space-y-1.5 overflow-y-auto"
        >
          {own.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected === c.id}
              onClick={() => setSelected(c.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                selected === c.id
                  ? "border-primary bg-primary-soft text-text"
                  : "border-border text-text-muted hover:bg-surface-muted hover:text-text",
              )}
            >
              <FiFolder className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="text-xs">{c.documentCount}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          {collections.loading
            ? "Loading…"
            : "You have no other collections yet. Create one below."}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <input
          value={newName}
          maxLength={60}
          aria-label="New collection name"
          placeholder="Or create a new collection"
          onChange={(e) => {
            setNewName(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void create();
            }
          }}
          className="h-11 min-w-0 flex-1 rounded-xl border border-border-strong bg-surface px-3.5 text-sm text-text placeholder:text-text-muted"
        />
        <Button
          variant="secondary"
          loading={creating}
          disabled={!newName.trim()}
          onClick={() => void create()}
        >
          Create
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-error-text">{error}</p>}
    </Modal>
  );
}
