"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  FiCopy,
  FiDownload,
  FiPlus,
  FiSend,
  FiSliders,
  FiSquare,
  FiZap,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useApi } from "@/hooks/use-api";
import { ApiError, api, apiRaw, errorMessage, parseResponse } from "@/lib/api";
import { cn } from "@/lib/cn";
import { copyText } from "@/lib/clipboard";
import { streamEvents } from "@/lib/sse";
import type {
  GenerationEvent,
  GenerationLength,
  GenerationStatus,
  GenerationTone,
} from "@/types/api";

const DOC_TYPES = [
  "Report",
  "Essay",
  "Letter",
  "Email",
  "Resume",
  "Cover letter",
  "Meeting minutes",
  "Proposal",
  "Blog post",
] as const;

const LENGTHS: { value: GenerationLength; label: string }[] = [
  { value: "SHORT", label: "Short" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LONG", label: "Long" },
];

const TONES: { value: GenerationTone; label: string }[] = [
  { value: "neutral", label: "Neutral" },
  { value: "formal", label: "Formal" },
  { value: "friendly", label: "Friendly" },
];

const LENGTH_HINT: Record<GenerationLength, string> = {
  SHORT: "about 300 words",
  MEDIUM: "about 700 words",
  LONG: "about 1500 words",
};

const EXAMPLES = [
  "A short report",
  "A cover letter",
  "A blog postt",
];

const STORE_KEY = "documind-writer-v1";
const STORE_TTL = 24 * 60 * 60 * 1000;

type UserMessage = { id: string; role: "user"; text: string; at: number };

type AssistantMessage = {
  id: string;
  role: "assistant";
  text: string;
  at: number;
  title: string | null;
  generatedId: string | null;
  truncated: boolean;
  saved: boolean;
  error: string | null;
  note: string | null;
};

type Message = UserMessage | AssistantMessage;

type Stored = {
  at: number;
  messages: Message[];
  settings: {
    docType: string;
    length: GenerationLength;
    language: string;
    tone: GenerationTone;
    title: string;
  };
};

const isAbort = (err: unknown) =>
  err instanceof DOMException && err.name === "AbortError";

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean).length;

export function GeneratorView() {
  const router = useRouter();
  const status = useApi<GenerationStatus>("/generate/status");
  const { status: authStatus } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [docType, setDocType] = useState<string>("Blog post");
  const [length, setLength] = useState<GenerationLength>("SHORT");
  const [language, setLanguage] = useState("");
  const [tone, setTone] = useState<GenerationTone>("neutral");
  const [title, setTitle] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);

  const [input, setInput] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const targetRef = useRef<string | null>(null);
  const pendingRef = useRef("");
  const frameRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const running = runningId !== null;
  const blocked = status.data ? status.data.remaining <= 0 : false;

  const fullText = useMemo(
    () =>
      messages
        .filter((m): m is AssistantMessage => m.role === "assistant")
        .map((m) => m.text.trim())
        .filter(Boolean)
        .join("\n\n"),
    [messages],
  );
  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant") return m;
    }
    return null;
  }, [messages]);

  // ---- streaming text, painted once per frame ----

  const flush = useCallback(() => {
    frameRef.current = 0;
    const id = targetRef.current;
    const chunk = pendingRef.current;
    if (!id || !chunk) return;
    pendingRef.current = "";
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id && m.role === "assistant"
          ? { ...m, text: m.text + chunk }
          : m,
      ),
    );
  }, []);

  const append = useCallback(
    (text: string) => {
      pendingRef.current += text;
      if (!frameRef.current) frameRef.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  const flushNow = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    flush();
  }, [flush]);

  const patch = useCallback((id: string, value: Partial<AssistantMessage>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id && m.role === "assistant" ? { ...m, ...value } : m,
      ),
    );
  }, []);

  // ---- restore and keep the conversation for 24 hours ----

  useEffect(() => {
    let cancelled = false;
    // restored after the first paint, so the server and client render the same page
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as Stored;
          if (stored.at && Date.now() - stored.at < STORE_TTL) {
            if (Array.isArray(stored.messages)) setMessages(stored.messages);
            if (stored.settings) {
              setDocType(stored.settings.docType ?? "Blog post");
              setLength(stored.settings.length ?? "SHORT");
              setLanguage(stored.settings.language ?? "");
              setTone(stored.settings.tone ?? "neutral");
              setTitle(stored.settings.title ?? "");
            }
          } else {
            window.localStorage.removeItem(STORE_KEY);
          }
        }
      } catch {
        // storage can be blocked, the writer still works for this visit
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || runningId) return;
    try {
      const data: Stored = {
        at: Date.now(),
        messages,
        settings: { docType, length, language, tone, title },
      };
      window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [
    hydrated,
    runningId,
    messages,
    docType,
    length,
    language,
    tone,
    title,
  ]);

  // leaving the page stops the draft; what was written is already saved by the server
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!messages.length) return;
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  // ---- generation ----

  function handlerFor(id: string) {
    return (event: GenerationEvent) => {
      if (event.type === "token") append(event.text);
      else if (event.type === "outline") patch(id, { title: event.title });
      else if (event.type === "section")
        patch(id, {
          note: `Writing section ${event.index + 1} of ${event.total}: ${event.heading}`,
        });
      else if (event.type === "done")
        patch(id, {
          title: event.title,
          generatedId: event.id,
          truncated: event.truncated,
          note: null,
        });
      else if (event.type === "error") patch(id, { error: event.message });
    };
  }

  async function run(
    mode: "generate" | "continue",
    instruction: string,
    assistantId: string,
    base: string,
  ) {
    const controller = new AbortController();
    abortRef.current = controller;
    targetRef.current = assistantId;
    pendingRef.current = "";
    setRunningId(assistantId);

    const onEvent = handlerFor(assistantId);
    const shared = {
      ...(language.trim() ? { language: language.trim() } : {}),
      ...(tone !== "neutral" ? { tone } : {}),
    };

    try {
      if (mode === "generate") {
        await streamEvents<GenerationEvent>(
          "/generate/stream",
          {
            docType,
            length,
            instructions: instruction,
            ...(title.trim() ? { title: title.trim() } : {}),
            ...shared,
          },
          onEvent,
          controller.signal,
        );
      } else {
        await streamEvents<GenerationEvent>(
          "/generate/continue",
          {
            content: base,
            docType,
            ...(instruction ? { instructions: instruction } : {}),
            ...shared,
            ...(lastAssistant?.generatedId
              ? { generatedId: lastAssistant.generatedId }
              : {}),
          },
          onEvent,
          controller.signal,
        );
      }
    } catch (err) {
      if (!isAbort(err)) patch(assistantId, { error: errorMessage(err) });
    } finally {
      flushNow();
      setRunningId(null);
      abortRef.current = null;
      targetRef.current = null;
      status.reload();
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || running) return;
    if (blocked) {
      toast.error("The free drafts for now are used up.");
      return;
    }

    const base = fullText;
    const first = base.trim().length < 20;
    const assistantId = uid();
    const now = Date.now();

    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text, at: now },
      {
        id: assistantId,
        role: "assistant",
        text: "",
        at: now,
        title: null,
        generatedId: null,
        truncated: false,
        saved: false,
        error: null,
        note: null,
      },
    ]);
    setInput("");
    setOptionsOpen(false);
    await run(first ? "generate" : "continue", text, assistantId, base);
  }

  async function continueWriting() {
    if (running || !fullText.trim()) return;
    const lastUser = [...messages]
      .reverse()
      .find((m): m is UserMessage => m.role === "user");
    const assistantId = uid();

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        text: "",
        at: Date.now(),
        title: null,
        generatedId: null,
        truncated: false,
        saved: false,
        error: null,
        note: null,
      },
    ]);
    await run("continue", lastUser?.text ?? "", assistantId, fullText);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setOptionsOpen(false);
    try {
      window.localStorage.removeItem(STORE_KEY);
    } catch {
      // ignore
    }
  }

  async function exportAs(format: "pdf" | "docx" | "txt") {
    if (!fullText || exporting || running) return;
    setExporting(format);
    try {
      const res = await apiRaw("/generate/export", {
        method: "POST",
        body: {
          format,
          ...(lastAssistant?.title || title.trim()
            ? { title: lastAssistant?.title ?? title.trim() }
            : {}),
          content: fullText,
        },
      });
      if (!res.ok) await parseResponse<never>(res);

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const safeTitle =
        (lastAssistant?.title ?? title.trim() ?? "")
          .replace(/[\\/:*?"<>|]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80) || "document";
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${safeTitle}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  async function saveToDocuments(message: AssistantMessage) {
    if (savingId) return;
    if (authStatus !== "authenticated" || !message.generatedId) {
      router.push("/login");
      return;
    }
    setSavingId(message.id);
    try {
      await api<{ document: { id: string } }>(
        `/generate/history/${message.generatedId}/save`,
        { method: "POST", body: { format: "docx" } },
      );
      patch(message.id, { saved: true });
      toast.success("Saved to My Documents");
      router.push("/documents");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.info("This draft is already saved to your documents.");
        router.push("/documents");
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setSavingId(null);
    }
  }

  const canSend = input.trim().length >= 5 && !running && !blocked;
  const settingsLine = [
    docType,
    LENGTH_HINT[length],
    language.trim() || "auto language",
    tone === "neutral" ? null : `${tone} tone`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ai">
            AI Writer
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            What should we write?
          </h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={!messages.length || running}
          onClick={newChat}
        >
          <FiPlus className="size-4" aria-hidden="true" />
          New chat
        </Button>
      </header>

      <div className="flex-1 space-y-6 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-2xl pt-4">
            <div>
              <p className="text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                Try an example
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setInput(example)}
                    className="max-w-full rounded-full border border-border px-3.5 py-2 text-left text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {message.text}
                  </div>
                </div>
              );
            }

            const isLast =
              index === messages.length - 1 ||
              !messages.slice(index + 1).some((m) => m.role === "assistant");
            const streaming = runningId === message.id;

            return (
              <div key={message.id} className="flex gap-3">
                <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-ai-soft text-ai">
                  <FiZap className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl border border-border bg-surface px-4 py-4 sm:px-5">
                    {message.title && !streaming && (
                      <h2 className="mb-2 text-base font-semibold text-text">
                        {message.title}
                      </h2>
                    )}

                    {message.text ? (
                      <Markdown className="text-[15px] leading-relaxed">
                        {message.text}
                      </Markdown>
                    ) : streaming ? (
                      <div className="space-y-3" aria-busy="true">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-11/12" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                    ) : null}

                    {streaming && message.text && (
                      <span
                        aria-hidden="true"
                        className="mt-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-ai align-middle"
                      />
                    )}

                    {message.note && streaming && (
                      <p className="mt-3 text-xs text-text-muted">
                        {message.note}
                      </p>
                    )}

                    {message.error && (
                      <p className="mt-3 rounded-md bg-error-soft px-3.5 py-2.5 text-sm text-error-text">
                        {message.error}
                      </p>
                    )}

                    {message.truncated && !message.error && (
                      <p className="mt-3 rounded-md bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
                        The draft stopped early. Continue writing to add the rest.
                      </p>
                    )}
                  </div>

                  {isLast && !streaming && message.text && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void copyText(fullText, "Draft copied")}
                      >
                        <FiCopy className="size-4" aria-hidden="true" />
                        Copy
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={running}
                        onClick={() => void continueWriting()}
                      >
                        <FiSend className="size-4" aria-hidden="true" />
                        Continue
                      </Button>
                      {(["pdf", "docx", "txt"] as const).map((format) => (
                        <Button
                          key={format}
                          variant="secondary"
                          size="sm"
                          disabled={running || exporting !== null}
                          loading={exporting === format}
                          onClick={() => void exportAs(format)}
                        >
                          {exporting !== format && (
                            <FiDownload className="size-4" aria-hidden="true" />
                          )}
                          {format.toUpperCase()}
                        </Button>
                      ))}
                      <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
                      <Button
                        size="sm"
                        disabled={savingId === message.id}
                        loading={savingId === message.id}
                        onClick={() => void saveToDocuments(message)}
                      >
                        Save to My Documents
                      </Button>
                      <span className="ml-auto text-xs text-text-muted">
                        {wordsOf(fullText)} words
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-bg/90 px-4 pb-4 pt-3 backdrop-blur sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {optionsOpen && (
          <div className="mb-3 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium text-text">
                Document type
              </p>
              <Select
                aria-label="Document type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                disabled={running}
              >
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-text">Length</p>
              <SegmentedControl
                label="Document length"
                value={length}
                onChange={setLength}
                disabled={running}
                options={LENGTHS}
              />
            </div>
            <Input
              label="Language (optional)"
              value={language}
              maxLength={40}
              disabled={running}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="English, Bangla…"
              hint="Empty: same language as your request."
            />
            <div>
              <p className="mb-1.5 text-sm font-medium text-text">Tone</p>
              <Select
                aria-label="Tone"
                value={tone}
                onChange={(e) => setTone(e.target.value as GenerationTone)}
                disabled={running}
              >
                {TONES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Title (optional)"
                value={title}
                maxLength={150}
                disabled={running}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave empty and the AI writes one"
              />
            </div>
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-2xl border border-border-strong bg-surface p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setOptionsOpen((o) => !o)}
            aria-expanded={optionsOpen}
            aria-label="Document options"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
              optionsOpen
                ? "bg-primary-soft text-link"
                : "text-text-muted hover:bg-surface-muted hover:text-text",
            )}
          >
            <FiSliders className="size-4" />
          </button>

          <textarea
            aria-label="Describe the document you need"
            rows={1}
            value={input}
            maxLength={2000}
            disabled={running}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Describe the document you need…"
            className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm text-text placeholder:text-text-muted disabled:opacity-60"
          />

          {running ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={stop}
              aria-label="Stop generating"
            >
              <FiSquare className="size-4" aria-hidden="true" />
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              disabled={!canSend}
              aria-label="Generate"
            >
              <FiSend className="size-4" aria-hidden="true" />
              Send
            </Button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-text-muted">
          <p className="min-w-0 truncate">
            {settingsLine}
            {title.trim() ? ` · “${title.trim()}”` : ""}
          </p>
          <p className="shrink-0">
            {status.data?.actor === "guest" ? (
              blocked ? (
                <span className="text-warning">
                  Free drafts used up.{" "}
                  <Link href="/login" className="underline">
                    Log in
                  </Link>{" "}
                  to keep writing.
                </span>
              ) : (
                `${status.data.remaining} free ${status.data.remaining === 1 ? "draft" : "drafts"} left today`
              )
            ) : authStatus === "authenticated" ? (
              "Does not use your account limits"
            ) : null}
          </p>
        </div>
        {!blocked && !canSend && input.trim().length > 0 && (
          <p className="mt-1 px-1 text-xs text-text-muted">
            Add a few more words so the AI knows what to write.
          </p>
        )}
      </form>
    </div>
  );
}
