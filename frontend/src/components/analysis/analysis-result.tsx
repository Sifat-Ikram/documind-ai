"use client";

import { FiCopy, FiInfo, FiPrinter } from "react-icons/fi";
import { SectionBody } from "@/components/analysis/section-renderers";
import {
  analysisToText,
  sectionToText,
} from "@/components/analysis/result-text";
import { TaskBadge } from "@/components/analysis/task-badge";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { formatDateTime } from "@/lib/utils";
import type { AnalysisDetail } from "@/types/api";

export function AnalysisResult({ analysis }: { analysis: AnalysisDetail }) {
  const { sections, notes } = analysis.result;

  return (
    <section aria-label="Analysis result" className="space-y-5">
      <div className="hidden print:block">
        <p className="text-sm font-semibold">DocuMind AI</p>
        <p className="text-xs">
          {analysis.document.originalName} ·{" "}
          {formatDateTime(analysis.createdAt)}
        </p>
      </div>

      <header className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Result
            </p>
            <p className="mt-1 break-words text-base font-semibold text-text">
              &ldquo;{analysis.originalInstruction}&rdquo;
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                copyText(analysisToText(analysis), "Result copied")
              }
            >
              <FiCopy className="size-4" aria-hidden="true" />
              Copy all
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
            >
              <FiPrinter className="size-4" aria-hidden="true" />
              Save as PDF
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">Detected:</span>
          {analysis.detectedTasks.map((task) => (
            <TaskBadge key={task} task={task} />
          ))}
          {analysis.targetLanguage && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
              Language: {analysis.targetLanguage}
            </span>
          )}
          <span className="text-xs text-text-muted">
            · {formatDateTime(analysis.createdAt)}
          </span>
        </div>

        <p className="mt-3 text-xs text-text-muted print:hidden">
          To save as a PDF, choose &ldquo;Save as PDF&rdquo; as the destination
          in the print window.
        </p>
      </header>

      {notes.map((note) => (
        <div
          key={note}
          className="flex gap-2.5 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text-muted"
        >
          <FiInfo className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{note}</span>
        </div>
      ))}

      {sections.map((section, i) => (
        <article
          key={`${section.task}-${i}`}
          className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text">
              {section.title}
            </h2>
            {!section.error && (
              <Button
                variant="ghost"
                size="sm"
                className="print:hidden"
                onClick={() =>
                  copyText(sectionToText(section), `${section.title} copied`)
                }
              >
                <FiCopy className="size-4" aria-hidden="true" />
                Copy
              </Button>
            )}
          </div>
          <div className="mt-4">
            <SectionBody section={section} />
          </div>
        </article>
      ))}

      <p className="text-xs text-text-muted print:hidden">
        AI results can contain mistakes. Check important details against the
        original document.
      </p>
    </section>
  );
}
