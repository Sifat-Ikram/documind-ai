import Link from "next/link";
import type { IconType } from "react-icons";
import {
  FiArchive,
  FiArrowRight,
  FiCheck,
  FiClock,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiFolder,
  FiGitMerge,
  FiLayers,
  FiMessageSquare,
  FiRepeat,
  FiSearch,
  FiShare2,
  FiTag,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { buttonVariants } from "@/components/ui/button";

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
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

const CORE = [
  {
    icon: FiFileText,
    title: "AI Document Analysis",
    body: "Upload a PDF, DOCX or TXT file and ask for what you need. DocuMind AI can summarize it, pull out the key points, extract names, dates and figures, simplify the language, translate it and list the action items — each answer grounded in the text of your file.",
    points: [
      "Summaries with sections and highlights",
      "Key points, data and action items",
      "Simplify or translate the whole document",
    ],
  },
  {
    icon: FiMessageSquare,
    title: "AI Chat with your documents",
    body: "Ask questions in your own words and follow up on the answers. Every conversation is saved with the document, so you can come back to it later instead of starting again.",
    points: [
      "Answers taken only from your file",
      "Saved conversations per document",
      "Tells you when something is not in the text",
    ],
  },
  {
    icon: FiEdit3,
    title: "AI Writer",
    body: "Describe the document you need and the AI writes a complete draft while you watch. Choose the document type, length, language and tone, then keep the draft, copy it, continue it or export it.",
    points: [
      "Reports, essays, letters, emails, resumes and more",
      "Short, medium or long output",
      "Continue from where it stopped",
    ],
  },
  {
    icon: FiRepeat,
    title: "Document Converter",
    body: "Convert between the formats you already use without leaving the dashboard. Pick a file, choose the target format and download the result; converted files stay available for 24 hours.",
    points: [
      "DOCX to PDF, DOCX to TXT",
      "PDF to TXT, TXT to PDF or DOCX",
      "Up to 5 MB per file",
    ],
  },
  {
    icon: FiGitMerge,
    title: "Versions and revision history",
    body: "Every edit creates a new version instead of overwriting the old one. Open any earlier version, compare two of them line by line, download one, or make an older version current again.",
    points: [
      "Full history of every document",
      "Line-by-line comparison",
      "Restore an earlier version safely",
    ],
  },
  {
    icon: FiShare2,
    title: "Sharing and collaboration",
    body: "Share a single document or a whole collection with view or edit access. People you share with see the same file, can leave comments and can write in the shared note.",
    points: [
      "Viewer and editor roles",
      "Comments with edit and delete",
      "One shared note per document",
    ],
  },
];

const ORGANIZE = [
  {
    icon: FiLayers,
    title: "Categories",
    body: "Group documents by type and see the counts at a glance.",
  },
  {
    icon: FiTag,
    title: "Tags",
    body: "Add your own labels and filter the library by any of them.",
  },
  {
    icon: FiFolder,
    title: "Collections",
    body: "Keep related documents together and share the collection as one.",
  },
  {
    icon: FiSearch,
    title: "Search and filters",
    body: "Find documents by name, type, category, collection or favorite.",
  },
  {
    icon: FiArchive,
    title: "Archive",
    body: "Move finished work out of the way without deleting anything.",
  },
  {
    icon: FiClock,
    title: "30-day trash",
    body: "Deleted documents can be restored for 30 days before they go for good.",
  },
  {
    icon: FiDownload,
    title: "Export and download",
    body: "Download the original file, or export a draft as PDF, DOCX or TXT.",
  },
  {
    icon: FiUsers,
    title: "Shared with me",
    body: "Everything other people share with you, in one list.",
  },
];

const STEPS = [
  {
    icon: FiFileText,
    title: "1. Add a document",
    body: "Upload a PDF, DOCX or TXT file, or write a new draft with the AI Writer.",
  },
  {
    icon: FiZap,
    title: "2. Let the AI read it",
    body: "Analyze the document, chat about it, or convert it to another format.",
  },
  {
    icon: FiCheck,
    title: "3. Keep it organized",
    body: "Tag, categorize, share and export — with every version kept.",
  },
];

function Card({
  icon: Icon,
  title,
  body,
  points,
}: {
  icon: IconType;
  title: string;
  body: string;
  points?: string[];
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6">
      <span className="grid size-10 place-items-center rounded-xl bg-ai-soft text-ai">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p>
      {points && (
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2 text-sm text-text-muted"
            >
              <FiCheck
                className="mt-0.5 size-3.5 shrink-0 text-success"
                aria-hidden="true"
              />
              {point}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function FeaturesView() {
  return (
    <div className="space-y-20 pb-28 sm:space-y-24">
      <section className="relative overflow-hidden px-6 py-16 text-center sm:px-10 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-ai-decor/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-text-muted">
            <span className="size-1.5 rounded-full bg-ai" aria-hidden="true" />
            Features
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-text sm:text-5xl">
            Everything DocuMind AI can do
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
            Read, write, convert and organize documents in one workspace. Each
            feature below is part of the app today — no waiting list, no
            half-finished tools.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/generate"
              className={buttonVariants({
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Try the AI Writer
              <FiArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/register"
              className={buttonVariants({
                variant: "secondary",
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="core-features">
        <SectionHeading
          eyebrow="Core features"
          title="The main tools, in detail"
          description="Six features that cover the life of a document, from the first upload to the last export."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CORE.map((feature) => (
            <Card key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section aria-labelledby="how-it-works">
        <SectionHeading eyebrow="How it works" title="Three steps, start to finish" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <Icon className="size-5 text-ai" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-text">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="organization">
        <SectionHeading
          eyebrow="Organization"
          title="Small tools that keep the library tidy"
          description="Everything you need to find a file again months later."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ORGANIZE.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <Icon className="size-5 text-ai" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-text">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface px-6 py-10 text-center sm:px-10">
        <h2 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          Start with one document
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-text-muted">
          Upload a file, ask a question or write a draft. You can try the AI
          Writer without an account, and keep everything once you sign up.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className={buttonVariants({
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            Get Started
            <FiArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/faq"
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            Read the FAQ
          </Link>
        </div>
      </section>
    </div>
  );
}
