"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiX,
  FiArrowRight,
  FiFileText,
  FiMessageSquare,
  FiSearch,
  FiEdit3,
  FiFolder,
  FiShare2,
  FiRepeat,
  FiGithub,
} from "react-icons/fi";

const STORAGE_KEY = "documind_project_showcase_seen";
const SHOW_DELAY_MS = 1500;

const FEATURES = [
  {
    icon: FiFileText,
    title: "AI Document Analysis",
    description:
      "Summarize documents, extract key points, and understand important information quickly.",
  },
  {
    icon: FiMessageSquare,
    title: "AI Chat",
    description:
      "Ask questions about your documents and get context-based answers.",
  },
  {
    icon: FiSearch,
    title: "AI Search",
    description:
      "Find relevant information across your documents with intelligent search.",
  },
  {
    icon: FiEdit3,
    title: "AI Writer",
    description:
      "Generate professional documents and continue writing with AI assistance.",
  },
  {
    icon: FiFolder,
    title: "Document Management",
    description:
      "Organize documents using categories, tags, collections, favorites, and archive.",
  },
  {
    icon: FiShare2,
    title: "Sharing & Collaboration",
    description:
      "Share documents, manage access, and collaborate with comments and notes.",
  },
  {
    icon: FiRepeat,
    title: "Document Converter",
    description:
      "Convert supported document formats into other useful formats.",
  },
];

const TECH_STACK = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "NestJS",
  "Prisma",
  "PostgreSQL",
  "Cloudinary",
  "OpenRouter",
  "Vercel",
];

export default function ProjectShowcaseModal() {
  const pathname = usePathname();
  const initialPath = useRef(pathname);
  const [open, setOpen] = useState(false);

  // Show only when the user initially enters the website through the home page.
  // Client-side navigation from another page to "/" will not trigger the modal.
  useEffect(() => {
    if (initialPath.current !== "/") return;

    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    setOpen(false);

    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // The modal can still be closed if localStorage is unavailable.
    }
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-showcase-title"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            onClick={(event) => event.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border bg-surface shadow-2xl"
          >
            {/* Header */}
            <div className="relative overflow-hidden border-b border-border bg-linear-to-br from-primary-soft via-surface to-ai-soft px-6 pb-7 pt-8 sm:px-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-ai-decor/15 blur-3xl"
              />

              <button
                type="button"
                onClick={close}
                aria-label="Close project introduction"
                className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-border bg-surface/80 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
              >
                <FiX className="size-4" />
              </button>

              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ai">
                  Personal Portfolio Project
                </p>

                <h2
                  id="project-showcase-title"
                  className="mt-2 pr-8 text-2xl font-bold tracking-tight text-text sm:text-3xl"
                >
                  Welcome to DocuMind AI
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
                  An AI-powered document workspace designed to make reading,
                  writing, understanding, and managing documents easier. Explore
                  the features and see what you can do with it.
                </p>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              {/* Features */}
              <div>
                <h3 className="text-base font-semibold text-text">
                  What you can do with DocuMind AI
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {FEATURES.map(({ icon: Icon, title, description }) => (
                    <article
                      key={title}
                      className="rounded-2xl border border-border p-4 transition-colors hover:bg-surface-muted/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ai-soft text-ai">
                          <Icon className="size-4" />
                        </span>
                        <h4 className="text-sm font-semibold text-text">
                          {title}
                        </h4>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-text-muted">
                        {description}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              {/* Tech stack */}
              <div className="mt-7">
                <h3 className="text-base font-semibold text-text">
                  Built with
                </h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  {TECH_STACK.map((technology) => (
                    <span
                      key={technology}
                      className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-text-muted"
                    >
                      {technology}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href="https://github.com/Sifat-Ikram/documind-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-muted"
                >
                  <FiGithub className="size-4" />
                  View on GitHub
                </a>

                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Start Exploring
                  <FiArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
