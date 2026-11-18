"use client";

import { useState, type KeyboardEvent } from "react";
import { FiX } from "react-icons/fi";
import { tagNameSchema } from "@/lib/validation";

export const MAX_TAGS = 20;

export function TagInput({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const has = (name: string) =>
    value.some((v) => v.toLowerCase() === name.toLowerCase());

  function add(raw: string) {
    const parsed = tagNameSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid tag");
      return;
    }
    const name = parsed.data;
    if (!has(name)) {
      if (value.length >= MAX_TAGS) {
        setError(`At most ${MAX_TAGS} tags`);
        return;
      }
      onChange([...value, name]);
    }
    setText("");
    setError("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (text.trim()) add(text);
    } else if (e.key === "Backspace" && text === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const unused = suggestions.filter((s) => !has(s)).slice(0, 12);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border-strong bg-surface p-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-surface-muted py-0.5 pl-2.5 pr-1 text-sm text-text"
          >
            #{tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="grid size-5 place-items-center rounded-full text-text-muted hover:bg-border hover:text-text"
            >
              <FiX className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          maxLength={30}
          aria-label="Add a tag"
          placeholder={
            value.length === 0 ? "Type a tag and press Enter" : "Add another"
          }
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
          onKeyDown={onKeyDown}
          onBlur={() => text.trim() && add(text)}
          className="h-8 min-w-32 flex-1 bg-transparent px-1 text-sm text-text placeholder:text-text-muted outline-none"
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-error-text">{error}</p>}
      {unused.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Your tags
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unused.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rounded-full border border-border px-2.5 py-0.5 text-sm text-text-muted hover:bg-surface-muted hover:text-text"
              >
                #{s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
