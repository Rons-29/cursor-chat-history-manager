export interface ChatMessage {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    projectId?: number;
    issueId?: number;
    userId?: number;
    sessionId?: string;
    tags?: string[];
    attachments?: string[];
  };
}

export interface ChatSession {
  id: string;
  title?: string;
  startTime: Date;
  endTime?: Date;
  messages: ChatMessage[];
  metadata?: {
    projectId?: number;
    userId?: number;
    tags?: string[];
    summary?: string;
    totalMessages?: number;
    source?: string;
    taskId?: string;
    projectPath?: string;
    importedAt?: string;
  };
}

export interface ChatHistoryFilter {
  sessionId?: string;
  projectId?: number;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  keyword?: string;
  role?: 'user' | 'assistant' | 'system';
  limit?: number;
  offset?: number;
}

export interface ChatHistorySearchResult {
  sessions: ChatSession[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number; // 分単位
  watchDirectories: string[];
  filePatterns: string[];
  maxSessionDuration: number; // 分単位
  idleTimeout: number; // 分単位
}

export interface AutoSaveStatus {
  isRunning: boolean;
  lastSaveTime: Date | null;
  currentSessionId: string | null;
  watchedFiles: string[];
  saveCount: number;
}

export interface ChatHistoryConfig {
  storageType: 'file' | 'database';
  storagePath: string;
  maxSessions?: number;
  maxMessagesPerSession?: number;
  autoCleanup?: boolean;
  cleanupDays?: number;
  enableSearch?: boolean;
  enableBackup?: boolean;
  backupInterval?: number; // hours
  autoSave?: AutoSaveConfig;
}

export interface ChatHistoryStats {
  totalSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
  oldestSession?: Date;
  newestSession?: Date;
  storageSize: number; // bytes
}

// 既存のMessage型をChatMessageのエイリアスとして追加
export type Message = ChatMessage; 