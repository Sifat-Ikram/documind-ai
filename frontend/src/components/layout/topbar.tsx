"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiLogOut, FiMenu } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/utils";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

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

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {user && (
          // The name opens the Profile page directly (no dropdown)
          <Link
            href="/profile"
            aria-label={`${user.name}, open your profile`}
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg p-1.5 transition-colors",
              pathname === "/profile"
                ? "bg-primary-soft"
                : "hover:bg-surface-muted",
            )}
          >
            <span className="grid size-8 place-items-center rounded-full bg-surface-muted text-sm font-semibold text-text">
              {initials(user.name)}
            </span>
            <span className="hidden max-w-40 truncate text-sm font-medium text-text sm:block">
              {user.name}
            </span>
          </Link>
        )}

        <Button
          variant="ghost"
          size="sm"
          loading={loggingOut}
          aria-label="Log out"
          onClick={async () => {
            setLoggingOut(true);
            await logout();
          }}
        >
          {!loggingOut && <FiLogOut className="size-4" aria-hidden="true" />}
          <span className="hidden sm:inline">Log out</span>
        </Button>
      </div>
    </header>
  );
}
