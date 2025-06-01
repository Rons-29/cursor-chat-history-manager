/**
 * 統合ルートのテスト
 */

import request from 'supertest'
import express from 'express'
import { IntegrationService } from '../../services/IntegrationService.js'
import { Logger } from '../../utils/Logger.js'
import integrationRouter, { setupIntegrationRoutes } from '../integration.js'
import type { IntegrationConfig } from '../../types/integration.js'

describe('Integration Routes', () => {
  let app: express.Application
  let service: IntegrationService
  let logger: Logger
  let config: IntegrationConfig

  beforeEach(() => {
    app = express()
    app.use(express.json())
    
    logger = Logger.getInstance()
    config = {
      enabled: true,
      syncInterval: 1000,
      customPath: '/test/path'
    }
    service = new IntegrationService(config, logger)
    
    setupIntegrationRoutes(service, logger)
    app.use('/api/integration', integrationRouter)
  })

  describe('POST /api/integration/initialize', () => {
    it('正常に初期化できること', async () => {
      const response = await request(app)
        .post('/api/integration/initialize')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: '統合サービスの初期化が完了しました'
      })
    })
  })

  describe('POST /api/integration/sync/start', () => {
    it('初期化後に同期を開始できること', async () => {
      await service.initialize()

      const response = await request(app)
        .post('/api/integration/sync/start')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: '同期を開始しました'
      })
    })
  })

  describe('POST /api/integration/sync/stop', () => {
    it('同期を停止できること', async () => {
      await service.initialize()

      const response = await request(app)
        .post('/api/integration/sync/stop')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: '同期を停止しました'
      })
    })
  })

  describe('POST /api/integration/cursor/scan', () => {
    it('Cursorログをスキャンできること', async () => {
      await service.initialize()

      const response = await request(app)
        .post('/api/integration/cursor/scan')
        .send({ customPath: '/custom/path' })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Cursorログスキャンが完了しました',
        data: {
          importCount: 0,
          customPath: '/custom/path'
        }
      })
    })
  })

  describe('GET /api/integration/cursor/status', () => {
    it('CursorWatcherのステータスを取得できること', async () => {
      const response = await request(app)
        .get('/api/integration/cursor/status')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          isActive: false,
          lastCheck: expect.any(String),
          watchPath: '',
          errorCount: 0
        }
      })
    })
  })

  describe('POST /api/integration/search', () => {
    it('検索を実行できること', async () => {
      await service.initialize()

      const response = await request(app)
        .post('/api/integration/search')
        .send({
          query: 'test',
          timeRange: {
            start: '2024-01-01',
            end: '2024-01-31'
          }
        })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          results: [],
          count: 0,
          searchOptions: expect.any(Object)
        }
      })
    })
  })

  describe('GET /api/integration/stats', () => {
    it('統計情報を取得できること', async () => {
      await service.initialize()

      const response = await request(app)
        .get('/api/integration/stats')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          totalMessages: 0,
          totalSessions: 0,
          activeWatchers: 0
        }
      })
    })
  })

  describe('POST /api/integration/analytics', () => {
    it('分析データを取得できること', async () => {
      await service.initialize()

      const response = await request(app)
        .post('/api/integration/analytics')
        .send({
          timeRange: {
            start: '2024-01-01',
            end: '2024-01-31'
          },
          granularity: 'daily',
          metrics: ['messageCount', 'sessionCount']
        })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          timeRange: {
            start: expect.any(String),
            end: expect.any(String)
          },
          granularity: 'daily',
          metrics: {
            messageCount: [],
            sessionCount: [],
            timestamps: []
          }
        }
      })
    })
  })

  describe('GET /api/integration/health', () => {
    it('ヘルスチェックを実行できること', async () => {
      const response = await request(app)
        .get('/api/integration/health')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'ready',
          timestamp: expect.any(String),
          cursor: expect.any(Object)
        }
      })
    })
  })
}) 