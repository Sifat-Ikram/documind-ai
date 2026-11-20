"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FiMessageSquare, FiStar, FiZap } from "react-icons/fi";
import { CategoryBadge } from "@/components/documents/category-badge";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import { formatBytes, formatRelative, plural } from "@/lib/utils";
import type { DocumentListItem } from "@/types/api";

interface DocumentItemProps {
  doc: DocumentListItem;
  mode: "grid" | "list";
  menu: MenuItem[];
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onFavorite?: () => void;
  /** replaces the "size and words" line */
  subtitle?: string;
  /** extra chip, for example "Shared by Anna" */
  badge?: ReactNode;
}

const pill =
  "rounded-full border border-border px-2 py-0.5 text-xs text-text-muted";

function Chips({ doc, badge }: { doc: DocumentListItem; badge?: ReactNode }) {
  const tags = doc.tags.slice(0, 3);
  const more = doc.tags.length - tags.length;
  const any =
    doc.category ||
    doc.currentVersion > 1 ||
    doc.source === "GENERATED" ||
    badge ||
    tags.length > 0;
  if (!any) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {doc.category && <CategoryBadge category={doc.category} />}
      {doc.currentVersion > 1 && (
        <span className={pill}>v{doc.currentVersion}</span>
      )}
      {doc.source === "GENERATED" && <span className={pill}>AI generated</span>}
      {badge}
      {tags.map((t) => (
        <span
          key={t.id}
          className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-muted"
        >
          #{t.name}
        </span>
      ))}
      {more > 0 && <span className="text-xs text-text-muted">+{more}</span>}
    </div>
  );
}

function FavoriteButton({
  doc,
  onFavorite,
}: {
  doc: DocumentListItem;
  onFavorite?: () => void;
}) {
  if (!onFavorite) return null;
  return (
    <button
      type="button"
      onClick={onFavorite}
      aria-pressed={doc.isFavorite}
      aria-label={doc.isFavorite ? "Remove from favorites" : "Add to favorites"}
      className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text"
    >
      <FiStar
        className={cn("size-4", doc.isFavorite && "fill-current text-warning")}
      />
    </button>
  );
}

export function DocumentItem({
  doc,
  mode,
  menu,
  selected = false,
  onSelect,
  onFavorite,
  subtitle,
  badge,
}: DocumentItemProps) {
  const meta =
    subtitle ??
    `${formatBytes(doc.fileSize)} · ${plural(doc.wordCount, "word")}`;
  const link = (
    <Link
      href={`/documents/${doc.id}`}
      className="after:absolute after:inset-0 after:content-['']"
    >
      {doc.originalName}
    </Link>
  );

  if (mode === "list") {
    return (
      <article
        className={cn(
          "relative flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors",
          selected ? "bg-gray-300" : "bg-surface hover:bg-surface-muted/50",
        )}
      >
        {onSelect && (
          <Checkbox
            className="relative z-10"
            checked={selected}
            onChange={onSelect}
            label={`Select ${doc.originalName}`}
          />
        )}
        <FileTypeBadge type={doc.fileType} className="h-9 w-12" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-text">{link}</h3>
          <div className="mt-1">
            <Chips doc={doc} badge={badge} />
          </div>
        </div>
        <p className="hidden shrink-0 text-xs text-text-muted md:block">
          {meta}
        </p>
        <p className="hidden w-28 shrink-0 text-right text-xs text-text-muted lg:block">
          {formatRelative(doc.createdAt)}
        </p>
        <div className="relative z-10 flex shrink-0 items-center">
          <FavoriteButton doc={doc} onFavorite={onFavorite} />
          <Menu label={`Actions for ${doc.originalName}`} items={menu} />
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border border-border p-5 transition-shadow hover:shadow-md",
        selected ? "bg-gray-300" : "bg-surface",
      )}
    >
      <div className="flex items-start gap-3">
        {onSelect && (
          <Checkbox
            className="relative z-10 mt-1"
            checked={selected}
            onChange={onSelect}
            label={`Select ${doc.originalName}`}
          />
        )}
        <FileTypeBadge type={doc.fileType} className="h-11 w-14" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 wrap-break-word text-sm font-semibold text-text">
            {link}
          </h3>
          <p className="mt-1 text-xs text-text-muted">{meta}</p>
        </div>
        <div className="relative z-10 -mr-1.5 -mt-1.5 flex items-center">
          <FavoriteButton doc={doc} onFavorite={onFavorite} />
          <Menu label={`Actions for ${doc.originalName}`} items={menu} />
        </div>
      </div>

      <div className="mt-3 min-h-5">
        <Chips doc={doc} badge={badge} />
      </div>
      <p className="mt-3 text-xs text-text-muted">
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
