"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FiLogOut, FiShield, FiUserPlus } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ErrorState } from "@/components/ui/error-state";
import { Input, PasswordInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { AdminAccount, AdminProfile } from "@/types/admin";
import {
  AdminTable,
  PageHeader,
  Panel,
  StatusBadge,
} from "./admin-ui";
import { useAdminData } from "./use-admin-data";

export function AdminSettingsView() {
  const { user, setUser, logout } = useAuth();
  const profile = useAdminData<AdminProfile>("/admin/settings/profile");
  const admins = useAdminData<AdminAccount[]>("/admin/settings/admins");

  const [typedName, setTypedName] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [confirmDemote, setConfirmDemote] = useState<AdminAccount | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const name = typedName ?? profile.data?.name ?? "";

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingName(true);
    try {
      const result = await api<{ user: { name: string } }>(
        "/admin/settings/profile",
        { method: "PATCH", body: { name } },
      );
      toast.success("Profile updated");
      profile.reload();
      if (user) setUser({ ...user, name: result.user.name });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("The new passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await api("/admin/settings/password", {
        method: "PATCH",
        body: {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
      });
      toast.success("Password changed. Other sessions were signed out.");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  }

  async function promote(event: React.FormEvent) {
    event.preventDefault();
    setPromoting(true);
    try {
      await api("/admin/settings/admins", {
        method: "POST",
        body: { email },
      });
      toast.success("Admin role granted");
      setEmail("");
      admins.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPromoting(false);
    }
  }

  if (profile.error) {
    return (
      <div>
        <PageHeader title="Admin Settings" />
        <ErrorState error={profile.error} onRetry={profile.reload} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Admin Settings"
        description="Your admin profile, password and admin access."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Admin profile">
          {!profile.data ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <form className="space-y-4" onSubmit={saveProfile}>
              <div>
                <p className="text-sm font-medium text-text">Email</p>
                <p className="mt-1.5 rounded-md border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-text-muted">
                  {profile.data.email}
                </p>
              </div>
              <Input
                label="Name"
                value={name}
                minLength={2}
                maxLength={60}
                required
                onChange={(event) => setTypedName(event.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                <StatusBadge tone="info">
                  <FiShield className="mr-1 size-3" aria-hidden="true" />
                  Administrator
                </StatusBadge>
                <Button type="submit" loading={savingName}>
                  Save profile
                </Button>
              </div>
              <p className="text-xs text-text-muted">
                Admin since {formatDateTime(profile.data.createdAt)}
                {profile.data.lastLoginAt
                  ? ` · last login ${formatDateTime(profile.data.lastLoginAt)}`
                  : ""}
              </p>
            </form>
          )}
        </Panel>

        <Panel title="Change password">
          <form className="space-y-4" onSubmit={changePassword}>
            <PasswordInput
              label="Current password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(event) =>
                setPasswords((p) => ({ ...p, currentPassword: event.target.value }))
              }
              required
            />
            <PasswordInput
              label="New password"
              autoComplete="new-password"
              hint="At least 8 characters with a letter and a number."
              value={passwords.newPassword}
              onChange={(event) =>
                setPasswords((p) => ({ ...p, newPassword: event.target.value }))
              }
              required
            />
            <PasswordInput
              label="Confirm new password"
              autoComplete="new-password"
              value={passwords.confirmPassword}
              onChange={(event) =>
                setPasswords((p) => ({ ...p, confirmPassword: event.target.value }))
              }
              required
            />
            <div className="flex justify-end">
              <Button type="submit" loading={savingPassword}>
                Update password
              </Button>
            </div>
          </form>
        </Panel>
      </div>

      <Panel title="Manage admin roles" className="mt-4">
        <form
          className="mb-5 flex flex-wrap items-end gap-3"
          onSubmit={promote}
        >
          <div className="w-full max-w-sm">
            <Input
              label="Promote an existing account"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              hint="The account must already exist. No new account is created."
              required
            />
          </div>
          <Button type="submit" variant="secondary" loading={promoting}>
            <FiUserPlus className="size-4" aria-hidden="true" />
            Make admin
          </Button>
        </form>

        {admins.error ? (
          <ErrorState error={admins.error} onRetry={admins.reload} />
        ) : !admins.data ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <AdminTable
            loading={admins.loading}
            rows={admins.data}
            rowKey={(row) => row.id}
            empty="No admins"
            columns={[
              {
                header: "Admin",
                cell: (row) => (
                  <div>
                    <p className="font-medium text-text">
                      {row.name}
                      {row.id === user?.id && (
                        <span className="ml-2 text-xs text-text-muted">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted">{row.email}</p>
                  </div>
                ),
              },
              {
                header: "Added",
                cell: (row) => (
                  <span className="text-xs text-text-muted">
                    {formatDateTime(row.createdAt)}
                  </span>
                ),
              },
              {
                header: "Status",
                cell: (row) => (
                  <StatusBadge tone={row.isBlocked ? "error" : "success"}>
                    {row.isBlocked ? "Blocked" : "Active"}
                  </StatusBadge>
                ),
              },
              {
                header: "Actions",
                cell: (row) => (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={row.id === user?.id || admins.data!.length <= 1}
                    onClick={() => setConfirmDemote(row)}
                  >
                    Remove admin
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Panel>

      <Panel title="Session" className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-muted">
            Sign out of the admin panel and the rest of DocuMind AI.
          </p>
          <Button
            variant="secondary"
            loading={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              await logout();
            }}
          >
            <FiLogOut className="size-4" aria-hidden="true" />
            Log out
          </Button>
        </div>
      </Panel>

      {confirmDemote && (
        <ConfirmModal
          title="Remove admin role"
          description={`Remove admin access from ${confirmDemote.email}? Their account stays, but they can no longer open the admin panel.`}
          confirmLabel="Remove admin"
          successMessage="Admin role removed"
          onConfirm={async () => {
            await api(`/admin/settings/admins/${confirmDemote.id}`, {
              method: "DELETE",
            });
            admins.reload();
          }}
          onClose={() => setConfirmDemote(null)}
        />
      )}
    </div>
  );
}
