"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronDown, FiMessageCircle } from "react-icons/fi";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const FAQS = [
  {
    q: "What exactly is DocuMind AI?",
    a: "One workspace for documents. You can upload a PDF, DOCX or TXT file and have the AI summarize it, pull out key points, extract dates and names, simplify or translate it. You can also chat about a single document, search across everything you own, and write brand new documents with the AI Writer.",
  },
  {
    q: "Do I need an account to use the AI Writer?",
    a: "No. The AI Writer works without signing up, and every feature is available to guests too — all document types, all lengths, all export formats. An account adds a dashboard, saved drafts, document analysis, sharing and search.",
  },
  {
    q: "Which file types can I upload?",
    a: "PDF, DOCX and TXT files, up to 5 MB each. The text is extracted on upload, which is what makes analysis, chat and search work.",
  },
  {
    q: "How does the AI Document Generator work?",
    a: "Describe what the document should be about, then choose the type (report, essay, letter, email, resume, cover letter, meeting minutes, proposal or blog post), the length, the language and the tone. The AI writes it in sections and the text appears as it is generated, so you can stop it at any point.",
  },
  {
    q: "Can I continue a document or change its direction?",
    a: "Yes. Press Continue writing under a draft, or send another message in the writer explaining what to add or change. Each reply is added to the same document, and the full text can be copied or exported whenever you want.",
  },
  {
    q: "How do I get a document out of DocuMind AI?",
    a: "Every draft can be copied to the clipboard or exported as PDF, DOCX or TXT. Uploaded documents can be downloaded in their original format, and saved generated documents appear in My Documents where you can download them again.",
  },
  {
    q: "What happens to a generated draft?",
    a: "Generated results stay available for 24 hours. Logged-in users can press Save to My Documents to keep the draft as a real document in their library, where it keeps its own versions and can be shared.",
  },
  {
    q: "Does AI Writer usage count against my account limits?",
    a: "No. Writing in the public AI Writer does not count against your account's usage limits, whether you are logged in or using it as a guest.",
  },
  {
    q: "Who can see my documents?",
    a: "Only you. Documents are private by default. You can share a single document or a collection with another person as a viewer or an editor, and take that access away again at any time. Everything in your Trash is removed automatically after 30 days.",
  },
  {
    q: "Which languages does it support?",
    a: "You can ask for documents in almost any language, including English and Bangla. If you leave the language field empty, the AI answers in the language of your request.",
  },
  {
    q: "Can I trust what the AI writes or extracts?",
    a: "Treat it as a very fast first draft. AI text can contain mistakes, so check names, numbers and dates before you send a document anywhere. Questions about a document are answered from that document's text, not from the internet.",
  },
];

export function FaqView() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-12 sm:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-ai-decor/20 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xs font-semibold uppercase tracking-wider text-ai"
          >
            FAQ
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl"
          >
            Questions, answered
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="mt-3 text-[15px] leading-relaxed text-text-muted"
          >
            Everything about accounts, uploads, the AI Writer and how your
            documents are handled.
          </motion.p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        <ul className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <motion.li
                key={faq.q}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-surface transition-colors",
                  isOpen ? "border-border-strong" : "border-border",
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[15px] font-medium text-text">
                    {faq.q}
                  </span>
                  <FiChevronDown
                    className={cn(
                      "size-5 shrink-0 text-text-muted transition-transform duration-200",
                      isOpen && "rotate-180 text-ai",
                    )}
                    aria-hidden="true"
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-text-muted">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-6 text-center sm:flex-row sm:justify-between sm:text-left"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ai-soft text-ai">
              <FiMessageCircle className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-text">
                Still have a question?
              </p>
              <p className="text-sm text-text-muted">
                Write to us and we will answer.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className={buttonVariants({ variant: "secondary" })}
          >
            Contact us
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
