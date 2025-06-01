import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { IntegrationService } from '../server/services/IntegrationService.js'
import { ChatHistoryService } from '../services/ChatHistoryService.js'
import { CursorLogService } from '../services/CursorLogService.js'
import { Logger } from '../server/utils/Logger.js'
import type { IntegrationConfig, IntegratedLog, CursorLogConfig } from '../server/types/integration.js'
import type { ChatHistoryConfig } from '../types/index.js'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

describe('IntegrationService', () => {
  let service: IntegrationService
  let chatHistoryService: ChatHistoryService
  let cursorLogService: CursorLogService
  let logger: Logger
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integration-test-'))
    logger = Logger.getInstance(path.join(tempDir, 'logs'))

    const chatHistoryConfig: ChatHistoryConfig = {
      storagePath: path.join(tempDir, 'chat-history'),
      maxSessions: 100,
      maxMessagesPerSession: 1000,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: true,
      backupInterval: 24
    }

    const cursorConfig: CursorLogConfig = {
      enabled: true,
      watchPath: path.join(tempDir, 'cursor-logs'),
      logDir: path.join(tempDir, 'cursor-logs'),
      autoImport: true,
      syncInterval: 300,
      batchSize: 100,
      retryAttempts: 3
    }

    const config: IntegrationConfig = {
      cursor: cursorConfig,
      chatHistory: chatHistoryConfig,
      sync: {
        interval: 5,
        batchSize: 100,
        retryAttempts: 3
      }
    }

    chatHistoryService = new ChatHistoryService(chatHistoryConfig)
    cursorLogService = new CursorLogService(cursorConfig, logger)
    service = new IntegrationService(config, logger)

    await chatHistoryService.initialize()
    await cursorLogService.initialize()
    await service.initialize()
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  describe('初期化', () => {
    it('正常に初期化できること', async () => {
      expect(service).toBeDefined()
    })
  })

  describe('ログ検索', () => {
    const chatLogs = [
      {
        id: 'chat1',
        type: 'chat' as const,
        content: 'チャットメッセージ1',
        timestamp: new Date(),
        metadata: {
          project: 'project1',
          source: 'chat'
        }
      },
      {
        id: 'chat2',
        type: 'chat' as const,
        content: 'チャットメッセージ2',
        timestamp: new Date(),
        metadata: {
          project: 'project2',
          source: 'chat'
        }
      }
    ]

    const cursorLogs = [
      {
        id: 'cursor1',
        type: 'cursor' as const,
        content: 'カーソルログ1',
        timestamp: new Date(),
        metadata: {
          project: 'project1',
          source: 'cursor'
        }
      },
      {
        id: 'cursor2',
        type: 'cursor' as const,
        content: 'カーソルログ2',
        timestamp: new Date(),
        metadata: {
          project: 'project2',
          source: 'cursor'
        }
      }
    ]

    beforeEach(async () => {
      // チャットログの追加
      for (const log of chatLogs) {
        await chatHistoryService.createSession({
          id: log.id,
          title: log.content,
          messages: [{
            id: `${log.id}-msg`,
            role: 'user',
            content: log.content,
            timestamp: log.timestamp
          }],
          tags: ['test'],
          startTime: log.timestamp,
          metadata: {
            project: log.metadata.project,
            source: log.metadata.source
          }
        })
      }

      // カーソルログの追加
      for (const log of cursorLogs) {
        await cursorLogService.log({
          type: log.type,
          content: log.content,
          metadata: {
            project: log.metadata.project,
            source: log.metadata.source
          }
        })
      }
    })

    it('キーワードで検索できること', async () => {
      const results = await service.search({
        query: 'メッセージ1'
      })

      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('チャットメッセージ1')
    })

    it('プロジェクトで検索できること', async () => {
      const results = await service.search({
        project: 'project1'
      })

      expect(results).toHaveLength(2)
      expect(results[0].metadata?.project).toBe('project1')
      expect(results[1].metadata?.project).toBe('project1')
    })

    it('タイプで検索できること', async () => {
      const results = await service.search({
        types: ['chat']
      })

      expect(results).toHaveLength(2)
      expect(results[0].type).toBe('chat')
      expect(results[1].type).toBe('chat')
    })
  })

  describe('統計情報', () => {
    beforeEach(async () => {
      // チャットログの追加
      await chatHistoryService.createSession({
        id: 'chat1',
        title: 'チャット1',
        messages: [{
          id: 'msg1',
          role: 'user',
          content: 'メッセージ1',
          timestamp: new Date()
        }],
        tags: ['test'],
        startTime: new Date(),
        metadata: {
          project: 'project1',
          source: 'chat'
        }
      })

      // カーソルログの追加
      await cursorLogService.log({
        type: 'chat',
        content: 'カーソルログ1',
        metadata: {
          project: 'project1',
          source: 'cursor'
        }
      })
    })

    it('統計情報を取得できること', async () => {
      const stats = await service.getStats()
      expect(stats.totalLogs).toBe(2)
      expect(stats.cursorLogs).toBe(1)
      expect(stats.chatLogs).toBe(1)
      expect(stats.storageSize).toBeGreaterThan(0)
    })
  })

  describe('分析情報', () => {
    it('分析情報を取得できること', async () => {
      const analytics = await service.getAnalytics({
        timeRange: {
          start: new Date(),
          end: new Date()
        },
        granularity: 'daily',
        metrics: ['messageCount', 'sessionCount']
      })

      expect(analytics).toBeDefined()
      expect(analytics.summary).toBeDefined()
      expect(analytics.logsByType).toBeDefined()
      expect(analytics.logsByProject).toBeDefined()
      expect(analytics.logsByTag).toBeDefined()
      expect(analytics.activityTimeline).toBeDefined()
      expect(analytics.hourlyDistribution).toBeDefined()
      expect(analytics.topKeywords).toBeDefined()
    })
  })
}) 