"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiExternalLink,
  FiInfo,
  FiMessageSquare,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Menu } from "@/components/ui/menu";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRelative, plural } from "@/lib/utils";
import type { ConversationOverview, ConversationsResponse } from "@/types/api";

const PAGE_SIZE = 10;

function ConversationCard({
  item,
  onDelete,
}: {
  item: ConversationOverview;
  onDelete: (item: ConversationOverview) => void;
}) {
  const router = useRouter();
  const href = `/documents/${item.document.id}/chat?conversation=${item.id}`;

  return (
    <article className="relative rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-[15px] font-semibold leading-snug text-text">
          <Link
            href={href}
            className="line-clamp-2 wrap-break-word after:absolute after:inset-0 after:content-['']"
          >
            {item.title}
          </Link>
        </h3>
        <Menu
          className="relative z-10 -mr-1.5 -mt-1.5 shrink-0"
          label="Actions for this conversation"
          items={[
            {
              label: "Open conversation",
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

      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <span className="inline-flex min-w-0 items-center gap-2">
          <FileTypeBadge type={item.document.fileType} className="h-7 w-10" />
          <Link
            href={`/documents/${item.document.id}`}
            className="truncate hover:text-text hover:underline"
          >
            {item.document.originalName}
          </Link>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FiMessageSquare className="size-4" aria-hidden="true" />
          {plural(item.messageCount, "message")}
        </span>
        <span>{formatRelative(item.updatedAt)}</span>
      </div>

      {item.lastMessage && (
        <p className="relative z-10 mt-3 line-clamp-2 border-t border-border pt-3 text-sm text-text-muted">
          <span className="font-medium text-text">
            {item.lastMessage.role === "USER" ? "You" : "AI"}:
          </span>{" "}
          {item.lastMessage.preview}
        </p>
      )}
    </article>
  );
}

export function ConversationsView() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<ConversationOverview | null>(null);
  const debounced = useDebounce(search, 350);

  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (debounced.trim()) query.set("search", debounced.trim());

  const { data, error, loading, reload } = useApi<ConversationsResponse>(
    `/conversations?${query}`,
  );

  async function deleteConversation(item: ConversationOverview) {
    await api(`/conversations/${item.id}`, { method: "DELETE" });
    if (data && data.items.length === 1 && page > 1) setPage(page - 1);
    else reload();
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          AI Conversations
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
          Every chat you have had with a document, all in one place. Open one to
          read it again or continue where you stopped.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        <section aria-label="Conversations" className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <FiSearch
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by title or document name"
                aria-label="Search conversations"
                className="h-11 w-full rounded-md border border-border-strong bg-surface pl-10 pr-3.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
              />
            </div>
            {data && (
              <p className="text-sm text-text-muted">
                {debounced.trim()
                  ? `${plural(data.total, "conversation")} found`
                  : `${plural(data.total, "conversation")} in total`}
              </p>
            )}
          </div>

          <div className="mt-4">
            {loading && !data ? (
              <div className="space-y-4" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded-2xl" />
                ))}
              </div>
            ) : error && !data ? (
              <ErrorState error={error} onRetry={reload} />
            ) : data && data.items.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface">
                {debounced.trim() ? (
                  <EmptyState
                    icon={FiSearch}
                    title="No conversation matched"
                    description="Try a shorter word, or clear the search to see every conversation."
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setPage(1);
                        }}
                      >
                        Clear search
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={FiMessageSquare}
                    title="No conversations yet"
                    description="Open a document and use Chat to ask questions about it. Each chat is listed here so you can continue it later."
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
                    <ConversationCard
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
              How conversations work
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
              <li>
                A conversation always belongs to one document. The AI answers
                only from that file.
              </li>
              <li>
                The title is taken from your first question and can be changed
                by continuing the chat.
              </li>
              <li>
                Opening a conversation takes you to the document chat, so you can
                keep asking questions straight away.
              </li>
              <li>
                Deleting a conversation removes all of its messages. Deleting the
                document removes its conversations too.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
              <FiSearch className="size-4 text-text-muted" aria-hidden="true" />
              Need one answer across many files?
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              AI Search looks through every document at once and can write a
              single answer with sources.
            </p>
            <Link
              href="/search"
              className="mt-3 inline-flex text-sm font-medium text-link hover:underline"
            >
              Open AI Search
            </Link>
          </section>
        </aside>
      </div>

      {deleting && (
        <ConfirmModal
          title="Delete this conversation?"
          description={`"${deleting.title}" and all of its messages will be deleted. This cannot be undone.`}
          successMessage="Conversation deleted"
          onConfirm={() => deleteConversation(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
