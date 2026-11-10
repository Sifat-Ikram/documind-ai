import type { TaskType } from "@/types/api";

export const TASK_LABELS: Record<TaskType, string> = {
  SUMMARIZE: "Summarize",
  EXTRACT_KEY_POINTS: "Key points",
  DOCUMENT_QA: "Question",
  EXTRACT_DATA: "Extract data",
  SIMPLIFY: "Simplify",
  TRANSLATE: "Translate",
  EXTRACT_ACTION_ITEMS: "Action items",
};
