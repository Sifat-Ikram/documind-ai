"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FiArchive,
  FiArrowLeft,
  FiDownload,
  FiEdit2,
  FiFileText,
  FiFolder,
  FiLayers,
  FiLogOut,
  FiMessageSquare,
  FiRotateCcw,
  FiShare2,
  FiStar,
  FiTag,
  FiTrash2,
  FiZap,
} from "react-icons/fi";
import { TaskBadge } from "@/components/analysis/task-badge";
import { CollectionPickerModal } from "@/components/collections/collection-picker-modal";
import { CommentsPanel } from "@/components/discussion/comments-panel";
import { NotesPanel } from "@/components/discussion/notes-panel";
import { CategoryBadge } from "@/components/documents/category-badge";
import { CategoryModal } from "@/components/documents/category-modal";
import { DeleteDocumentModal } from "@/components/documents/delete-document-modal";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { RenameDocumentModal } from "@/components/documents/rename-document-modal";
import { TagsModal } from "@/components/documents/tags-modal";
import { FilePreview } from "@/components/preview/file-preview";
import { ShareModal } from "@/components/sharing/share-modal";
import { VersionsPanel } from "@/components/versions/versions-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { ApiError, api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { downloadDocument } from "@/lib/download";
import {
  formatBytes,
  formatDateTime,
  formatRelative,
  plural,
} from "@/lib/utils";
import type {
  AnalysesListResponse,
  ConversationListItem,
  DocumentDetail,
  VersionDetail,
} from "@/types/api";

const TABS = [
  { id: "preview", label: "Preview" },
  { id: "versions", label: "Versions" },
  { id: "comments", label: "Comments" },
  { id: "notes", label: "Notes" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const ROLE_TEXT = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
} as const;

function SidePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-[15px] font-semibold text-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PreviewTab({ doc }: { doc: DocumentDetail }) {
  const { data, error, loading, reload } = useApi<VersionDetail>(
    `/documents/${doc.id}/versions/${doc.currentVersion}`,
  );
  if (loading && !data) return <Skeleton className="h-80 rounded-2xl" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;
  return (
    <FilePreview
      key={data.fileUrl}
      fileType={data.fileType}
      fileUrl={data.fileUrl}
      text={data.text}
      textNote={
        data.truncated
          ? "Only the first 20,000 characters of the text are shown here."
          : undefined
      }
    />
  );
}

function ActivityPanels({ docId }: { docId: string }) {
  const analyses = useApi<AnalysesListResponse>(
    `/analyses?documentId=${docId}&limit=5`,
  );
  const chats = useApi<{ items: ConversationListItem[] }>(
    `/documents/${docId}/conversations`,
  );

  return (
    <>
      <SidePanel title="Your analyses">
        {analyses.loading && !analyses.data ? (
          <Skeleton className="h-16" />
        ) : analyses.data && analyses.data.items.length > 0 ? (
          <ul className="space-y-1">
            {analyses.data.items.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/documents/${docId}/analyze?analysis=${a.id}`}
                  className="block rounded-xl px-2 py-2 hover:bg-surface-muted"
                >
                  <p className="line-clamp-2 text-sm font-medium text-text">
                    {a.originalInstruction}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {a.detectedTasks.slice(0, 2).map((t) => (
                      <TaskBadge key={t} task={t} />
                    ))}
                    <span className="text-xs text-text-muted">
                      {formatRelative(a.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">
            You have not analyzed this document yet. Use Analyze to get a
            summary, key points, dates and more.
          </p>
        )}
      </SidePanel>

      <SidePanel title="Your chats">
        {chats.loading && !chats.data ? (
          <Skeleton className="h-16" />
        ) : chats.data && chats.data.items.length > 0 ? (
          <ul className="space-y-1">
            {chats.data.items.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/documents/${docId}/chat?conversation=${c.id}`}
                  className="block rounded-xl px-2 py-2 hover:bg-surface-muted"
                >
                  <p className="line-clamp-1 text-sm font-medium text-text">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {plural(c._count.messages, "message")} ·{" "}
                    {formatRelative(c.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">
            You have not chatted about this document yet.
          </p>
        )}
      </SidePanel>
    </>
  );
}

export function DocumentDetailsView({
  id,
  initialTab,
}: {
  id: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ document: DocumentDetail }>(
    `/documents/${id}`,
  );

  const [tab, setTabState] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? (initialTab as TabId) : "preview",
  );
  const [fav, setFav] = useState<boolean | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  function setTab(next: TabId) {
    setTabState(next);
    window.history.replaceState(null, "", `?tab=${next}`);
  }

  if (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 403)
  ) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          icon={FiFileText}
          title="Document not found"
          description="It may have been deleted or moved to Trash, or it is not shared with you any more."
          action={
            <Link href="/documents" className={buttonVariants({ size: "sm" })}>
              Back to documents
            </Link>
          }
        />
      </div>
    );
  }
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }
  if (!data) return null;

  const doc = data.document;
  const isOwner = doc.myRole === "OWNER";
  const canEdit = doc.myRole !== "VIEWER" && doc.fileType !== "PDF";
  const isFav = fav ?? doc.isFavorite;
  const archived = doc.archivedAt !== null;

  async function toggleFavorite() {
    const next = !isFav;
    setFav(next);
    try {
      await api(`/documents/${id}/favorite`, {
        method: next ? "POST" : "DELETE",
      });
    } catch (err) {
      setFav(!next);
      toast.error(errorMessage(err));
    }
  }

  async function toggleArchive() {
    try {
      await api(`/documents/${id}/${archived ? "unarchive" : "archive"}`, {
        method: "POST",
      });
      toast.success(archived ? "Restored to your library" : "Archived");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const menu: MenuItem[] = [
    ...(isOwner
      ? [{ label: "Rename", icon: FiEdit2, onClick: () => setRenaming(true) }]
      : []),
    ...(isOwner
      ? [
          {
            label: "Set category",
            icon: FiLayers,
            onClick: () => setCategoryOpen(true),
          },
        ]
      : []),
    { label: "Manage tags", icon: FiTag, onClick: () => setTagsOpen(true) },
    {
      label: "Add to collection",
      icon: FiFolder,
      onClick: () => setCollectionOpen(true),
    },
    ...(isOwner
      ? [
          {
            label: archived ? "Restore to library" : "Archive",
            icon: archived ? FiRotateCcw : FiArchive,
            onClick: () => void toggleArchive(),
          },
          {
            label: "Move to Trash",
            icon: FiTrash2,
            danger: true,
            onClick: () => setTrashing(true),
          },
        ]
      : []),
    ...(!isOwner && doc.myShareId
      ? [
          {
            label: "Leave this document",
            icon: FiLogOut,
            danger: true,
            onClick: () => setLeaving(true),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm text-text-muted"
      >
        <Link
          href={isOwner ? "/documents" : "/shared"}
          className="inline-flex items-center gap-1.5 hover:text-text"
        >
          <FiArrowLeft className="size-4" aria-hidden="true" />
          {isOwner ? "Documents" : "Shared with Me"}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="max-w-[18rem] truncate text-text">
          {doc.originalName}
        </span>
      </nav>

      <header className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <FileTypeBadge type={doc.fileType} className="h-14 w-18" />
            <div className="min-w-0">
              <h1 className="wrap-break-word text-2xl font-semibold tracking-tight text-text">
                {doc.originalName}
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                {formatBytes(doc.fileSize)} · {plural(doc.wordCount, "word")} ·
                version {doc.currentVersion} · uploaded{" "}
                {formatRelative(doc.createdAt)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {doc.category && <CategoryBadge category={doc.category} />}
                {doc.source === "GENERATED" && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                    AI generated
                  </span>
                )}
                {archived && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                    Archived
                  </span>
                )}
                {!isOwner && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                    Shared by {doc.owner.name} · {ROLE_TEXT[doc.myRole]}
                  </span>
                )}
                {doc.tags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-muted"
                  >
                    #{t.name}
                  </span>
                ))}
                {doc.collections.map((c) => (
                  <Link
                    key={c.id}
                    href={`/collections/${c.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-text-muted hover:text-text"
                  >
                    <FiFolder className="size-3" aria-hidden="true" />
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-5">
          <Link
            href={`/documents/${id}/analyze`}
            className={buttonVariants({ size: "lg" })}
          >
            <FiZap className="size-4" aria-hidden="true" />
            Analyze
          </Link>
          <Link
            href={`/documents/${id}/chat`}
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            <FiMessageSquare className="size-4" aria-hidden="true" />
            Chat
          </Link>
          <Button
            variant="secondary"
            size="lg"
            onClick={() =>
              void toast.promise(downloadDocument(id), {
                loading: "Preparing download…",
                success: "Download started",
                error: (err) => errorMessage(err),
              })
            }
          >
            <FiDownload className="size-4" aria-hidden="true" />
            Download
          </Button>
          {isOwner && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setSharing(true)}
            >
              <FiShare2 className="size-4" aria-hidden="true" />
              Share
            </Button>
          )}
          {canEdit && (
            <Link
              href={`/documents/${id}/edit`}
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <FiEdit2 className="size-4" aria-hidden="true" />
              Edit
            </Link>
          )}
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            aria-pressed={isFav}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            className="grid size-11 place-items-center rounded-xl border border-border-strong text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <FiStar
              className={cn("size-4", isFav && "fill-current text-warning")}
            />
          </button>
          <Menu label="More actions" items={menu} />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div
            role="tablist"
            aria-label="Document sections"
            className="mb-5 flex gap-1 overflow-x-auto border-b border-border"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "border-primary text-text"
                    : "border-transparent text-text-muted hover:text-text",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "preview" && <PreviewTab doc={doc} />}
          {tab === "versions" && (
            <VersionsPanel
              doc={doc}
              canEdit={doc.myRole !== "VIEWER"}
              onChanged={reload}
            />
          )}
          {tab === "comments" && <CommentsPanel docId={id} />}
          {tab === "notes" && (
            <NotesPanel docId={id} canWrite={doc.myRole !== "VIEWER"} />
          )}
        </div>

        <aside className="space-y-6">
          <SidePanel title="About this document">
            <dl className="divide-y divide-border text-sm">
              {(
                [
                  ["Type", doc.fileType],
                  ["Size", formatBytes(doc.fileSize)],
                  ["Words", doc.wordCount.toLocaleString("en-US")],
                  ["Version", `v${doc.currentVersion}`],
                  ["Uploaded", formatDateTime(doc.createdAt)],
                  ["Owner", isOwner ? "You" : doc.owner.name],
                  ["Your access", ROLE_TEXT[doc.myRole]],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0"
                >
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="text-right font-medium text-text">{value}</dd>
                </div>
              ))}
            </dl>
          </SidePanel>
          <ActivityPanels docId={id} />
        </aside>
      </div>

      {renaming && (
        <RenameDocumentModal
          document={doc}
          onClose={() => setRenaming(false)}
          onRenamed={reload}
        />
      )}
      {categoryOpen && (
        <CategoryModal
          documentIds={[id]}
          currentId={doc.category?.id}
          onClose={() => setCategoryOpen(false)}
          onDone={reload}
        />
      )}
      {tagsOpen && (
        <TagsModal
          doc={doc}
          onClose={() => setTagsOpen(false)}
          onDone={reload}
        />
      )}
      {collectionOpen && (
        <CollectionPickerModal
          mode="add"
          ids={[id]}
          onClose={() => setCollectionOpen(false)}
          onDone={reload}
        />
      )}
      {sharing && <ShareModal doc={doc} onClose={() => setSharing(false)} />}
      {trashing && (
        <DeleteDocumentModal
          document={doc}
          onClose={() => setTrashing(false)}
          onDeleted={() => router.replace("/documents")}
        />
      )}
      {leaving && doc.myShareId && (
        <ConfirmModal
          title="Leave this document?"
          description="It will disappear from Shared with Me. The owner can share it with you again."
          confirmLabel="Leave"
          successMessage="You left the document"
          onConfirm={async () => {
            await api(`/documents/${id}/shares/${doc.myShareId}`, {
              method: "DELETE",
            });
            router.replace("/shared");
          }}
          onClose={() => setLeaving(false)}
        />
      )}
    </div>
  );
}
