import Link from "next/link";
import { TaskBadge } from "@/components/analysis/task-badge";
import { Logo } from "@/components/ui/logo";
import { ALL_TASKS } from "@/lib/constants";

const STEPS = [
  {
    title: "Upload a document",
    text: "PDF, DOCX or TXT, up to 5 MB.",
  },
  {
    title: "Tell the AI what you need",
    text: "Describe it in plain words. The AI works out which task you mean.",
  },
  {
    title: "Get a structured result",
    text: "Read it, copy it, save it as a PDF, or keep asking questions in a chat.",
  },
];

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-0 opacity-60"
      />

      <div className="relative">
        <Link href="/" aria-label="DocuMind AI home">
          <Logo className="text-xl" />
        </Link>
      </div>

      <div className="relative max-w-md">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
          AI document analysis
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-text">
          Tell the AI what you need. It picks the right task.
        </h2>

        <ol className="mt-10 space-y-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border-strong text-sm font-medium text-text">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-text">{step.title}</p>
                <p className="mt-0.5 text-sm text-text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
          What it can do
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_TASKS.map((task) => (
            <TaskBadge key={task} task={task} />
          ))}
        </div>
      </div>
    </aside>
  );
}
