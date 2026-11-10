"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import { FiClock, FiFileText, FiHome, FiSettings, FiX } from "react-icons/fi";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";

const NAV: { href: string; label: string; icon: IconType }[] = [
  { href: "/dashboard", label: "Dashboard", icon: FiHome },
  { href: "/documents", label: "Documents", icon: FiFileText },
  { href: "/history", label: "History", icon: FiClock },
  { href: "/settings", label: "Settings", icon: FiSettings },
];

export function SidebarContent({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-5">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo />
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <FiX className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-soft text-link"
                  : "text-text-muted hover:bg-surface-muted hover:text-text",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
