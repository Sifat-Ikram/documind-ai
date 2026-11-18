"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FiSearch } from "react-icons/fi";
import { FileTypeBadge } from "@/components/documents/file-type-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { useApi } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { api, errorMessage } from "@/lib/api";
import { plural } from "@/lib/utils";
import type { DocumentsListResponse } from "@/types/api";

export function AddDocumentsModal({
  collectionId,
  onClose,
  onDone,
}: {
  collectionId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const debounced = useDebounce(search.trim(), 300);

  const query = new URLSearchParams({
    limit: "50",
    sort: "name",
    order: "asc",
  });
  if (debounced) query.set("search", debounced);
  const { data, loading } = useApi<DocumentsListResponse>(
    `/documents?${query}`,
  );

  async function save() {
    setSaving(true);
    try {
      const res = await api<{ added: number }>(
        `/collections/${collectionId}/documents`,
        {
          method: "POST",
          body: { documentIds: selected },
        },
      );
      toast.success(`Added ${plural(res.added, "document")}`);
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
      title="Add documents"
      description="Choose documents from your library."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={save}
            loading={saving}
            disabled={selected.length === 0}
          >
            Add {selected.length > 0 ? selected.length : ""}
          </Button>
        </>
      }
    >
      <div className="relative">
        <FiSearch
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Search your documents"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-xl border border-border-strong bg-surface pl-10 pr-3 text-sm text-text placeholder:text-text-muted"
        />
      </div>
      <div className="mt-3 max-h-64 overflow-y-auto">
        {data && data.items.length > 0 ? (
          <ul className="space-y-1">
            {data.items.map((doc) => {
              const already = doc.collections.some(
                (c) => c.id === collectionId,
              );
              return (
                <li key={doc.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface-muted">
                    <Checkbox
                      checked={already || selected.includes(doc.id)}
                      onChange={(c) =>
                        setSelected((prev) =>
                          c
                            ? [...prev, doc.id]
                            : prev.filter((x) => x !== doc.id),
                        )
                      }
                      label={`Select ${doc.originalName}`}
                    />
                    <FileTypeBadge
                      type={doc.fileType}
                      className="h-7 w-10 text-[10px]"
                    />
                    <span className="min-w-0 flex-1 truncate text-text">
                      {doc.originalName}
                    </span>
                    {already && (
                      <span className="text-xs text-text-muted">
                        Already added
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-2 py-4 text-sm text-text-muted">
            {loading ? "Loading…" : "No documents found."}
          </p>
        )}
      </div>
    </Modal>
  );
}
