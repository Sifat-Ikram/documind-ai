"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { VersionCompare } from "@/types/api";

type Kind = "added" | "removed" | "equal";

function Line({ kind, text }: { kind: Kind; text: string }) {
  return (
    <div
      className={cn(
        "flex gap-3 whitespace-pre-wrap wrap-break-word border-l-4 px-3 py-0.5 text-text",
        kind === "added" && "border-success bg-success-soft",
        kind === "removed" && "border-error bg-error-soft",
        kind === "equal" && "border-transparent",
      )}
    >
      <span
        className="w-4 shrink-0 select-none text-text-muted"
        aria-hidden="true"
      >
        {kind === "added" ? "+" : kind === "removed" ? "−" : ""}
      </span>
      <span className="sr-only">
        {kind === "added" ? "Added: " : kind === "removed" ? "Removed: " : ""}
      </span>
      <span className="min-w-0 flex-1">{text || " "}</span>
    </div>
  );
}

/** One column: removed lines in red, added lines in green. Long unchanged parts are folded. */
export function DiffView({ changes }: { changes: VersionCompare["changes"] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm">
      {changes.map((part, index) => {
        const lines = part.text.replace(/\n$/, "").split("\n");

        if (part.type === "equal" && lines.length > 8 && !open.has(index)) {
          const hidden = lines.length - 6;
          return (
            <div key={index}>
              {lines.slice(0, 3).map((l, i) => (
                <Line key={`a${i}`} kind="equal" text={l} />
              ))}
              <button
                type="button"
                onClick={() => setOpen((prev) => new Set(prev).add(index))}
                className="my-1 w-full bg-surface-muted px-3 py-1.5 text-left text-xs text-text-muted hover:text-text"
              >
                … {hidden} unchanged lines (show)
              </button>
              {lines.slice(-3).map((l, i) => (
                <Line key={`b${i}`} kind="equal" text={l} />
              ))}
            </div>
          );
        }

        return (
          <div key={index}>
            {lines.map((l, i) => (
              <Line key={i} kind={part.type} text={l} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
