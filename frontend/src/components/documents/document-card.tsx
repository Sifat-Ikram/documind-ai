"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiDownload,
  FiEdit2,
  FiFileText,
  FiMessageSquare,
  FiTrash2,
  FiZap,
} from "react-icons/fi";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { buttonVariants } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { formatBytes, formatRelative, plural } from "@/lib/utils";
import type { DocumentSummary } from "@/types/api";

interface DocumentCardProps {
  doc: DocumentSummary;
  onRename: (doc: DocumentSummary) => void;
  onDelete: (doc: DocumentSummary) => void;
  onDownload: (doc: DocumentSummary) => void;
}

export function DocumentCard({
  doc,
  onRename,
  onDelete,
  onDownload,
}: DocumentCardProps) {
  const router = useRouter();

  return (
    <article className="relative flex flex-col rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <FileTypeBadge type={doc.fileType} className="h-11 w-14" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words text-sm font-semibold text-text">
            {/* the link covers the whole card, buttons above it stay clickable */}
            <Link
              href={`/documents/${doc.id}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {doc.originalName}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            {formatBytes(doc.fileSize)} · {plural(doc.wordCount, "word")}
          </p>
        </div>
        <Menu
          className="relative z-10 -mr-1.5 -mt-1.5"
          label={`Actions for ${doc.originalName}`}
          items={[
            {
              label: "View details",
              icon: FiFileText,
              onClick: () => router.push(`/documents/${doc.id}`),
            },
            { label: "Rename", icon: FiEdit2, onClick: () => onRename(doc) },
            {
              label: "Download",
              icon: FiDownload,
              onClick: () => onDownload(doc),
            },
            {
              label: "Delete",
              icon: FiTrash2,
              onClick: () => onDelete(doc),
              danger: true,
            },
          ]}
        />
      </div>

      <p className="mt-4 text-xs text-text-muted">
        Uploaded {formatRelative(doc.createdAt)}
      </p>

      <div className="relative z-10 mt-4 flex gap-2 border-t border-border pt-4">
        <Link
          href={`/documents/${doc.id}/analyze`}
          className={buttonVariants({ size: "sm" })}
        >
          <FiZap className="size-3.5" aria-hidden="true" />
          Analyze
        </Link>
        <Link
          href={`/documents/${doc.id}/chat`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <FiMessageSquare className="size-3.5" aria-hidden="true" />
          Chat
        </Link>
      </div>
    </article>
  );
}
