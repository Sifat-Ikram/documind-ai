"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiAlertTriangle,
  FiFileText,
  FiHardDrive,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatBytes, formatRelative } from "@/lib/utils";
import type {
  AdminDocumentRow,
  AdminDocumentsAnalytics,
  Paged,
} from "@/types/admin";
import {
  AdminTable,
  PageHeader,
  StatCard,
  StatusBadge,
} from "./admin-ui";
import { BarChart, ChartCard, DoughnutChart } from "./charts";
import { RangeFilter } from "./range-filter";
import {
  buildQuery,
  useAdminData,
  useDebounced,
  useRangeFilter,
} from "./use-admin-data";

const STATUS_TONE = {
  COMPLETED: "success",
  PROCESSING: "warning",
  FAILED: "error",
} as const;

export function AdminDocumentsView() {
  const rangeFilter = useRangeFilter();
  const analytics = useAdminData<AdminDocumentsAnalytics>(
    `/admin/documents/analytics${rangeFilter.query}`,
  );

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [confirm, setConfirm] = useState<AdminDocumentRow | null>(null);

  const listPath = `/admin/documents${buildQuery({
    page,
    limit: 10,
    search: debounced || undefined,
    type: type || undefined,
    status: status || undefined,
  })}`;
  const { data, error, loading, reload } = useAdminData<Paged<AdminDocumentRow>>(
    listPath,
  );

  const summary = analytics.data;

  return (
    <div>
      <PageHeader
        title="Document Management"
        description="Every uploaded and generated document on the platform."
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
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Total documents"
            value={summary.stats.totalDocuments}
            icon={FiFileText}
            tone="info"
          />
          <StatCard
            label="Storage used"
            value={formatBytes(summary.stats.storageBytes)}
            icon={FiHardDrive}
            tone="warning"
          />
          <StatCard
            label="Failed processing"
            value={summary.stats.failedProcessing}
            hint="In the selected period"
            icon={FiAlertTriangle}
            tone="error"
          />
        </div>
      )}

      {summary && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <ChartCard title="Upload trends" description="Documents added over time">
            <BarChart
              data={summary.uploadTrend}
              interval={summary.interval}
              valueSuffix=" documents"
            />
          </ChartCard>
          <ChartCard
            title="Document status"
            description="Completed, processing and failed documents"
          >
            <DoughnutChart
              data={summary.statusDistribution.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              centerLabel="documents"
            />
          </ChartCard>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Input
            label="Search documents"
            placeholder="File name or owner email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-32">
          <label className="mb-1.5 block text-sm font-medium text-text">Type</label>
          <Select
            aria-label="Filter by type"
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value="PDF">PDF</option>
            <option value="DOCX">DOCX</option>
            <option value="TXT">TXT</option>
          </Select>
        </div>
        <div className="w-40">
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
            <option value="COMPLETED">Completed</option>
            <option value="PROCESSING">Processing</option>
            <option value="FAILED">Failed</option>
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
            empty="No documents match these filters"
            columns={[
              {
                header: "Document",
                cell: (row) => (
                  <div className="min-w-0">
                    <Link
                      href={`/admin/documents/${row.id}`}
                      className="font-medium text-text hover:text-link hover:underline"
                    >
                      {row.originalName}
                    </Link>
                    <p className="truncate text-xs text-text-muted">
                      {row.user.email}
                    </p>
                  </div>
                ),
              },
              { header: "Type", cell: (row) => row.fileType },
              {
                header: "Size",
                cell: (row) => formatBytes(row.fileSize),
              },
              {
                header: "Status",
                cell: (row) => (
                  <StatusBadge tone={STATUS_TONE[row.processingStatus]}>
                    {row.processingStatus.toLowerCase()}
                  </StatusBadge>
                ),
              },
              {
                header: "Uploaded",
                cell: (row) => (
                  <span className="text-xs text-text-muted">
                    {formatRelative(row.createdAt)}
                  </span>
                ),
              },
              {
                header: "Actions",
                cell: (row) => (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/documents/${row.id}`}
                      className="text-sm font-medium text-link hover:underline"
                    >
                      View
                    </Link>
                    <Button
                      size="sm"
                      variant="danger"
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
          title="Delete document"
          description={`Delete "${confirm.originalName}" owned by ${confirm.user.email}? This also removes its analyses and conversations.`}
          confirmLabel="Delete document"
          successMessage="Document deleted"
          onConfirm={async () => {
            await api(`/admin/documents/${confirm.id}`, { method: "DELETE" });
            reload();
            analytics.reload();
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
