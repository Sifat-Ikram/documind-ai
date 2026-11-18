"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FiDownload } from "react-icons/fi";
import {
  SettingRow,
  SettingsSection,
} from "@/components/settings/setting-parts";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { api, errorMessage } from "@/lib/api";

type Action = "conversations" | "analyses";

const COPY: Record<
  Action,
  { title: string; description: string; done: string }
> = {
  conversations: {
    title: "Delete all chat history?",
    description:
      "Every conversation you had with the AI about your documents, with all its messages, will be deleted permanently. Your documents are not affected.",
    done: "Chat history deleted",
  },
  analyses: {
    title: "Delete all analysis history?",
    description:
      "Every saved result from the Analyze tool will be deleted permanently. Your documents are not affected.",
    done: "Analysis history deleted",
  },
};

async function downloadData() {
  const data = await api<unknown>("/users/data/export");
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `documind-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function PrivacySection() {
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [clearingRecent, setClearingRecent] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function clearRecent() {
    setClearingRecent(true);
    try {
      await api("/users/data/recent", { method: "DELETE" });
      toast.success("Recent list cleared");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setClearingRecent(false);
    }
  }

  async function download() {
    setDownloading(true);
    try {
      await downloadData();
      toast.success("Your data was downloaded");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  const info: [string, string][] = [
    [
      "What is stored",
      "The text read from your documents, your analyses, chats, comments and notes are stored in the database. The original files are kept in a file storage service.",
    ],
    [
      "Files use a public link",
      "Anyone who has the link to an uploaded file can open it. Please do not upload sensitive or private documents.",
    ],
    [
      "What the AI receives",
      "When you analyze a document, chat about it, search, or generate a document, the relevant text and your instruction are sent to an AI provider to produce the answer. Nothing is sent until you do one of these.",
    ],
    [
      "Deleting",
      "A deleted document stays in Trash for 30 days, then it is removed for good, together with its analyses, chats, versions and stored files. Passwords are stored in a hashed form, never as plain text.",
    ],
  ];

  return (
    <SettingsSection
      id="privacy"
      title="Privacy & Data"
      description="Clean up your history, download your data, and see how your information is handled."
    >
      <SettingRow
        label="Chat history"
        description="Delete every conversation you had with the AI."
      >
        <Button
          variant="secondary"
          onClick={() => setConfirming("conversations")}
        >
          Delete all chats
        </Button>
      </SettingRow>
      <SettingRow
        label="Analysis history"
        description="Delete every saved result from the Analyze tool."
      >
        <Button variant="secondary" onClick={() => setConfirming("analyses")}>
          Delete all analyses
        </Button>
      </SettingRow>
      <SettingRow
        label="Recent list"
        description="Clear the list of documents you opened recently."
      >
        <Button
          variant="secondary"
          loading={clearingRecent}
          onClick={clearRecent}
        >
          Clear recent
        </Button>
      </SettingRow>
      <SettingRow
        label="Download my data"
        description="A JSON file with your documents list, analyses, chats, comments and generated documents. The document files themselves are not included."
      >
        <Button variant="secondary" loading={downloading} onClick={download}>
          {!downloading && <FiDownload className="size-4" aria-hidden="true" />}
          Download JSON
        </Button>
      </SettingRow>

      <div className="space-y-4 py-4 text-sm last:pb-0">
        <h3 className="font-medium text-text">How your data is handled</h3>
        <dl className="space-y-4">
          {info.map(([title, text]) => (
            <div key={title}>
              <dt className="font-medium text-text">{title}</dt>
              <dd className="mt-1 text-text-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </div>

      {confirming && (
        <ConfirmModal
          title={COPY[confirming].title}
          description={COPY[confirming].description}
          confirmLabel="Delete"
          successMessage={COPY[confirming].done}
          onConfirm={async () => {
            await api(`/users/data/${confirming}`, { method: "DELETE" });
          }}
          onClose={() => setConfirming(null)}
        />
      )}
    </SettingsSection>
  );
}
