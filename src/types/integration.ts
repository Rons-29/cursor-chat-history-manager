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
  storageSize: number
  lastUpdate: Date
  syncStatus: SyncStatus
}

// 検索オプション（IntegrationServiceで使用）
export interface IntegrationSearchOptions {
  query?: string
  types?: Array<'chat' | 'cursor'>
  timeRange?: {
    start: Date
    end: Date
  }
  project?: string
  tags?: string[]
  pageSize?: number
  offset?: number
}

// 分析リクエスト（IntegrationServiceで使用）
export interface IntegrationAnalyticsRequest {
  startDate?: Date
  endDate?: Date
  timeRange: {
    start: Date
    end: Date
  }
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
  groupBy?: 'day' | 'week' | 'month'
  metrics: string[]
  types?: Array<'chat' | 'cursor'>
  project?: string
  projectId?: string
  tags?: string[]
}

// 分析レスポンス型（IntegrationServiceで使用）
export interface IntegrationAnalyticsResponse {
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

// エラー型（IntegrationServiceで使用）
export interface IntegrationError {
  code: string
  message: string
  timestamp: Date
  details?: any
  context?: Record<string, any>
}

// バリデーションスキーマ（APIで使用）
export const IntegrationSearchRequestSchema = {
  parse: (data: any): IntegrationSearchOptions => {
    // 簡単なバリデーション
    const validated: IntegrationSearchOptions = {}
    
    if (data.q && typeof data.q === 'string') {
      validated.query = data.q
    }
    
    if (data.types && typeof data.types === 'string') {
      validated.types = data.types.split(',') as Array<'chat' | 'cursor'>
    }
    
    if (data.startDate && data.endDate) {
      validated.timeRange = {
        start: new Date(data.startDate),
        end: new Date(data.endDate)
      }
    }
    
    if (data.project && typeof data.project === 'string') {
      validated.project = data.project
    }
    
    if (data.tags && typeof data.tags === 'string') {
      validated.tags = data.tags.split(',')
    }
    
    if (data.limit && typeof data.limit === 'number') {
      validated.pageSize = Math.min(Math.max(data.limit, 1), 1000)
    }
    
    if (data.offset && typeof data.offset === 'number') {
      validated.offset = Math.max(data.offset, 0)
    }
    
    return validated
  }
}

export const IntegrationAnalyticsRequestSchema = {
  parse: (data: any): IntegrationAnalyticsRequest => {
    // デフォルト値
    const timeRange = {
      start: data.startDate ? new Date(data.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: data.endDate ? new Date(data.endDate) : new Date()
    }
    
    const validated: IntegrationAnalyticsRequest = {
      timeRange,
      granularity: ['hourly', 'daily', 'weekly', 'monthly'].includes(data.granularity) 
        ? data.granularity : 'daily',
      metrics: data.metrics && typeof data.metrics === 'string' 
        ? data.metrics.split(',') : ['messageCount', 'sessionCount']
    }
    
    if (data.project && typeof data.project === 'string') {
      validated.project = data.project
    }
    
    if (data.tags && typeof data.tags === 'string') {
      validated.tags = data.tags.split(',')
    }
    
    return validated
  }
} 