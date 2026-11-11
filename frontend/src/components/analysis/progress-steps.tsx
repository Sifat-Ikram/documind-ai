import { FiAlertCircle, FiCheck } from "react-icons/fi";
import { TaskBadge } from "@/components/analysis/task-badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import type { Detection } from "@/types/api";

export type Phase = "idle" | "detecting" | "analyzing" | "done" | "error";
type StepState = "pending" | "active" | "done" | "error";

function Step({
  index,
  state,
  title,
  last,
  children,
}: {
  index: number;
  state: StepState;
  title: string;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && (
        <span
          aria-hidden="true"
          className="absolute left-3.5 top-8 bottom-0 w-px bg-border"
        />
      )}
      <span
        className={cn(
          "relative grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
          state === "done" && "bg-success-soft text-success",
          state === "error" && "bg-error-soft text-error",
          state === "active" && "bg-ai-soft text-ai",
          state === "pending" && "border border-border-strong text-text-muted",
        )}
      >
        {state === "done" ? (
          <FiCheck className="size-4" aria-label="Done" />
        ) : state === "error" ? (
          <FiAlertCircle className="size-4" aria-label="Failed" />
        ) : state === "active" ? (
          <Spinner className="size-4" />
        ) : (
          index
        )}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p
          className={cn(
            "text-sm font-semibold",
            state === "pending" ? "text-text-muted" : "text-text",
          )}
        >
          {title}
        </p>
        {children && (
          <div className="mt-1 text-sm text-text-muted">{children}</div>
        )}
      </div>
    </li>
  );
}

export function ProgressSteps({
  phase,
  detection,
  failedStep,
  error,
}: {
  phase: Phase;
  detection: Detection | null;
  failedStep: 1 | 3 | null;
  error: string;
}) {
  const s1: StepState =
    failedStep === 1 ? "error" : phase === "detecting" ? "active" : "done";
  const s2: StepState =
    failedStep === 1 || phase === "detecting" ? "pending" : "done";
  const s3: StepState =
    failedStep === 3
      ? "error"
      : phase === "analyzing"
        ? "active"
        : phase === "done"
          ? "done"
          : "pending";

  return (
    <section
      aria-label="Analysis progress"
      aria-live="polite"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6 print:hidden"
    >
      <ol>
        <Step index={1} state={s1} title="Understanding your instruction">
          {failedStep === 1 ? (
            <span className="text-error-text">{error}</span>
          ) : (
            "The AI reads what you wrote and works out which task fits."
          )}
        </Step>

        <Step index={2} state={s2} title="Choosing the task">
          {detection ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>Detected:</span>
                {detection.tasks.map((task) => (
                  <TaskBadge key={task} task={task} />
                ))}
                {detection.targetLanguage && (
                  <span>→ {detection.targetLanguage}</span>
                )}
              </div>
              {detection.usedFallback && (
                <p>
                  The AI could not tell what you wanted, so your instruction is
                  treated as a question about the document.
                </p>
              )}
            </div>
          ) : (
            "Waiting for the AI to understand your instruction."
          )}
        </Step>

        <Step index={3} state={s3} title="Analyzing the document" last>
          {failedStep === 3 ? (
            <span className="text-error-text">{error}</span>
          ) : (
            "Running the task on your document. Long documents and busy AI models can take up to a minute."
          )}
        </Step>
      </ol>
    </section>
  );
}
