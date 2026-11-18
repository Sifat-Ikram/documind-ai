"use client";

import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60",
        checked
          ? "border-transparent bg-primary"
          : "border-border-strong bg-surface-muted",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full shadow transition-transform",
          checked
            ? "translate-x-6 bg-primary-foreground"
            : "translate-x-1 bg-text-muted",
        )}
      />
    </button>
  );
}
