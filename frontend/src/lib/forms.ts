import type { ZodError } from "zod";
import type { FieldError } from "@/lib/api";

export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export function serverFieldErrors(
  errors?: FieldError[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of errors ?? []) {
    const key = e.path.split(".")[0] || "form";
    if (!(key in out)) out[key] = e.message;
  }
  return out;
}
