"use client";

import { FiAlertCircle, FiCopy, FiRefreshCw, FiZap } from "react-icons/fi";
import type { UiMessage } from "@/components/chat/types";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { copyText } from "@/lib/clipboard";

function TypingDots() {
  return (
    <span
      className="inline-flex items-center gap-1 py-1"
      aria-label="The AI is writing"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-text-muted" />
      <span className="size-1.5 animate-pulse rounded-full bg-text-muted [animation-delay:150ms]" />
      <span className="size-1.5 animate-pulse rounded-full bg-text-muted [animation-delay:300ms]" />
    </span>
  );
}

export function MessageBubble({
  message,
  canRetry,
  onRetry,
}: {
  message: UiMessage;
  canRetry: boolean;
  onRetry: () => void;
}) {
  if (message.role === "USER") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }

  const streaming = message.status === "streaming";

  return (
    <div className="flex gap-3">
      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-ai-soft text-ai">
        <FiZap className="size-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 max-w-[92%] flex-1 sm:max-w-[82%]">
        {(message.content || streaming) && (
          <div className="rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-3">
            {message.content ? (
              <Markdown>{message.content}</Markdown>
            ) : (
              <TypingDots />
            )}
          </div>
        )}

        {streaming && message.content && (
          <p className="mt-1.5 text-xs text-text-muted">Writing…</p>
        )}

        {message.status === "stopped" && (
          <p className="mt-1.5 text-xs text-text-muted">
            Stopped. The part that was written has been saved.
          </p>
        )}

        {message.status === "error" && (
          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl bg-error-soft px-4 py-3 text-sm text-error-text">
            <FiAlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {message.error ?? "Something went wrong."}
            </span>
            {canRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                <FiRefreshCw className="size-3.5" aria-hidden="true" />
                Try again
              </Button>
            )}
          </div>
        )}

        {!message.status && message.content && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => copyText(message.content, "Answer copied")}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text"
            >
              <FiCopy className="size-3.5" aria-hidden="true" />
              Copy
            </button>
            {message.contextMode === "excerpts" && (
              <span className="text-xs text-text-muted">
                This document is long, so the answer is based on the parts most
                relevant to your question.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
