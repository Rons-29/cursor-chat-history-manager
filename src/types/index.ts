export interface ChatMessage {
  id: string
  timestamp: Date
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: {
    projectId?: number
    issueId?: number
    userId?: number
    sessionId?: string
    tags?: string[]
    attachments?: string[]
    source?: string
    originalTimestamp?: string
  }
}

export interface ChatSession {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  startTime: Date
  endTime?: Date
  messages: ChatMessage[]
  tags: string[]
  metadata?: {
    projectId?: number
    userId?: number
    summary?: string
    totalMessages?: number
    source?: string
    taskId?: string
    projectPath?: string
    importedAt?: string
    originalCreatedAt?: string
    originalUpdatedAt?: string
    tags?: string[]
  }
}

export interface ChatHistoryFilter {
  sessionId?: string
  projectId?: number
  userId?: number
  startDate?: Date
  endDate?: Date
  tags?: string[]
  keyword?: string
  role?: 'user' | 'assistant' | 'system'
  limit?: number
  offset?: number
}

export interface ChatHistorySearchResult {
  sessions: ChatSession[]
  totalCount: number
  hasMore: boolean
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
  storageType: 'file' | 'database'
  maxSessions?: number
  maxMessagesPerSession?: number
  autoCleanup?: boolean
  cleanupDays?: number
  enableSearch?: boolean
  enableBackup?: boolean
  backupInterval?: number // hours
  autoSave?: AutoSaveConfig
  cursor?: {
    enabled: boolean
    watchPath?: string
    autoImport: boolean
  }
}

export interface ChatHistoryStats {
  totalSessions: number
  totalMessages: number
  thisMonthMessages: number
  activeProjects: number
  storageSize: string
  lastActivity?: Date
  averageMessagesPerSession: number
  oldestSession?: Date
  newestSession?: Date
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

// WebUIで使用される統計データ型
export interface SystemStats {
  totalSessions: number
  totalMessages: number
  thisMonthMessages: number
  activeProjects: number
  storageSize: string
  lastActivity?: string
}
