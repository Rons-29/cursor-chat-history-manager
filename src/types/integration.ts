import type { ChatHistoryConfig } from './index.js'
import type { CursorConfig } from './cursor.js'
import { z } from 'zod'

export interface CursorLogConfig {
  enabled: boolean;
  watchPath: string;
  autoImport: boolean;
  syncInterval?: number;
  batchSize?: number;
  retryAttempts?: number;
  logDir: string;
  maxLogSize?: number;
  maxLogFiles?: number;
  cacheSize?: number;
  cacheTTL?: number;
}

export interface IntegrationConfig {
  cursor: CursorConfig
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
    source?: string
    tags?: string[]
  }
}

export interface IntegrationStats {
  totalLogs: number
  cursorLogs: number
  chatLogs: number
  storageSize: number
}

export interface IntegrationSearchOptions {
  query?: string
  timeRange?: {
    start: Date
    end: Date
  }
  types?: ('chat' | 'cursor')[]
  project?: string
  tags?: string[]
  page?: number
  pageSize?: number
}

export interface IntegrationError extends Error {
  code: string
  details?: any
  timestamp: Date
}

export const IntegrationSearchRequestSchema = z.object({
  query: z.string().min(1),
  timeRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime()
    })
    .optional(),
  types: z.array(z.enum(['chat', 'cursor'])).optional(),
  projects: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
})

export type IntegrationSearchRequest = z.infer<typeof IntegrationSearchRequestSchema>

export const IntegrationSearchResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      timestamp: z.string(),
      type: z.enum(['chat', 'cursor']),
      content: z.string(),
      metadata: z.object({
        project: z.string().optional(),
        tags: z.array(z.string()).optional(),
        source: z.string(),
      })
    })
  )
})

export type IntegrationSearchResponse = z.infer<typeof IntegrationSearchResponseSchema>

export const IntegrationAnalyticsRequestSchema = z.object({
  projectId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
  types: z.array(z.enum(['chat', 'cursor'])).optional()
})

export type IntegrationAnalyticsRequest = z.infer<typeof IntegrationAnalyticsRequestSchema>

export const IntegrationAnalyticsResponseSchema = z.object({
  summary: z.object({
    totalLogs: z.number(),
    totalChats: z.number(),
    totalCursorLogs: z.number(),
    uniqueProjects: z.number(),
    uniqueTags: z.number()
  }),
  logsByType: z.record(z.number()),
  logsByProject: z.record(z.number()),
  logsByTag: z.record(z.number()),
  activityTimeline: z.array(z.object({
    date: z.string(),
    chatCount: z.number(),
    cursorCount: z.number(),
    totalCount: z.number()
  })),
  hourlyDistribution: z.record(z.number()),
  topKeywords: z.array(z.object({
    keyword: z.string(),
    count: z.number()
  }))
})

export type IntegrationAnalyticsResponse = z.infer<typeof IntegrationAnalyticsResponseSchema>

export interface CursorLog {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  metadata?: {
    project?: string;
    source?: string;
    summary?: string;
    status?: 'active' | 'archived' | 'deleted';
    tags?: string[];
    totalMessages?: number;
  };
}

export interface CursorLogStats {
  totalLogs: number
  storageSize: number
} 