"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiClock,
  FiExternalLink,
  FiFileText,
  FiInfo,
  FiTrash2,
} from "react-icons/fi";
import { TaskBadge } from "@/components/analysis/task-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Menu } from "@/components/ui/menu";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime, plural } from "@/lib/utils";
import type {
  AnalysesListResponse,
  AnalysisListItem,
  DocumentsListResponse,
} from "@/types/api";

const PAGE_SIZE = 10;

function HistoryCard({
  item,
  onDelete,
}: {
  item: AnalysisListItem;
  onDelete: (item: AnalysisListItem) => void;
}) {
  const router = useRouter();
  const href = `/documents/${item.documentId}/analyze?analysis=${item.id}`;

  return (
    <article className="relative rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-[15px] font-semibold leading-snug text-text">
          {/* the link covers the whole card, the menu and document link stay clickable above it */}
          <Link
            href={href}
            className="line-clamp-2 break-words after:absolute after:inset-0 after:content-['']"
          >
            {item.originalInstruction}
          </Link>
        </h3>
        <Menu
          className="relative z-10 -mr-1.5 -mt-1.5 shrink-0"
          label="Actions for this analysis"
          items={[
            {
              label: "Open result",
              icon: FiExternalLink,
              onClick: () => router.push(href),
            },
            {
              label: "Delete",
              icon: FiTrash2,
              onClick: () => onDelete(item),
              danger: true,
            },
          ]}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {item.detectedTasks.map((task) => (
          <TaskBadge key={task} task={task} />
        ))}
        {item.targetLanguage && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
            Language: {item.targetLanguage}
          </span>
        )}
        {item.usedFallback && (
          <span
            title="The AI could not tell what was wanted, so the instruction was treated as a question about the document."
            className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted"
          >
            Treated as a question
          </span>
        )}
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4 text-sm text-text-muted">
        <Link
          href={`/documents/${item.document.id}`}
          className="inline-flex min-w-0 items-center gap-1.5 hover:text-text hover:underline"
        >
          <FiFileText className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.document.originalName}</span>
        </Link>
        <span className="inline-flex items-center gap-1.5">
          <FiClock className="size-4" aria-hidden="true" />
          {formatDateTime(item.createdAt)}
        </span>
      </div>
    </article>
  );
}

export function HistoryView() {
  const [documentId, setDocumentId] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<AnalysisListItem | null>(null);

  const docs = useApi<DocumentsListResponse>("/documents?limit=50");

  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (documentId) query.set("documentId", documentId);
  const { data, error, loading, reload } = useApi<AnalysesListResponse>(
    `/analyses?${query}`,
  );

  async function deleteAnalysis(item: AnalysisListItem) {
    await api(`/analyses/${item.id}`, { method: "DELETE" });
    if (data && data.items.length === 1 && page > 1) setPage(page - 1);
    else reload();
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          History
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
          Every result from the Analyze tool is saved here automatically. Open
          one to read the full result again, copy it, or save it as a PDF.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        <section aria-label="Saved analyses" className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="history-document"
                className="text-sm font-medium text-text"
              >
                Document
              </label>
              <select
                id="history-document"
                value={documentId}
                onChange={(e) => {
                  setDocumentId(e.target.value);
                  setPage(1);
                }}
                className="h-11 max-w-[16rem] rounded-xl border border-border-strong bg-surface px-3.5 text-sm text-text"
              >
                <option value="">All documents</option>
                {docs.data?.items.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.originalName}
                  </option>
                ))}
              </select>
            </div>
            {data && (
              <p className="text-sm text-text-muted">
                {documentId
                  ? `${plural(data.total, "analysis")} for this document`
                  : `${plural(data.total, "analysis")} in total`}
              </p>
            )}
          </div>

          <div className="mt-4">
            {loading && !data ? (
              <div className="space-y-4" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : error && !data ? (
              <ErrorState error={error} onRetry={reload} />
            ) : data && data.items.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface">
                {documentId ? (
                  <EmptyState
                    icon={FiClock}
                    title="No analyses for this document"
                    description="Results you create with the Analyze tool for this document will be listed here."
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setDocumentId("");
                          setPage(1);
                        }}
                      >
                        Show all documents
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={FiClock}
                    title="No analyses yet"
                    description="Open a document and use Analyze to get a summary, key points, dates and more. Each result is saved here."
                    action={
                      <Link
                        href="/documents"
                        className={buttonVariants({ size: "sm" })}
                      >
                        Go to documents
                      </Link>
                    }
                  />
                )}
              </div>
            ) : data ? (
              <>
                <div
                  className={cn(
                    "space-y-4 transition-opacity",
                    loading && "opacity-60",
                  )}
                >
                  {data.items.map((item) => (
                    <HistoryCard
                      key={item.id}
                      item={item}
                      onDelete={setDeleting}
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

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
              <FiInfo className="size-4 text-text-muted" aria-hidden="true" />
              How history works
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
              <li>
                A result is saved each time you run Analyze. Nothing else to do.
              </li>
              <li>
                Each entry shows your original instruction and the task the AI
                chose for it.
              </li>
              <li>
                &ldquo;Treated as a question&rdquo; means the AI could not tell
                what you wanted, so it answered your instruction as a question
                about the document.
              </li>
              <li>
                Deleting an entry removes it permanently. Deleting a document
                also removes all of its analyses and chats.
              </li>
              <li>
                Chats are not listed here. Find them under the document they
                belong to.
              </li>
            </ul>
          </section>
        </aside>
      </div>

      {deleting && (
        <ConfirmModal
          title="Delete this analysis?"
          description="The saved result will be removed permanently. The document itself is not affected."
          successMessage="Analysis deleted"
          onConfirm={() => deleteAnalysis(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
