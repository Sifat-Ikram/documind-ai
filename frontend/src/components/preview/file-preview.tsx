"use client";

import { useState } from "react";
import { FiExternalLink } from "react-icons/fi";
import { DocxViewer } from "@/components/preview/docx-viewer";
import { PdfViewer } from "@/components/preview/pdf-viewer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { FileType } from "@/types/api";

function TextBlock({ text, note }: { text: string; note?: string }) {
  return (
    <div>
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap wrap-break-word rounded-2xl border border-border bg-surface p-5 text-sm leading-relaxed text-text">
        {text || "No text to show."}
      </pre>
      {note && <p className="mt-2 text-xs text-text-muted">{note}</p>}
    </div>
  );
}

/** Shows a file the way it looks (PDF or Word), or its text. Use key={fileUrl} so it resets for a new file. */
export function FilePreview({
  fileType,
  fileUrl,
  text,
  textNote,
}: {
  fileType: FileType;
  fileUrl: string;
  text: string;
  textNote?: string;
}) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [error, setError] = useState("");
  const hasViewer = fileType !== "TXT";
  const showText = !hasViewer || mode === "text" || Boolean(error);

  return (
    <div>
      {hasViewer && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label="What to show"
            value={mode}
            onChange={setMode}
            options={[
              { value: "file", label: "Document" },
              { value: "text", label: "Extracted text" },
            ]}
          />
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-link hover:underline"
          >
            <FiExternalLink className="size-4" aria-hidden="true" />
            Open in a new tab
          </a>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-xl bg-warning-soft px-4 py-3 text-sm text-text"
        >
          {error} The extracted text is shown instead.
        </div>
      )}

      {showText ? (
        <TextBlock text={text} note={textNote} />
      ) : fileType === "PDF" ? (
        <PdfViewer url={fileUrl} onError={setError} />
      ) : (
        <DocxViewer url={fileUrl} onError={setError} />
      )}
    </div>
  );
}
