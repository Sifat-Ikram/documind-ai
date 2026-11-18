"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { FiLogOut } from "react-icons/fi";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useApi } from "@/hooks/use-api";
import { ApiError, api, errorMessage } from "@/lib/api";
import { fieldErrors, serverFieldErrors } from "@/lib/forms";
import { formatBytes, formatDateTime, initials } from "@/lib/utils";
import { changePasswordSchema, profileSchema } from "@/lib/validation";
import type { DashboardResponse, User } from "@/types/api";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-text">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-text-muted">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileSection() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;
  const unchanged = name.trim() === user.name;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid name");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await api<{ user: User }>("/users/profile", {
        method: "PATCH",
        body: { name: parsed.data.name },
      });
      setUser(res.user);
      setName(res.user.name);
      toast.success("Profile updated");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Your details"
      description="Your name is shown in the top bar and in the greeting on your dashboard."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Input
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          error={error}
        />
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-muted">Email</dt>
            <dd className="mt-1 break-all font-medium text-text">
              {user.email}
            </dd>
            <p className="mt-1 text-xs text-text-muted">
              The email cannot be changed.
            </p>
          </div>
          <div>
            <dt className="text-text-muted">Member since</dt>
            <dd className="mt-1 font-medium text-text">
              {formatDateTime(user.createdAt)}
            </dd>
          </div>
        </dl>
        <Button type="submit" loading={saving} disabled={unchanged}>
          Save changes
        </Button>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await api("/users/password", {
        method: "PATCH",
        body: {
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        },
      });
      setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated. Other devices were logged out.");
    } catch (err) {
      if (err instanceof ApiError && err.errors?.length) {
        setErrors(serverFieldErrors(err.errors));
      } else if (
        err instanceof ApiError &&
        /current password/i.test(err.message)
      ) {
        setErrors({ currentPassword: "The current password is incorrect." });
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Password"
      description="Choose a new password. You stay logged in on this device, and every other device is logged out."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && (
          <div
            role="alert"
            className="rounded-md bg-error-soft px-4 py-3 text-sm text-error-text"
          >
            {formError}
          </div>
        )}
        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={(e) => update("currentPassword", e.target.value)}
          error={errors.currentPassword}
        />
        <div className="space-y-3">
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={(e) => update("newPassword", e.target.value)}
            error={errors.newPassword}
          />
          <PasswordChecklist value={values.newPassword} />
        </div>
        <PasswordInput
          label="Repeat the new password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />
        <Button type="submit" loading={saving}>
          Update password
        </Button>
      </form>
    </Section>
  );
}

function ActivityCard() {
  const { data, loading } = useApi<DashboardResponse>("/dashboard/stats");

  return (
    <Section title="Your activity">
      {loading && !data ? (
        <Skeleton className="h-28 rounded-md" />
      ) : data ? (
        <dl className="divide-y divide-border text-sm">
          {(
            [
              ["Documents", String(data.stats.documents)],
              ["Analyses", String(data.stats.analyses)],
              ["Conversations", String(data.stats.conversations)],
              ["Storage used", formatBytes(data.stats.storageBytes)],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
            >
              <dt className="text-text-muted">{label}</dt>
              <dd className="font-medium text-text">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-text-muted">
          Your activity could not be loaded right now.
        </p>
      )}
    </Section>
  );
}

function SessionSection() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  return (
    <Section
      title="Session"
      description="You stay logged in on this device until you log out or the session expires."
    >
      <Button
        variant="secondary"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          await logout();
        }}
      >
        <FiLogOut className="size-4" aria-hidden="true" />
        Log out
      </Button>
    </Section>
  );
}

export function ProfileView() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-surface-muted text-xl font-semibold text-text">
          {user ? initials(user.name) : "?"}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-semibold tracking-tight text-text">
            {user?.name ?? "Profile"}
          </h1>
          <p className="mt-1 truncate text-sm text-text-muted">{user?.email}</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <ProfileSection />
          <PasswordSection />
        </div>
        <div className="space-y-6">
          <ActivityCard />
          <SessionSection />
        </div>
      </div>
    </div>
  );
}
