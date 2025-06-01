/**
 * 統合機能の型定義
 */

import type { ChatHistoryConfig } from '../../types/index.js'

export interface CursorLogConfig {
  enabled: boolean
  watchPath: string
  logDir: string
  autoImport: boolean
  syncInterval: number
  batchSize: number
  retryAttempts: number
  maxLogSize?: number
  maxLogFiles?: number
  cacheSize?: number
  cacheTTL?: number
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
  type: 'chat' | 'cursor'
  content: string
  timestamp: Date
  metadata: {
    project?: string
    projectId?: number
    source: string
    tags?: string[]
    summary?: string
    status?: 'active' | 'archived' | 'deleted'
    totalMessages?: number
    taskId?: string
    cursorId?: string
  }
}

export interface CursorLog {
  id: string
  type: string
  content: string
  timestamp: Date
  sessionId?: string
  userId?: string
  metadata?: {
    project?: string
    source?: string
    summary?: string
    status?: 'active' | 'archived' | 'deleted'
    tags?: string[]
    totalMessages?: number
  }
}

export interface CursorLogStats {
  totalLogs: number
  storageSize: number
  logsByType?: Record<string, number>
  logsByProject?: Record<string, number>
  logsByTag?: Record<string, number>
}

export interface IntegrationStats {
  totalLogs: number
  cursorLogs: number
  chatLogs: number
  storageSize: number
  logsByType: Record<string, number>
  logsByProject: Record<string, number>
  logsByTag: Record<string, number>
}

export interface IntegrationAnalytics {
  timeRange: {
    start: Date;
    end: Date;
  };
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  summary: {
    totalLogs: number
    totalChats: number
    totalCursorLogs: number
    uniqueProjects: number
    uniqueTags: number
  }
  logsByType: Record<string, number>
  logsByProject: Record<string, number>
  logsByTag: Record<string, number>
  activityTimeline: Array<{
    date: string
    chatCount: number
    cursorCount: number
    totalCount: number
  }>
  hourlyDistribution: Record<string, number>
  topKeywords: Array<{
    keyword: string
    count: number
  }>
  metrics: {
    messageCount: number[];
    sessionCount: number[];
    timestamps: string[];
  };
}

export interface IntegrationAnalyticsRequest {
  timeRange: {
    start: Date
    end: Date
  }
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
  metrics: string[]
}

export interface IntegrationAnalyticsResponse extends IntegrationAnalytics {}

export interface IntegrationSearchOptions {
  query?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  types?: string[];
  project?: string;
  tags?: string[];
  pageSize?: number;
}

export interface CursorWatcherStatus {
  isActive: boolean;
  lastCheck: Date;
  watchPath: string;
  errorCount: number;
} 