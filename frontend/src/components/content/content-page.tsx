import type { ReactNode } from "react";

export function ContentPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-ai">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
          {intro}
        </p>
        {updated && (
          <p className="mt-2 text-xs text-text-muted">Last updated {updated}</p>
        )}
      </header>
      <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}

export function ContentSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-text-muted">
        {children}
      </div>
    </section>
  );
}
