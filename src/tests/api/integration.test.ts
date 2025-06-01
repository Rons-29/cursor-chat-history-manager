import request from 'supertest'
import express, { Router } from 'express'
import type { Request, Response, RequestHandler } from 'express'
import { IntegrationService } from '../../services/IntegrationService.js'
import type { IntegrationConfig } from '../../types/integration.js'
import type { IntegratedLog, IntegrationAnalyticsResponse, IntegrationAnalyticsRequest } from '../../types/integration.js'
import { Logger } from '../../utils/Logger.js'

// モックの設定
jest.mock('../../services/IntegrationService')

describe('Integration API', () => {
  let app: express.Application
  let router: Router
  let mockIntegrationService: jest.Mocked<IntegrationService>
  let logger: Logger

  beforeAll(() => {
    logger = new Logger({ logPath: './logs', level: 'info' })
    const config: IntegrationConfig = {
      cursor: {
        enabled: true,
        watchPath: '/test/path',
        autoImport: true
      },
      chatHistory: {
        storagePath: '/test/storage',
        maxSessions: 1000,
        maxMessagesPerSession: 1000,
        autoCleanup: false,
        cleanupDays: 30,
        enableSearch: true,
        enableBackup: false,
        backupInterval: 24
      },
      sync: {
        interval: 300,
        batchSize: 100,
        retryAttempts: 3
      }
    }
    mockIntegrationService = new IntegrationService(config, logger) as jest.Mocked<IntegrationService>
    ;(IntegrationService as unknown as jest.Mock).mockImplementation(() => mockIntegrationService)

    app = express()
    app.use(express.json())
    
    // ルーターを作成
    router = Router()
    
    // ルートを定義
    const searchHandler: RequestHandler = async (req, res, next) => {
      try {
        if (!req.body.query) {
          res.status(400).json({ error: 'Validation error' })
          return
        }
        const results = await mockIntegrationService.search(req.body)
        res.json({ results })
      } catch (error) {
        res.status(400).json({ error: 'Validation error' })
      }
    }

    const analyticsHandler: RequestHandler = async (req, res, next) => {
      try {
        if (!req.query.startDate || !req.query.endDate || !req.query.groupBy) {
          res.status(400).json({ error: 'Validation error' })
          return
        }
        const analytics = await mockIntegrationService.getAnalytics(req.query)
        res.json(analytics)
      } catch (error) {
        res.status(400).json({ error: 'Validation error' })
      }
    }

    router.post('/search', searchHandler)
    router.get('/analytics', analyticsHandler)

    // ルーターをマウント
    app.use('/api/integration', router)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // デフォルトのモック返却値
    mockIntegrationService.search.mockResolvedValue([
      {
        id: '1',
        type: 'cursor',
        content: 'test log',
        timestamp: new Date(),
        metadata: { project: '1', tags: [], source: 'cursor' }
      },
      {
        id: '2',
        type: 'chat',
        content: 'test chat',
        timestamp: new Date(),
        metadata: { project: '2', tags: [], source: 'chat' }
      }
    ])
    mockIntegrationService.getAnalytics.mockResolvedValue({
      summary: {
        totalLogs: 10,
        totalChats: 5,
        totalCursorLogs: 5,
        uniqueProjects: 2,
        uniqueTags: 3
      },
      logsByType: { chat: 5, cursor: 5 },
      logsByProject: { '1': 5, '2': 5 },
      logsByTag: { tag1: 3, tag2: 2 },
      activityTimeline: [],
      hourlyDistribution: {},
      topKeywords: []
    })
  })

  describe('POST /api/integration/search', () => {
    it('should return 400 if validation fails', async () => {
      const res = await request(app)
        .post('/api/integration/search')
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation error')
    })

    it('should return results for valid request', async () => {
      const mockResults: IntegratedLog[] = [
        {
          id: '1',
          type: 'cursor' as const,
          content: 'test log',
          timestamp: new Date(),
          metadata: {
            project: '1',
            source: 'cursor',
            tags: []
          }
        },
        {
          id: '2',
          type: 'chat' as const,
          content: 'test chat',
          timestamp: new Date(),
          metadata: {
            project: '2',
            source: 'chat',
            tags: []
          }
        }
      ]
      mockIntegrationService.search.mockResolvedValue(mockResults)
      const res = await request(app)
        .post('/api/integration/search')
        .send({
          query: 'test',
          timeRange: {
            start: new Date().toISOString(),
            end: new Date().toISOString()
          }
        })
      expect(res.status).toBe(200)
      expect(res.body.results.length).toBe(2)
      expect(res.body.results[0]).toMatchObject({
        id: '1',
        type: 'cursor',
        content: 'test log',
        metadata: {
          project: '1',
          source: 'cursor',
          tags: []
        },
        timestamp: expect.any(String)
      })
      expect(res.body.results[1]).toMatchObject({
        id: '2',
        type: 'chat',
        content: 'test chat',
        metadata: {
          project: '2',
          source: 'chat',
          tags: []
        },
        timestamp: expect.any(String)
      })
      expect(mockIntegrationService.search).toHaveBeenCalledWith(expect.objectContaining({
        query: 'test'
      }))
    })
  })

  describe('GET /api/integration/analytics', () => {
    it('should return 400 if validation fails', async () => {
      const res = await request(app)
        .get('/api/integration/analytics')
        .query({ groupBy: 'invalid' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation error')
    })

    it('should return analytics for valid request', async () => {
      const mockAnalytics: IntegrationAnalyticsResponse = {
        summary: {
          totalLogs: 10,
          totalChats: 5,
          totalCursorLogs: 5,
          uniqueProjects: 2,
          uniqueTags: 3
        },
        logsByType: { chat: 5, cursor: 5 },
        logsByProject: { '1': 5, '2': 5 },
        logsByTag: { tag1: 3, tag2: 2 },
        activityTimeline: [],
        hourlyDistribution: {},
        topKeywords: []
      }

      mockIntegrationService.getAnalytics.mockResolvedValue(mockAnalytics)

      const res = await request(app)
        .get('/api/integration/analytics')
        .query({
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          groupBy: 'type'
        })

      expect(res.status).toBe(200)
      expect(res.body).toEqual(mockAnalytics)
      expect(mockIntegrationService.getAnalytics).toHaveBeenCalledWith(expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
        groupBy: 'type'
      }))
    })
  })
}) 