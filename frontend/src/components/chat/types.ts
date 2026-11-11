import type { ContextMode } from "@/types/api";

export interface UiMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  status?: "streaming" | "error" | "stopped";
  error?: string;
  contextMode?: ContextMode;
}
