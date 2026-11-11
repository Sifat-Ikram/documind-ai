"use client";

import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FiArrowLeft,
  FiFileText,
  FiList,
  FiMessageSquare,
} from "react-icons/fi";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { UiMessage } from "@/components/chat/types";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { ApiError, api, errorMessage } from "@/lib/api";
import { streamChatMessage } from "@/lib/chat-stream";
import { cn } from "@/lib/cn";
import { formatBytes, plural } from "@/lib/utils";
import type {
  ConversationListItem,
  ConversationMessages,
  DocumentDetail,
} from "@/types/api";

const SUGGESTIONS = [
  "What is this document about?",
  "Who or what is mentioned in this document?",
  "What are the most important dates or numbers?",
  "What are the main conclusions or decisions?",
];

export function ChatView({ documentId }: { documentId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const doc = useApi<{ document: DocumentDetail }>(`/documents/${documentId}`);
  const convs = useApi<{ items: ConversationListItem[] }>(
    `/documents/${documentId}/conversations`,
  );

  const [activeId, setActiveId] = useState<string | null>(() =>
    searchParams.get("conversation"),
  );
  // live: the messages shown while chatting. null = show what was loaded from the server.
  const [live, setLive] = useState<UiMessage[] | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [deleting, setDeleting] = useState<ConversationListItem | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const loaded = useApi<ConversationMessages>(
    activeId && live === null ? `/conversations/${activeId}/messages` : null,
  );

  const base = useMemo<UiMessage[]>(
    () =>
      (loaded.data?.messages ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
    [loaded.data],
  );
  const messages = live ?? base;
  const loadingMessages = live === null && activeId !== null && loaded.loading;
  const notFound =
    live === null &&
    loaded.error instanceof ApiError &&
    loaded.error.status === 404;

  // keep the view at the bottom while the answer grows, unless the user scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, loadingMessages]);

  // leaving the page stops the answer (what was written is already saved by the server)
  useEffect(() => () => abortRef.current?.abort(), []);

  function onScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function syncUrl(id: string | null) {
    router.replace(id ? `${pathname}?conversation=${id}` : pathname, {
      scroll: false,
    });
  }

  function stop() {
    abortRef.current?.abort();
  }

  function startNew() {
    stop();
    setActiveId(null);
    setLive(null);
    syncUrl(null);
    setListOpen(false);
  }

  function selectConversation(id: string) {
    setListOpen(false);
    if (id === activeId) return;
    stop();
    setLive(null);
    setActiveId(id);
    syncUrl(id);
  }

  async function send(rawText: string, historyOverride?: UiMessage[]) {
    const text = rawText.trim();
    if (!text || streaming) return;

    const history = historyOverride ?? messages;
    const userLocalId = `local-user-${crypto.randomUUID()}`;
    const aiId = `local-ai-${crypto.randomUUID()}`;

    stickRef.current = true;
    setLive([
      ...history,
      { id: userLocalId, role: "USER", content: text },
      { id: aiId, role: "ASSISTANT", content: "", status: "streaming" },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const patch = (id: string, changes: Partial<UiMessage>) =>
      setLive(
        (prev) =>
          prev?.map((m) => (m.id === id ? { ...m, ...changes } : m)) ?? prev,
      );

    // Tokens arrive very often. They are collected and shown once per animation frame.
    let pending = "";
    let frame = 0;
    const flush = () => {
      frame = 0;
      if (!pending) return;
      const chunk = pending;
      pending = "";
      setLive(
        (prev) =>
          prev?.map((m) =>
            m.id === aiId ? { ...m, content: m.content + chunk } : m,
          ) ?? prev,
      );
    };
    const flushNow = () => {
      if (frame) cancelAnimationFrame(frame);
      flush();
    };

    try {
      let conversationId = activeId;
      if (!conversationId) {
        const created = await api<{ conversation: { id: string } }>(
          `/documents/${documentId}/conversations`,
          { method: "POST", body: {} },
        );
        conversationId = created.conversation.id;
        setActiveId(conversationId);
        syncUrl(conversationId);
      }

      const outcome = await streamChatMessage(
        conversationId,
        text,
        {
          onStart: (event) => {
            patch(userLocalId, { id: event.userMessage.id });
            patch(aiId, { contextMode: event.contextMode });
          },
          onToken: (chunk) => {
            pending += chunk;
            if (!frame) frame = requestAnimationFrame(flush);
          },
          onDone: (message) => {
            flushNow();
            patch(aiId, {
              id: message.id,
              content: message.content,
              status: undefined,
            });
          },
          onError: (message) => {
            flushNow();
            patch(aiId, { status: "error", error: message });
          },
        },
        controller.signal,
      );

      flushNow();
      if (outcome === "aborted") patch(aiId, { status: "stopped" });
    } catch (err) {
      flushNow();
      patch(aiId, { status: "error", error: errorMessage(err) });
    } finally {
      setStreaming(false);
      abortRef.current = null;
      convs.reload();
    }
  }

  function retry(aiId: string) {
    const index = messages.findIndex((m) => m.id === aiId);
    const userMessage = index > 0 ? messages[index - 1] : undefined;
    if (!userMessage || userMessage.role !== "USER") return;
    void send(userMessage.content, messages.slice(0, index - 1));
  }

  async function deleteConversation(item: ConversationListItem) {
    await api(`/conversations/${item.id}`, { method: "DELETE" });
    if (item.id === activeId) startNew();
    convs.reload();
  }

  if (doc.error instanceof ApiError && doc.error.status === 404) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          icon={FiFileText}
          title="Document not found"
          description="It may have been deleted, or the link is wrong."
          action={
            <Link href="/documents" className={buttonVariants({ size: "sm" })}>
              Back to documents
            </Link>
          }
        />
      </div>
    );
  }
  if (doc.error && !doc.data)
    return <ErrorState error={doc.error} onRetry={doc.reload} />;

  const document = doc.data?.document;
  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "ASSISTANT")?.id;

  return (
    <div className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm text-text-muted"
      >
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 hover:text-text"
        >
          <FiArrowLeft className="size-4" aria-hidden="true" />
          Documents
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/documents/${documentId}`}
          className="max-w-[14rem] truncate hover:text-text"
        >
          {document?.originalName ?? "…"}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-text">Chat</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Document chat
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
            Ask questions about this document in your own words. The AI answers
            only from the text of your file, and tells you when something is not
            in it.
          </p>
          {document ? (
            <div className="mt-4 inline-flex max-w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
              <FileTypeBadge type={document.fileType} className="h-8 w-11" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {document.originalName}
                </p>
                <p className="text-xs text-text-muted">
                  {formatBytes(document.fileSize)} ·{" "}
                  {plural(document.wordCount, "word")}
                </p>
              </div>
            </div>
          ) : (
            <Skeleton className="mt-4 h-14 w-72 rounded-xl" />
          )}
        </div>
        <Button
          variant="secondary"
          className="lg:hidden"
          aria-expanded={listOpen}
          onClick={() => setListOpen((o) => !o)}
        >
          <FiList className="size-4" aria-hidden="true" />
          Conversations
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className={cn(listOpen ? "block" : "hidden", "lg:block")}>
          <ConversationList
            items={convs.data?.items ?? null}
            loading={convs.loading}
            error={convs.error}
            activeId={activeId}
            onSelect={selectConversation}
            onNew={startNew}
            onDelete={setDeleting}
            onRetry={convs.reload}
          />
        </div>

        <section
          aria-label="Chat"
          className="flex h-[calc(100dvh-16rem)] min-h-[30rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface"
        >
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
          >
            {loadingMessages ? (
              <div className="space-y-4" aria-busy="true">
                <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
                <Skeleton className="h-24 w-4/5 rounded-2xl" />
                <Skeleton className="ml-auto h-10 w-1/3 rounded-2xl" />
              </div>
            ) : notFound ? (
              <EmptyState
                icon={FiMessageSquare}
                title="Conversation not found"
                description="It may have been deleted. You can start a new chat about this document."
                action={
                  <Button size="sm" onClick={startNew}>
                    Start a new chat
                  </Button>
                }
              />
            ) : loaded.error && live === null ? (
              <ErrorState error={loaded.error} onRetry={loaded.reload} />
            ) : messages.length === 0 ? (
              <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
                <span className="grid size-12 place-items-center rounded-full bg-ai-soft text-ai">
                  <FiMessageSquare className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-text">
                  Ask anything about this document
                </h2>
                <p className="mt-1.5 text-sm text-text-muted">
                  Answers come from the text of your file. If the answer is not
                  there, the AI says so. For long documents it looks at the
                  parts most relevant to your question.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      className="rounded-full border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    canRetry={!streaming && message.id === lastAssistantId}
                    onRetry={() => retry(message.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-3 sm:p-4">
            <ChatComposer
              onSend={(text) => void send(text)}
              onStop={stop}
              streaming={streaming}
            />
            <p className="mt-1 text-xs text-text-muted">
              AI answers can contain mistakes. Check important details in the
              original document.
            </p>
          </div>
        </section>
      </div>

      {deleting && (
        <ConfirmModal
          title="Delete this conversation?"
          description={`"${deleting.title}" and all its messages will be deleted. This cannot be undone.`}
          successMessage="Conversation deleted"
          onConfirm={() => deleteConversation(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
