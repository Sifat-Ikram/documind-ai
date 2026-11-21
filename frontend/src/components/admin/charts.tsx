"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AdminInterval, SeriesPoint } from "@/types/admin";

const PALETTE = [
  "var(--primary)",
  "var(--ai)",
  "var(--success)",
  "var(--warning)",
  "var(--error)",
  "var(--file-docx)",
];

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 44 };

function labelFor(bucket: string, interval: AdminInterval): string {
  const date = new Date(`${bucket}T00:00:00Z`);
  if (interval === "month") {
    return date.toLocaleDateString("en", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
  }
  return date.toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  if (value <= 4) return 4;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const scaled = value / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * power;
}

function ticks(max: number): number[] {
  return [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
}

function axisLabels(data: SeriesPoint[]) {
  if (data.length === 0) return [];
  const max = Math.min(6, data.length);
  const step = Math.max(1, Math.ceil(data.length / max));
  return data
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index % step === 0 || index === data.length - 1)
    .filter(
      (item, i, list) => list.findIndex((l) => l.point.bucket === item.point.bucket) === i,
    );
}

interface ChartProps {
  data: SeriesPoint[];
  interval: AdminInterval;
  color?: string;
  valueSuffix?: string;
  className?: string;
}

export function LineChart({
  data,
  interval,
  color = "var(--primary)",
  valueSuffix = "",
  className,
}: ChartProps) {
  const gradientId = useId();
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) =>
    PAD.left + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;

  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const labels = axisLabels(data);
  const empty = data.every((d) => d.value === 0);

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-56 w-full"
        role="img"
        aria-label="Line chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks(max).map((tick, tickIndex) => (
          <g key={`${tick}-${tickIndex}`}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              className="fill-[var(--text-muted)] text-[10px]"
            >
              {tick.toLocaleString("en")}
            </text>
          </g>
        ))}
        {data.length > 1 && (
          <>
            <polygon
              points={`${PAD.left},${PAD.top + innerH} ${points} ${WIDTH - PAD.right},${PAD.top + innerH}`}
              fill={`url(#${gradientId})`}
            />
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        {data.map((point, index) => (
          <circle
            key={point.bucket}
            cx={x(index)}
            cy={y(point.value)}
            r="3"
            fill="var(--surface)"
            stroke={color}
            strokeWidth="2"
          >
            <title>{`${labelFor(point.bucket, interval)}: ${point.value.toLocaleString("en")}${valueSuffix}`}</title>
          </circle>
        ))}
        {labels.map(({ point, index }) => (
          <text
            key={point.bucket}
            x={x(index)}
            y={HEIGHT - 8}
            textAnchor={
              index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"
            }
            className="fill-[var(--text-muted)] text-[10px]"
          >
            {labelFor(point.bucket, interval)}
          </text>
        ))}
      </svg>
      {empty && (
        <p className="-mt-24 mb-16 text-center text-xs text-text-muted">
          No activity in this period
        </p>
      )}
    </div>
  );
}

export function BarChart({
  data,
  interval,
  color = "var(--primary)",
  valueSuffix = "",
  className,
}: ChartProps) {
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = data.length === 0 ? innerW : innerW / data.length;
  const barWidth = Math.max(2, Math.min(38, slot * 0.55));
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;
  const labels = axisLabels(data);

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-56 w-full"
        role="img"
        aria-label="Bar chart"
      >
        {ticks(max).map((tick, tickIndex) => (
          <g key={`${tick}-${tickIndex}`}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              className="fill-[var(--text-muted)] text-[10px]"
            >
              {tick.toLocaleString("en")}
            </text>
          </g>
        ))}
        {data.map((point, index) => {
          const height = Math.max(0, PAD.top + innerH - y(point.value));
          const x = PAD.left + slot * index + (slot - barWidth) / 2;
          return (
            <rect
              key={point.bucket}
              x={x}
              y={y(point.value)}
              width={barWidth}
              height={height}
              rx="3"
              fill={color}
              opacity={point.value === 0 ? 0.18 : 0.9}
            >
              <title>{`${labelFor(point.bucket, interval)}: ${point.value.toLocaleString("en")}${valueSuffix}`}</title>
            </rect>
          );
        })}
        {labels.map(({ point, index }) => (
          <text
            key={point.bucket}
            x={PAD.left + slot * index + slot / 2}
            y={HEIGHT - 8}
            textAnchor={
              index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"
            }
            className="fill-[var(--text-muted)] text-[10px]"
          >
            {labelFor(point.bucket, interval)}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function DoughnutChart({
  data,
  centerLabel,
  className,
}: {
  data: { label: string; value: number }[];
  centerLabel: string;
  className?: string;
}) {
  const visible = data.filter((d) => d.value > 0);
  const total = visible.reduce((sum, d) => sum + d.value, 0);
  const radius = 56;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;
  const segments = visible.map((item, index) => {
    const before = visible
      .slice(0, index)
      .reduce((totalValue, entry) => totalValue + entry.value, 0);
    const length = (item.value / total) * circumference;
    return {
      item,
      color: PALETTE[index % PALETTE.length],
      dash: `${Math.max(0, length - 3)} ${circumference - Math.max(0, length - 3)}`,
      offset: (before / total) * circumference,
    };
  });

  return (
    <div className={cn("flex flex-col items-center gap-5 sm:flex-row", className)}>
      <svg
        viewBox="0 0 160 160"
        className="size-40 shrink-0"
        role="img"
        aria-label="Doughnut chart"
      >
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth={stroke}
        />
        {segments.map(({ item, color, dash, offset }) => (
          <circle
            key={item.label}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform="rotate(-90 80 80)"
          >
            <title>{`${item.label}: ${item.value.toLocaleString("en")}`}</title>
          </circle>
        ))}
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-[var(--text)] text-[18px] font-semibold"
        >
          {total.toLocaleString("en")}
        </text>
        <text
          x="80"
          y="94"
          textAnchor="middle"
          className="fill-[var(--text-muted)] text-[9px]"
        >
          {centerLabel}
        </text>
      </svg>
      <ul className="w-full space-y-2">
        {visible.length === 0 && (
          <li className="text-sm text-text-muted">No data in this period</li>
        )}
        {visible.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: PALETTE[index % PALETTE.length] }}
            />
            <span className="truncate text-text">{item.label}</span>
            <span className="ml-auto tabular-nums text-text-muted">
              {item.value.toLocaleString("en")}
              <span className="ml-1 text-xs">
                ({Math.round((item.value / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CategoryBars({
  data,
  suffix = "",
  color = "var(--primary)",
}: {
  data: { label: string; value: number }[];
  suffix?: string;
  color?: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 0);
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-text-muted">No data yet</p>;
  }
  return (
    <ul className="space-y-3">
      {data.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-text">{item.label}</span>
            <span className="shrink-0 tabular-nums text-text-muted">
              {item.value.toLocaleString("en")}
              {suffix}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: max === 0 ? "0%" : `${Math.max(2, (item.value / max) * 100)}%`,
                background: color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 shadow-sm",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-text">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-text-muted">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
