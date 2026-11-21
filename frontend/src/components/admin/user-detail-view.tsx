"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FiArrowLeft,
  FiClock,
  FiCpu,
  FiFileText,
  FiMessageSquare,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api";
import { formatBytes, formatDateTime, formatRelative } from "@/lib/utils";
import type { AdminUserDetail } from "@/types/admin";
import {
  AdminTable,
  MetricRow,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "./admin-ui";
import { useAdminData } from "./use-admin-data";

export function AdminUserDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, reload } = useAdminData<AdminUserDetail>(
    `/admin/users/${id}`,
  );
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function toggleBlock() {
    if (!data) return;
    setBusy(true);
    try {
      await api(`/admin/users/${id}/block`, {
        method: "PATCH",
        body: { blocked: !data.user.isBlocked },
      });
      toast.success(data.user.isBlocked ? "User unblocked" : "User blocked");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

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

  const { user, overview, recentDocuments, recentAnalyses, recentFeedback } = data;

  return (
    <div>
      <BackLink />

      <PageHeader
        title={user.name}
        description={user.email}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              loading={busy}
              disabled={user.role === "ADMIN"}
              onClick={toggleBlock}
            >
              {user.isBlocked ? "Unblock user" : "Block user"}
            </Button>
            <Button
              variant="danger"
              disabled={user.role === "ADMIN"}
              onClick={() => setConfirmDelete(true)}
            >
              Delete user
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documents"
          value={user.documentCount}
          icon={FiFileText}
          tone="info"
        />
        <StatCard
          label="Analyses"
          value={user.analysisCount}
          icon={FiCpu}
          tone="success"
        />
        <StatCard
          label="Storage used"
          value={formatBytes(overview.storageBytes)}
          icon={FiClock}
          tone="warning"
        />
        <StatCard
          label="AI requests"
          value={overview.aiRequests}
          hint={`${overview.aiTokens.toLocaleString("en")} tokens`}
          icon={FiMessageSquare}
          tone="info"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Account">
          <MetricRow label="Role" value={user.role === "ADMIN" ? "Admin" : "User"} />
          <MetricRow
            label="Status"
            value={
              <StatusBadge tone={user.isBlocked ? "error" : "success"}>
                {user.isBlocked ? "Blocked" : "Active"}
              </StatusBadge>
            }
          />
          <MetricRow label="Joined" value={formatDateTime(user.createdAt)} />
          <MetricRow
            label="Last login"
            value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
          />
          <MetricRow
            label="Last active"
            value={user.lastActiveAt ? formatRelative(user.lastActiveAt) : "No activity"}
          />
          {user.blockedAt && (
            <MetricRow label="Blocked at" value={formatDateTime(user.blockedAt)} />
          )}
        </Panel>

        <Panel title="Activity">
          <MetricRow label="Conversations" value={user.conversationCount} />
          <MetricRow label="Generated documents" value={user.generationCount} />
          <MetricRow label="Feedback submitted" value={user.feedbackCount} />
          <MetricRow label="Active sessions" value={overview.activeSessions} />
          <MetricRow label="AI tokens" value={overview.aiTokens.toLocaleString("en")} />
        </Panel>

        <Panel title="Recent feedback">
          {recentFeedback.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              This user has not sent feedback.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentFeedback.map((item) => (
                <li key={item.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-text">
                      {item.subject}
                    </p>
                    <StatusBadge
                      tone={
                        item.status === "RESOLVED"
                          ? "success"
                          : item.status === "IN_REVIEW"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {item.status.replace("_", " ").toLowerCase()}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-text-muted">
                    {formatRelative(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent documents" className="overflow-hidden">
          <AdminTable
            rows={recentDocuments}
            rowKey={(row) => row.id}
            empty="No documents uploaded"
            columns={[
              { header: "Name", cell: (row) => row.originalName },
              { header: "Type", cell: (row) => row.fileType },
              {
                header: "Size",
                cell: (row) => formatBytes(row.fileSize),
              },
              {
                header: "Uploaded",
                cell: (row) => formatRelative(row.createdAt),
              },
            ]}
          />
        </Panel>

        <Panel title="Recent analyses" className="overflow-hidden">
          <AdminTable
            rows={recentAnalyses}
            rowKey={(row) => row.id}
            empty="No analyses yet"
            columns={[
              {
                header: "Instruction",
                cell: (row) => (
                  <div className="max-w-[240px]">
                    <p className="truncate font-medium text-text">
                      {row.originalInstruction}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {row.document.originalName}
                    </p>
                  </div>
                ),
              },
              {
                header: "When",
                cell: (row) => formatRelative(row.createdAt),
              },
            ]}
          />
        </Panel>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete user"
          description={`Delete ${user.email}? Their documents, conversations and analyses will be removed permanently.`}
          confirmLabel="Delete user"
          successMessage="User deleted"
          onConfirm={async () => {
            await api(`/admin/users/${id}`, { method: "DELETE" });
            router.push("/admin/users");
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
      href="/admin/users"
      className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text"
    >
      <FiArrowLeft className="size-4" aria-hidden="true" />
      All users
    </Link>
  );
}
