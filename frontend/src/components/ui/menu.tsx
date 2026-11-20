"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { IconType } from "react-icons";
import { FiMoreVertical } from "react-icons/fi";
import { cn } from "@/lib/cn";

export interface MenuItem {
  label: string;
  icon?: IconType;
  onClick: () => void;
  danger?: boolean;
}

const GAP = 4;
const EDGE = 8;
const WIDTH = 192; // w-48

type Position = {
  top: number;
  left: number;
  maxHeight: number;
};

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
  const [position, setPosition] = useState<Position | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    const rect = button.getBoundingClientRect();
    const height = menu.offsetHeight;
    const below = window.innerHeight - rect.bottom - GAP - EDGE;
    const above = rect.top - GAP - EDGE;

    // open upward only when it does not fit below and there is more room above
    const openUp = height > below && above > below;
    const maxHeight = Math.max(96, openUp ? above : below);
    const top = openUp
      ? Math.max(EDGE, rect.top - GAP - Math.min(height, maxHeight))
      : rect.bottom + GAP;

    setPosition({
      top,
      left: Math.min(
        Math.max(EDGE, rect.right - WIDTH),
        window.innerWidth - WIDTH - EDGE,
      ),
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, items.length, place]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onMove = () => place();

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            setPosition(null);
          } else {
            setOpen(true);
          }
        }}
        className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text"
      >
        <FiMoreVertical className="size-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            width: WIDTH,
            maxHeight: position?.maxHeight,
            visibility: position ? "visible" : "hidden",
          }}
          className="z-50 overflow-y-auto rounded-md border border-border bg-surface-raised p-1.5 shadow-lg"
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
              {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
