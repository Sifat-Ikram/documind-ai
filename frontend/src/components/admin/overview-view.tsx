"use client";

import {
  FiActivity,
  FiCpu,
  FiFileText,
  FiUsers,
} from "react-icons/fi";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/utils";
import type { AdminOverview } from "@/types/admin";
import { AdminTable, PageHeader, StatCard } from "./admin-ui";
import {
  BarChart,
  ChartCard,
  DoughnutChart,
  LineChart,
} from "./charts";
import { RangeFilter } from "./range-filter";
import { useAdminData, useRangeFilter } from "./use-admin-data";

const ACTIVITY_LABELS: Record<string, string> = {
  document: "Document",
  analysis: "Analysis",
  registration: "Signup",
  feedback: "Feedback",
};

export function AdminOverviewView() {
  const { range, interval, setRange, setInterval, query } = useRangeFilter();
  const { data, error, loading, reload } = useAdminData<AdminOverview>(
    `/admin/overview${query}`,
  );

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Platform activity at a glance."
        actions={
          <RangeFilter
            range={range}
            interval={interval}
            onRangeChange={setRange}
            onIntervalChange={setInterval}
          />
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total users"
              value={data.stats.totalUsers}
              hint={`${data.stats.newUsers.toLocaleString("en")} joined in this period`}
              icon={FiUsers}
              tone="info"
            />
            <StatCard
              label="Active users"
              value={data.stats.activeUsers}
              hint="Did something in this period"
              icon={FiActivity}
              tone="success"
            />
            <StatCard
              label="Total documents"
              value={data.stats.totalDocuments}
              hint="Excluding trashed documents"
              icon={FiFileText}
              tone="warning"
            />
            <StatCard
              label="Total AI requests"
              value={data.stats.totalAiRequests}
              hint={`${data.stats.totalTokens.toLocaleString("en")} tokens used`}
              icon={FiCpu}
              tone="info"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="User growth"
              description="New registrations over time"
            >
              <LineChart
                data={data.userGrowth}
                interval={data.interval}
                valueSuffix=" users"
              />
            </ChartCard>
            <ChartCard
              title="Document uploads"
              description="Documents added over time"
            >
              <BarChart
                data={data.documentUploads}
                interval={data.interval}
                color="var(--ai)"
                valueSuffix=" documents"
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="AI usage distribution"
              description="Requests per AI feature in this period"
            >
              <DoughnutChart
                data={data.aiDistribution.map((item) => ({
                  label: item.label,
                  value: item.requests,
                }))}
                centerLabel="requests"
              />
            </ChartCard>

            <ChartCard
              title="Recent activities"
              description="Latest activity across the platform"
            >
              <AdminTable
                loading={loading}
                rows={data.recentActivities}
                rowKey={(row) => row.id}
                empty="No activity recorded yet"
                columns={[
                  {
                    header: "Activity",
                    cell: (row) => (
                      <div>
                        <p className="font-medium text-text">{row.title}</p>
                        <p className="text-xs text-text-muted">
                          {ACTIVITY_LABELS[row.type]}
                          {row.user ? ` · ${row.user.name}` : ""}
                        </p>
                      </div>
                    ),
                  },
                  {
                    header: "When",
                    className: "w-28 whitespace-nowrap",
                    cell: (row) => (
                      <span className="text-xs text-text-muted">
                        {formatRelative(row.at)}
                      </span>
                    ),
                  },
                ]}
              />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
