"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FiArchive,
  FiDownload,
  FiEdit2,
  FiFileText,
  FiFolder,
  FiGrid,
  FiLayers,
  FiList,
  FiRotateCcw,
  FiSearch,
  FiShare2,
  FiStar,
  FiTag,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { CategoryModal } from "@/components/documents/category-modal";
import { CollectionPickerModal } from "@/components/collections/collection-picker-modal";
import { DocumentItem } from "@/components/documents/document-item";
import { RenameDocumentModal } from "@/components/documents/rename-document-modal";
import { BulkTagsModal, TagsModal } from "@/components/documents/tags-modal";
import { UploadZone } from "@/components/documents/upload-zone";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import type { MenuItem } from "@/components/ui/menu";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferences } from "@/context/preferences-context";
import { useApi } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { downloadDocument, downloadMany } from "@/lib/download";
import { plural } from "@/lib/utils";
import type {
  BulkResult,
  Category,
  CollectionItem,
  DocumentListItem,
  DocumentsListResponse,
  DocumentSummary,
  FileType,
  TagItem,
} from "@/types/api";
import { ShareModal } from "../sharing/share-modal";

type TypeFilter = "ALL" | FileType;

const TYPES: { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PDF", label: "PDF" },
  { value: "DOCX", label: "DOCX" },
  { value: "TXT", label: "TXT" },
];

function BarButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof FiStar;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-surface-muted",
        danger ? "text-error-text" : "text-text",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </button>
  );
}

export function DocumentsBrowser({
  status,
  withUpload = false,
}: {
  status: "active" | "archived";
  withUpload?: boolean;
}) {
  const archived = status === "archived";
  const router = useRouter();
  const params = useSearchParams();
  const { preferences, ready, update } = usePreferences();
  const view = preferences.view;

  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [category, setCategory] = useState(() => params.get("category") ?? "");
  const [collectionId, setCollectionId] = useState(
    () => params.get("collection") ?? "",
  );
  const [tagId, setTagId] = useState(() => params.get("tag") ?? "");
  const [favorite, setFavorite] = useState(
    () => params.get("favorite") === "true",
  );
  const [page, setPage] = useState(1);

  const [renaming, setRenaming] = useState<DocumentListItem | null>(null);
  const [sharingDoc, setSharingDoc] = useState<DocumentListItem | null>(null);
  const [categoryFor, setCategoryFor] = useState<DocumentListItem | null>(null);
  const [tagsFor, setTagsFor] = useState<DocumentListItem | null>(null);
  const [collectionFor, setCollectionFor] = useState<{
    ids: string[];
    mode: "add" | "move";
  } | null>(null);
  const [trashing, setTrashing] = useState<string[] | null>(null);
  const [bulkModal, setBulkModal] = useState<"category" | "tags" | null>(null);

  const debouncedSearch = useDebounce(search.trim(), 300);

  const queryString = useMemo(() => {
    const q = new URLSearchParams({
      page: String(page),
      limit: String(view.perPage),
      sort: view.sort,
      order: view.order,
      status,
    });
    if (debouncedSearch) q.set("search", debouncedSearch);
    if (type !== "ALL") q.set("type", type);
    if (category) q.set("category", category);
    if (collectionId) q.set("collectionId", collectionId);
    if (tagId) q.set("tagId", tagId);
    if (favorite) q.set("favorite", "true");
    return q.toString();
  }, [
    page,
    view.perPage,
    view.sort,
    view.order,
    status,
    debouncedSearch,
    type,
    category,
    collectionId,
    tagId,
    favorite,
  ]);

  // wait for the saved view settings, so the list is not loaded twice
  const { data, error, loading, reload } = useApi<DocumentsListResponse>(
    ready ? `/documents?${queryString}` : null,
  );
  const categories = useApi<{ items: Category[] }>("/categories");
  const tags = useApi<{ items: TagItem[] }>("/tags");
  const collections = useApi<{ items: CollectionItem[] }>("/collections");
  const ownCollections = (collections.data?.items ?? []).filter(
    (c) => c.isOwner,
  );
  const activeCollection = ownCollections.find((c) => c.id === collectionId);

  // selection belongs to the current list; it is dropped when the filters or the page change
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({
    key: "",
    ids: [],
  });
  const selectedIds = selection.key === queryString ? selection.ids : [];
  const setSelected = (ids: string[]) =>
    setSelection({ key: queryString, ids });

  // a favorite star changes at once, the list is refreshed in the background
  const [fav, setFav] = useState<{
    base: DocumentsListResponse | null;
    map: Record<string, boolean>;
  }>({
    base: null,
    map: {},
  });
  const favMap = fav.base === data ? fav.map : {};
  const shown = (data?.items ?? []).map((d) =>
    d.id in favMap ? { ...d, isFavorite: favMap[d.id] } : d,
  );

  const filtered =
    Boolean(debouncedSearch) ||
    type !== "ALL" ||
    Boolean(category) ||
    Boolean(collectionId) ||
    Boolean(tagId) ||
    favorite;

  function resetFilters() {
    setSearch("");
    setType("ALL");
    setCategory("");
    setCollectionId("");
    setTagId("");
    setFavorite(false);
    setPage(1);
  }

  function refreshAll() {
    reload();
    tags.reload();
    collections.reload();
  }

  function leaveList(count: number) {
    if (data && count >= data.items.length && page > 1) setPage(page - 1);
    else reload();
    collections.reload();
  }

  async function toggleFavorite(doc: DocumentListItem) {
    const next = !doc.isFavorite;
    setFav({ base: data, map: { ...favMap, [doc.id]: next } });
    try {
      await api(`/documents/${doc.id}/favorite`, {
        method: next ? "POST" : "DELETE",
      });
      if (favorite && !next) reload();
    } catch (err) {
      setFav({ base: data, map: { ...favMap, [doc.id]: !next } });
      toast.error(errorMessage(err));
    }
  }

  async function moveToTrash(ids: string[]) {
    if (ids.length === 1)
      await api(`/documents/${ids[0]}`, { method: "DELETE" });
    else
      await api("/documents/bulk", {
        method: "POST",
        body: { action: "trash", documentIds: ids },
      });
    setSelected([]);
    leaveList(ids.length);
  }

  async function restoreFromTrash(ids: string[]) {
    try {
      for (const id of ids)
        await api(`/trash/${id}/restore`, { method: "POST" });
      toast.success("Restored");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function requestTrash(ids: string[]) {
    if (preferences.documents.confirmBeforeTrash) {
      setTrashing(ids);
      return;
    }
    try {
      await moveToTrash(ids);
      toast.success(
        ids.length === 1
          ? "Moved to Trash"
          : `${plural(ids.length, "document")} moved to Trash`,
        {
          action: { label: "Undo", onClick: () => void restoreFromTrash(ids) },
        },
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function archiveMany(ids: string[], archive: boolean) {
    try {
      if (ids.length === 1) {
        await api(`/documents/${ids[0]}/${archive ? "archive" : "unarchive"}`, {
          method: "POST",
        });
      } else {
        await api("/documents/bulk", {
          method: "POST",
          body: { action: archive ? "archive" : "unarchive", documentIds: ids },
        });
      }
      toast.success(archive ? "Archived" : "Restored to your library");
      setSelected([]);
      leaveList(ids.length);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function bulkSimple(
    action: "favorite" | "unfavorite",
    message: string,
  ) {
    try {
      await api("/documents/bulk", {
        method: "POST",
        body: { action, documentIds: selectedIds },
      });
      toast.success(message);
      setSelected([]);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function bulkRemoveFromCollection() {
    if (!activeCollection) return;
    try {
      await api("/documents/bulk", {
        method: "POST",
        body: {
          action: "move",
          documentIds: selectedIds,
          collectionId: null,
          fromCollectionId: activeCollection.id,
        },
      });
      toast.success("Removed from the collection");
      setSelected([]);
      leaveList(selectedIds.length);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function bulkDownload(ids: string[]) {
    const id = toast.loading("Preparing download…");
    try {
      const res = await api<BulkResult>("/documents/bulk", {
        method: "POST",
        body: { action: "download", documentIds: ids },
      });
      await downloadMany(res.files ?? []);
      toast.success("Download started", { id });
    } catch (err) {
      toast.error(errorMessage(err), { id });
    }
  }

  async function handleUploaded(
    doc: DocumentSummary,
    info: { single: boolean },
  ) {
    const defaultCollection = preferences.documents.defaultCollectionId;
    if (defaultCollection) {
      try {
        await api(`/collections/${defaultCollection}/documents`, {
          method: "POST",
          body: { documentIds: [doc.id] },
        });
      } catch {
        toast.warning(
          "The document was uploaded, but could not be added to your default collection.",
        );
      }
    }
    setPage(1);
    refreshAll();
    if (info.single) {
      if (preferences.documents.afterUpload === "open_details")
        router.push(`/documents/${doc.id}`);
      if (preferences.documents.afterUpload === "open_analyze")
        router.push(`/documents/${doc.id}/analyze`);
    }
  }

  function menuFor(doc: DocumentListItem): MenuItem[] {
    return [
      {
        label: "View details",
        icon: FiFileText,
        onClick: () => router.push(`/documents/${doc.id}`),
      },
      { label: "Rename", icon: FiEdit2, onClick: () => setRenaming(doc) },
      { label: "Share", icon: FiShare2, onClick: () => setSharingDoc(doc) },
      {
        label: doc.isFavorite ? "Remove from favorites" : "Add to favorites",
        icon: FiStar,
        onClick: () => void toggleFavorite(doc),
      },
      {
        label: "Set category",
        icon: FiLayers,
        onClick: () => setCategoryFor(doc),
      },
      { label: "Manage tags", icon: FiTag, onClick: () => setTagsFor(doc) },
      {
        label: "Add to collection",
        icon: FiFolder,
        onClick: () => setCollectionFor({ ids: [doc.id], mode: "add" }),
      },
      archived
        ? {
            label: "Restore to library",
            icon: FiRotateCcw,
            onClick: () => void archiveMany([doc.id], false),
          }
        : {
            label: "Archive",
            icon: FiArchive,
            onClick: () => void archiveMany([doc.id], true),
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
        label: "Move to Trash",
        icon: FiTrash2,
        danger: true,
        onClick: () => void requestTrash([doc.id]),
      },
    ];
  }

  const allSelected = shown.length > 0 && selectedIds.length === shown.length;
  const waiting = !ready || (loading && !data);

  return (
    <div className="space-y-8">
      {withUpload && (
        <UploadZone
          onUploaded={(doc, info) => void handleUploaded(doc, info)}
        />
      )}

      <section aria-label={archived ? "Archived documents" : "Your documents"}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full min-w-48 sm:max-w-xs sm:flex-1">
            <FiSearch
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search documents by name"
              placeholder="Search by name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-xl border border-border-strong bg-surface pl-10 pr-3 text-sm text-text placeholder:text-text-muted"
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div
              role="group"
              aria-label="View"
              className="inline-flex rounded-xl border border-border-strong bg-surface-muted p-1"
            >
              {(
                [
                  ["grid", FiGrid, "Grid view"],
                  ["list", FiList, "List view"],
                ] as const
              ).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-label={label}
                  aria-pressed={view.mode === mode}
                  onClick={() =>
                    void update({ view: { mode } }).catch(() => undefined)
                  }
                  className={cn(
                    "grid size-9 place-items-center rounded-lg transition-colors",
                    view.mode === mode
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            aria-pressed={favorite}
            onClick={() => {
              setFavorite((f) => !f);
              setPage(1);
            }}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
              favorite
                ? "border-transparent bg-primary-soft text-link"
                : "border-border text-text-muted hover:bg-surface-muted hover:text-text",
            )}
          >
            <FiStar
              className={cn("size-3.5", favorite && "fill-current")}
              aria-hidden="true"
            />
            Favorites
          </button>

          {categories.data && categories.data.items.length > 0 && (
            <Select
              aria-label="Category"
              className="h-9 min-w-0 rounded-full"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              <option value="none">Uncategorized</option>
              {categories.data.items.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          {ownCollections.length > 0 && (
            <Select
              aria-label="Collection"
              className="h-9 min-w-0 rounded-full"
              value={collectionId}
              onChange={(e) => {
                setCollectionId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All collections</option>
              {ownCollections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          {tags.data && tags.data.items.length > 0 && (
            <Select
              aria-label="Tag"
              className="h-9 min-w-0 rounded-full"
              value={tagId}
              onChange={(e) => {
                setTagId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All tags</option>
              {tags.data.items.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.name}
                </option>
              ))}
            </Select>
          )}
          {filtered && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-medium text-link hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {data && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              {filtered
                ? `${plural(data.total, "document")} found`
                : `${plural(data.total, "document")} ${archived ? "archived" : "in total"}`}
            </p>
            {shown.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
                <Checkbox
                  checked={allSelected}
                  onChange={(c) => setSelected(c ? shown.map((d) => d.id) : [])}
                  label="Select all documents on this page"
                />
                Select all on this page
              </label>
            )}
          </div>
        )}

        <div className="mt-4">
          {waiting ? (
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
                    view.mode === "grid"
                      ? "h-52 rounded-2xl"
                      : "h-16 rounded-xl"
                  }
                />
              ))}
            </div>
          ) : error && !data ? (
            <ErrorState error={error} onRetry={reload} />
          ) : data && data.items.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface">
              {filtered ? (
                <EmptyState
                  icon={FiSearch}
                  title="No documents match"
                  description="Try different words, or clear the filters to see everything."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </Button>
                  }
                />
              ) : archived ? (
                <EmptyState
                  icon={FiArchive}
                  title="Your archive is empty"
                  description="Archive documents you do not need every day. They keep their analyses and chats, and you can restore them any time."
                />
              ) : (
                <EmptyState
                  icon={FiFileText}
                  title="No documents yet"
                  description="Upload your first PDF, DOCX or TXT file above. Once it is uploaded you can analyze it or chat about it."
                />
              )}
            </div>
          ) : data ? (
            <>
              <div
                className={cn(
                  view.mode === "grid"
                    ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    : "space-y-2",
                  "transition-opacity",
                  loading && "opacity-60",
                )}
              >
                {shown.map((doc) => (
                  <DocumentItem
                    key={doc.id}
                    doc={doc}
                    mode={view.mode}
                    menu={menuFor(doc)}
                    selected={selectedIds.includes(doc.id)}
                    onSelect={(c) =>
                      setSelected(
                        c
                          ? [...selectedIds, doc.id]
                          : selectedIds.filter((x) => x !== doc.id),
                      )
                    }
                    onFavorite={() => void toggleFavorite(doc)}
                  />
                ))}
              </div>
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          ) : null}
        </div>
      </section>

      {selectedIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-64 print:hidden">
          <div
            role="toolbar"
            aria-label="Actions for selected documents"
            className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-surface-raised p-2 shadow-xl"
          >
            <BarButton
              icon={FiStar}
              label="Favorite"
              onClick={() => void bulkSimple("favorite", "Added to favorites")}
            />
            <BarButton
              icon={FiStar}
              label="Unfavorite"
              onClick={() =>
                void bulkSimple("unfavorite", "Removed from favorites")
              }
            />
            <BarButton
              icon={FiFolder}
              label="Add to collection"
              onClick={() =>
                setCollectionFor({ ids: selectedIds, mode: "add" })
              }
            />
            {activeCollection && (
              <>
                <BarButton
                  icon={FiFolder}
                  label="Move to…"
                  onClick={() =>
                    setCollectionFor({ ids: selectedIds, mode: "move" })
                  }
                />
                <BarButton
                  icon={FiX}
                  label="Remove from this collection"
                  onClick={() => void bulkRemoveFromCollection()}
                />
              </>
            )}
            <BarButton
              icon={FiTag}
              label="Tags"
              onClick={() => setBulkModal("tags")}
            />
            <BarButton
              icon={FiLayers}
              label="Category"
              onClick={() => setBulkModal("category")}
            />
            <BarButton
              icon={archived ? FiRotateCcw : FiArchive}
              label={archived ? "Restore" : "Archive"}
              onClick={() => void archiveMany(selectedIds, !archived)}
            />
            <BarButton
              icon={FiDownload}
              label="Download"
              onClick={() => void bulkDownload(selectedIds)}
            />
            <BarButton
              icon={FiTrash2}
              label="Move to Trash"
              danger
              onClick={() => void requestTrash(selectedIds)}
            />
            <button
              type="button"
              aria-label="Clear selection"
              onClick={() => setSelected([])}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text"
            >
              <FiX className="size-4" />
            </button>
          </div>
        </div>
      )}

      {renaming && (
        <RenameDocumentModal
          key={renaming.id}
          document={renaming}
          onClose={() => setRenaming(null)}
          onRenamed={reload}
        />
      )}
      {categoryFor && (
        <CategoryModal
          key={categoryFor.id}
          documentIds={[categoryFor.id]}
          currentId={categoryFor.category?.id}
          onClose={() => setCategoryFor(null)}
          onDone={reload}
        />
      )}
      {tagsFor && (
        <TagsModal
          key={tagsFor.id}
          doc={tagsFor}
          onClose={() => setTagsFor(null)}
          onDone={refreshAll}
        />
      )}
      {collectionFor && (
        <CollectionPickerModal
          mode={collectionFor.mode}
          ids={collectionFor.ids}
          from={
            collectionFor.mode === "move" && activeCollection
              ? { id: activeCollection.id, name: activeCollection.name }
              : undefined
          }
          onClose={() => setCollectionFor(null)}
          onDone={() => {
            setSelected([]);
            refreshAll();
          }}
        />
      )}
      {bulkModal === "category" && (
        <CategoryModal
          documentIds={selectedIds}
          onClose={() => setBulkModal(null)}
          onDone={() => {
            setSelected([]);
            reload();
          }}
        />
      )}
      {bulkModal === "tags" && (
        <BulkTagsModal
          ids={selectedIds}
          onClose={() => setBulkModal(null)}
          onDone={() => {
            setSelected([]);
            refreshAll();
          }}
        />
      )}
      {sharingDoc && (
        <ShareModal doc={sharingDoc} onClose={() => setSharingDoc(null)} />
      )}
      {trashing && (
        <ConfirmModal
          title={
            trashing.length === 1
              ? "Move this document to Trash?"
              : `Move ${trashing.length} documents to Trash?`
          }
          description="They stay in Trash for 30 days, and you can restore them from the Trash page before then."
          confirmLabel="Move to Trash"
          successMessage="Moved to Trash"
          onConfirm={() => moveToTrash(trashing)}
          onClose={() => setTrashing(null)}
        />
      )}
    </div>
  );
}
