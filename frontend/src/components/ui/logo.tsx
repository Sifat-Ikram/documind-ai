import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-lg font-semibold tracking-tight text-text",
        className,
      )}
    >
      DocuMind AI
    </span>
  );
}
