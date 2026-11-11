"use client";

import { FiMessageSquare, FiPlus, FiTrash2 } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatRelative, plural } from "@/lib/utils";
import type { ConversationListItem } from "@/types/api";

export function ConversationList({
  items,
  loading,
  error,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRetry,
}: {
  items: ConversationListItem[] | null;
  loading: boolean;
  error: unknown;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (item: ConversationListItem) => void;
  onRetry: () => void;
}) {
  return (
    <aside className="rounded-2xl border border-border bg-surface p-3 lg:h-[calc(100dvh-16rem)] lg:min-h-[30rem] lg:overflow-y-auto">
      <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
        <h2 className="text-sm font-semibold text-text">Conversations</h2>
        <Button size="sm" variant="secondary" onClick={onNew}>
          <FiPlus className="size-4" aria-hidden="true" />
          New chat
        </Button>
      </div>

      {loading && !items ? (
        <div className="space-y-2 p-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : error && !items ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : items && items.length === 0 ? (
        <div className="px-3 py-8 text-center">
          <FiMessageSquare
            className="mx-auto size-5 text-text-muted"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium text-text">
            No conversations yet
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Your chats about this document are listed here, so you can continue
            them later.
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {items?.map((item) => (
            <li key={item.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={activeId === item.id ? "true" : undefined}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 pr-10 text-left transition-colors hover:bg-surface-muted",
                  activeId === item.id && "bg-primary-soft",
                )}
              >
                <p className="line-clamp-1 text-sm font-medium text-text">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {plural(item._count.messages, "message")} ·{" "}
                  {formatRelative(item.updatedAt)}
                </p>
              </button>
              <button
                type="button"
                aria-label={`Delete conversation ${item.title}`}
                onClick={() => onDelete(item)}
                className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-text-muted opacity-100 hover:bg-surface hover:text-error-text focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
              >
                <FiTrash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
