"use client";

import { FiActivity, FiCpu, FiFileText, FiUsers } from "react-icons/fi";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminSystemAnalytics } from "@/types/admin";
import { PageHeader, StatCard } from "./admin-ui";
import {
  BarChart,
  CategoryBars,
  ChartCard,
  LineChart,
} from "./charts";
import { RangeFilter } from "./range-filter";
import { useAdminData, useRangeFilter } from "./use-admin-data";

export function AdminAnalyticsView() {
  const { range, interval, setRange, setInterval, query } = useRangeFilter();
  const { data, error, reload } = useAdminData<AdminSystemAnalytics>(
    `/admin/analytics${query}`,
  );

  return (
    <div>
      <PageHeader
        title="System Analytics"
        description="Growth, activity and engagement across the platform."
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
              label="Active users"
              value={data.stats.activeUsers}
              hint="Unique users with activity"
              icon={FiActivity}
              tone="success"
            />
            <StatCard
              label="Total users"
              value={data.stats.totalUsers}
              hint={`${data.stats.newUsers.toLocaleString("en")} new in this period`}
              icon={FiUsers}
              tone="info"
            />
            <StatCard
              label="Documents added"
              value={data.stats.documents}
              icon={FiFileText}
              tone="warning"
            />
            <StatCard
              label="AI requests"
              value={data.stats.aiRequests}
              icon={FiCpu}
              tone="info"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Active users"
              description="Daily, weekly or monthly active users"
            >
              <LineChart
                data={data.activeUsersTrend}
                interval={data.interval}
                color="var(--success)"
                valueSuffix=" users"
              />
            </ChartCard>
            <ChartCard
              title="User growth"
              description="Cumulative registered accounts"
            >
              <LineChart
                data={data.userGrowth}
                interval={data.interval}
                color="var(--primary)"
                valueSuffix=" users"
              />
            </ChartCard>
            <ChartCard title="Document uploads" description="Documents over time">
              <BarChart
                data={data.documentUploads}
                interval={data.interval}
                color="var(--ai)"
                valueSuffix=" documents"
              />
            </ChartCard>
            <ChartCard title="AI requests growth" description="AI requests over time">
              <LineChart
                data={data.aiRequestsTrend}
                interval={data.interval}
                color="var(--ai)"
                valueSuffix=" requests"
              />
            </ChartCard>
          </div>

          <ChartCard
            title="User engagement"
            description="Average actions per active user in this period"
          >
            <CategoryBars
              data={data.engagement.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              color="var(--success)"
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
