"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FiDownload,
  FiFileText,
  FiFolder,
  FiLogOut,
  FiMessageSquare,
  FiSearch,
  FiShare2,
  FiZap,
} from "react-icons/fi";
import { CollectionPickerModal } from "@/components/collections/collection-picker-modal";
import { DocumentItem } from "@/components/documents/document-item";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import type { MenuItem } from "@/components/ui/menu";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferences } from "@/context/preferences-context";
import { useApi } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { downloadDocument } from "@/lib/download";
import { plural } from "@/lib/utils";
import type {
  DocumentsListResponse,
  FileType,
  SharedDocument,
} from "@/types/api";

type Filter = "ALL" | FileType;
type SharedList = Omit<DocumentsListResponse, "items"> & {
  items: SharedDocument[];
};

const ROLE_TEXT = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
} as const;
const TYPES: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PDF", label: "PDF" },
  { value: "DOCX", label: "DOCX" },
  { value: "TXT", label: "TXT" },
];

export function SharedView() {
  const router = useRouter();
  const { preferences, ready } = usePreferences();
  const view = preferences.view;

  const [search, setSearch] = useState("");
  const [type, setType] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);
  const [collectionFor, setCollectionFor] = useState<SharedDocument | null>(
    null,
  );
  const [leaving, setLeaving] = useState<SharedDocument | null>(null);
  const debounced = useDebounce(search.trim(), 300);

  const query = new URLSearchParams({
    page: String(page),
    limit: String(view.perPage),
    sort: view.sort,
    order: view.order,
  });
  if (debounced) query.set("search", debounced);
  if (type !== "ALL") query.set("type", type);

  const { data, error, loading, reload } = useApi<SharedList>(
    ready ? `/shared?${query}` : null,
  );
  const filtered = Boolean(debounced) || type !== "ALL";

  async function toggleFavorite(doc: SharedDocument) {
    try {
      await api(`/documents/${doc.id}/favorite`, {
        method: doc.isFavorite ? "DELETE" : "POST",
      });
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function menuFor(doc: SharedDocument): MenuItem[] {
    return [
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
      {
        label: "Download",
        icon: FiDownload,
        onClick: () =>
          void toast.promise(downloadDocument(doc.id), {
            loading: "Preparing download…",
            success: "Download started",
            error: (err) => errorMessage(err),
          }),
      },
      {
        label: "Add to my collection",
        icon: FiFolder,
        onClick: () => setCollectionFor(doc),
      },
      ...(doc.shareId
        ? [
            {
              label: "Leave this document",
              icon: FiLogOut,
              danger: true,
              onClick: () => setLeaving(doc),
            },
          ]
        : []),
    ];
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Shared with Me
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
          Documents other people shared with you, directly or through a shared
          collection. What you can do depends on your access: a Viewer can open,
          download and comment, an Editor can also edit and save new versions.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full min-w-48 sm:max-w-xs sm:flex-1">
          <FiSearch
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search shared documents by name"
            placeholder="Search by name"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-xl border border-border-strong bg-surface pl-10 pr-3 text-sm text-text placeholder:text-text-muted"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={type === t.value}
              onClick={() => {
                setType(t.value);
                setPage(1);
              }}
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-medium transition-colors",
                type === t.value
                  ? "border-transparent bg-primary-soft text-link"
                  : "border-border text-text-muted hover:bg-surface-muted hover:text-text",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <p className="-mt-4 text-sm text-text-muted">
          {plural(data.total, "document")}
          {filtered ? " found" : " shared with you"}
        </p>
      )}

      {!ready || (loading && !data) ? (
        <div
          className={cn(
            view.mode === "grid"
              ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              : "space-y-2",
          )}
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className={
                view.mode === "grid" ? "h-52 rounded-2xl" : "h-16 rounded-xl"
              }
            />
          ))}
        </div>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data && data.items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            icon={FiShare2}
            title={
              filtered ? "No documents match" : "Nothing is shared with you yet"
            }
            description={
              filtered
                ? "Try different words, or clear the filter."
                : "When someone shares a document or a collection with you, it appears here."
            }
          />
        </div>
      ) : data ? (
        <>
          <div
            className={cn(
              view.mode === "grid"
                ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                : "space-y-2",
              loading && "opacity-60",
            )}
          >
            {data.items.map((doc) => (
              <DocumentItem
                key={doc.id}
                doc={doc}
                mode={view.mode}
                menu={menuFor(doc)}
                onFavorite={() => void toggleFavorite(doc)}
                badge={
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                    Shared by {doc.owner.name} · {ROLE_TEXT[doc.myRole]}
                  </span>
                }
              />
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={setPage}
          />
        </>
      ) : null}

      {collectionFor && (
        <CollectionPickerModal
          mode="add"
          ids={[collectionFor.id]}
          onClose={() => setCollectionFor(null)}
          onDone={reload}
        />
      )}
      {leaving && (
        <ConfirmModal
          title="Leave this document?"
          description={`"${leaving.originalName}" will disappear from Shared with Me. ${leaving.owner.name} can share it with you again.`}
          confirmLabel="Leave"
          successMessage="You left the document"
          onConfirm={async () => {
            await api(`/documents/${leaving.id}/shares/${leaving.shareId}`, {
              method: "DELETE",
            });
            reload();
          }}
          onClose={() => setLeaving(null)}
        />
      )}
    </div>
  );
}
