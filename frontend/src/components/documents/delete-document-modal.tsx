"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { api, errorMessage } from "@/lib/api";

export function DeleteDocumentModal({
  document,
  onClose,
  onDeleted,
}: {
  document: { id: string; originalName: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await api(`/documents/${document.id}`, { method: "DELETE" });
      toast.success("Moved to Trash");
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Move this document to Trash?"
      description={`"${document.originalName}" stays in Trash for 30 days. You can restore it from the Trash page before then.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={busy}>
            Move to Trash
          </Button>
        </>
      }
    />
  );
}
