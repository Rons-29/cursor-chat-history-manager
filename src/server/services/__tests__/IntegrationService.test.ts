/**
 * IntegrationServiceのテスト
 */

import { IntegrationService } from '../IntegrationService.js'
import { Logger } from '../../utils/Logger.js'
import type { IntegrationConfig } from '../../types/integration.js'

describe('IntegrationService', () => {
  let service: IntegrationService
  let logger: Logger
  let config: IntegrationConfig

  beforeEach(() => {
    logger = Logger.getInstance()
    config = {
      enabled: true,
      syncInterval: 1000,
      customPath: '/test/path'
    }
    service = new IntegrationService(config, logger)
  })

  describe('initialize', () => {
    it('正常に初期化できること', async () => {
      await expect(service.initialize()).resolves.not.toThrow()
    })
  })

  describe('startSync', () => {
    it('初期化前に呼び出すとエラーになること', async () => {
      await expect(service.startSync()).rejects.toThrow('サービスが初期化されていません')
    })

    it('初期化後に呼び出せること', async () => {
      await service.initialize()
      await expect(service.startSync()).resolves.not.toThrow()
    })
  })

  describe('stopSync', () => {
    it('初期化前に呼び出すとエラーになること', async () => {
      await expect(service.stopSync()).rejects.toThrow('サービスが初期化されていません')
    })

    it('初期化後に呼び出せること', async () => {
      await service.initialize()
      await expect(service.stopSync()).resolves.not.toThrow()
    })
  })

  describe('scanCursorLogs', () => {
    it('初期化前に呼び出すとエラーになること', async () => {
      await expect(service.scanCursorLogs()).rejects.toThrow('サービスが初期化されていません')
    })

    it('初期化後に呼び出せること', async () => {
      await service.initialize()
      const result = await service.scanCursorLogs()
      expect(result).toBe(0)
    })

    it('カスタムパスを指定して呼び出せること', async () => {
      await service.initialize()
      const result = await service.scanCursorLogs('/custom/path')
      expect(result).toBe(0)
    })
  })

  describe('getCursorWatcherStatus', () => {
    it('初期状態のステータスを取得できること', () => {
      const status = service.getCursorWatcherStatus()
      expect(status).toEqual({
        isActive: false,
        lastCheck: expect.any(Date),
        watchPath: '',
        errorCount: 0
      })
    })
  })

  describe('search', () => {
    it('初期化前に呼び出すとエラーになること', async () => {
      await expect(service.search({})).rejects.toThrow('サービスが初期化されていません')
    })

    it('初期化後に呼び出せること', async () => {
      await service.initialize()
      const results = await service.search({})
      expect(Array.isArray(results)).toBe(true)
      expect(results).toHaveLength(0)
    })
  })

  describe('getStats', () => {
    it('初期化前に呼び出すとエラーになること', async () => {
      await expect(service.getStats()).rejects.toThrow('サービスが初期化されていません')
    })

    it('初期化後に呼び出せること', async () => {
      await service.initialize()
      const stats = await service.getStats()
      expect(stats).toEqual({
        totalMessages: 0,
        totalSessions: 0,
        activeWatchers: 0
      })
    })
  })

  describe('getAnalytics', () => {
    const analyticsRequest = {
      timeRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      },
      granularity: 'daily' as const,
      metrics: ['messageCount', 'sessionCount']
    }

    it('初期化前に呼び出すとエラーになること', async () => {
      await expect(service.getAnalytics(analyticsRequest)).rejects.toThrow('サービスが初期化されていません')
    })

    it('初期化後に呼び出せること', async () => {
      await service.initialize()
      const analytics = await service.getAnalytics(analyticsRequest)
      expect(analytics).toEqual({
        timeRange: analyticsRequest.timeRange,
        granularity: analyticsRequest.granularity,
        metrics: {
          messageCount: [],
          sessionCount: [],
          timestamps: []
        }
      })
    })
  })
}) 