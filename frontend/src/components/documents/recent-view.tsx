"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FiClock,
  FiDownload,
  FiFileText,
  FiMessageSquare,
  FiZap,
} from "react-icons/fi";
import { DocumentItem } from "@/components/documents/document-item";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import type { MenuItem } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useApi } from "@/hooks/use-api";
import { errorMessage } from "@/lib/api";
import { downloadDocument } from "@/lib/download";
import { formatBytes, formatRelative } from "@/lib/utils";
import type { RecentDocument } from "@/types/api";

const ROLE_TEXT = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
} as const;

export function RecentView() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<{ items: RecentDocument[] }>(
    "/documents/recent?limit=30",
  );

  function menuFor(doc: RecentDocument): MenuItem[] {
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
    ];
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Recent
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
          The documents you uploaded or opened lately, newest first. This list
          updates by itself. You can clear it in Settings.
        </p>
      </header>

      {loading && !data ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data && data.items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            icon={FiClock}
            title="Nothing here yet"
            description="Documents you upload or open will show up here."
          />
        </div>
      ) : data ? (
        <div className="space-y-2">
          {data.items.map((doc) => (
            <DocumentItem
              key={doc.id}
              doc={doc}
              mode="list"
              menu={menuFor(doc)}
              subtitle={`Opened ${formatRelative(doc.lastAccessedAt)} · ${formatBytes(doc.fileSize)}`}
              badge={
                doc.owner.id !== user?.id ? (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                    Shared by {doc.owner.name} · {ROLE_TEXT[doc.myRole]}
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
