"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FiArrowLeft,
  FiEdit2,
  FiFileText,
  FiFolder,
  FiMessageSquare,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
  FiZap,
} from "react-icons/fi";
import { AddDocumentsModal } from "@/components/collections/add-documents-modal";
import { CollectionFormModal } from "@/components/collections/collection-form-modal";
import { DocumentItem } from "@/components/documents/document-item";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferences } from "@/context/preferences-context";
import { useApi } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { ApiError, api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/utils";
import type {
  CollectionDocument,
  CollectionItem,
  DocumentsListResponse,
} from "@/types/api";

const ROLE_TEXT = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
} as const;

type CollectionDocs = Omit<DocumentsListResponse, "items"> & {
  items: CollectionDocument[];
};

export function CollectionDetailsView({ id }: { id: string }) {
  const router = useRouter();
  const { preferences } = usePreferences();
  const view = preferences.view;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const debounced = useDebounce(search.trim(), 300);

  const info = useApi<{ collection: CollectionItem }>(`/collections/${id}`);
  const query = new URLSearchParams({
    page: String(page),
    limit: String(view.perPage),
    sort: view.sort,
    order: view.order,
  });
  if (debounced) query.set("search", debounced);
  const docs = useApi<CollectionDocs>(`/collections/${id}/documents?${query}`);

  if (info.error instanceof ApiError && info.error.status === 404) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          icon={FiFolder}
          title="Collection not found"
          description="It may have been deleted, or it is not shared with you any more."
          action={
            <Link
              href="/collections"
              className={buttonVariants({ size: "sm" })}
            >
              Back to collections
            </Link>
          }
        />
      </div>
    );
  }
  if (info.error && !info.data)
    return <ErrorState error={info.error} onRetry={info.reload} />;

  const collection = info.data?.collection;
  const owner = collection?.isOwner ?? false;

  async function removeFromCollection(doc: CollectionDocument) {
    try {
      await api(`/collections/${id}/documents/${doc.id}`, { method: "DELETE" });
      toast.success("Removed from the collection");
      docs.reload();
      info.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function toggleFavorite(doc: CollectionDocument) {
    try {
      await api(`/documents/${doc.id}/favorite`, {
        method: doc.isFavorite ? "DELETE" : "POST",
      });
      docs.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function menuFor(doc: CollectionDocument): MenuItem[] {
    const items: MenuItem[] = [
      {
        label: "View details",
        icon: FiFileText,
        onClick: () => router.push(`/documents/${doc.id}`),
      },
      {
        label: "Analyze",
        icon: FiZap,
        onClick: () => router.push(`/documents/${doc.id}/analyze`),
      },
      {
        label: "Chat",
        icon: FiMessageSquare,
        onClick: () => router.push(`/documents/${doc.id}/chat`),
      },
    ];
    if (owner) {
      items.push({
        label: "Remove from collection",
        icon: FiX,
        danger: true,
        onClick: () => void removeFromCollection(doc),
      });
    }
    return items;
  }

  return (
    <div className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm text-text-muted"
      >
        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 hover:text-text"
        >
          <FiArrowLeft className="size-4" aria-hidden="true" />
          Collections
        </Link>
        <span aria-hidden="true">/</span>
        <span className="max-w-[16rem] truncate text-text">
          {collection?.name ?? "…"}
        </span>
      </nav>

      <header className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {collection ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-surface-muted text-text-muted">
                <FiFolder className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="wrap-break-words text-2xl font-semibold tracking-tight text-text">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="mt-1 max-w-2xl text-sm text-text-muted">
                    {collection.description}
                  </p>
                )}
                <p className="mt-2 text-sm text-text-muted">
                  {plural(collection.documentCount, "document")}
                  {collection.memberCount > 0 &&
                    ` · shared with ${plural(collection.memberCount, "person")}`}
                  {!owner &&
                    ` · shared by ${collection.owner.name} · you are ${ROLE_TEXT[collection.myRole].toLowerCase()}`}
                </p>
              </div>
            </div>
            {owner && (
              <div className="flex items-center gap-2">
                <Button size="lg" onClick={() => setAdding(true)}>
                  <FiPlus className="size-4" aria-hidden="true" />
                  Add documents
                </Button>
                <Menu
                  label="More actions"
                  items={[
                    {
                      label: "Edit",
                      icon: FiEdit2,
                      onClick: () => setEditing(true),
                    },
                    {
                      label: "Delete collection",
                      icon: FiTrash2,
                      danger: true,
                      onClick: () => setDeleting(true),
                    },
                  ]}
                />
              </div>
            )}
          </div>
        ) : (
          <Skeleton className="h-16 w-80" />
        )}
      </header>

      <div className="relative w-full sm:max-w-xs">
        <FiSearch
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Search this collection"
          placeholder="Search by name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-11 w-full rounded-xl border border-border-strong bg-surface pl-10 pr-3 text-sm text-text placeholder:text-text-muted"
        />
      </div>

      {docs.loading && !docs.data ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : docs.error && !docs.data ? (
        <ErrorState error={docs.error} onRetry={docs.reload} />
      ) : docs.data && docs.data.items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            icon={FiFolder}
            title={
              debounced ? "No documents match" : "This collection is empty"
            }
            description={
              debounced
                ? "Try different words."
                : owner
                  ? "Add documents from your library."
                  : "Nothing has been added yet."
            }
            action={
              owner && !debounced ? (
                <Button size="sm" onClick={() => setAdding(true)}>
                  Add documents
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : docs.data ? (
        <>
          <div
            className={cn(
              view.mode === "grid"
                ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                : "space-y-2",
              docs.loading && "opacity-60",
            )}
          >
            {docs.data.items.map((doc) => (
              <DocumentItem
                key={doc.id}
                doc={doc}
                mode={view.mode}
                menu={menuFor(doc)}
                onFavorite={() => void toggleFavorite(doc)}
                badge={
                  doc.myRole !== "OWNER" ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                      {ROLE_TEXT[doc.myRole]}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </div>
          <Pagination
            page={docs.data.page}
            totalPages={docs.data.totalPages}
            onChange={setPage}
          />
        </>
      ) : null}

      {adding && (
        <AddDocumentsModal
          collectionId={id}
          onClose={() => setAdding(false)}
          onDone={() => {
            docs.reload();
            info.reload();
          }}
        />
      )}
      {editing && collection && (
        <CollectionFormModal
          collection={collection}
          onClose={() => setEditing(false)}
          onSaved={info.reload}
        />
      )}
      {deleting && collection && (
        <ConfirmModal
          title="Delete this collection?"
          description={`"${collection.name}" will be deleted. Its documents are not deleted.`}
          confirmLabel="Delete collection"
          successMessage="Collection deleted"
          onConfirm={async () => {
            await api(`/collections/${id}`, { method: "DELETE" });
            router.replace("/collections");
          }}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
