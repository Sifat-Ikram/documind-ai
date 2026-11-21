export type AdminRange = "7d" | "30d" | "90d" | "12m";
export type AdminInterval = "day" | "week" | "month";

export interface SeriesPoint {
  bucket: string;
  value: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminPerson {
  id: string;
  name: string;
  email: string;
}

export interface AiFeatureBreakdown {
  key: string;
  label: string;
  requests: number;
  tokens: number;
}

export interface AdminOverview {
  range: AdminRange;
  interval: AdminInterval;
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalDocuments: number;
    totalAiRequests: number;
    totalTokens: number;
    newUsers: number;
  };
  userGrowth: SeriesPoint[];
  documentUploads: SeriesPoint[];
  aiDistribution: { key: string; label: string; requests: number; tokens: number }[];
  recentActivities: {
    id: string;
    type: "document" | "analysis" | "registration" | "feedback";
    title: string;
    description?: string;
    user: AdminPerson | null;
    at: string;
  }[];
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  isBlocked: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  documentCount: number;
  analysisCount: number;
  generationCount: number;
}

export interface AdminUsersStats {
  range: AdminRange;
  interval: AdminInterval;
  registrationTrend: SeriesPoint[];
  statusDistribution: { key: string; label: string; value: number }[];
  stats: {
    newUsers: number;
    activeUsers: number;
    blockedUsers: number;
    admins: number;
  };
}

export interface AdminUserDetail {
  user: AdminUserRow & {
    blockedAt: string | null;
    analysisCount: number;
    conversationCount: number;
    generationCount: number;
    feedbackCount: number;
  };
  overview: {
    storageBytes: number;
    aiRequests: number;
    aiTokens: number;
    activeSessions: number;
  };
  recentDocuments: {
    id: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
    trashedAt: string | null;
  }[];
  recentAnalyses: {
    id: string;
    originalInstruction: string;
    createdAt: string;
    document: { id: string; originalName: string };
  }[];
  recentFeedback: {
    id: string;
    type: "FEEDBACK" | "BUG_REPORT";
    subject: string;
    status: "OPEN" | "IN_REVIEW" | "RESOLVED";
    createdAt: string;
  }[];
}

export interface AdminDocumentRow {
  id: string;
  originalName: string;
  fileType: "PDF" | "DOCX" | "TXT";
  fileSize: number;
  wordCount: number;
  source: "UPLOAD" | "GENERATED";
  processingStatus: "PROCESSING" | "COMPLETED" | "FAILED";
  currentVersion: number;
  createdAt: string;
  archivedAt: string | null;
  trashedAt: string | null;
  user: AdminPerson;
}

export interface AdminDocumentsAnalytics {
  range: AdminRange;
  interval: AdminInterval;
  uploadTrend: SeriesPoint[];
  statusDistribution: { key: string; label: string; value: number }[];
  stats: { totalDocuments: number; storageBytes: number; failedProcessing: number };
}

export interface AdminDocumentDetail {
  document: AdminDocumentRow & {
    fileUrl: string;
    updatedAt: string;
    analysisCount: number;
    conversationCount: number;
    versionCount: number;
    shareCount: number;
    textLength: number;
    textPreview: string;
    user: AdminPerson & { isBlocked: boolean; createdAt: string };
  };
  recentAnalyses: {
    id: string;
    originalInstruction: string;
    detectedTasks: string[];
    createdAt: string;
    user: AdminPerson;
  }[];
  recentConversations: {
    id: string;
    title: string;
    updatedAt: string;
    _count: { messages: number };
    user: AdminPerson;
  }[];
}

export interface AdminAiAnalytics {
  range: AdminRange;
  interval: AdminInterval;
  stats: {
    totalRequests: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    successRate: number | null;
  };
  featureUsage: AiFeatureBreakdown[];
  usageTrend: SeriesPoint[];
  tokenTrend: SeriesPoint[];
  distribution: { key: string; label: string; value: number }[];
}

export interface AdminSystemAnalytics {
  range: AdminRange;
  interval: AdminInterval;
  stats: {
    activeUsers: number;
    totalUsers: number;
    newUsers: number;
    documents: number;
    aiRequests: number;
  };
  activeUsersTrend: SeriesPoint[];
  userGrowth: SeriesPoint[];
  documentUploads: SeriesPoint[];
  aiRequestsTrend: SeriesPoint[];
  engagement: { key: string; label: string; value: number }[];
}

export type StatusLevel = "operational" | "degraded" | "down";

export interface AdminMonitoring {
  range: AdminRange;
  interval: AdminInterval;
  statuses: {
    api: { status: StatusLevel; detail: string; errorRate: number; avgLatency: number };
    aiProvider: {
      status: StatusLevel;
      detail: string;
      successRate: number | null;
      lastErrorAt: string | null;
      lastError: string | null;
    };
    server: {
      status: StatusLevel;
      detail: string;
      uptimeSeconds: number;
      database: string;
    };
  };
  stats: { requests: number; errors: number; avgLatency: number };
  responseTime: SeriesPoint[];
  errorTrend: SeriesPoint[];
  recentErrors: {
    id: string;
    method: string;
    path: string;
    status: number;
    durationMs: number;
    createdAt: string;
  }[];
  failedProcessing: {
    id: string;
    fileName: string;
    fileType: string | null;
    reason: string;
    createdAt: string;
    user: AdminPerson | null;
  }[];
}

export interface AdminFeedbackRow {
  id: string;
  type: "FEEDBACK" | "BUG_REPORT";
  subject: string;
  message: string;
  rating: number | null;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED";
  createdAt: string;
  handledAt: string | null;
  user: AdminPerson | null;
}

export interface AdminFeedbackStats {
  stats: {
    totalFeedback: number;
    pendingFeedback: number;
    bugReports: number;
    contactMessages: number;
    pendingMessages: number;
  };
  statusDistribution: { key: string; label: string; value: number }[];
}

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  isBlocked: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}
