import { ChatHistoryConfig } from './index'

export interface CursorLogConfig {
  enabled: boolean
  watchPath: string
  autoImport: boolean
  syncInterval?: number
  batchSize?: number
  retryAttempts?: number
}

export interface IntegrationConfig {
  cursor: CursorLogConfig
  chatHistory: ChatHistoryConfig
  sync: {
    interval: number
    batchSize: number
    retryAttempts: number
  }
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
    [key: string]: any
  }
  relatedLogs?: string[]
}

export interface IntegrationStats {
  totalLogs: number
  cursorLogs: number
  chatLogs: number
  lastSync: Date
  syncStatus: 'idle' | 'syncing' | 'error'
  errorCount: number
  storageSize: number
}

export interface IntegrationSearchOptions {
  query: string
  timeRange?: {
    start: Date
    end: Date
  }
  types?: ('chat' | 'cursor')[]
  projects?: string[]
  tags?: string[]
  limit?: number
  offset?: number
}

export interface IntegrationError extends Error {
  code: string
  details?: any
  timestamp: Date
} 