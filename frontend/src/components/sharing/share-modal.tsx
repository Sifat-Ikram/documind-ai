"use client";

import {
  PeopleManager,
  type Person,
} from "@/components/sharing/people-manager";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import type { ShareList } from "@/types/api";

export function ShareModal({
  doc,
  onClose,
  onChanged,
}: {
  doc: { id: string; originalName: string };
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { data, error, loading, reload } = useApi<ShareList>(
    `/documents/${doc.id}/shares`,
  );

  const people: Person[] = (data?.shares ?? []).map((s) => ({
    key: s.id,
    name: s.user.name,
    email: s.user.email,
    role: s.role,
  }));

  const done = () => {
    reload();
    onChanged?.();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Share this document"
      description={`Give other DocuMind AI users access to "${doc.originalName}".`}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <PeopleManager
        people={people}
        loading={loading}
        error={error}
        onRetry={reload}
        roleHelp="Viewer: can open, download and comment. Editor: can also edit and save new versions. Only you can rename, delete or share it."
        onAdd={async (email, role) => {
          await api(`/documents/${doc.id}/shares`, {
            method: "POST",
            body: { email, role },
          });
          done();
        }}
        onRole={async (key, role) => {
          await api(`/documents/${doc.id}/shares/${key}`, {
            method: "PATCH",
            body: { role },
          });
          done();
        }}
        onRemove={async (key) => {
          await api(`/documents/${doc.id}/shares/${key}`, { method: "DELETE" });
          done();
        }}
      />
    </Modal>
  );
}
