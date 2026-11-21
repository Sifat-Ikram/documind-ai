"use client";

import { Select } from "@/components/ui/select";
import type { AdminInterval, AdminRange } from "@/types/admin";

const RANGES: { value: AdminRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

const INTERVALS: { value: AdminInterval; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

export function RangeFilter({
  range,
  interval,
  onRangeChange,
  onIntervalChange,
}: {
  range: AdminRange;
  interval: AdminInterval;
  onRangeChange: (value: AdminRange) => void;
  onIntervalChange: (value: AdminInterval) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-40">
        <Select
          containerClassName="min-w-0"
          aria-label="Date range"
          value={range}
          onChange={(event) => onRangeChange(event.target.value as AdminRange)}
        >
          {RANGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-36">
        <Select
          containerClassName="min-w-0"
          aria-label="Group by"
          value={interval}
          onChange={(event) =>
            onIntervalChange(event.target.value as AdminInterval)
          }
        >
          {INTERVALS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
