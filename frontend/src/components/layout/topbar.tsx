"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiChevronDown, FiLogOut, FiMenu, FiSettings } from "react-icons/fi";
import { Logo } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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

  if (!user) return null;
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-surface-muted"
      >
        <span className="grid size-8 place-items-center rounded-full bg-surface-muted text-sm font-semibold text-text">
          {initial}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-medium text-text sm:block">
          {user.name}
        </span>
        <FiChevronDown className="size-4 text-text-muted" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface-raised p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-text">
              {user.name}
            </p>
            <p className="truncate text-xs text-text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text hover:bg-surface-muted"
          >
            <FiSettings className="size-4 text-text-muted" aria-hidden="true" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              await logout();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text hover:bg-surface-muted disabled:opacity-60"
          >
            {loggingOut ? (
              <Spinner className="size-4" />
            ) : (
              <FiLogOut className="size-4 text-text-muted" aria-hidden="true" />
            )}
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur sm:px-6 lg:px-8 print:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text lg:hidden"
      >
        <FiMenu className="size-5" />
      </button>
      <Link href="/dashboard" className="lg:hidden">
        <Logo />
      </Link>
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}
