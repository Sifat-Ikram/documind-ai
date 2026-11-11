"use client";

import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FiMoreVertical } from "react-icons/fi";
import { cn } from "@/lib/cn";

export interface MenuItem {
  label: string;
  icon?: IconType;
  onClick: () => void;
  danger?: boolean;
}

export function Menu({
  items,
  label = "More actions",
  className,
}: {
  items: MenuItem[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text"
      >
        <FiMoreVertical className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-border bg-surface-raised p-1.5 shadow-lg"
        >
          {items.map(({ label: itemLabel, icon: Icon, onClick, danger }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted",
                danger ? "text-error-text" : "text-text",
              )}
            >
              {Icon && <Icon className="size-4" aria-hidden="true" />}
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
