import { cn } from "@/lib/cn";
import type { FileType } from "@/types/api";

const styles: Record<FileType, string> = {
  PDF: "bg-file-pdf-soft text-file-pdf",
  DOCX: "bg-file-docx-soft text-file-docx",
  TXT: "bg-file-txt-soft text-file-txt",
};

export function FileTypeBadge({
  type,
  className,
}: {
  type: FileType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-12 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
        styles[type],
        className,
      )}
    >
      {type}
    </span>
  );
}
