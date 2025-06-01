// 統合機能の型定義
export interface IntegrationConfig {
  cursor: CursorLogConfig
  chatHistory: ChatHistoryConfig
  sync: SyncConfig
}

export interface CursorLogConfig {
  enabled: boolean
  watchPath: string
  logDir: string
  autoImport: boolean
  syncInterval: number
  batchSize: number
  retryAttempts: number
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
}

export interface SyncConfig {
  interval: number
  batchSize: number
  retryAttempts: number
}

export interface IntegratedLog {
  id: string
  timestamp: Date
  type: 'chat' | 'cursor'
  content: string
  metadata: {
    project?: string
    tags?: string[]
    source: string
  }
  relatedLogs?: string[]
}

export interface SearchRequest {
  query?: string
  types?: Array<'chat' | 'cursor'>
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
  projectId?: string
  tags?: string[]
}

export interface SearchResponse {
  results: IntegratedLog[]
  total: number
  hasMore: boolean
  searchTime: number
}

export interface AnalyticsRequest {
  startDate?: Date
  endDate?: Date
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly'
  types?: Array<'chat' | 'cursor'>
  projectId?: string
  tags?: string[]
}

export interface AnalyticsResponse {
  timeRange: {
    start: Date
    end: Date
  }
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
  summary: {
    totalLogs: number
    totalChats: number
    totalCursorLogs: number
    uniqueProjects: number
    uniqueTags: number
  }
  logsByType: {
    chat: number
    cursor: number
  }
  logsByProject: Record<string, number>
  logsByTag: Record<string, number>
  activityTimeline: Array<{
    timestamp: Date
    count: number
    type?: 'chat' | 'cursor'
  }>
  hourlyDistribution: Record<number, number>
  topKeywords: Array<{
    keyword: string
    frequency: number
    trend: 'up' | 'down' | 'stable'
  }>
  metrics: {
    messageCount: number[]
    sessionCount: number[]
    timestamps: string[]
  }
}

export interface SyncStatus {
  isActive: boolean
  lastSync: Date | null
  processedCount: number
  errorCount: number
  syncSpeed: number
}

export interface IntegrationStats {
  totalLogs: number
  cursorLogs: number
  chatLogs: number
  storageSize: string
  lastUpdate: Date
  syncStatus: SyncStatus
} 