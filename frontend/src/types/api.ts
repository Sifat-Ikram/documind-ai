export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type TaskType =
  | "SUMMARIZE"
  | "EXTRACT_KEY_POINTS"
  | "DOCUMENT_QA"
  | "EXTRACT_DATA"
  | "SIMPLIFY"
  | "TRANSLATE"
  | "EXTRACT_ACTION_ITEMS";

export type FileType = "PDF" | "DOCX" | "TXT";

export interface DocumentSummary {
  id: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  wordCount: number;
  createdAt: string;
}

export interface ActivityItem {
  type: "analysis" | "chat";
  id: string;
  documentId: string;
  documentName: string;
  title: string;
  tasks: TaskType[];
  at: string;
}

export interface DashboardResponse {
  stats: {
    documents: number;
    analyses: number;
    conversations: number;
    storageBytes: number;
  };
  recentDocuments: DocumentSummary[];
  recentActivity: ActivityItem[];
}
