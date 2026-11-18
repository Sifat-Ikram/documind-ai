"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FiZap } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { categoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/cn";
import type { Category } from "@/types/api";

const option = (active: boolean) =>
  cn(
    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
    active
      ? "border-primary bg-primary-soft text-text"
      : "border-border text-text-muted hover:bg-surface-muted hover:text-text",
  );

export function CategoryModal({
  documentIds,
  currentId,
  onClose,
  onDone,
}: {
  documentIds: string[];
  currentId?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const single = documentIds.length === 1;
  const { data } = useApi<{ items: Category[] }>("/categories");
  const [selected, setSelected] = useState<string | null>(currentId ?? null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [hint, setHint] = useState("");

  async function suggest() {
    setSuggesting(true);
    setHint("");
    try {
      const res = await api<{ category: Category | null }>(
        `/documents/${documentIds[0]}/suggest-category`,
        { method: "POST", body: {} },
      );
      if (res.category) {
        setSelected(res.category.id);
        setHint(
          `The AI suggests "${res.category.name}". Press Save to apply it.`,
        );
      } else {
        setHint("The AI could not suggest a category.");
      }
    } catch (err) {
      setHint(errorMessage(err));
    } finally {
      setSuggesting(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      if (single) {
        await api(`/documents/${documentIds[0]}/category`, {
          method: "PATCH",
          body: { categoryId: selected },
        });
      } else {
        await api("/documents/bulk", {
          method: "POST",
          body: { action: "set_category", documentIds, categoryId: selected },
        });
      }
      toast.success(selected ? "Category saved" : "Category cleared");
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Category"
      description={
        single
          ? "Say what kind of document this is. Only the owner can change it."
          : `Set the category of ${documentIds.length} documents.`
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div
        role="radiogroup"
        aria-label="Category"
        className="grid gap-2 sm:grid-cols-2"
      >
        <button
          type="button"
          role="radio"
          aria-checked={selected === null}
          onClick={() => setSelected(null)}
          className={option(selected === null)}
        >
          No category
        </button>
        {data?.items.map((c) => {
          const Icon = categoryIcon(c.icon);
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected === c.id}
              onClick={() => setSelected(c.id)}
              className={option(selected === c.id)}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {c.name}
            </button>
          );
        })}
      </div>

      {single && (
        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            loading={suggesting}
            onClick={suggest}
          >
            {!suggesting && <FiZap className="size-3.5" aria-hidden="true" />}
            Suggest with AI
          </Button>
          {hint && <p className="mt-2 text-sm text-text-muted">{hint}</p>}
        </div>
      )}
    </Modal>
  );
}
