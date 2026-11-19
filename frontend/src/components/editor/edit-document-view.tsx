"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { ApiError, api, errorMessage } from "@/lib/api";
import type { FileType } from "@/types/api";

interface EditorData {
  html: string;
  title: string;
  fileType: FileType;
  basedOn: number;
  currentVersion: number;
  warning: string | null;
}

export function EditDocumentView({
  id,
  version,
}: {
  id: string;
  version?: number;
}) {
  const router = useRouter();
  const back = `/documents/${id}?tab=versions`;
  const { data, error, loading, reload } = useApi<EditorData>(
    `/documents/${id}/editor${version ? `?version=${version}` : ""}`,
  );

  const [html, setHtml] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!touched) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [touched]);

  async function save(force = false) {
    if (!data) return;
    setSaving(true);
    setConflict(false);
    try {
      await api(`/documents/${id}/versions`, {
        method: "POST",
        body: {
          ...(title.trim() ? { title: title.trim() } : {}),
          html: html ?? data.html,
          basedOn: data.basedOn,
          expectedCurrentVersion: data.currentVersion,
          ...(force ? { force: true } : {}),
        },
      });
      setTouched(false);
      toast.success("Saved as a new version");
      router.push(back);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setConflict(true);
      else toast.error(errorMessage(err));
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[60vh] rounded-2xl" />
      </div>
    );
  }
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const plain = data.fileType === "TXT";
  const canSave = touched || title.trim() !== "";

  return (
    <div className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm text-text-muted"
      >
        <Link
          href={back}
          className="inline-flex items-center gap-1.5 hover:text-text"
        >
          <FiArrowLeft className="size-4" aria-hidden="true" />
          Back to the document
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Edit document
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
            You are editing a copy of{" "}
            <span className="font-medium text-text">{data.title}</span> (version{" "}
            {data.basedOn}). Saving creates a new version. The earlier versions
            stay as they are, and you can open or restore them any time.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => (touched ? setLeaving(true) : router.push(back))}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            loading={saving}
            disabled={!canSave}
          >
            {!saving && <FiSave className="size-4" aria-hidden="true" />}
            Save as new version
          </Button>
        </div>
      </header>

      {(data.warning || plain) && (
        <div
          role="note"
          className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-text"
        >
          {plain
            ? "This is a plain text file, so only the text is kept. Formatting is not saved."
            : data.warning}
        </div>
      )}

      <div className="max-w-xl">
        <Input
          label="Title of the new version (optional)"
          value={title}
          maxLength={120}
          placeholder={`Automatic, for example “${data.title.replace(/ \(\d+\)(\.\w+)?$/, "$1")} (1)”`}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-text-muted">
          Leave it empty and the number goes up by itself: Report, Report (1),
          Report (2).
        </p>
      </div>

      <RichTextEditor
        content={data.html}
        plain={plain}
        onChange={(value) => {
          setHtml(value);
          setTouched(true);
        }}
      />

      <Modal
        open={conflict}
        onClose={() => setConflict(false)}
        title="A newer version exists"
        description="Someone else saved a newer version while you were editing. Your changes are still here. If you save anyway, your text becomes the newest version and the other one stays in the history."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConflict(false)}>
              Keep editing
            </Button>
            <Button onClick={() => void save(true)} loading={saving}>
              Save anyway
            </Button>
          </>
        }
      />
      <Modal
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Discard your changes?"
        description="You have changes that are not saved. If you leave now they are lost."
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaving(false)}>
              Keep editing
            </Button>
            <Link href={back} className={buttonVariants({ variant: "danger" })}>
              Discard changes
            </Link>
          </>
        }
      />
    </div>
  );
}
