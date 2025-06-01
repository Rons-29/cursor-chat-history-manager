import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import request, { Response } from 'supertest'
import app from '../../server/app.js'
import { ChatHistoryService } from '../../services/ChatHistoryService.js'
import { CursorLogService } from '../../services/CursorLogService.js'
import { IntegrationService } from '../../server/services/IntegrationService.js'
import { Logger } from '../../server/utils/Logger.js'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import type { Application } from 'express'

describe('/api/integration', () => {
  let tempDir: string
  let logger: Logger
  
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integration-api-test-'))
    logger = Logger.getInstance(path.join(tempDir, 'logs'))
    await logger.initialize()
    
    const cursorConfig = {
      enabled: true,
      watchPath: path.join(tempDir, 'cursor'),
      logDir: path.join(tempDir, 'cursor-logs'),
      autoImport: true,
      syncInterval: 300,
      batchSize: 100,
      retryAttempts: 3
    }

    const integrationConfig = {
      cursor: cursorConfig,
      chatHistory: {
        storagePath: path.join(tempDir, 'chat-history'),
        maxSessions: 1000,
        maxMessagesPerSession: 100,
        autoCleanup: true,
        cleanupDays: 30,
        enableSearch: true,
        enableBackup: false,
        backupInterval: 24
      },
      sync: {
        interval: 5000,
        batchSize: 100,
        retryAttempts: 3
      }
    }

    const integrationService = new IntegrationService(integrationConfig, logger)
    await integrationService.initialize()
  })

  afterEach(async () => {
    await fs.remove(tempDir)
    Logger.reset()
  })

  describe('GET /api/integration/search', () => {
    it('should search integrated logs', async () => {
      const response: Response = await request(app)
        .get('/api/integration/search')
        .query({ q: 'test', types: 'chat,cursor' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('results')
      expect(Array.isArray(response.body.results)).toBe(true)
      expect(response.body).toHaveProperty('total')
    })

    it('should handle search with time range', async () => {
      const response: Response = await request(app)
        .get('/api/integration/search')
        .query({ 
          q: 'test',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('results')
      expect(response.body).toHaveProperty('total')
    })
  })

  describe('GET /api/integration/stats', () => {
    it('統計情報を取得できること', async () => {
      const response: Response = await request(app)
        .get('/api/integration/stats')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('totalLogs')
      expect(response.body).toHaveProperty('cursorLogs')
      expect(response.body).toHaveProperty('chatLogs')
      expect(response.body).toHaveProperty('storageSize')
    })
  })

  describe('POST /api/integration/sync', () => {
    it('同期を開始できること', async () => {
      const response: Response = await request(app)
        .post('/api/integration/sync/start')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message')
    })
  })

  describe('GET /api/integration/analytics', () => {
    beforeEach(() => {
      // モックデータの設定
      const mockAnalytics = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        },
        granularity: 'daily' as const,
        summary: {
          totalLogs: 100,
          totalChats: 60,
          totalCursorLogs: 40,
          uniqueProjects: 5,
          uniqueTags: 10
        },
        logsByType: {
          chat: 60,
          cursor: 40
        },
        logsByProject: {
          '1': 50,
          '2': 50
        },
        logsByTag: {
          tag1: 30,
          tag2: 70
        },
        activityTimeline: [],
        hourlyDistribution: {},
        topKeywords: [],
        metrics: {
          messageCount: [10, 20, 30],
          sessionCount: [5, 10, 15],
          timestamps: ['2024-01-01', '2024-01-02', '2024-01-03']
        }
      }

      // IntegrationService.getAnalytics をモック
      jest.spyOn(IntegrationService.prototype, 'getAnalytics').mockResolvedValue(mockAnalytics)
    })

    it('should return analytics data', async () => {
      const response: Response = await request(app)
        .get('/api/integration/analytics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('summary')
      expect(response.body).toHaveProperty('logsByType')
    })

    it('期間を指定した分析データを取得できること', async () => {
      const response: Response = await request(app)
        .get('/api/integration/analytics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          granularity: 'daily',
          types: 'chat'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('summary')
      expect(response.body.summary).toHaveProperty('totalLogs')
      expect(response.body.summary).toHaveProperty('totalChats')
      expect(response.body.summary).toHaveProperty('totalCursorLogs')
    })
  })
}) 