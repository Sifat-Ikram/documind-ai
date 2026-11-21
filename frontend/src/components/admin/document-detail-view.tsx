"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCpu, FiFileText, FiMessageSquare } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatBytes, formatDateTime, formatRelative } from "@/lib/utils";
import type { AdminDocumentDetail } from "@/types/admin";
import {
  AdminTable,
  MetricRow,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "./admin-ui";
import { useAdminData } from "./use-admin-data";

const STATUS_TONE = {
  COMPLETED: "success",
  PROCESSING: "warning",
  FAILED: "error",
} as const;

export function AdminDocumentDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, reload } = useAdminData<AdminDocumentDetail>(
    `/admin/documents/${id}`,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (error) {
    return (
      <div>
        <BackLink />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const { document, recentAnalyses, recentConversations } = data;

  return (
    <div>
      <BackLink />

      <PageHeader
        title={document.originalName}
        description={`${document.fileType} · ${formatBytes(document.fileSize)} · uploaded ${formatRelative(document.createdAt)}`}
        actions={
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete document
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Analyses"
          value={document.analysisCount}
          icon={FiCpu}
          tone="info"
        />
        <StatCard
          label="Conversations"
          value={document.conversationCount}
          icon={FiMessageSquare}
          tone="success"
        />
        <StatCard
          label="Versions"
          value={document.versionCount}
          icon={FiFileText}
          tone="warning"
        />
        <StatCard
          label="Words"
          value={document.wordCount}
          hint={`${document.textLength.toLocaleString("en")} characters`}
          icon={FiFileText}
          tone="info"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Document">
          <MetricRow label="Status" value={
            <StatusBadge tone={STATUS_TONE[document.processingStatus]}>
              {document.processingStatus.toLowerCase()}
            </StatusBadge>
          } />
          <MetricRow label="Source" value={document.source === "UPLOAD" ? "Upload" : "AI generated"} />
          <MetricRow label="Current version" value={`v${document.currentVersion}`} />
          <MetricRow label="Created" value={formatDateTime(document.createdAt)} />
          <MetricRow label="Updated" value={formatDateTime(document.updatedAt)} />
          <MetricRow
            label="Archived"
            value={document.archivedAt ? formatDateTime(document.archivedAt) : "No"}
          />
          <MetricRow
            label="In trash"
            value={document.trashedAt ? formatDateTime(document.trashedAt) : "No"}
          />
        </Panel>

        <Panel title="Owner">
          <MetricRow
            label="Name"
            value={
              <Link
                href={`/admin/users/${document.user.id}`}
                className="text-link hover:underline"
              >
                {document.user.name}
              </Link>
            }
          />
          <MetricRow label="Email" value={document.user.email} />
          <MetricRow
            label="Account"
            value={
              <StatusBadge tone={document.user.isBlocked ? "error" : "success"}>
                {document.user.isBlocked ? "Blocked" : "Active"}
              </StatusBadge>
            }
          />
          <MetricRow label="Joined" value={formatDateTime(document.user.createdAt)} />
          <MetricRow label="Shares" value={document.shareCount} />
        </Panel>
      </div>

      <Panel title="Extracted text" className="mb-4">
        {document.textPreview ? (
          <>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-muted p-4 text-xs leading-relaxed text-text">
              {document.textPreview}
            </pre>
            {document.textLength > document.textPreview.length && (
              <p className="mt-2 text-xs text-text-muted">
                Showing the first {document.textPreview.length.toLocaleString("en")} of{" "}
                {document.textLength.toLocaleString("en")} characters.
              </p>
            )}
          </>
        ) : (
          <p className="py-6 text-center text-sm text-text-muted">
            No text was extracted from this document.
          </p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent analyses" className="overflow-hidden">
          <AdminTable
            rows={recentAnalyses}
            rowKey={(row) => row.id}
            empty="No analyses for this document"
            columns={[
              {
                header: "Instruction",
                cell: (row) => (
                  <div className="max-w-[260px]">
                    <p className="truncate font-medium text-text">
                      {row.originalInstruction}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {row.user.email} · {formatRelative(row.createdAt)}
                    </p>
                  </div>
                ),
              },
              {
                header: "Tasks",
                cell: (row) => (
                  <span className="text-xs text-text-muted">
                    {row.detectedTasks.join(", ").toLowerCase() || "—"}
                  </span>
                ),
              },
            ]}
          />
        </Panel>

        <Panel title="Recent conversations" className="overflow-hidden">
          <AdminTable
            rows={recentConversations}
            rowKey={(row) => row.id}
            empty="No conversations for this document"
            columns={[
              {
                header: "Title",
                cell: (row) => (
                  <div className="max-w-[260px]">
                    <p className="truncate font-medium text-text">{row.title}</p>
                    <p className="truncate text-xs text-text-muted">
                      {row.user.email}
                    </p>
                  </div>
                ),
              },
              {
                header: "Messages",
                cell: (row) => row._count.messages,
              },
              {
                header: "Updated",
                cell: (row) => formatRelative(row.updatedAt),
              },
            ]}
          />
        </Panel>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete document"
          description={`Delete "${document.originalName}"? Its analyses, conversations and stored file will be removed permanently.`}
          confirmLabel="Delete document"
          successMessage="Document deleted"
          onConfirm={async () => {
            await api(`/admin/documents/${id}`, { method: "DELETE" });
            router.push("/admin/documents");
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/documents"
      className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text"
    >
      <FiArrowLeft className="size-4" aria-hidden="true" />
      All documents
    </Link>
  );
}
