"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiShield, FiX } from "react-icons/fi";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/cn";
import { HOME_ITEM, NAV_ITEMS, isActive, type NavItem } from "@/lib/nav";

function NavEntry({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const row =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium";

  if (item.soon) {
    return (
      <span
        aria-disabled="true"
        title="Coming soon"
        className={cn(row, "cursor-not-allowed text-text-muted opacity-60")}
      >
        <Icon className="size-4" aria-hidden="true" />
        {item.label}
        <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Soon
        </span>
      </span>
    );
  }

  const active = item.href !== "/" && isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        row,
        "transition-colors",
        active
          ? "bg-primary-soft text-link"
          : "text-text-muted hover:bg-surface-muted hover:text-text",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

export function SidebarContent({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-5">
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

      <nav className="flex-1 overflow-y-auto px-3 pb-6 pt-2" aria-label="Main">
        <NavEntry
          item={HOME_ITEM}
          pathname={pathname}
          onNavigate={onNavigate}
        />

        <ul className="space-y-1 mt-6">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <NavEntry
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            </li>
          ))}
          {user?.role === "ADMIN" && (
            <li>
              <NavEntry
                item={{ href: "/admin", label: "Admin Panel", icon: FiShield }}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
