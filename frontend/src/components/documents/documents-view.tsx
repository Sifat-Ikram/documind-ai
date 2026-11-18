"use client";

import { DocumentsBrowser } from "@/components/documents/documents-browser";

export function DocumentsView() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          My Documents
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
          Everything you have uploaded. Open a document to analyze it with AI,
          chat about its contents, organize it with collections, tags and
          categories, or download the original file.
        </p>
      </header>
      <DocumentsBrowser status="active" withUpload />
    </div>
  );
}
