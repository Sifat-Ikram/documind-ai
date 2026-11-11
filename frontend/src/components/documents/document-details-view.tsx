"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FiArrowLeft,
  FiDownload,
  FiEdit2,
  FiFileText,
  FiMessageSquare,
  FiTrash2,
  FiZap,
} from "react-icons/fi";
import { TaskBadge } from "@/components/analysis/task-badge";
import { DeleteDocumentModal } from "@/components/documents/delete-document-modal";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { RenameDocumentModal } from "@/components/documents/rename-document-modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Menu } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { ApiError, errorMessage } from "@/lib/api";
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
} from "@/types/api";

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-[15px] font-semibold text-text">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-text-muted">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DocumentDetailsView({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ document: DocumentDetail }>(
    `/documents/${id}`,
  );
  const analyses = useApi<AnalysesListResponse>(
    `/analyses?documentId=${id}&limit=5`,
  );
  const chats = useApi<{ items: ConversationListItem[] }>(
    `/documents/${id}/conversations`,
  );
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading && !data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid gap-6 xl:grid-cols-3">
          <Skeleton className="h-96 rounded-2xl xl:col-span-2" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          icon={FiFileText}
          title="Document not found"
          description="It may have been deleted, or the link is wrong."
          action={
            <Link href="/documents" className={buttonVariants({ size: "sm" })}>
              Back to documents
            </Link>
          }
        />
      </div>
    );
  }

  if (error || !data) return <ErrorState error={error} onRetry={reload} />;

  const doc = data.document;

  function handleDownload() {
    toast.promise(downloadDocument(doc.id), {
      loading: "Preparing download…",
      success: "Download started",
      error: (err) => errorMessage(err),
    });
  }

  const details: [string, string][] = [
    ["File type", doc.fileType],
    ["Size", formatBytes(doc.fileSize)],
    ["Words", doc.wordCount.toLocaleString("en")],
    ["Characters extracted", doc.textLength.toLocaleString("en")],
    ["Uploaded", formatDateTime(doc.createdAt)],
    ["Last changed", formatDateTime(doc.updatedAt)],
  ];

  return (
    <div className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm text-text-muted"
      >
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 hover:text-text"
        >
          <FiArrowLeft className="size-4" aria-hidden="true" />
          Documents
        </Link>
        <span aria-hidden="true">/</span>
        <span className="max-w-[16rem] truncate text-text">
          {doc.originalName}
        </span>
      </nav>

      <header className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <FileTypeBadge type={doc.fileType} className="h-14 w-16 text-sm" />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-text">
                {doc.originalName}
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                {formatBytes(doc.fileSize)} · {plural(doc.wordCount, "word")} ·
                uploaded {formatRelative(doc.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/documents/${doc.id}/analyze`}
              className={buttonVariants({ size: "lg" })}
            >
              <FiZap className="size-4" aria-hidden="true" />
              Analyze
            </Link>
            <Link
              href={`/documents/${doc.id}/chat`}
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <FiMessageSquare className="size-4" aria-hidden="true" />
              Chat
            </Link>
            <Button variant="secondary" size="lg" onClick={handleDownload}>
              <FiDownload className="size-4" aria-hidden="true" />
              Download
            </Button>
            <Menu
              label="More actions"
              items={[
                {
                  label: "Rename",
                  icon: FiEdit2,
                  onClick: () => setRenaming(true),
                },
                {
                  label: "Delete",
                  icon: FiTrash2,
                  onClick: () => setDeleting(true),
                  danger: true,
                },
              ]}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel
            title="Extracted text"
            description="This is the text we read from your file. The AI works with this text, not with the original layout, images or formatting."
          >
            {doc.textPreview ? (
              <>
                <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-surface-muted p-4 text-sm leading-relaxed text-text">
                  {doc.textPreview}
                </pre>
                {doc.previewTruncated && (
                  <p className="mt-3 text-sm text-text-muted">
                    Showing the first{" "}
                    {doc.textPreview.length.toLocaleString("en")} of{" "}
                    {doc.textLength.toLocaleString("en")} characters. The AI
                    uses the full text, up to its own limits.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-text-muted">
                No text was extracted from this file.
              </p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Details">
            <dl className="divide-y divide-border text-sm">
              {details.map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="text-right font-medium text-text">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            title="Analyses"
            description={`${plural(doc._count.analyses, "saved result")} for this document.`}
          >
            {analyses.data && analyses.data.items.length > 0 ? (
              <ul className="-mx-2 space-y-1">
                {analyses.data.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/documents/${doc.id}/analyze?analysis=${item.id}`}
                      className="block rounded-xl px-2 py-2 hover:bg-surface-muted"
                    >
                      <p className="line-clamp-2 text-sm font-medium text-text">
                        {item.originalInstruction}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {item.detectedTasks.map((task) => (
                          <TaskBadge key={task} task={task} />
                        ))}
                        <span className="text-xs text-text-muted">
                          {formatRelative(item.createdAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">
                {analyses.loading
                  ? "Loading…"
                  : "Nothing yet. Use Analyze to ask the AI for a summary, key points, dates and more."}
              </p>
            )}
          </Panel>

          <Panel
            title="Chats"
            description={`${plural(doc._count.conversations, "conversation")} about this document.`}
          >
            {chats.data && chats.data.items.length > 0 ? (
              <ul className="-mx-2 space-y-1">
                {chats.data.items.slice(0, 5).map((chat) => (
                  <li key={chat.id}>
                    <Link
                      href={`/documents/${doc.id}/chat`}
                      className="block rounded-xl px-2 py-2 hover:bg-surface-muted"
                    >
                      <p className="line-clamp-1 text-sm font-medium text-text">
                        {chat.title}
                      </p>
                      <p className="text-xs text-text-muted">
                        {plural(chat._count.messages, "message")} ·{" "}
                        {formatRelative(chat.updatedAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">
                {chats.loading
                  ? "Loading…"
                  : "No chats yet. Open Chat to ask questions about this document."}
              </p>
            )}
          </Panel>
        </div>
      </div>

      {renaming && (
        <RenameDocumentModal
          document={doc}
          onClose={() => setRenaming(false)}
          onRenamed={reload}
        />
      )}
      {deleting && (
        <DeleteDocumentModal
          document={doc}
          onClose={() => setDeleting(false)}
          onDeleted={() => router.replace("/documents")}
        />
      )}
    </div>
  );
}
