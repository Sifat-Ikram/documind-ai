"use client";

import {
  PeopleManager,
  type Person,
} from "@/components/sharing/people-manager";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import type { CollectionMemberItem } from "@/types/api";

export function CollectionMembersModal({
  collection,
  onClose,
  onChanged,
}: {
  collection: { id: string; name: string };
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { data, error, loading, reload } = useApi<{
    members: CollectionMemberItem[];
  }>(`/collections/${collection.id}/members`);

  const people: Person[] = (data?.members ?? []).map((m) => ({
    key: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  }));

  const done = () => {
    reload();
    onChanged?.();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Share this collection"
      description={`People you add can open the documents in "${collection.name}". A collection can only be shared while it holds your own documents.`}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <PeopleManager
        people={people}
        loading={loading}
        error={error}
        onRetry={reload}
        roleHelp="Viewer: can open, download and comment on the documents. Editor: can also edit them and save new versions."
        onAdd={async (email, role) => {
          await api(`/collections/${collection.id}/members`, {
            method: "POST",
            body: { email, role },
          });
          done();
        }}
        onRole={async (key, role) => {
          await api(`/collections/${collection.id}/members/${key}`, {
            method: "PATCH",
            body: { role },
          });
          done();
        }}
        onRemove={async (key) => {
          await api(`/collections/${collection.id}/members/${key}`, {
            method: "DELETE",
          });
          done();
        }}
      />
    </Modal>
  );
}
