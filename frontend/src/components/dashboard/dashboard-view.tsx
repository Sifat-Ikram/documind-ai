"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { IconType } from "react-icons";
import {
  FiFileText,
  FiHardDrive,
  FiMessageSquare,
  FiUploadCloud,
  FiZap,
} from "react-icons/fi";
import { TaskBadge } from "@/components/analysis/task-badge";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useApi } from "@/hooks/use-api";
import { firstName, formatBytes, formatRelative } from "@/lib/utils";
import type {
  ActivityItem,
  DashboardResponse,
  DocumentSummary,
} from "@/types/api";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: IconType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{label}</p>
        <span className="grid size-9 place-items-center rounded-lg bg-surface-muted text-text-muted">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-text">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function DocumentRow({ doc }: { doc: DocumentSummary }) {
  return (
    <li>
      <Link
        href={`/documents/${doc.id}`}
        className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-muted"
      >
        <FileTypeBadge type={doc.fileType} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">
            {doc.originalName}
          </p>
          <p className="text-xs text-text-muted">
            {formatBytes(doc.fileSize)} · {formatRelative(doc.createdAt)}
          </p>
        </div>
      </Link>
    </li>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const isAnalysis = item.type === "analysis";
  const href = isAnalysis ? "/history" : `/documents/${item.documentId}/chat`;
  return (
    <li>
      <Link
        href={href}
        className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-muted"
      >
        <span
          className={
            isAnalysis
              ? "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-ai-soft text-ai"
              : "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-text-muted"
          }
        >
          {isAnalysis ? (
            <FiZap className="size-4" aria-hidden="true" />
          ) : (
            <FiMessageSquare className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{item.title}</p>
          <p className="truncate text-xs text-text-muted">
            {item.documentName} · {formatRelative(item.at)}
          </p>
          {isAnalysis && item.tasks.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.tasks.slice(0, 3).map((task) => (
                <TaskBadge key={task} task={task} />
              ))}
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

export function DashboardView() {
  const { user } = useAuth();
  const { data, error, loading, reload } =
    useApi<DashboardResponse>("/dashboard/stats");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Welcome back{user ? `, ${firstName(user.name)}` : ""}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            A summary of your documents and recent AI activity.
          </p>
        </div>
        <Link href="/documents" className={buttonVariants({ size: "lg" })}>
          <FiUploadCloud className="size-4" aria-hidden="true" />
          Upload document
        </Link>
      </div>

      {loading && !data ? (
        <DashboardSkeleton />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Documents"
              value={String(data.stats.documents)}
              icon={FiFileText}
            />
            <StatCard
              label="Analyses"
              value={String(data.stats.analyses)}
              icon={FiZap}
            />
            <StatCard
              label="Conversations"
              value={String(data.stats.conversations)}
              icon={FiMessageSquare}
            />
            <StatCard
              label="Storage used"
              value={formatBytes(data.stats.storageBytes)}
              icon={FiHardDrive}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title="Recent documents"
              action={
                data.recentDocuments.length > 0 ? (
                  <Link
                    href="/documents"
                    className="text-sm font-medium text-link hover:underline"
                  >
                    View all
                  </Link>
                ) : undefined
              }
            >
              {data.recentDocuments.length === 0 ? (
                <EmptyState
                  icon={FiFileText}
                  title="No documents yet"
                  description="Upload a PDF, DOCX or TXT file to get started."
                  action={
                    <Link
                      href="/documents"
                      className={buttonVariants({ size: "sm" })}
                    >
                      Upload document
                    </Link>
                  }
                />
              ) : (
                <ul>
                  {data.recentDocuments.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Recent activity"
              action={
                data.recentActivity.length > 0 ? (
                  <Link
                    href="/history"
                    className="text-sm font-medium text-link hover:underline"
                  >
                    View history
                  </Link>
                ) : undefined
              }
            >
              {data.recentActivity.length === 0 ? (
                <EmptyState
                  icon={FiZap}
                  title="No activity yet"
                  description="Your analyses and chats will appear here."
                />
              ) : (
                <ul>
                  {data.recentActivity.map((item) => (
                    <ActivityRow key={`${item.type}-${item.id}`} item={item} />
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
