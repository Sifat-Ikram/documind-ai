"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FiFileText, FiSearch } from "react-icons/fi";
import { DeleteDocumentModal } from "@/components/documents/delete-document-modal";
import { DocumentCard } from "@/components/documents/document-card";
import { RenameDocumentModal } from "@/components/documents/rename-document-modal";
import { UploadZone } from "@/components/documents/upload-zone";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { downloadDocument } from "@/lib/download";
import { plural } from "@/lib/utils";
import type {
  DocumentsListResponse,
  DocumentSummary,
  FileType,
} from "@/types/api";

const PAGE_SIZE = 12;
type Filter = "ALL" | FileType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PDF", label: "PDF" },
  { value: "DOCX", label: "DOCX" },
  { value: "TXT", label: "TXT" },
];

export function DocumentsView() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);
  const [renaming, setRenaming] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState<DocumentSummary | null>(null);

  const debouncedSearch = useDebounce(search.trim(), 300);

  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (debouncedSearch) query.set("search", debouncedSearch);
  if (filter !== "ALL") query.set("type", filter);

  const { data, error, loading, reload } = useApi<DocumentsListResponse>(
    `/documents?${query}`,
  );
  const filtered = Boolean(debouncedSearch) || filter !== "ALL";

  function handleDownload(doc: DocumentSummary) {
    toast.promise(downloadDocument(doc.id), {
      loading: "Preparing download…",
      success: "Download started",
      error: (err) => errorMessage(err),
    });
  }

  function afterDelete() {
    if (data && data.items.length === 1 && page > 1) setPage(page - 1);
    else reload();
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Documents
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
          Everything you have uploaded. Open a document to analyze it with AI,
          chat about its contents, or download the original file.
        </p>
      </header>

      <UploadZone
        onUploaded={() => {
          setPage(1);
          reload();
        }}
      />

      <section aria-label="Your documents">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
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

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => {
                  setFilter(f.value);
                  setPage(1);
                }}
                className={cn(
                  "h-9 rounded-full border px-4 text-sm font-medium transition-colors",
                  filter === f.value
                    ? "border-transparent bg-primary-soft text-link"
                    : "border-border text-text-muted hover:bg-surface-muted hover:text-text",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <p className="mt-4 text-sm text-text-muted">
            {filtered
              ? `${plural(data.total, "document")} found`
              : `${plural(data.total, "document")} in total`}
          </p>
        )}

        <div className="mt-4">
          {loading && !data ? (
            <div
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              aria-busy="true"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
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
                  description="Try a different name, or clear the filters to see everything."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setFilter("ALL");
                        setPage(1);
                      }}
                    >
                      Clear filters
                    </Button>
                  }
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
                  "grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
                  loading && "opacity-60",
                )}
              >
                {data.items.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onRename={setRenaming}
                    onDelete={setDeleting}
                    onDownload={handleDownload}
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
        </div>
      </section>

      {renaming && (
        <RenameDocumentModal
          key={renaming.id}
          document={renaming}
          onClose={() => setRenaming(null)}
          onRenamed={reload}
        />
      )}
      {deleting && (
        <DeleteDocumentModal
          key={deleting.id}
          document={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={afterDelete}
        />
      )}
    </div>
  );
}
