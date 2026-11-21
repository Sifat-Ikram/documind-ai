"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiActivity,
  FiArrowLeft,
  FiBarChart2,
  FiCpu,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiSettings,
  FiShield,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: FiGrid, exact: true },
  { href: "/admin/users", label: "User Management", icon: FiUsers },
  { href: "/admin/documents", label: "Document Management", icon: FiFileText },
  { href: "/admin/ai", label: "AI Usage & Analytics", icon: FiCpu },
  { href: "/admin/analytics", label: "System Analytics", icon: FiBarChart2 },
  { href: "/admin/monitoring", label: "System Monitoring", icon: FiActivity },
  { href: "/admin/feedback", label: "Feedback & Support", icon: FiMessageSquare },
  { href: "/admin/settings", label: "Admin Settings", icon: FiSettings },
];

function isActive(pathname: string, item: (typeof ADMIN_NAV)[number]) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function AdminSidebar({
  pathname,
  onNavigate,
  onClose,
}: {
  pathname: string;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-5">
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2">
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

      <div className="mx-3 mt-1 flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-xs font-semibold uppercase tracking-wide text-link">
        <FiShield className="size-3.5" aria-hidden="true" />
        Admin Panel
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
        <ul className="space-y-1">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-link"
                      : "text-text-muted hover:bg-surface-muted hover:text-text",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
        >
          <FiArrowLeft className="size-4" aria-hidden="true" />
          Back to app
        </Link>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, status, logout, retry } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  if (status === "error") {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4 text-center">
        <div>
          <p className="text-sm text-text-muted">
            Could not reach the server. Your session is still saved.
          </p>
          <Button variant="secondary" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <Spinner className="size-6 text-text-muted" />
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-error-soft text-error-text">
            <FiShield className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-text">
            Admin access required
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            This area is only available to administrators.
          </p>
          <Link href="/dashboard">
            <Button variant="secondary" className="mt-5">
              Back to dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
        <AdminSidebar pathname={pathname} />
      </aside>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-surface lg:hidden">
            <AdminSidebar
              pathname={pathname}
              onNavigate={() => setDrawerOpen(false)}
              onClose={() => setDrawerOpen(false)}
            />
          </aside>
        </>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open admin menu"
            className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text lg:hidden"
          >
            <FiMenu className="size-5" />
          </button>
          <Link href="/admin" className="lg:hidden">
            <Logo />
          </Link>
          <p className="hidden text-sm font-medium text-text-muted sm:block">
            DocuMind AI administration
          </p>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text sm:flex"
            >
              <FiArrowLeft className="size-4" aria-hidden="true" />
              Back to app
            </Link>
            <span className="hidden items-center gap-2 rounded-lg p-1.5 sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-surface-muted text-sm font-semibold text-text">
                {initials(user.name)}
              </span>
              <span className="max-w-36 truncate text-sm font-medium text-text">
                {user.name}
              </span>
            </span>
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

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
