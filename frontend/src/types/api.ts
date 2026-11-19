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
    archived: number;
    trashed: number;
  };
  recentDocuments: DocumentSummary[];
  recentActivity: ActivityItem[];
  byCategory: {
    slug: string;
    name: string;
    icon: string | null;
    count: number;
  }[];
}

export interface DocumentsListResponse {
  items: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
}

export interface TagRef {
  id: string;
  name: string;
}

export interface CollectionRef {
  id: string;
  name: string;
}

export type DocRole = "OWNER" | "EDITOR" | "VIEWER";

export interface PersonRef {
  id: string;
  name: string;
}

export interface DocumentListItem extends DocumentSummary {
  updatedAt: string;
  archivedAt: string | null;
  currentVersion: number;
  source: "UPLOAD" | "GENERATED";
  category: Category | null;
  isFavorite: boolean;
  tags: TagRef[];
  collections: CollectionRef[];
}

export interface TagItem {
  id: string;
  name: string;
  documentCount: number;
}

export interface CollectionItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  memberCount: number;
  isOwner: boolean;
  myRole: DocRole;
  owner: PersonRef;
}

export interface TrashedDocument {
  id: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  wordCount: number;
  currentVersion: number;
  createdAt: string;
  trashedAt: string;
  purgeAt: string;
  daysLeft: number;
}

export interface RecentDocument extends DocumentListItem {
  lastAccessedAt: string;
  owner: PersonRef;
  myRole: DocRole;
}

export interface CollectionDocument extends DocumentListItem {
  owner: PersonRef;
  myRole: DocRole;
}

export interface BulkResult {
  action: string;
  requested: number;
  processed: number;
  skipped: number;
  files?: { id: string; fileName: string; url: string; fileSize: number }[];
}

export interface DocumentDetail extends DocumentListItem {
  fileUrl: string;
  owner: PersonRef;
  myRole: DocRole;
  myShareId: string | null;
  textPreview: string;
  textLength: number;
  previewTruncated: boolean;
  _count: { analyses: number; conversations: number };
}

export interface VersionItem {
  version: number;
  title: string;
  createdAt: string;
  createdBy: PersonRef | null;
  fileSize: number;
  wordCount: number;
  fileType: FileType;
  note: string | null;
  isCurrent: boolean;
}

export interface VersionDetail {
  version: number;
  isCurrent: boolean;
  title: string;
  fileType: FileType;
  fileUrl: string;
  fileSize: number;
  wordCount: number;
  createdAt: string;
  note: string | null;
  text: string;
  textLength: number;
  truncated: boolean;
}

export interface VersionCompare {
  from: { version: number; title: string; createdAt: string };
  to: { version: number; title: string; createdAt: string };
  stats: { addedLines: number; removedLines: number };
  changes: { type: "added" | "removed" | "equal"; text: string }[];
}

export interface ShareEntry {
  id: string;
  role: "VIEWER" | "EDITOR";
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface ShareList {
  owner: { id: string; name: string; email: string } | null;
  shares: ShareEntry[];
}

export interface CollectionMemberItem {
  role: "VIEWER" | "EDITOR";
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  author: PersonRef;
  canEdit: boolean;
  canDelete: boolean;
}

export interface NoteData {
  content: string;
  revision: number;
  updatedAt: string | null;
  updatedBy: PersonRef | null;
}

export interface SharedDocument extends DocumentListItem {
  owner: PersonRef;
  myRole: DocRole;
  shareId: string | null;
}
