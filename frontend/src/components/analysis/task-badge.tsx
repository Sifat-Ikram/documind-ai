import { TASK_LABELS } from "@/lib/constants";
import type { TaskType } from "@/types/api";

export function TaskBadge({ task }: { task: TaskType }) {
  return (
    <span className="inline-flex items-center rounded-full bg-ai-soft px-2 py-0.5 text-xs font-medium text-ai">
      {TASK_LABELS[task]}
    </span>
  );
}
