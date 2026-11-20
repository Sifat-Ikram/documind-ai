"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiArrowUpRight,
  FiFileText,
  FiInfo,
  FiSearch,
  FiUser,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Markdown } from "@/components/ui/markdown";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/utils";
import type {
  DocRole,
  FileType,
  SearchAnswer,
  SearchResponse,
  SearchResultItem,
  SearchScope,
} from "@/types/api";

const MAX_ANSWER_DOCUMENTS = 8;

const ROLE_LABEL: Record<DocRole, string> = {
  OWNER: "Yours",
  EDITOR: "Can edit",
  VIEWER: "Can view",
};

const MODE_LABEL: Record<SearchResponse["mode"], string> = {
  fts: "Full-text match",
  like: "Word match",
  name: "File name match",
  none: "No text match",
};

const SUGGESTIONS = [
  "contract with a payment deadline",
  "meeting notes about the budget",
  "documents that mention my address",
  "invoice from last year",
];

/** Marks the words that caused the match, so the reason for a result is visible. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  const wanted = new Set(terms.map((t) => t.toLowerCase()));
  const parts = text.split(/([\p{L}\p{M}\p{N}]+)/gu);
  return (
    <>
      {parts.map((part, i) =>
        wanted.has(part.toLowerCase()) ? (
          <mark
            key={i}
            className="rounded bg-ai-soft px-0.5 font-medium text-ai"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function ResultCard({
  item,
  terms,
  selected,
  onToggle,
  selectionFull,
}: {
  item: SearchResultItem;
  terms: string[];
  selected: boolean;
  onToggle: () => void;
  selectionFull: boolean;
}) {
  const doc = item.document;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-surface p-5 transition-colors",
        selected ? "border-primary" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          disabled={!selected && selectionFull}
          onChange={onToggle}
          aria-label={`Use ${doc.originalName} for an AI answer`}
          className="mt-3 size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        <FileTypeBadge type={doc.fileType} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-text">
            <Link
              href={`/documents/${doc.id}`}
              className="line-clamp-2 wrap-break-word hover:underline"
            >
              {doc.originalName}
            </Link>
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              {doc.myRole === "OWNER" ? (
                <FiUser className="size-3.5" aria-hidden="true" />
              ) : (
                <FiUsers className="size-3.5" aria-hidden="true" />
              )}
              {ROLE_LABEL[doc.myRole]} · {doc.owner.name}
            </span>
            <span>{plural(doc.wordCount, "word")}</span>
            {item.nameMatch && (
              <span className="rounded-full border border-border px-2 py-0.5">
                File name matches
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/documents/${doc.id}`}
          aria-label={`Open ${doc.originalName}`}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
        >
          <FiArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {item.snippets.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {item.snippets.map((snippet) => (
            <li
              key={snippet.chunkIndex}
              className="text-sm leading-relaxed text-text-muted"
            >
              <Highlight text={snippet.text} terms={terms} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function SearchView() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [fileType, setFileType] = useState<"" | FileType>("");
  const [useAi, setUseAi] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);

  const [data, setData] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [answer, setAnswer] = useState<SearchAnswer | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<unknown>(null);

  const canSearch = query.trim().length >= 2 && !searching;

  async function run(reuseTerms?: string[]) {
    const trimmed = query.trim();
    if (trimmed.length < 2 || searching) return;

    setSearching(true);
    setMessage(null);
    setSearchError(null);
    setAnswer(null);
    setAnswerError(null);

    try {
      const body: Record<string, unknown> = {
        query: trimmed,
        scope,
        includeArchived,
        useAi: reuseTerms ? false : useAi,
      };
      if (reuseTerms?.length) body.terms = reuseTerms;
      if (fileType) body.type = fileType;

      const res = await api<SearchResponse>("/search", { method: "POST", body });
      setData(res);
      setSelected([]);
      if (res.items.length === 0 && res.searchedDocuments === 0) {
        setMessage(
          "There are no documents to search yet. Upload one from My Documents first.",
        );
      }
    } catch (err) {
      setData(null);
      setSearchError(err);
    } finally {
      setSearching(false);
    }
  }

  async function askAi() {
    if (!data || selected.length === 0 || answering) return;
    setAnswering(true);
    setAnswerError(null);
    setAnswer(null);
    try {
      const res = await api<SearchAnswer>("/search/answer", {
        method: "POST",
        body: {
          query: data.query,
          terms: data.terms,
          documentIds: selected,
        },
      });
      setAnswer(res);
    } catch (err) {
      setAnswerError(err);
    } finally {
      setAnswering(false);
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= MAX_ANSWER_DOCUMENTS) return current;
      return [...current, id];
    });
  }

  const terms = data?.terms ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          AI Search
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
          Ask in your own words and the AI turns the question into search words,
          then finds the passages that answer it. Pick a few results to get one
          written answer with sources.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section
            aria-label="Search"
            className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run();
              }}
            >
              <label
                htmlFor="search-query"
                className="text-[15px] font-semibold text-text"
              >
                What are you looking for?
              </label>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <FiSearch
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="search-query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={300}
                    disabled={searching}
                    placeholder="For example: the contract section about late payments"
                    className="h-11 w-full rounded-md border border-border-strong bg-surface pl-10 pr-3.5 text-sm text-text placeholder:text-text-muted focus:outline-none disabled:opacity-60"
                  />
                </div>
                <Button
                  type="submit"
                  size="md"
                  loading={searching}
                  disabled={!canSearch}
                  className="shrink-0"
                >
                  {!searching && (
                    <FiSearch className="size-4" aria-hidden="true" />
                  )}
                  Search
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <SegmentedControl
                  label="Where to search"
                  value={scope}
                  onChange={setScope}
                  options={[
                    { value: "all", label: "All documents" },
                    { value: "mine", label: "Mine" },
                    { value: "shared", label: "Shared with me" },
                  ]}
                />

                <Select
                  aria-label="File type"
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as "" | FileType)}
                  className="h-11 w-40"
                >
                  <option value="">Any file type</option>
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="TXT">TXT</option>
                </Select>

                <label className="flex items-center gap-3 text-sm text-text">
                  <Switch
                    checked={useAi}
                    onChange={setUseAi}
                    label="Use AI to understand the question"
                    disabled={searching}
                  />
                  AI understanding
                </label>

                <label className="flex items-center gap-3 text-sm text-text">
                  <Switch
                    checked={includeArchived}
                    onChange={setIncludeArchived}
                    label="Search archived documents too"
                    disabled={searching}
                  />
                  Archived too
                </label>
              </div>

              {!data && query.trim().length === 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    Try asking
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setQuery(suggestion)}
                        className="rounded-full border border-border px-3 py-1.5 text-left text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </section>

          <section aria-label="Results">
            {searching && !data && (
              <div className="space-y-4" aria-busy="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-2xl" />
                ))}
              </div>
            )}

            {!searching && Boolean(searchError) && !data && (
              <ErrorState error={searchError} />
            )}

            {!searching && !searchError && !data && (
              <div className="rounded-2xl border border-border bg-surface">
                <EmptyState
                  icon={FiSearch}
                  title="Search inside all your documents"
                  description="Type a few words above. Results show the matching passages, so you know why a document was found."
                />
              </div>
            )}

            {data && (
              <div className={cn("space-y-4", searching && "opacity-60")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-text-muted">
                    {data.totalMatched > 0
                      ? `${plural(data.totalMatched, "document")} matched in ${plural(data.searchedDocuments, "document searched")}`
                      : `${plural(data.searchedDocuments, "document searched")}, no match`}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
                      {MODE_LABEL[data.mode]}
                    </span>
                    {data.aiNote && (
                      <span
                        title={data.aiNote}
                        className="rounded-full bg-warning-soft px-2.5 py-1 text-xs text-warning"
                      >
                        AI understanding unavailable
                      </span>
                    )}
                    {data.truncated && (
                      <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs text-warning">
                        Only the 1000 most recent were searched
                      </span>
                    )}
                  </div>
                </div>

                {terms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-text-muted">
                      Searching for
                    </span>
                    {terms.slice(0, 12).map((term) => (
                      <span
                        key={term}
                        className="rounded-full bg-ai-soft px-2 py-0.5 text-xs text-ai"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                )}

                {data.understanding !== "ai" && data.understanding !== "plain" && (
                  <p className="text-xs text-text-muted">
                    These search words were reused from the previous answer, so
                    no AI request was made.
                  </p>
                )}

                {message && (
                  <p className="rounded-md border border-border bg-surface-muted px-3.5 py-3 text-sm text-text-muted">
                    {message}
                  </p>
                )}

                {data.items.length === 0 && !message && (
                  <div className="rounded-2xl border border-border bg-surface">
                    <EmptyState
                      icon={FiSearch}
                      title="No document matched"
                      description="Try other words, or turn on the archived documents. Bengali text is matched word by word rather than by full-text search."
                      action={
                        data.terms.length > 0 ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void run(data.terms)}
                          >
                            Search again with these words
                          </Button>
                        ) : undefined
                      }
                    />
                  </div>
                )}

                {data.items.length > 0 && (
                  <>
                    <p className="text-xs text-text-muted">
                      Tick up to {MAX_ANSWER_DOCUMENTS} documents to get one
                      written answer with sources.
                    </p>
                    <div className="space-y-4">
                      {data.items.map((item) => (
                        <ResultCard
                          key={item.document.id}
                          item={item}
                          terms={terms}
                          selected={selected.includes(item.document.id)}
                          selectionFull={
                            selected.length >= MAX_ANSWER_DOCUMENTS
                          }
                          onToggle={() => toggle(item.document.id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
              <FiZap className="size-4 text-ai" aria-hidden="true" />
              AI answer
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {selected.length === 0
                ? "Select documents in the results and the AI writes one answer, citing the passages it used."
                : `${plural(selected.length, "document")} selected.`}
            </p>
            <Button
              className="mt-4 w-full"
              loading={answering}
              disabled={selected.length === 0 || answering}
              onClick={() => void askAi()}
            >
              {!answering && <FiZap className="size-4" aria-hidden="true" />}
              Answer with AI
            </Button>

            {Boolean(answerError) && (
              <p className="mt-3 rounded-md bg-error-soft px-3 py-2 text-sm text-error-text">
                {errorMessage(answerError)}
              </p>
            )}

            {answer && (
              <div className="mt-4 border-t border-border pt-4">
                <Markdown>{answer.answer}</Markdown>
                {answer.sources.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-border pt-3">
                    {answer.sources.map((source) => (
                      <li key={source.label} className="text-xs text-text-muted">
                        <Link
                          href={`/documents/${source.documentId}`}
                          className="font-medium text-link hover:underline"
                        >
                          {source.label}
                        </Link>{" "}
                        {source.documentName} · part {source.chunkIndex + 1}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-text-muted">
                  Answers can contain mistakes. Check the passages above before
                  relying on them.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
              <FiInfo className="size-4 text-text-muted" aria-hidden="true" />
              How this search works
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
              <li>
                Your question is turned into search words, including close
                synonyms, by one AI request. Turn AI understanding off to search
                with your exact words only.
              </li>
              <li>
                Text inside each document is searched, not just the file name.
                The best passages are shown under every result.
              </li>
              <li>
                Trash is never searched. Archived documents are included only
                when you allow it.
              </li>
              <li>
                The AI answer uses only the passages it found in the documents
                you ticked and says so when the answer is not there.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
              <FiFileText className="size-4 text-text-muted" aria-hidden="true" />
              Looking for a chat instead?
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              A document chat keeps the whole conversation with one file. AI
              Search looks across all of them at once.
            </p>
            <Link
              href="/conversations"
              className="mt-3 inline-flex text-sm font-medium text-link hover:underline"
            >
              Open AI Conversations
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
