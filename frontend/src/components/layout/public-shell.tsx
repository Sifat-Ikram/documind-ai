"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FiMenu } from "react-icons/fi";
import { FaGithub, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/cn";
import ProjectShowcaseModal from "../ui/project-showcase-modal";

const NAV_LINKS = [
  { href: "/generate", label: "AI Generator" },
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
  {
    href: "https://github.com",
    label: "DocuMind AI on GitHub",
    Icon: FaGithub,
  },
];

function AuthActions({ compact = false }: { compact?: boolean }) {
  const { status, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const size = compact ? "sm" : "md";

  return (
    <div className="flex items-center gap-2 rounded-full border border-border p-1">
      {status === "authenticated" ? (
        <>
          <Link
            href="/dashboard"
            className={buttonVariants({
              size,
              className: "rounded-full",
            })}
          >
            Dashboard
          </Link>

          <Button
            variant="ghost"
            size={size}
            loading={loggingOut}
            className="rounded-full bg-surface-muted text-[#0f766e] hover:bg-surface-muted hover:text-[#0f766e] in-data-[theme=dark]:text-white in-data-[theme=dark]:hover:text-white"
            onClick={async () => {
              setLoggingOut(true);
              await logout();
            }}
          >
            Logout
          </Button>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className={buttonVariants({
              variant: "ghost",
              size,
              className:
                "rounded-full bg-surface-muted text-[#0f766e] hover:bg-surface-muted hover:text-[#0f766e] in-data-[theme=dark]:text-white in-data-[theme=dark]:hover:text-white",
            })}
          >
            Login
          </Link>

          <Link
            href="/register"
            className={buttonVariants({
              size,
              className: "rounded-full",
            })}
          >
            Register
          </Link>
        </>
      )}
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // the menu belongs to the page it was opened on, so a new page closes it
  const [menu, setMenu] = useState({ open: false, at: pathname });
  const menuOpen = menu.open && menu.at === pathname;
  const headerRef = useRef<HTMLElement>(null);

  const setMenuOpen = (open: boolean) => setMenu({ open, at: pathname });

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu({ open: false, at: pathname });
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node))
        setMenu({ open: false, at: pathname });
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
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
      <ProjectShowcaseModal />
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur print:hidden"
      >
        <div className="flex h-16 mx-auto w-11/12 items-center gap-2 lg:gap-6">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text lg:hidden"
          >
            <FiMenu className="size-5" />
          </button>

          <Link
            href="/"
            aria-label="DocuMind AI, go to the home page"
            className="shrink-0"
          >
            <Logo />
          </Link>

          {/* the pages and the sign-in actions both sit on the right, in two separate groups */}
          <div className="ml-auto flex items-center gap-2 sm:gap-4 lg:gap-8">
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

            <div className="hidden items-center gap-1 bg-surface lg:flex">
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
              className="absolute left-0 top-full z-50 w-full overflow-hidden border-b border-border bg-surface shadow-lg lg:hidden"
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

      <main
        className={`mx-auto w-11/12 ${pathname === "/" || pathname === "/generate" ? "mt-0" : "mt-10"}`}
      >
        {children}
      </main>

      <footer className="border-t border-border bg-surface print:hidden">
        <div className="mx-auto w-11/12 py-12">
          <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" aria-label="DocuMind AI home">
                <Logo className="text-xl" />
              </Link>
              <p className="mt-3 max-w-full text-sm leading-relaxed text-text-muted">
                Read, write, analyze, and organize your documents with DocuMind
                AI. Get AI-powered insights, chat with your files, search across
                documents, and generate professional drafts in seconds.
              </p>
            </div>

            {/* below lg the three link groups share one row under the logo */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 lg:contents">
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
