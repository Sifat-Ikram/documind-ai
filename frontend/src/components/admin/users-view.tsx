"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FiAlertTriangle, FiShield, FiSlash, FiUsers } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { AdminUserRow, AdminUsersStats, Paged } from "@/types/admin";
import {
  AdminTable,
  PageHeader,
  StatCard,
  StatusBadge,
} from "./admin-ui";
import { ChartCard, DoughnutChart, LineChart } from "./charts";
import { RangeFilter } from "./range-filter";
import {
  buildQuery,
  useAdminData,
  useDebounced,
  useRangeFilter,
} from "./use-admin-data";

export function AdminUsersView() {
  const rangeFilter = useRangeFilter();
  const stats = useAdminData<AdminUsersStats>(
    `/admin/users/stats${rangeFilter.query}`,
  );

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<AdminUserRow | null>(null);

  const listPath = `/admin/users${buildQuery({
    page,
    limit: 10,
    search: debounced || undefined,
    role: role || undefined,
    status: status || undefined,
  })}`;
  const { data, error, loading, reload } = useAdminData<Paged<AdminUserRow>>(listPath);

  async function toggleBlock(user: AdminUserRow) {
    setBusyId(user.id);
    try {
      await api(`/admin/users/${user.id}/block`, {
        method: "PATCH",
        body: { blocked: !user.isBlocked },
      });
      toast.success(user.isBlocked ? "User unblocked" : "User blocked");
      reload();
      stats.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const summary = stats.data;

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Search, inspect and moderate registered accounts."
        actions={
          <RangeFilter
            range={rangeFilter.range}
            interval={rangeFilter.interval}
            onRangeChange={rangeFilter.setRange}
            onIntervalChange={rangeFilter.setInterval}
          />
        }
      />

      {summary && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="New users"
            value={summary.stats.newUsers}
            hint="In the selected period"
            icon={FiUsers}
            tone="info"
          />
          <StatCard
            label="Active users"
            value={summary.stats.activeUsers}
            hint="Active in the last 30 days"
            icon={FiShield}
            tone="success"
          />
          <StatCard
            label="Blocked users"
            value={summary.stats.blockedUsers}
            hint="Cannot sign in"
            icon={FiSlash}
            tone="error"
          />
          <StatCard
            label="Admins"
            value={summary.stats.admins}
            hint="Accounts with admin access"
            icon={FiAlertTriangle}
            tone="warning"
          />
        </div>
      )}

      {summary && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <ChartCard title="Registration trends" description="New accounts over time">
            <LineChart data={summary.registrationTrend} interval={summary.interval} />
          </ChartCard>
          <ChartCard title="User status" description="Active versus blocked accounts">
            <DoughnutChart
              data={summary.statusDistribution.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              centerLabel="users"
            />
          </ChartCard>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Input
            label="Search users"
            placeholder="Name or email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-36">
          <label className="mb-1.5 block text-sm font-medium text-text">Role</label>
          <Select
            aria-label="Filter by role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </div>
        <div className="w-36">
          <label className="mb-1.5 block text-sm font-medium text-text">Status</label>
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <>
          <AdminTable
            loading={loading}
            rows={data.items}
            rowKey={(row) => row.id}
            empty="No users match these filters"
            columns={[
              {
                header: "User",
                cell: (row) => (
                  <div className="min-w-0">
                    <Link
                      href={`/admin/users/${row.id}`}
                      className="font-medium text-text hover:text-link hover:underline"
                    >
                      {row.name}
                    </Link>
                    <p className="truncate text-xs text-text-muted">{row.email}</p>
                  </div>
                ),
              },
              {
                header: "Role",
                cell: (row) => (
                  <StatusBadge tone={row.role === "ADMIN" ? "info" : "muted"}>
                    {row.role === "ADMIN" ? "Admin" : "User"}
                  </StatusBadge>
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
                header: "Documents",
                className: "tabular-nums",
                cell: (row) => row.documentCount.toLocaleString("en"),
              },
              {
                header: "Joined",
                cell: (row) => (
                  <span className="text-xs text-text-muted">
                    {formatRelative(row.createdAt)}
                  </span>
                ),
              },
              {
                header: "Actions",
                cell: (row) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/users/${row.id}`}
                      className="text-sm font-medium text-link hover:underline"
                    >
                      View
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === row.id}
                      disabled={row.role === "ADMIN"}
                      onClick={() => toggleBlock(row)}
                    >
                      {row.isBlocked ? "Unblock" : "Block"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={row.role === "ADMIN"}
                      onClick={() => setConfirm(row)}
                    >
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={setPage}
          />
        </>
      )}

      {confirm && (
        <ConfirmModal
          title="Delete user"
          description={`Delete ${confirm.email}? Their documents, conversations and analyses will be removed permanently.`}
          confirmLabel="Delete user"
          successMessage="User deleted"
          onConfirm={async () => {
            await api(`/admin/users/${confirm.id}`, { method: "DELETE" });
            reload();
            stats.reload();
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
