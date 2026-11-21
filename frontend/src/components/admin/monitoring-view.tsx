"use client";

import { FiActivity, FiCpu, FiRefreshCw, FiServer } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatRelative } from "@/lib/utils";
import type { AdminMonitoring, StatusLevel } from "@/types/admin";
import { AdminTable, PageHeader, Panel, StatusBadge } from "./admin-ui";
import { BarChart, ChartCard, LineChart } from "./charts";
import { RangeFilter } from "./range-filter";
import { useAdminData, useRangeFilter } from "./use-admin-data";

const LEVEL: Record<StatusLevel, { tone: "success" | "warning" | "error"; label: string }> = {
  operational: { tone: "success", label: "Operational" },
  degraded: { tone: "warning", label: "Degraded" },
  down: { tone: "error", label: "Down" },
};

function uptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function StatusCard({
  title,
  status,
  detail,
  extra,
}: {
  title: string;
  status: StatusLevel;
  detail: string;
  extra?: string;
}) {
  const level = LEVEL[status];
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        <StatusBadge tone={level.tone}>{level.label}</StatusBadge>
      </div>
      <p className="mt-3 text-sm text-text-muted">{detail}</p>
      {extra && <p className="mt-1 text-xs text-text-muted">{extra}</p>}
    </div>
  );
}

export function AdminMonitoringView() {
  const { range, interval, setRange, setInterval, query } = useRangeFilter("7d");
  const { data, error, loading, reload } = useAdminData<AdminMonitoring>(
    `/admin/monitoring${query}`,
  );

  return (
    <div>
      <PageHeader
        title="System Monitoring"
        description="API health, AI provider status and recent failures."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <RangeFilter
              range={range}
              interval={interval}
              onRangeChange={setRange}
              onIntervalChange={setInterval}
            />
            <Button variant="secondary" onClick={reload} loading={loading}>
              <FiRefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatusCard
              title="API health"
              status={data.statuses.api.status}
              detail={data.statuses.api.detail}
              extra={`Average response ${data.statuses.api.avgLatency.toLocaleString("en")} ms`}
            />
            <StatusCard
              title="AI provider"
              status={data.statuses.aiProvider.status}
              detail={data.statuses.aiProvider.detail}
              extra={
                data.statuses.aiProvider.lastErrorAt
                  ? `Last error ${formatRelative(data.statuses.aiProvider.lastErrorAt)}`
                  : "No recent errors"
              }
            />
            <StatusCard
              title="Server"
              status={data.statuses.server.status}
              detail={data.statuses.server.detail}
              extra={`Uptime ${uptime(data.statuses.server.uptimeSeconds)} · database ${data.statuses.server.database}`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Panel title="Requests">
              <p className="text-2xl font-semibold tabular-nums text-text">
                {data.stats.requests.toLocaleString("en")}
              </p>
              <p className="mt-1 text-xs text-text-muted">In the selected period</p>
            </Panel>
            <Panel title="Errors">
              <p className="text-2xl font-semibold tabular-nums text-text">
                {data.stats.errors.toLocaleString("en")}
              </p>
              <p className="mt-1 text-xs text-text-muted">Responses with status 400 or higher</p>
            </Panel>
            <Panel title="Average response time">
              <p className="text-2xl font-semibold tabular-nums text-text">
                {data.stats.avgLatency.toLocaleString("en")} ms
              </p>
              <p className="mt-1 text-xs text-text-muted">Across all API routes</p>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="API response time" description="Average milliseconds per period">
              <LineChart
                data={data.responseTime}
                interval={data.interval}
                color="var(--primary)"
                valueSuffix=" ms"
              />
            </ChartCard>
            <ChartCard title="API errors" description="Failed requests per period">
              <BarChart
                data={data.errorTrend}
                interval={data.interval}
                color="var(--error)"
                valueSuffix=" errors"
              />
            </ChartCard>
          </div>

          <ChartCard
            title="Recent errors"
            description="The latest failed API requests"
          >
            <AdminTable
              loading={loading}
              rows={data.recentErrors}
              rowKey={(row) => row.id}
              empty="No errors recorded"
              columns={[
                {
                  header: "Request",
                  cell: (row) => (
                    <div className="min-w-0">
                      <p className="font-medium text-text">
                        {row.method} {row.path}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatDateTime(row.createdAt)}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  cell: (row) => (
                    <StatusBadge tone={row.status >= 500 ? "error" : "warning"}>
                      {row.status}
                    </StatusBadge>
                  ),
                },
                {
                  header: "Duration",
                  className: "tabular-nums",
                  cell: (row) => `${row.durationMs.toLocaleString("en")} ms`,
                },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="Failed document processing"
            description="Uploads that could not be turned into documents"
          >
            <AdminTable
              loading={loading}
              rows={data.failedProcessing}
              rowKey={(row) => row.id}
              empty="No failed processing logs"
              columns={[
                {
                  header: "File",
                  cell: (row) => (
                    <div className="min-w-0">
                      <p className="font-medium text-text">{row.fileName}</p>
                      <p className="text-xs text-text-muted">
                        {row.fileType ?? "unknown type"}
                        {row.user ? ` · ${row.user.email}` : ""}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Reason",
                  cell: (row) => (
                    <span className="block max-w-[420px] text-xs text-text-muted">
                      {row.reason}
                    </span>
                  ),
                },
                {
                  header: "When",
                  cell: (row) => (
                    <span className="text-xs text-text-muted">
                      {formatRelative(row.createdAt)}
                    </span>
                  ),
                },
              ]}
            />
          </ChartCard>

          <p className="flex items-center gap-2 text-xs text-text-muted">
            <FiActivity className="size-3.5" aria-hidden="true" />
            API metrics are recorded from live requests; AI provider status uses the last 24 hours.
            <FiCpu className="ml-2 size-3.5" aria-hidden="true" />
            <FiServer className="size-3.5" aria-hidden="true" />
          </p>
        </div>
      )}
    </div>
  );
}
