"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TagInput } from "@/components/documents/tag-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import type { TagItem, TagRef } from "@/types/api";

/** The tags of one document (your own tags, other people do not see them). */
export function TagsModal({
  doc,
  onClose,
  onDone,
}: {
  doc: { id: string; originalName: string; tags: TagRef[] };
  onClose: () => void;
  onDone: () => void;
}) {
  const all = useApi<{ items: TagItem[] }>("/tags");
  const [tags, setTags] = useState(doc.tags.map((t) => t.name));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api(`/documents/${doc.id}/tags`, { method: "PUT", body: { tags } });
      toast.success("Tags saved");
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
      title="Tags"
      description={`Short labels for "${doc.originalName}". Tags are private to you.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <TagInput
        value={tags}
        onChange={setTags}
        suggestions={all.data?.items.map((t) => t.name)}
      />
    </Modal>
  );
}

/** Add tags to, or remove tags from, many documents at once. */
export function BulkTagsModal({
  ids,
  onClose,
  onDone,
}: {
  ids: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const all = useApi<{ items: TagItem[] }>("/tags");
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [names, setNames] = useState<string[]>([]);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canSave = mode === "add" ? names.length > 0 : removeIds.length > 0;

  async function save() {
    setSaving(true);
    try {
      await api("/documents/bulk", {
        method: "POST",
        body:
          mode === "add"
            ? { action: "add_tags", documentIds: ids, tagNames: names }
            : { action: "remove_tags", documentIds: ids, tagIds: removeIds },
      });
      toast.success(mode === "add" ? "Tags added" : "Tags removed");
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
      title="Tags"
      description={`${ids.length} documents selected.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!canSave}>
            {mode === "add" ? "Add tags" : "Remove tags"}
          </Button>
        </>
      }
    >
      <SegmentedControl
        label="What to do"
        value={mode}
        onChange={setMode}
        options={[
          { value: "add", label: "Add tags" },
          { value: "remove", label: "Remove tags" },
        ]}
      />
      <div className="mt-4">
        {mode === "add" ? (
          <TagInput
            value={names}
            onChange={setNames}
            suggestions={all.data?.items.map((t) => t.name)}
          />
        ) : all.data && all.data.items.length > 0 ? (
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {all.data.items.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface-muted">
                  <Checkbox
                    checked={removeIds.includes(t.id)}
                    onChange={(c) =>
                      setRemoveIds((prev) =>
                        c ? [...prev, t.id] : prev.filter((x) => x !== t.id),
                      )
                    }
                    label={`Remove tag ${t.name}`}
                  />
                  <span className="flex-1 text-text">#{t.name}</span>
                  <span className="text-xs text-text-muted">
                    {t.documentCount}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">
            {all.loading ? "Loading…" : "You have no tags yet."}
          </p>
        )}
      </div>
    </Modal>
  );
}
