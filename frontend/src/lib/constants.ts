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

export const ALL_TASKS = Object.keys(TASK_LABELS) as TaskType[];

export const TASK_DESCRIPTIONS: Record<TaskType, string> = {
  SUMMARIZE: "A concise summary organized into sections.",
  EXTRACT_KEY_POINTS: "The most important points as a short list.",
  DOCUMENT_QA: "An answer to a question, based only on the document.",
  EXTRACT_DATA: "Names, dates, numbers, organizations and other details.",
  SIMPLIFY: "Difficult text explained in plain language.",
  TRANSLATE: "The document translated into another language.",
  EXTRACT_ACTION_ITEMS: "Tasks, deadlines and who is responsible.",
};

export const EXAMPLE_INSTRUCTIONS = [
  "Summarize this document.",
  "Give me a short summary and list all important dates.",
  "Find the important points.",
  "Explain this in simple English.",
  "Extract all dates and names.",
  "Find the action items.",
  "Translate this into Bangla.",
];
