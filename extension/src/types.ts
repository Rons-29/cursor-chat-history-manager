// Extension用の型定義
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    source?: string;
    fileName?: string;
    savedAt?: string;
    [key: string]: any;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  metadata?: {
    project?: string;
    source?: string;
    [key: string]: any;
  };
}

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  watchDirectories: string[];
  filePatterns: string[];
  maxSessionDuration: number;
  idleTimeout: number;
}

export interface ChatHistoryConfig {
  storageType: 'file' | 'memory';
  storagePath: string;
  maxSessions: number;
  maxMessagesPerSession: number;
  autoCleanup: boolean;
  cleanupDays: number;
  enableSearch: boolean;
  enableBackup: boolean;
  backupInterval: number;
  autoSave: AutoSaveConfig;
}

export interface AutoSaveStatus {
  enabled: boolean;
  running: boolean;
  saveCount: number;
  currentSessionId?: string;
  lastSaveTime?: Date;
}

export interface SessionStats {
  totalSessions: number;
  totalMessages: number;
  storageSize: number;
} 