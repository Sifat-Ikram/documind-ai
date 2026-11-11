"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { api, errorMessage } from "@/lib/api";
import { renameSchema } from "@/lib/validation";

export function RenameDocumentModal({
  document,
  onClose,
  onRenamed,
}: {
  document: { id: string; originalName: string };
  onClose: () => void;
  onRenamed: () => void;
}) {
  const [name, setName] = useState(document.originalName);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = renameSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid name");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api(`/documents/${document.id}`, {
        method: "PATCH",
        body: { name: parsed.data.name },
      });
      toast.success("Document renamed");
      onRenamed();
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
      title="Rename document"
      description="This only changes the name shown in DocuMind AI. The file itself is not changed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="rename-form" loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <form id="rename-form" onSubmit={onSubmit} noValidate>
        <Input
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          error={error}
          autoFocus
        />
      </form>
    </Modal>
  );
}
