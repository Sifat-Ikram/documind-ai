"use client";

import { FiCheckCircle, FiCpu, FiHash, FiZap } from "react-icons/fi";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminAiAnalytics } from "@/types/admin";
import { AdminTable, PageHeader, StatCard } from "./admin-ui";
import {
  BarChart,
  CategoryBars,
  ChartCard,
  DoughnutChart,
  LineChart,
} from "./charts";
import { RangeFilter } from "./range-filter";
import { useAdminData, useRangeFilter } from "./use-admin-data";

export function AdminAiView() {
  const { range, interval, setRange, setInterval, query } = useRangeFilter();
  const { data, error, loading, reload } = useAdminData<AdminAiAnalytics>(
    `/admin/ai${query}`,
  );

  return (
    <div>
      <PageHeader
        title="AI Usage & Analytics"
        description="Requests, tokens and feature usage from real AI calls."
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
              label="Total AI requests"
              value={data.stats.totalRequests}
              icon={FiCpu}
              tone="info"
            />
            <StatCard
              label="Total tokens"
              value={data.stats.totalTokens}
              hint={`${data.stats.promptTokens.toLocaleString("en")} prompt / ${data.stats.completionTokens.toLocaleString("en")} completion`}
              icon={FiZap}
              tone="warning"
            />
            <StatCard
              label="Successful requests"
              value={
                data.stats.successRate === null
                  ? "—"
                  : `${data.stats.successRate.toFixed(1)}%`
              }
              hint="Share of requests that completed"
              icon={FiCheckCircle}
              tone="success"
            />
            <StatCard
              label="Features used"
              value={data.featureUsage.filter((f) => f.requests > 0).length}
              hint="Writer, analysis, chat and search"
              icon={FiHash}
              tone="info"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="AI feature usage"
              description="Requests per feature in this period"
            >
              <CategoryBars
                data={data.featureUsage.map((item) => ({
                  label: item.label,
                  value: item.requests,
                }))}
                color="var(--ai)"
              />
            </ChartCard>
            <ChartCard
              title="Feature usage distribution"
              description="Share of requests per feature"
            >
              <DoughnutChart
                data={data.distribution.map((item) => ({
                  label: item.label,
                  value: item.value,
                }))}
                centerLabel="requests"
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="AI usage trends" description="Requests over time">
              <LineChart
                data={data.usageTrend}
                interval={data.interval}
                valueSuffix=" requests"
              />
            </ChartCard>
            <ChartCard title="Token consumption" description="Tokens over time">
              <LineChart
                data={data.tokenTrend}
                interval={data.interval}
                color="var(--ai)"
                valueSuffix=" tokens"
              />
            </ChartCard>
          </div>

          <ChartCard
            title="Usage by feature"
            description="Requests and tokens for each AI feature"
          >
            <AdminTable
              loading={loading}
              rows={data.featureUsage}
              rowKey={(row) => row.key}
              columns={[
                { header: "Feature", cell: (row) => row.label },
                {
                  header: "Requests",
                  className: "tabular-nums",
                  cell: (row) => row.requests.toLocaleString("en"),
                },
                {
                  header: "Tokens",
                  className: "tabular-nums",
                  cell: (row) => row.tokens.toLocaleString("en"),
                },
                {
                  header: "Avg tokens / request",
                  className: "tabular-nums",
                  cell: (row) =>
                    row.requests === 0
                      ? "—"
                      : Math.round(row.tokens / row.requests).toLocaleString("en"),
                },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="AI requests by interval"
            description="Requests per period"
          >
            <BarChart
              data={data.usageTrend}
              interval={data.interval}
              color="var(--ai)"
              valueSuffix=" requests"
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
