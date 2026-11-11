"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { FiSend, FiSquare } from "react-icons/fi";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = 2000;

export function ChatComposer({
  onSend,
  onStop,
  streaming,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // grow with the text, up to about 6 lines
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || streaming) return;
    onSend(text);
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: pressing Enter to confirm a word in an input method (like Bangla) must not send
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div>
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          maxLength={MAX_LENGTH}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Your message"
          placeholder="Ask a question about this document…"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted"
        />
        {streaming ? (
          <Button
            variant="secondary"
            size="lg"
            onClick={onStop}
            aria-label="Stop writing"
          >
            <FiSquare className="size-4" aria-hidden="true" />
            Stop
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send message"
          >
            <FiSend className="size-4" aria-hidden="true" />
            Send
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Enter to send, Shift + Enter for a new line.
        {value.length > 1600 && (
          <span className="ml-2">
            {value.length}/{MAX_LENGTH}
          </span>
        )}
      </p>
    </div>
  );
}
