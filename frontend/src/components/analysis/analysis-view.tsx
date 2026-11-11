"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiFileText, FiZap } from "react-icons/fi";
import { AnalysisResult } from "@/components/analysis/analysis-result";
import {
  ProgressSteps,
  type Phase,
} from "@/components/analysis/progress-steps";
import { TaskBadge } from "@/components/analysis/task-badge";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { ApiError, api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  ALL_TASKS,
  EXAMPLE_INSTRUCTIONS,
  TASK_DESCRIPTIONS,
} from "@/lib/constants";
import { formatBytes, formatRelative, plural } from "@/lib/utils";
import type {
  AnalysesListResponse,
  AnalysisDetail,
  Detection,
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

export function AnalysisView({ documentId }: { documentId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const savedId = searchParams.get("analysis");

  const doc = useApi<{ document: DocumentDetail }>(`/documents/${documentId}`);
  const history = useApi<AnalysesListResponse>(
    `/analyses?documentId=${documentId}&limit=8`,
  );
  const saved = useApi<{ analysis: AnalysisDetail }>(
    savedId ? `/analyses/${savedId}` : null,
  );

  const [instruction, setInstruction] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [detection, setDetection] = useState<Detection | null>(null);
  const [failedStep, setFailedStep] = useState<1 | 3 | null>(null);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState<AnalysisDetail | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const busy = phase === "detecting" || phase === "analyzing";
  const savedAnalysis = saved.loading ? null : (saved.data?.analysis ?? null);
  const result = fresh ?? savedAnalysis;
  const activeId = fresh?.id ?? savedId;

  useEffect(() => {
    if (fresh)
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [fresh]);

  async function run() {
    const text = instruction.trim();
    if (text.length < 3 || busy) return;

    setPhase("detecting");
    setDetection(null);
    setError("");
    setFailedStep(null);
    setFresh(null);
    if (savedId) router.replace(pathname, { scroll: false });

    let step: 1 | 3 = 1;
    try {
      // 1) which task does the instruction mean?
      const found = await api<Detection>(
        `/documents/${documentId}/detect-task`,
        {
          method: "POST",
          body: { instruction: text },
        },
      );
      setDetection(found);
      setPhase("analyzing");
      step = 3;

      // 2) run it, reusing the detection so it does not run twice
      const res = await api<{ analysis: AnalysisDetail }>(
        `/documents/${documentId}/analyze`,
        {
          method: "POST",
          body: {
            instruction: text,
            tasks: found.tasks,
            targetLanguage: found.targetLanguage,
            usedFallback: found.usedFallback,
          },
        },
      );
      setFresh(res.analysis);
      setPhase("done");
      history.reload();
    } catch (err) {
      setError(errorMessage(err));
      setFailedStep(step);
      setPhase("error");
    }
  }

  function openSaved(id: string) {
    setFresh(null);
    setPhase("idle");
    setDetection(null);
    router.replace(`${pathname}?analysis=${id}`, { scroll: false });
  }

  if (doc.error instanceof ApiError && doc.error.status === 404) {
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
  if (doc.error && !doc.data)
    return <ErrorState error={doc.error} onRetry={doc.reload} />;

  const document = doc.data?.document;

  return (
    <div className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm text-text-muted print:hidden"
      >
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 hover:text-text"
        >
          <FiArrowLeft className="size-4" aria-hidden="true" />
          Documents
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/documents/${documentId}`}
          className="max-w-[14rem] truncate hover:text-text"
        >
          {document?.originalName ?? "…"}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-text">Analyze</span>
      </nav>

      <header className="print:hidden">
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Analyze document
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
          Tell the AI what you need in plain words. It decides which task fits,
          runs it on this document, and saves the result to your history.
        </p>
        {document ? (
          <div className="mt-4 inline-flex max-w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
            <FileTypeBadge type={document.fileType} className="h-8 w-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">
                {document.originalName}
              </p>
              <p className="text-xs text-text-muted">
                {formatBytes(document.fileSize)} ·{" "}
                {plural(document.wordCount, "word")}
              </p>
            </div>
          </div>
        ) : (
          <Skeleton className="mt-4 h-14 w-72 rounded-xl" />
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-3 print:block">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 print:hidden">
            <label
              htmlFor="instruction"
              className="text-[15px] font-semibold text-text"
            >
              What do you want to do with this document?
            </label>
            <p className="mt-1 text-sm text-text-muted">
              Write it in your own words. You can ask for more than one thing at
              once.
            </p>
            <textarea
              id="instruction"
              rows={3}
              maxLength={1000}
              disabled={busy}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void run();
                }
              }}
              placeholder="For example: Give me a short summary and list all important dates."
              className="mt-3 w-full resize-y rounded-xl border border-border-strong bg-surface px-3.5 py-3 text-sm text-text placeholder:text-text-muted disabled:opacity-60"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                {instruction.length}/1000 · Ctrl or ⌘ + Enter to run
              </p>
              <Button
                size="lg"
                loading={busy}
                disabled={instruction.trim().length < 3}
                onClick={() => void run()}
              >
                <FiZap className="size-4" aria-hidden="true" />
                Analyze
              </Button>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Try an example
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_INSTRUCTIONS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={busy}
                    onClick={() => setInstruction(example)}
                    className="rounded-full border border-border px-3 py-1.5 text-left text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-60"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {phase !== "idle" && (
            <ProgressSteps
              phase={phase}
              detection={detection}
              failedStep={failedStep}
              error={error}
            />
          )}

          <div ref={resultRef} className="scroll-mt-20">
            {savedId && saved.loading && !fresh ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : savedId && saved.error && !fresh ? (
              <ErrorState error={saved.error} onRetry={saved.reload} />
            ) : result ? (
              <AnalysisResult analysis={result} />
            ) : phase === "idle" ? (
              <div className="rounded-2xl border border-dashed border-border-strong print:hidden">
                <EmptyState
                  icon={FiZap}
                  title="Your result will appear here"
                  description="Write an instruction above, or pick an example, and press Analyze."
                />
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-6 print:hidden">
          <Panel title="How it works">
            <ol className="space-y-3 text-sm text-text-muted">
              <li>
                <span className="font-medium text-text">
                  1. You write an instruction.
                </span>{" "}
                For example a question, or a request for a summary.
              </li>
              <li>
                <span className="font-medium text-text">
                  2. The AI picks the task.
                </span>{" "}
                It can choose more than one, such as a summary and the dates.
              </li>
              <li>
                <span className="font-medium text-text">
                  3. The task runs on your document.
                </span>{" "}
                The answer comes only from the text of your file.
              </li>
            </ol>
          </Panel>

          <Panel title="What the AI can do">
            <ul className="space-y-3">
              {ALL_TASKS.map((task) => (
                <li key={task} className="text-sm">
                  <TaskBadge task={task} />
                  <p className="mt-1 text-text-muted">
                    {TASK_DESCRIPTIONS[task]}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Previous analyses"
            description={
              history.data
                ? `${plural(history.data.total, "saved result")} for this document.`
                : undefined
            }
          >
            {history.data && history.data.items.length > 0 ? (
              <ul className="-mx-2 space-y-1">
                {history.data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openSaved(item.id)}
                      aria-current={activeId === item.id ? "true" : undefined}
                      className={cn(
                        "w-full rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-muted",
                        activeId === item.id && "bg-primary-soft",
                      )}
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
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">
                {history.loading
                  ? "Loading…"
                  : "No analyses yet. Your results are saved here automatically."}
              </p>
            )}
          </Panel>

          <Panel title="Good to know">
            <ul className="list-disc space-y-2 pl-5 text-sm text-text-muted">
              <li>
                If the answer is not in your document, the AI says so instead of
                guessing.
              </li>
              <li>
                Very long documents may be analyzed in part. The result tells
                you when that happens.
              </li>
              <li>
                AI models can be slow or busy at times. If a run fails, try
                again.
              </li>
              <li>
                AI results can contain mistakes. Check important details against
                the original.
              </li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
