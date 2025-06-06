export interface ChatMessage {
  id: string
  timestamp: Date
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: {
    project?: string
    tags?: string[]
    attachments?: string[]
    source?: string
    originalTimestamp?: string
  }
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  startTime: Date
  endTime?: Date
  tags: string[]
  metadata?: SessionMetadata
}

export interface ChatHistoryFilter {
  keyword?: string
  query?: string // 検索用クエリ
  tags?: string[]
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
  limit?: number
}

export interface ChatHistorySearchResult {
  sessions: ChatSession[]
  total: number
  hasMore: boolean
  page: number
  pageSize: number
  totalCount: number
  currentPage: number
  totalPages: number
}

export interface AutoSaveConfig {
  enabled: boolean
  interval: number // 分単位
  watchDirectories: string[]
  filePatterns: string[]
  maxSessionDuration: number // ミリ秒
  idleTimeout: number // ミリ秒
}

export interface AutoSaveStatus {
  isActive: boolean
  lastSaveTime: Date | null
  currentSessionId: string | null
  currentSession?: ChatSession | null
  watchedFiles: string[]
  saveCount: number
}

export interface ChatHistoryConfig {
  storagePath: string
  maxSessions: number
  maxMessagesPerSession: number
  autoCleanup: boolean
  cleanupDays: number
  enableSearch: boolean
  enableBackup: boolean
  backupInterval: number
  autoSave?: AutoSaveConfig
  cursor?: {
    enabled: boolean
    autoImport: boolean
    watchPath?: string
    logDir?: string
    syncInterval?: number
    batchSize?: number
    retryAttempts?: number
  }
  storageType?: 'file' | 'database'
}

export interface ChatHistoryStats {
  totalSessions: number
  totalMessages: number
  totalSize: number
  storageSize: number
  thisMonthMessages: number
  activeProjects: number
  averageMessagesPerSession: number
  tagDistribution: Record<string, number>
  lastUpdated: Date
  lastActivity: Date | null
  oldestSession: Date | null
  newestSession: Date | null
}

export interface UsageStats {
  averageSessionLength: number
  averageMessagesPerSession: number
  mostActiveHour: number
  topTags: string[]
  weeklyActivity?: Array<{
    day: string
    sessions: number
    messages: number
  }>
}

// エクスポート形式
export type ExportFormat = 'json' | 'markdown' | 'txt'

// 既存のMessage型をChatMessageのエイリアスとして追加
export type Message = ChatMessage

// SessionSearchResult型を追加
export interface SessionSearchResult {
  sessions: ChatSession[]
  totalCount: number
  hasMore: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

// SessionMetadata型を追加
export interface SessionMetadata {
  project?: string
  source?: string
  summary?: string
  description?: string
  status?: 'active' | 'archived' | 'deleted'
  tags?: string[]
  totalMessages?: number
  taskId?: string
  cursorId?: string
  // Cursor Chat Import用の追加プロパティ
  fileHash?: string
  importDate?: string
  exportDate?: string
  originalFormat?: 'markdown' | 'text' | 'json'
  messageCount?: number
  estimatedDuration?: number
  // Phase 2: バックアップデータ統合用プロパティ
  originalPath?: string
}

// WebUIで使用される統計データ型
export interface SystemStats {
  totalSessions: number
  totalMessages: number
  thisMonthMessages: number
  activeProjects: number
  storageSize: string
  lastActivity?: string
}
