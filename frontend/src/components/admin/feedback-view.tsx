"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FiAlertTriangle,
  FiInbox,
  FiMessageSquare,
  FiSend,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/utils";
import type {
  AdminContactMessage,
  AdminFeedbackRow,
  AdminFeedbackStats,
  Paged,
} from "@/types/admin";
import {
  AdminTable,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "./admin-ui";
import { ChartCard, DoughnutChart } from "./charts";
import {
  buildQuery,
  useAdminData,
  useDebounced,
} from "./use-admin-data";

type Tab = "feedback" | "bugs" | "contact";

const STATUS_TONE = {
  OPEN: "warning",
  IN_REVIEW: "info",
  RESOLVED: "success",
} as const;

export function AdminFeedbackView() {
  const [tab, setTab] = useState<Tab>("feedback");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState("");
  const [confirmFeedback, setConfirmFeedback] = useState<AdminFeedbackRow | null>(
    null,
  );
  const [confirmMessage, setConfirmMessage] =
    useState<AdminContactMessage | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const stats = useAdminData<AdminFeedbackStats>("/admin/feedback/stats");

  const feedbackPath = `/admin/feedback${buildQuery({
    page,
    limit: 10,
    search: debounced || undefined,
    type: tab === "bugs" ? "BUG_REPORT" : tab === "feedback" ? "FEEDBACK" : undefined,
    status: status || undefined,
  })}`;
  const contactPath = `/admin/contact-messages${buildQuery({
    page,
    limit: 10,
    search: debounced || undefined,
  })}`;

  const feedback = useAdminData<Paged<AdminFeedbackRow>>(
    tab === "contact" ? null : feedbackPath,
  );
  const contact = useAdminData<Paged<AdminContactMessage>>(
    tab === "contact" ? contactPath : null,
  );

  async function updateStatus(row: AdminFeedbackRow, next: string) {
    setBusyId(row.id);
    try {
      await api(`/admin/feedback/${row.id}/status`, {
        method: "PATCH",
        body: { status: next },
      });
      toast.success("Feedback status updated");
      feedback.reload();
      stats.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleRead(row: AdminContactMessage) {
    setBusyId(row.id);
    try {
      await api(
        `/admin/contact-messages/${row.id}/${row.readAt ? "unread" : "read"}`,
        { method: "PATCH" },
      );
      toast.success(row.readAt ? "Marked as pending" : "Marked as read");
      contact.reload();
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
        title="Feedback & Support"
        description="User feedback, bug reports and contact messages."
      />

      {summary && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total feedback"
            value={summary.stats.totalFeedback}
            icon={FiMessageSquare}
            tone="info"
          />
          <StatCard
            label="Pending feedback"
            value={summary.stats.pendingFeedback}
            hint="Open or in review"
            icon={FiSend}
            tone="warning"
          />
          <StatCard
            label="Bug reports"
            value={summary.stats.bugReports}
            icon={FiAlertTriangle}
            tone="error"
          />
          <StatCard
            label="Pending messages"
            value={summary.stats.pendingMessages}
            hint={`${summary.stats.contactMessages.toLocaleString("en")} contact messages in total`}
            icon={FiInbox}
            tone="success"
          />
        </div>
      )}

      {summary && (
        <div className="mb-4">
          <ChartCard
            title="Feedback status distribution"
            description="Where feedback currently stands"
          >
            <DoughnutChart
              data={summary.statusDistribution.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              centerLabel="feedback"
            />
          </ChartCard>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <SegmentedControl<Tab>
          label="Feedback section"
          value={tab}
          onChange={(value) => {
            setTab(value);
            setStatus("");
            setPage(1);
          }}
          options={[
            { value: "feedback", label: "User feedback", icon: FiMessageSquare },
            { value: "bugs", label: "Bug reports", icon: FiAlertTriangle },
            { value: "contact", label: "Contact messages", icon: FiInbox },
          ]}
        />
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-56">
            <Input
              label="Search"
              placeholder={tab === "contact" ? "Name, email or subject" : "Subject or message"}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          {tab !== "contact" && (
            <div className="w-40">
              <label className="mb-1.5 block text-sm font-medium text-text">
                Status
              </label>
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_REVIEW">In review</option>
                <option value="RESOLVED">Resolved</option>
              </Select>
            </div>
          )}
        </div>
      </div>

      {tab === "contact" ? (
        contact.error ? (
          <ErrorState error={contact.error} onRetry={contact.reload} />
        ) : !contact.data ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : (
          <>
            <AdminTable
              loading={contact.loading}
              rows={contact.data.items}
              rowKey={(row) => row.id}
              empty="No contact messages yet"
              columns={[
                {
                  header: "From",
                  cell: (row) => (
                    <div className="min-w-0">
                      <p className="font-medium text-text">{row.name}</p>
                      <p className="truncate text-xs text-text-muted">{row.email}</p>
                    </div>
                  ),
                },
                {
                  header: "Message",
                  cell: (row) => (
                    <div className="max-w-[380px]">
                      <p className="font-medium text-text">{row.subject}</p>
                      <p className="line-clamp-2 text-xs text-text-muted">
                        {row.message}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  cell: (row) => (
                    <StatusBadge tone={row.readAt ? "success" : "warning"}>
                      {row.readAt ? "Read" : "Pending"}
                    </StatusBadge>
                  ),
                },
                {
                  header: "Received",
                  cell: (row) => (
                    <span className="text-xs text-text-muted">
                      {formatDateTime(row.createdAt)}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  cell: (row) => (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busyId === row.id}
                        onClick={() => toggleRead(row)}
                      >
                        {row.readAt ? "Mark pending" : "Mark read"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setConfirmMessage(row)}
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
            <Pagination
              page={contact.data.page}
              totalPages={contact.data.totalPages}
              onChange={setPage}
            />
          </>
        )
      ) : feedback.error ? (
        <ErrorState error={feedback.error} onRetry={feedback.reload} />
      ) : !feedback.data ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <>
          <AdminTable
            loading={feedback.loading}
            rows={feedback.data.items}
            rowKey={(row) => row.id}
            empty={
              tab === "bugs" ? "No bug reports" : "No feedback has been sent yet"
            }
            columns={[
              {
                header: "From",
                cell: (row) => (
                  <div className="min-w-0">
                    <p className="font-medium text-text">
                      {row.user?.name ?? "Deleted user"}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {row.user?.email ?? "—"}
                    </p>
                  </div>
                ),
              },
              {
                header: "Feedback",
                cell: (row) => (
                  <div className="max-w-[380px]">
                    <p className="font-medium text-text">{row.subject}</p>
                    <p className="line-clamp-2 text-xs text-text-muted">
                      {row.message}
                    </p>
                    {row.rating !== null && (
                      <p className="text-xs text-text-muted">Rating: {row.rating}/5</p>
                    )}
                  </div>
                ),
              },
              {
                header: "Status",
                cell: (row) => (
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={STATUS_TONE[row.status]}>
                      {row.status.replace("_", " ").toLowerCase()}
                    </StatusBadge>
                  </div>
                ),
              },
              {
                header: "Received",
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
                    <div className="w-36">
                      <Select
                        aria-label={`Status for ${row.subject}`}
                        value={row.status}
                        disabled={busyId === row.id}
                        onChange={(event) => updateStatus(row, event.target.value)}
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_REVIEW">In review</option>
                        <option value="RESOLVED">Resolved</option>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setConfirmFeedback(row)}
                    >
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination
            page={feedback.data.page}
            totalPages={feedback.data.totalPages}
            onChange={setPage}
          />
        </>
      )}

      {summary && !summary.stats.totalFeedback && (
        <Panel className="mt-4">
          <p className="text-center text-sm text-text-muted">
            Feedback appears here once users submit it through the feedback endpoint.
          </p>
        </Panel>
      )}

      {confirmFeedback && (
        <ConfirmModal
          title="Delete feedback"
          description={`Delete "${confirmFeedback.subject}" permanently?`}
          confirmLabel="Delete feedback"
          successMessage="Feedback deleted"
          onConfirm={async () => {
            await api(`/admin/feedback/${confirmFeedback.id}`, { method: "DELETE" });
            feedback.reload();
            stats.reload();
          }}
          onClose={() => setConfirmFeedback(null)}
        />
      )}

      {confirmMessage && (
        <ConfirmModal
          title="Delete message"
          description={`Delete the message from ${confirmMessage.email} permanently?`}
          confirmLabel="Delete message"
          successMessage="Message deleted"
          onConfirm={async () => {
            await api(`/admin/contact-messages/${confirmMessage.id}`, {
              method: "DELETE",
            });
            contact.reload();
            stats.reload();
          }}
          onClose={() => setConfirmMessage(null)}
        />
      )}
    </div>
  );
}
