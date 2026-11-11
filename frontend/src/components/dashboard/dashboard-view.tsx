"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { IconType } from "react-icons";
import {
  FiAlertTriangle,
  FiCheck,
  FiCheckCircle,
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
import { cn } from "@/lib/cn";
import {
  firstName,
  formatBytes,
  formatRelative,
  formatToday,
  greeting,
} from "@/lib/utils";
import type {
  ActivityItem,
  DashboardResponse,
  DocumentSummary,
  TaskType,
} from "@/types/api";

type Stats = DashboardResponse["stats"];

const EXAMPLES: { text: string; tasks: TaskType[] }[] = [
  { text: "Summarize this document.", tasks: ["SUMMARIZE"] },
  {
    text: "Give me a short summary and list all important dates.",
    tasks: ["SUMMARIZE", "EXTRACT_DATA"],
  },
  { text: "Explain this in simple English.", tasks: ["SIMPLIFY"] },
  { text: "Who is responsible for the budget?", tasks: ["DOCUMENT_QA"] },
  { text: "Find the action items.", tasks: ["EXTRACT_ACTION_ITEMS"] },
  { text: "Translate this into Bangla.", tasks: ["TRANSLATE"] },
];

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: IconType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-text">
            {value}
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-surface-muted text-text-muted">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xs text-text-muted">{caption}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-surface", className)}
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-semibold text-text">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-text-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-3 pt-2">{children}</div>
    </section>
  );
}

function GetStarted({ stats }: { stats: Stats }) {
  const steps = [
    {
      title: "Upload a document",
      text: "Add a PDF, DOCX or TXT file (up to 5 MB).",
      done: stats.documents > 0,
      cta: "Upload document",
    },
    {
      title: "Tell the AI what you need",
      text: "Write what you want, for example a summary or all the dates. The AI picks the right task.",
      done: stats.analyses > 0,
      cta: "Open documents",
    },
    {
      title: "Ask follow-up questions",
      text: "Open a chat for a document and ask about anything inside it.",
      done: stats.conversations > 0,
      cta: "Open documents",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-text">Get started</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            {completed} of {steps.length} steps done
          </p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-5 space-y-4">
        {steps.map((step, i) => {
          const current = i === currentIndex;
          return (
            <li key={step.title} className="flex gap-4">
              <span
                className={cn(
                  "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                  step.done
                    ? "bg-success-soft text-success"
                    : current
                      ? "border-2 border-primary text-link"
                      : "border border-border-strong text-text-muted",
                )}
              >
                {step.done ? (
                  <FiCheck className="size-4" aria-label="Done" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    step.done ? "text-text-muted" : "text-text",
                  )}
                >
                  {step.title}
                </p>
                <p className="mt-0.5 text-sm text-text-muted">{step.text}</p>
                {current && (
                  <Link
                    href="/documents"
                    className={buttonVariants({
                      size: "sm",
                      className: "mt-3",
                    })}
                  >
                    {step.cta}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function DocumentRow({ doc }: { doc: DocumentSummary }) {
  return (
    <li>
      <Link
        href={`/documents/${doc.id}`}
        className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-surface-muted"
      >
        <FileTypeBadge type={doc.fileType} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">
            {doc.originalName}
          </p>
          <p className="text-xs text-text-muted">
            {formatBytes(doc.fileSize)} · {doc.wordCount.toLocaleString("en")}{" "}
            words · {formatRelative(doc.createdAt)}
          </p>
        </div>
      </Link>
    </li>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const isAnalysis = item.type === "analysis";
  const href = isAnalysis
    ? `/documents/${item.documentId}/analyze?analysis=${item.id}`
    : `/documents/${item.documentId}/chat`;

  return (
    <li>
      <Link
        href={href}
        className="flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-surface-muted"
      >
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
            isAnalysis
              ? "bg-ai-soft text-ai"
              : "bg-surface-muted text-text-muted",
          )}
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
            {isAnalysis ? "Analysis" : "Chat"} · {item.documentName} ·{" "}
            {formatRelative(item.at)}
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

function ExamplesCard() {
  return (
    <Panel
      title="Things you can ask"
      description="The AI detects the task from your instruction."
    >
      <ul className="divide-y divide-border">
        {EXAMPLES.map((example) => (
          <li key={example.text} className="px-2.5 py-3">
            <p className="text-sm text-text">&ldquo;{example.text}&rdquo;</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-text-muted">Detected:</span>
              {example.tasks.map((task) => (
                <TaskBadge key={task} task={task} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SupportedFilesCard() {
  const items: { icon: IconType; tone: string; text: string }[] = [
    {
      icon: FiCheckCircle,
      tone: "text-success",
      text: "PDF, DOCX and TXT files",
    },
    { icon: FiCheckCircle, tone: "text-success", text: "Up to 5 MB per file" },
    {
      icon: FiAlertTriangle,
      tone: "text-warning",
      text: "Scanned or image-only PDFs have no text, so they are not supported.",
    },
    {
      icon: FiAlertTriangle,
      tone: "text-warning",
      text: "Files are stored with a public link. Do not upload sensitive documents.",
    },
  ];

  return (
    <Panel title="Supported files">
      <ul className="space-y-3 px-2.5 py-2">
        {items.map(({ icon: Icon, tone, text }) => (
          <li key={text} className="flex gap-3 text-sm text-text-muted">
            <Icon
              className={cn("mt-0.5 size-4 shrink-0", tone)}
              aria-hidden="true"
            />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {formatToday()}
          </p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-text">
            {greeting()}
            {user ? `, ${firstName(user.name)}` : ""}
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            An overview of your documents and recent AI activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/documents"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            <FiFileText className="size-4" aria-hidden="true" />
            Documents
          </Link>
          <Link href="/documents" className={buttonVariants({ size: "lg" })}>
            <FiUploadCloud className="size-4" aria-hidden="true" />
            Upload document
          </Link>
        </div>
      </header>

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
              caption="Uploaded files"
              icon={FiFileText}
            />
            <StatCard
              label="Analyses"
              value={String(data.stats.analyses)}
              caption="Saved AI results"
              icon={FiZap}
            />
            <StatCard
              label="Conversations"
              value={String(data.stats.conversations)}
              caption="Chats about your documents"
              icon={FiMessageSquare}
            />
            <StatCard
              label="Storage used"
              value={formatBytes(data.stats.storageBytes)}
              caption="Across all your files"
              icon={FiHardDrive}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <GetStarted stats={data.stats} />

              <Panel
                title="Recent documents"
                description="Your latest uploads."
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
                description="Analyses and chats."
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
                      <ActivityRow
                        key={`${item.type}-${item.id}`}
                        item={item}
                      />
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="space-y-6">
              <ExamplesCard />
              <SupportedFilesCard />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
