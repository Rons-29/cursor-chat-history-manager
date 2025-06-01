export interface CursorConfig {
  enabled: boolean
  watchPath: string
  autoImport: boolean
  syncInterval?: number
  batchSize?: number
  retryAttempts?: number
  logPath?: string
  maxLogSize?: number
  retentionDays?: number
  excludePatterns?: string[]
  includePatterns?: string[]
}

export interface CursorChatData {
  id: string
  title: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
  }>
  createdAt: string
  updatedAt: string
  metadata?: {
    project?: string
    projectId?: number
    source?: string
    tags?: string[]
    [key: string]: any
  }
}

export interface CursorLog {
  id: string
  type: 'chat' | 'command' | 'error' | 'info'
  content: string
  timestamp: Date
  metadata: {
    project?: string
    projectId?: number
    source?: string
    tags?: string[]
    [key: string]: any
  }
}

export interface CursorLogSearchOptions {
  query?: string
  timeRange?: {
    start: Date
    end: Date
  }
  types?: ('chat' | 'command' | 'error' | 'info')[]
  project?: string
  tags?: string[]
  limit?: number
  offset?: number
}

export interface CursorLogStats {
  totalLogs: number
  storageSize: number
  logsByType: Record<string, number>
  logsByProject: Record<string, number>
  logsByTag: Record<string, number>
  lastUpdated: Date
} 