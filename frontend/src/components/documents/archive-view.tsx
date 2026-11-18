"use client";

import { DocumentsBrowser } from "@/components/documents/documents-browser";

export function ArchiveView() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Archive
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
          Archived documents are hidden from My Documents but nothing is
          deleted: their analyses and chats are kept, and you can restore a
          document to your library at any time.
        </p>
      </header>
      <DocumentsBrowser status="archived" />
    </div>
  );
}
