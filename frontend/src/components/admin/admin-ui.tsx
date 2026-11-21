"use client";

import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { cn } from "@/lib/cn";

const TONES = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  error: "bg-error-soft text-error-text",
  info: "bg-primary-soft text-link",
  muted: "bg-surface-muted text-text-muted",
} as const;

export type Tone = keyof typeof TONES;

export function StatusBadge({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "info",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconType;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-lg", TONES[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-text tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en") : value}
      </p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty = "Nothing to show yet",
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: string;
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/60">
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="border-b border-border">
                  {columns.map((column) => (
                    <td key={column.header} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-text-muted"
                >
                  {empty}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-border last:border-0 hover:bg-surface-muted/40"
                >
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={cn("px-4 py-3 align-middle text-text", column.className)}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </div>
  );
}

export function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className={tone === "muted" ? "text-text-muted" : "text-text-muted"}>
        {label}
      </span>
      <span className="font-medium text-text tabular-nums">{value}</span>
    </div>
  );
}

export function Panel({
  title,
  children,
  actions,
  className,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 shadow-sm",
        className,
      )}
    >
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-text">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
