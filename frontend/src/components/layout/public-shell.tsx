"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowRight, FiMenu, FiX } from "react-icons/fi";
import { FaGithub, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "/generate", label: "AI Generator" },
  { href: "/#features", label: "Features" },
  { href: "/contact", label: "Contact" },
];

const FOOTER_GROUPS = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "Home" },
      { href: "/#features", label: "Features" },
      { href: "/about", label: "About Us" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/generate", label: "AI Generator" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

const SOCIALS = [
  { href: "https://x.com", label: "DocuMind AI on X", Icon: FaXTwitter },
  {
    href: "https://www.linkedin.com",
    label: "DocuMind AI on LinkedIn",
    Icon: FaLinkedinIn,
  },
  { href: "https://github.com", label: "DocuMind AI on GitHub", Icon: FaGithub },
];

function AuthActions({ compact = false }: { compact?: boolean }) {
  const { status } = useAuth();

  if (status === "authenticated") {
    return (
      <Link
        href="/dashboard"
        className={buttonVariants({
          size: compact ? "sm" : "md",
          className: compact ? undefined : "w-full",
        })}
      >
        Dashboard
        <FiArrowRight className="size-4" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Login
      </Link>
      <Link href="/register" className={buttonVariants({ size: "sm" })}>
        Register
      </Link>
    </>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // the menu belongs to the page it was opened on, so a new page closes it
  const [menu, setMenu] = useState({ open: false, at: pathname });
  const menuOpen = menu.open && menu.at === pathname;

  const setMenuOpen = (open: boolean) => setMenu({ open, at: pathname });

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu({ open: false, at: pathname });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, pathname]);

  const linkClass = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary-soft text-link"
        : "text-text-muted hover:bg-surface-muted hover:text-text",
    );

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur print:hidden">
        <div className="flex h-16 mx-auto w-11/12 items-center gap-2 lg:gap-6">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text lg:hidden"
          >
            {menuOpen ? (
              <FiX className="size-5" />
            ) : (
              <FiMenu className="size-5" />
            )}
          </button>

          <Link
            href="/"
            aria-label="DocuMind AI, go to the home page"
            className="shrink-0"
          >
            <Logo />
          </Link>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Pages"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={linkClass(pathname === link.href)}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {/* the sign-in actions sit in their own area, apart from the pages */}
            <div className="hidden items-center gap-1 rounded-xl border border-border bg-surface p-1 lg:flex">
              <AuthActions />
            </div>
            <div className="flex items-center gap-1 lg:hidden">
              <AuthActions compact />
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.nav
              id="public-mobile-menu"
              key="mobile-menu"
              aria-label="Pages"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden border-t border-border bg-surface lg:hidden"
            >
              <div className="mx-auto w-full max-w-6xl space-y-1 px-4 py-3 sm:px-6">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname === link.href
                        ? "bg-primary-soft text-link"
                        : "text-text hover:bg-surface-muted",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto w-11/12">
        {children}
      </main>

      <footer className="border-t border-border bg-surface print:hidden">
        <div className="mx-auto w-11/12 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" aria-label="DocuMind AI home">
                <Logo className="text-xl" />
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-muted">
                Read, write and organize documents with AI. Analyze a file, chat
                about it, or write a new draft in seconds.
              </p>
            </div>

            {FOOTER_GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {group.title}
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-text-muted transition-colors hover:text-text"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-5 border-t border-border pt-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-1">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              ))}
            </div>
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} DocuMind AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
