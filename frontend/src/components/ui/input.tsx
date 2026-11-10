"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-text">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={cn(
          "h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text placeholder:text-text-muted disabled:opacity-60",
          error ? "border-error" : "border-border-strong",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-error-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, "type">
>(function PasswordInput({ className, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-[30px] grid size-8 place-items-center rounded-md text-text-muted hover:text-text"
      >
        {visible ? (
          <FiEyeOff className="size-4" />
        ) : (
          <FiEye className="size-4" />
        )}
      </button>
    </div>
  );
});
