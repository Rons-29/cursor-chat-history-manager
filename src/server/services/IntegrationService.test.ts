import { IntegrationService } from './IntegrationService.js'
import { Logger } from '../utils/Logger.js'
import type { IntegrationConfig } from '../types/integration.js'

describe('IntegrationService', () => {
  let service: IntegrationService
  let logger: Logger
  let config: IntegrationConfig

  beforeEach(() => {
    logger = Logger.getInstance('test-logs')
    config = {
      cursor: {
        enabled: true,
        watchPath: '/test/path',
        logDir: '/test/cursor-logs',
        autoImport: true,
        syncInterval: 1000,
        batchSize: 100,
        retryAttempts: 3,
      },
      chatHistory: {
        storagePath: '/test/storage',
        maxSessions: 1000,
        maxMessagesPerSession: 100,
        autoCleanup: true,
        cleanupDays: 30,
      },
      sync: {
        interval: 5000,
        batchSize: 100,
        retryAttempts: 3,
      },
    }
    service = new IntegrationService(config, logger)
  })

  describe('初期化', () => {
    it('正常に初期化できること', async () => {
      await expect(service.initialize()).resolves.not.toThrow()
    })

    it('二重初期化を防ぐこと', async () => {
      await service.initialize()
      await expect(service.initialize()).resolves.not.toThrow()
    })
  })

  describe('検索', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('クエリによる検索ができること', async () => {
      const results = await service.search({ query: 'test' })
      expect(Array.isArray(results)).toBe(true)
    })

    it('プロジェクトによるフィルタリングができること', async () => {
      const results = await service.search({ project: 'test-project' })
      expect(Array.isArray(results)).toBe(true)
    })

    it('タイプによるフィルタリングができること', async () => {
      const results = await service.search({ types: ['chat', 'cursor'] })
      expect(Array.isArray(results)).toBe(true)
    })

    it('時間範囲によるフィルタリングができること', async () => {
      const results = await service.search({
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
      })
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('統計情報', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('統計情報を取得できること', async () => {
      const stats = await service.getStats()
      expect(stats).toHaveProperty('totalLogs')
      expect(stats).toHaveProperty('cursorLogs')
      expect(stats).toHaveProperty('chatLogs')
      expect(stats).toHaveProperty('storageSize')
      expect(stats).toHaveProperty('logsByType')
      expect(stats).toHaveProperty('logsByProject')
      expect(stats).toHaveProperty('logsByTag')
    })
  })

  describe('分析', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('分析情報を取得できること', async () => {
      const analytics = await service.getAnalytics({
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        granularity: 'daily',
        metrics: ['messageCount', 'sessionCount'],
      })

      expect(analytics).toHaveProperty('timeRange')
      expect(analytics).toHaveProperty('granularity')
      expect(analytics).toHaveProperty('summary')
      expect(analytics).toHaveProperty('logsByType')
      expect(analytics).toHaveProperty('logsByProject')
      expect(analytics).toHaveProperty('logsByTag')
      expect(analytics).toHaveProperty('activityTimeline')
      expect(analytics).toHaveProperty('hourlyDistribution')
      expect(analytics).toHaveProperty('topKeywords')
      expect(analytics).toHaveProperty('metrics')
    })
  })
})
