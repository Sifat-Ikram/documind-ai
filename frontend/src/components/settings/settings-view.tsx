"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import {
  SettingRow,
  SettingsSection,
} from "@/components/settings/setting-parts";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { usePreferences } from "@/context/preferences-context";
import { useApi } from "@/hooks/use-api";
import type { PreferencesPatch } from "@/lib/preferences";
import { PrivacySection } from "./privacy-section";

const LANGUAGES = [
  "English",
  "Bengali",
  "Hindi",
  "Urdu",
  "Arabic",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Japanese",
];

function useSave() {
  const { update } = usePreferences();
  return useCallback(
    async (patch: PreferencesPatch) => {
      try {
        await update(patch);
        toast.success("Saved", { id: "prefs-saved", duration: 1500 });
      } catch {
        // the error is already shown
      }
    },
    [update],
  );
}

function AppearanceSection() {
  const { preferences } = usePreferences();
  const save = useSave();
  const a = preferences.appearance;

  return (
    <SettingsSection
      id="appearance"
      title="Appearance"
      description="How DocuMind AI looks. Your choice is remembered on this device and on your account."
    >
      <SettingRow
        label="Theme"
        description="System follows the light or dark mode of your device."
      >
        <SegmentedControl
          label="Theme"
          value={a.theme}
          onChange={(theme) => void save({ appearance: { theme } })}
          options={[
            { value: "light", label: "Light", icon: FiSun },
            { value: "dark", label: "Dark", icon: FiMoon },
            { value: "system", label: "System", icon: FiMonitor },
          ]}
        />
      </SettingRow>
      <SettingRow
        label="Density"
        description="Compact fits more on the screen by using less space."
      >
        <SegmentedControl
          label="Density"
          value={a.density}
          onChange={(density) => void save({ appearance: { density } })}
          options={[
            { value: "comfortable", label: "Comfortable" },
            { value: "compact", label: "Compact" },
          ]}
        />
      </SettingRow>
      <SettingRow label="Text size" description="Large makes all text bigger.">
        <SegmentedControl
          label="Text size"
          value={a.textSize}
          onChange={(textSize) => void save({ appearance: { textSize } })}
          options={[
            { value: "normal", label: "Normal" },
            { value: "large", label: "Large" },
          ]}
        />
      </SettingRow>
      <SettingRow
        label="Reduce motion"
        description="Turns off animations and sliding effects."
      >
        <Switch
          label="Reduce motion"
          checked={a.reduceMotion}
          onChange={(reduceMotion) =>
            void save({ appearance: { reduceMotion } })
          }
        />
      </SettingRow>
    </SettingsSection>
  );
}

function AiSection() {
  const { preferences } = usePreferences();
  const save = useSave();
  const ai = preferences.ai;

  const known = LANGUAGES.includes(ai.language);
  const selectValue =
    ai.language === "auto" ? "auto" : known ? ai.language : "other";
  const [editingOther, setEditingOther] = useState(false);
  const [other, setOther] = useState(
    known || ai.language === "auto" ? "" : ai.language,
  );
  const showOther = selectValue === "other" || editingOther;

  return (
    <SettingsSection
      id="ai"
      title="AI Preferences"
      description="How the AI answers in Analyze, Chat, AI Search answers and the Document Generator. When you clearly ask for something else in a request, your request wins."
    >
      <SettingRow
        label="Response language"
        description="Auto answers in the language you write in. Translation always uses the language you ask for."
      >
        <div className="flex flex-col items-start gap-2">
          <Select
            aria-label="Response language"
            value={showOther ? "other" : selectValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "other") {
                setEditingOther(true);
                return;
              }
              setEditingOther(false);
              void save({ ai: { language: value } });
            }}
          >
            <option value="auto">Auto (same as my request)</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
            <option value="other">Other…</option>
          </Select>
          {showOther && (
            <div className="flex gap-2">
              <input
                aria-label="Other language"
                value={other}
                maxLength={40}
                onChange={(e) => setOther(e.target.value)}
                placeholder="For example: Tamil"
                className="h-11 w-48 rounded-md border border-border-strong bg-surface px-3.5 text-sm text-text placeholder:text-text-muted"
              />
              <Button
                variant="secondary"
                disabled={
                  other.trim().length === 0 || other.trim() === ai.language
                }
                onClick={() => void save({ ai: { language: other.trim() } })}
              >
                Use
              </Button>
            </div>
          )}
        </div>
      </SettingRow>
      <SettingRow label="Response length">
        <SegmentedControl
          label="Response length"
          value={ai.length}
          onChange={(length) => void save({ ai: { length } })}
          options={[
            { value: "short", label: "Short" },
            { value: "medium", label: "Medium" },
            { value: "detailed", label: "Detailed" },
          ]}
        />
      </SettingRow>
      <SettingRow label="Explanation style">
        <Select
          aria-label="Explanation style"
          value={ai.style}
          onChange={(e) =>
            void save({ ai: { style: e.target.value as typeof ai.style } })
          }
        >
          <option value="standard">Standard</option>
          <option value="simple">Simple and plain</option>
          <option value="detailed">In depth</option>
          <option value="technical">Technical</option>
        </Select>
      </SettingRow>
      <SettingRow label="Tone">
        <SegmentedControl
          label="Tone"
          value={ai.tone}
          onChange={(tone) => void save({ ai: { tone } })}
          options={[
            { value: "neutral", label: "Neutral" },
            { value: "formal", label: "Formal" },
            { value: "friendly", label: "Friendly" },
          ]}
        />
      </SettingRow>
      <SettingRow
        label="Answer format"
        description="Paragraphs or short bullet points where it fits."
      >
        <SegmentedControl
          label="Answer format"
          value={ai.format}
          onChange={(format) => void save({ ai: { format } })}
          options={[
            { value: "paragraphs", label: "Paragraphs" },
            { value: "bullets", label: "Bullet points" },
          ]}
        />
      </SettingRow>
    </SettingsSection>
  );
}

function DocumentsSection() {
  const { preferences } = usePreferences();
  const save = useSave();
  const d = preferences.documents;
  const collections = useApi<{
    items: { id: string; name: string; isOwner: boolean }[];
  }>("/collections");
  const own = collections.data?.items.filter((c) => c.isOwner) ?? [];

  return (
    <SettingsSection
      id="documents"
      title="Document Preferences"
      description="Defaults for your documents. How the Documents page looks (grid or list, sorting, items per page) is set on that page itself."
    >
      <SettingRow
        label="After uploading a document"
        description="What happens when an upload finishes."
      >
        <Select
          aria-label="After uploading a document"
          value={d.afterUpload}
          onChange={(e) =>
            void save({
              documents: {
                afterUpload: e.target.value as typeof d.afterUpload,
              },
            })
          }
        >
          <option value="stay">Stay on the Documents page</option>
          <option value="open_details">Open the document</option>
          <option value="open_analyze">Open Analyze</option>
        </Select>
      </SettingRow>
      <SettingRow
        label="Default export format"
        description="Used when you export or download generated documents."
      >
        <SegmentedControl
          label="Default export format"
          value={d.exportFormat}
          onChange={(exportFormat) =>
            void save({ documents: { exportFormat } })
          }
          options={[
            { value: "pdf", label: "PDF" },
            { value: "docx", label: "DOCX" },
            { value: "txt", label: "TXT" },
          ]}
        />
      </SettingRow>
      <SettingRow
        label="Default collection"
        description="New uploads are added to this collection."
      >
        {collections.loading && !collections.data ? (
          <Skeleton className="h-11 w-56 rounded-md" />
        ) : (
          <Select
            aria-label="Default collection"
            value={d.defaultCollectionId ?? ""}
            onChange={(e) =>
              void save({
                documents: { defaultCollectionId: e.target.value || null },
              })
            }
          >
            <option value="">None</option>
            {own.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {d.defaultCollectionId &&
              !own.some((c) => c.id === d.defaultCollectionId) && (
                <option value={d.defaultCollectionId}>
                  (collection no longer available)
                </option>
              )}
          </Select>
        )}
      </SettingRow>
      <SettingRow
        label="Ask before moving to Trash"
        description="Documents stay in Trash for 30 days and can be restored."
      >
        <Switch
          label="Ask before moving to Trash"
          checked={d.confirmBeforeTrash}
          onChange={(confirmBeforeTrash) =>
            void save({ documents: { confirmBeforeTrash } })
          }
        />
      </SettingRow>
    </SettingsSection>
  );
}

export function SettingsView() {
  const { ready } = usePreferences();

  return (
    <div className="space-y-8 w-full">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Personalize your DocuMind AI experience to match the way you work.
          Adjust your appearance, choose how AI responds, and set your preferred
          document behavior. Select your preferred language, response style, and
          level of detail for a more comfortable experience. Customize document
          defaults to make everyday tasks easier and more consistent.
        </p>
        <nav
          aria-label="Settings sections"
          className="mt-4 md:mt-6 lg:mt-8 flex flex-wrap justify-evenly gap-2"
        >
          {[
            ["appearance", "Appearance"],
            ["ai", "AI Preferences"],
            ["documents", "Document Preferences"],
            ["privacy", "Privacy & Data"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-border px-3.5 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      {ready ? (
        <div className="max-w-full space-y-6">
          <AppearanceSection />
          <AiSection />
          <DocumentsSection />
          <PrivacySection />
        </div>
      ) : (
        <div className="max-w-full space-y-6" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      )}
    </div>
  );
}
