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
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    try {
      await api(`/documents/${document.id}`, { method: "DELETE" });
      toast.success("Document deleted");
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Delete this document?"
      description={`"${document.originalName}" will be removed permanently, together with all its analyses and chats. This cannot be undone.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={deleting}>
            Delete
          </Button>
        </>
      }
    />
  );
}
