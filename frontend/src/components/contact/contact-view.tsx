"use client";

import { useState } from "react";
import { FiCheckCircle, FiMail, FiSend } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const EMPTY: FormState = { name: "", email: "", subject: "", message: "" };

export function ContactView() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const canSend =
    form.name.trim().length >= 2 &&
    form.email.trim().length >= 3 &&
    form.subject.trim().length >= 3 &&
    form.message.trim().length >= 10;

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !canSend) return;
    setSending(true);
    setError(null);
    try {
      await api("/contact", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          ...(website ? { website } : {}),
        },
      });
      setForm(EMPTY);
      setWebsite("");
      setSent(true);
    } catch (err) {
      setError(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8 min-h-screen">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-ai">
          Contact
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">
          Tell us what you think
        </h1>
      </header>

      <div className="flex flex-col-reverse lg:flex-row gap-6 lg:justify-evenly lg:items-start">
        <section className="xl:col-span-2">
          {sent ? (
            <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-success-soft text-success">
                <FiCheckCircle className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-text">
                Message sent
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">
                Thank you. We read every message and reply to the email address
                you gave, usually within a couple of days.
              </p>
              <Button
                variant="secondary"
                className="mt-5"
                onClick={() => setSent(false)}
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6"
              onSubmit={(e) => void submit(e)}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Your name"
                  value={form.name}
                  maxLength={80}
                  autoComplete="name"
                  disabled={sending}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Your name"
                  required
                />
                <Input
                  label="Email address"
                  type="email"
                  value={form.email}
                  maxLength={160}
                  autoComplete="email"
                  disabled={sending}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <Input
                label="Subject"
                value={form.subject}
                maxLength={120}
                disabled={sending}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="What is this about?"
                required
              />

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-text"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={7}
                  maxLength={3000}
                  value={form.message}
                  disabled={sending}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="Write a few words about your question or the problem you found."
                  required
                  className="mt-1.5 w-full resize-y rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm text-text placeholder:text-text-muted disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-text-muted">
                  {form.message.length}/3000
                </p>
              </div>

              {/* a real person never fills this in; it only catches bots */}
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              {Boolean(error) && (
                <p className="rounded-md bg-error-soft px-3.5 py-3 text-sm text-error-text">
                  {errorMessage(error)}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="max-w-sm text-xs text-text-muted">
                  We only use your address to reply to this message.
                </p>
                <Button
                  type="submit"
                  loading={sending}
                  disabled={!canSend || sending}
                >
                  {!sending && <FiSend className="size-4" aria-hidden="true" />}
                  Send message
                </Button>
              </div>
            </form>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
              <FiMail className="size-4 text-text-muted" aria-hidden="true" />
              What to include
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
              <li>What you were doing when the problem appeared.</li>
              <li>The document type, if the issue was about a draft.</li>
              <li>
                The message you saw, if there was an error. A screenshot helps.
              </li>
              <li>
                Do not send passwords or full documents you do not want stored.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
