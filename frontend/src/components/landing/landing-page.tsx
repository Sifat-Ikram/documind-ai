"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiBookOpen,
  FiBriefcase,
  FiCheck,
  FiEdit3,
  FiFileText,
  FiLayers,
  FiMessageSquare,
  FiSearch,
  FiShare2,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-ai">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-text-muted">
          {description}
        </p>
      )}
    </div>
  );
}

const WHY = [
  {
    icon: FiFileText,
    title: "Long documents take hours",
    body: "Reading a 40-page report to find three decisions is slow work. DocuMind AI reads the whole file and gives you the summary, the key points and the action items in seconds.",
  },
  {
    icon: FiEdit3,
    title: "Blank pages block you",
    body: "Reports, letters, proposals and meeting notes all start the same way: staring at an empty page. Describe what you need and the AI Writer produces a finished first draft.",
  },
  {
    icon: FiLayers,
    title: "Files end up everywhere",
    body: "Categories, favorites, tags, collections and search keep every document in one place, and sharing lets the right people read or edit it with you.",
  },
];

const FEATURES = [
  {
    icon: FiFileText,
    title: "AI Document Analysis",
    body: "Summaries, key points, extracted dates and names, simplified text, translations and action items — from any PDF, DOCX or TXT file.",
  },
  {
    icon: FiMessageSquare,
    title: "AI Chat",
    body: "Ask questions about a document and get answers based only on its contents, with a conversation you can come back to.",
  },
  {
    icon: FiSearch,
    title: "AI Search",
    body: "Search across everything you own or everything shared with you, with matched excerpts so you see why a result was found.",
  },
  {
    icon: FiLayers,
    title: "Document Management",
    body: "Categories, tags, collections, favorites, archive and a 30-day trash. Organize hundreds of files without losing one.",
  },
  {
    icon: FiShare2,
    title: "Document Sharing & Collaboration",
    body: "Share a document or a collection with view or edit access, leave comments and notes, and compare versions side by side.",
  },
  {
    icon: FiZap,
    title: "AI Document Generator",
    body: "Describe the document you need, choose the type, length, language and tone, and get a complete draft you can continue and export.",
  },
];

const AUDIENCE = [
  {
    icon: FiBookOpen,
    title: "Students",
    body: "Turn readings into summaries, collect key points for revision and get essay and report drafts started.",
  },
  {
    icon: FiBriefcase,
    title: "Professionals",
    body: "Meeting minutes, proposals, emails and cover letters written in your tone, ready to review and send.",
  },
  {
    icon: FiSearch,
    title: "Researchers",
    body: "Compare long papers, pull out findings, dates and figures, and keep everything tagged and searchable.",
  },
  {
    icon: FiUsers,
    title: "Everyone else",
    body: "Contracts, manuals, forms, personal letters — anything you have to read closely or write from scratch.",
  },
];

const BENEFITS = [
  "One workspace for reading, writing and organizing documents.",
  "Answers that stay grounded in your own files.",
  "Finished drafts in the length, language and tone you choose.",
  "Export to PDF, DOCX or TXT, or save straight to My Documents.",
  "Sharing with view or edit access, plus comments and version history.",
  "Works without an account, so you can try it before you sign up.",
];

export function LandingPage() {
  const { status } = useAuth();
  const getStartedHref = status === "authenticated" ? "/dashboard" : "/register";

  return (
    <div className="space-y-20 pb-28 sm:space-y-24">
      {/* 1. Hero */}
      <section className="relative overflow-hidden px-6 py-16 sm:px-10 sm:py-20 lg:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-ai-decor/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="bg-grid pointer-events-none absolute inset-0 opacity-50"
        />

        <div className="relative mx-auto w-full text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-text-muted"
          >
            <span className="size-1.5 rounded-full bg-ai" aria-hidden="true" />
            AI document workspace
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-text sm:text-5xl lg:text-6xl"
          >
            Documents, written and understood by AI.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg"
          >
            Upload a file and get a summary, the key points and answers to your
            questions. Or describe what you need and let the AI Writer produce a
            finished draft — then keep it organized in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href={getStartedHref}
              className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}
            >
              Get Started
              <FiArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/generate"
              className={buttonVariants({
                variant: "secondary",
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Try the AI Writer
            </Link>
          </motion.div>

          <p className="mt-4 text-xs text-text-muted">
            Free to try. No account needed for the AI Writer.
          </p>
        </div>
      </section>

      {/* 2. Why DocuMind AI */}
      <section aria-labelledby="why-title">
        <Reveal>
          <SectionHeading
            eyebrow="Why DocuMind AI"
            title="The slow parts of working with documents"
          />
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {WHY.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.06}>
              <article className="h-full border border-border rounded-2xl px-5 py-3">
                <span className="grid size-10 place-items-center rounded-xl bg-ai-soft text-ai">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 3. AI Document Generator */}
      <Reveal>
        <section
          aria-labelledby="writer-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-1/2 size-64 -translate-y-1/2 rounded-full bg-ai-decor/15 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-ai">
              AI Document Generator
            </p>
            <h2
              id="writer-title"
              className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl"
            >
              A finished first draft, in about a minute
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
              Describe the document you need in your own words. Pick the type,
              length, language and tone, and the AI writes it section by section
              while you watch. Continue where it stopped, copy the text, or
              export it as PDF, DOCX or TXT.
            </p>
            <Link
              href="/generate"
              className={buttonVariants({
                size: "lg",
                className: "mt-7 w-full sm:w-auto",
              })}
            >
              Open the AI Writer
              <FiArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </Reveal>

      {/* 4. Core features */}
      <section id="features" aria-labelledby="features-title" className="scroll-mt-24">
        <Reveal>
          <SectionHeading
            eyebrow="Core features"
            title="Everything you need, in one workspace"
            description="Six tools that cover the whole life of a document — from the first upload to the last export."
          />
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={(i % 3) * 0.06}>
              <article className="group p-5 h-full rounded-2xl border border-border transition-shadow hover:shadow-md">
                <span className="grid size-10 place-items-center rounded-xl-muted text-ai transition-colors group-hover:bg-ai-soft">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 5. Who is it for */}
      <section aria-labelledby="audience-title">
        <Reveal>
          <SectionHeading
            eyebrow="Who is it for?"
            title="Built for anyone who works with text"
          />
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCE.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.05}>
              <article className="h-full border border-border rounded-2xl p-5">
                <Icon className="size-5 text-ai" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold text-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 6. Benefits */}
      <Reveal>
        <section
          aria-labelledby="benefits-title"
          className="grid gap-10 lg:grid-cols-2 lg:items-center"
        >
          <div>
            <SectionHeading
              eyebrow="Benefits"
              title="Less busywork, better documents"
              description="DocuMind AI does the reading and the first draft, so you can spend your time on the thinking that actually needs you."
            />
            <Link
              href={getStartedHref}
              className={buttonVariants({
                size: "lg",
                className: "mt-7 w-full sm:w-auto",
              })}
            >
              Get Started
              <FiArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-text">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  <FiCheck className="size-3" aria-hidden="true" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>
      </Reveal>
    </div>
  );
}
