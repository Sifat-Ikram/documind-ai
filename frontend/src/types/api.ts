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

export interface DocumentsListResponse {
  items: DocumentSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DocumentDetail extends DocumentSummary {
  updatedAt: string;
  fileUrl: string;
  _count: { analyses: number; conversations: number };
  textPreview: string;
  textLength: number;
  previewTruncated: boolean;
}

export interface ConversationListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export interface Detection {
  tasks: TaskType[];
  targetLanguage: string | null;
  confidence: number;
  usedFallback: boolean;
}

export interface AnalysisListItem {
  id: string;
  documentId: string;
  originalInstruction: string;
  detectedTasks: TaskType[];
  targetLanguage: string | null;
  usedFallback: boolean;
  createdAt: string;
  document: { id: string; originalName: string };
}

export interface AnalysesListResponse {
  items: AnalysisListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaskSection {
  task: TaskType;
  title: string;
  data?: unknown;
  error?: string;
}

export interface AnalysisDetail extends AnalysisListItem {
  result: { sections: TaskSection[]; notes: string[] };
}

export interface SummaryData {
  overview: string;
  sections: { heading: string; content: string }[];
  highlights: string[];
}
export interface KeyPointsData {
  points: string[];
}
export interface QaData {
  answer: string;
  found: boolean;
}
export interface ExtractedData {
  people: string[];
  organizations: string[];
  locations: string[];
  dates: { value: string; context: string }[];
  numbers: { value: string; context: string }[];
  other: { label: string; values: string[] }[];
}
export interface SimplifyData {
  simplified: string;
  glossary: { term: string; meaning: string }[];
}
export interface TranslateData {
  language: string;
  translation: string;
}
export interface ActionItemsData {
  items: {
    task: string;
    responsible: string | null;
    deadline: string | null;
    notes: string | null;
  }[];
  found: boolean;
}

export type ContextMode = "full" | "excerpts";

export interface ChatMessageDto {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

export interface ConversationMessages {
  conversation: { id: string; documentId: string; title: string };
  messages: ChatMessageDto[];
}
