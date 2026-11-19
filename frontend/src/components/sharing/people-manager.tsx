"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api";
import { initials } from "@/lib/utils";

export type PersonRole = "VIEWER" | "EDITOR";
export interface Person {
  key: string;
  name: string;
  email: string;
  role: PersonRole;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Add people by email, change their role, remove them. Used for documents and for collections. */
export function PeopleManager({
  people,
  loading,
  error,
  onRetry,
  onAdd,
  onRole,
  onRemove,
  roleHelp,
}: {
  people: Person[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onAdd: (email: string, role: PersonRole) => Promise<void>;
  onRole: (key: string, role: PersonRole) => Promise<void>;
  onRemove: (key: string) => Promise<void>;
  roleHelp: string;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PersonRole>("VIEWER");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) {
      setFormError("Email not valid");
      return;
    }
    setAdding(true);
    setFormError("");
    try {
      await onAdd(value, role);
      setEmail("");
      toast.success("Access given");
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  async function run(key: string, task: () => Promise<void>, success: string) {
    setBusyKey(key);
    try {
      await task();
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
      <form onSubmit={submit} noValidate>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            aria-label="Email address of the person"
            aria-invalid={Boolean(formError)}
            placeholder="Email address of a DocuMind AI user"
            onChange={(e) => {
              setEmail(e.target.value);
              setFormError("");
            }}
            className="h-11 min-w-0 flex-1 basis-56 rounded-xl border border-border-strong bg-surface px-3.5 text-sm text-text placeholder:text-text-muted"
          />
          <Select
            aria-label="Access level"
            className="min-w-0"
            value={role}
            onChange={(e) => setRole(e.target.value as PersonRole)}
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
          </Select>
          <Button type="submit" loading={adding} disabled={!email.trim()}>
            Share
          </Button>
        </div>
        {formError && (
          <p role="alert" className="mt-2 text-sm text-error-text">
            {formError}
          </p>
        )}
        <p className="mt-2 text-xs text-text-muted">{roleHelp}</p>
      </form>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-text">People with access</h3>
        {loading && people.length === 0 ? (
          <Skeleton className="mt-3 h-14 rounded-xl" />
        ) : error && people.length === 0 ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : people.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">Nobody yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {people.map((p) => (
              <li key={p.key} className="flex items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-text">
                  {initials(p.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {p.name}
                  </p>
                  <p className="truncate text-xs text-text-muted">{p.email}</p>
                </div>
                <Select
                  aria-label={`Access level of ${p.name}`}
                  className="h-9 min-w-0"
                  value={p.role}
                  disabled={busyKey === p.key}
                  onChange={(e) =>
                    void run(
                      p.key,
                      () => onRole(p.key, e.target.value as PersonRole),
                      "Access updated",
                    )
                  }
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                </Select>
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  disabled={busyKey === p.key}
                  onClick={() =>
                    void run(p.key, () => onRemove(p.key), "Access removed")
                  }
                  className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-error-text disabled:opacity-40"
                >
                  <FiX className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
