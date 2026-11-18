"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiEdit2,
  FiExternalLink,
  FiFolder,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { CollectionFormModal } from "@/components/collections/collection-form-modal";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Menu } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { plural } from "@/lib/utils";
import type { CollectionItem } from "@/types/api";

const ROLE_TEXT = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
} as const;

function CollectionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: CollectionItem;
  onEdit: (c: CollectionItem) => void;
  onDelete: (c: CollectionItem) => void;
}) {
  const router = useRouter();
  return (
    <article className="relative flex flex-col rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-muted text-text-muted">
          <FiFolder className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-text">
            <Link
              href={`/collections/${item.id}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {item.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {plural(item.documentCount, "document")}
            {item.memberCount > 0 &&
              ` · shared with ${plural(item.memberCount, "person")}`}
          </p>
        </div>
        {item.isOwner && (
          <Menu
            className="relative z-10 -mr-1.5 -mt-1.5"
            label={`Actions for ${item.name}`}
            items={[
              {
                label: "Open",
                icon: FiExternalLink,
                onClick: () => router.push(`/collections/${item.id}`),
              },
              { label: "Edit", icon: FiEdit2, onClick: () => onEdit(item) },
              {
                label: "Delete",
                icon: FiTrash2,
                onClick: () => onDelete(item),
                danger: true,
              },
            ]}
          />
        )}
      </div>
      {item.description && (
        <p className="mt-3 line-clamp-2 text-sm text-text-muted">
          {item.description}
        </p>
      )}
      {!item.isOwner && (
        <p className="mt-3 text-xs text-text-muted">
          Shared by {item.owner.name} · you are{" "}
          {ROLE_TEXT[item.myRole].toLowerCase()}
        </p>
      )}
    </article>
  );
}

export function CollectionsView() {
  const { data, error, loading, reload } = useApi<{ items: CollectionItem[] }>(
    "/collections",
  );
  const [form, setForm] = useState<{ collection?: CollectionItem } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<CollectionItem | null>(null);

  const own = data?.items.filter((c) => c.isOwner) ?? [];
  const shared = data?.items.filter((c) => !c.isOwner) ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Collections
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
            Group documents by project, subject or anything else. A document can
            be in more than one collection, and deleting a collection never
            deletes its documents.
          </p>
        </div>
        <Button size="lg" onClick={() => setForm({})}>
          <FiPlus className="size-4" aria-hidden="true" />
          New collection
        </Button>
      </header>

      {loading && !data ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data ? (
        <>
          {own.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface">
              <EmptyState
                icon={FiFolder}
                title="No collections yet"
                description="Create a collection, then add documents to it from My Documents or from the collection itself."
                action={
                  <Button size="sm" onClick={() => setForm({})}>
                    New collection
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {own.map((c) => (
                <CollectionCard
                  key={c.id}
                  item={c}
                  onEdit={(x) => setForm({ collection: x })}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          )}

          {shared.length > 0 && (
            <section aria-label="Shared with you">
              <h2 className="text-[15px] font-semibold text-text">
                Shared with you
              </h2>
              <p className="mt-0.5 text-sm text-text-muted">
                Collections that other people shared with you.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {shared.map((c) => (
                  <CollectionCard
                    key={c.id}
                    item={c}
                    onEdit={() => undefined}
                    onDelete={() => undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}

      {form && (
        <CollectionFormModal
          collection={form.collection}
          onClose={() => setForm(null)}
          onSaved={reload}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this collection?"
          description={`"${deleting.name}" will be deleted. Its documents are not deleted, and anyone it was shared with loses access through it.`}
          confirmLabel="Delete collection"
          successMessage="Collection deleted"
          onConfirm={async () => {
            await api(`/collections/${deleting.id}`, { method: "DELETE" });
            reload();
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
