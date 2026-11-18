"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { api, errorMessage } from "@/lib/api";
import type { CollectionItem } from "@/types/api";

export function CollectionFormModal({
  collection,
  onClose,
  onSaved,
}: {
  collection?: CollectionItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Name is required");
    if (trimmed.length > 60)
      return setError("Name must be at most 60 characters");
    if (description.length > 300)
      return setError("Description must be at most 300 characters");

    setError("");
    setSaving(true);
    try {
      if (collection) {
        await api(`/collections/${collection.id}`, {
          method: "PATCH",
          body: { name: trimmed, description: description.trim() || null },
        });
      } else {
        await api("/collections", {
          method: "POST",
          body: { name: trimmed, description: description.trim() || undefined },
        });
      }
      toast.success(collection ? "Collection updated" : "Collection created");
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={collection ? "Edit collection" : "New collection"}
      description="A collection groups documents, for example by project or subject."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="collection-form" loading={saving}>
            {collection ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <form
        id="collection-form"
        onSubmit={onSubmit}
        noValidate
        className="space-y-4"
      >
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          error={error}
        />
        <div className="space-y-1.5">
          <label
            htmlFor="collection-description"
            className="block text-sm font-medium text-text"
          >
            Description{" "}
            <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id="collection-description"
            rows={3}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-y rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted"
          />
        </div>
      </form>
    </Modal>
  );
}
