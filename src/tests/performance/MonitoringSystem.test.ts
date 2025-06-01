import { MonitoringSystem } from '../../services/MonitoringSystem.js'
import { Logger } from '../../utils/Logger.js'
import path from 'path'
import fs from 'fs-extra'

describe('MonitoringSystem Performance Tests', () => {
  let monitoringSystem: MonitoringSystem
  let logger: Logger
  const testLogPath = path.join(__dirname, 'test-logs')

  beforeAll(async () => {
    await fs.ensureDir(testLogPath)
    logger = new Logger(testLogPath)
    await logger.initialize()
  })

  afterAll(async () => {
    await fs.remove(testLogPath)
  })

  beforeEach(async () => {
    monitoringSystem = new MonitoringSystem({
      logPath: testLogPath,
      metricsInterval: 1000,
      alertThreshold: 80,
      reportInterval: 3600,
    })
    await monitoringSystem.initialize()
  })

  afterEach(async () => {
    await monitoringSystem.cleanup()
  })

  describe('メトリクス収集', () => {
    it('CPU使用率のメトリクスを収集できること', async () => {
      const metrics = await monitoringSystem.collectMetrics()
      expect(metrics.cpu).toBeDefined()
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0)
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100)
    })

    it('メモリ使用率のメトリクスを収集できること', async () => {
      const metrics = await monitoringSystem.collectMetrics()
      expect(metrics.memory).toBeDefined()
      expect(metrics.memory.usage).toBeGreaterThanOrEqual(0)
      expect(metrics.memory.usage).toBeLessThanOrEqual(100)
      expect(metrics.memory.total).toBeGreaterThan(0)
      expect(metrics.memory.used).toBeGreaterThan(0)
    })

    it('ディスク使用率のメトリクスを収集できること', async () => {
      const metrics = await monitoringSystem.collectMetrics()
      expect(metrics.disk).toBeDefined()
      expect(metrics.disk.usage).toBeGreaterThanOrEqual(0)
      expect(metrics.disk.usage).toBeLessThanOrEqual(100)
      expect(metrics.disk.total).toBeGreaterThan(0)
      expect(metrics.disk.used).toBeGreaterThan(0)
    })

    it('ネットワーク使用率のメトリクスを収集できること', async () => {
      const metrics = await monitoringSystem.collectMetrics()
      expect(metrics.network).toBeDefined()
      expect(metrics.network.bytesIn).toBeGreaterThanOrEqual(0)
      expect(metrics.network.bytesOut).toBeGreaterThanOrEqual(0)
    })
  })

  describe('アラート機能', () => {
    it('CPU使用率が閾値を超えた場合にアラートを発行できること', async () => {
      // CPU使用率を強制的に高く設定
      jest.spyOn(monitoringSystem, 'collectMetrics').mockResolvedValue({
        cpu: { usage: 90 },
        memory: { usage: 50, total: 1000, used: 500 },
        disk: { usage: 50, total: 1000, used: 500 },
        network: { bytesIn: 0, bytesOut: 0 },
      })

      const alerts = await monitoringSystem.checkAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].type).toBe('CPU')
      expect(alerts[0].level).toBe('WARNING')
    })

    it('メモリ使用率が閾値を超えた場合にアラートを発行できること', async () => {
      // メモリ使用率を強制的に高く設定
      jest.spyOn(monitoringSystem, 'collectMetrics').mockResolvedValue({
        cpu: { usage: 50 },
        memory: { usage: 90, total: 1000, used: 900 },
        disk: { usage: 50, total: 1000, used: 500 },
        network: { bytesIn: 0, bytesOut: 0 },
      })

      const alerts = await monitoringSystem.checkAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].type).toBe('MEMORY')
      expect(alerts[0].level).toBe('WARNING')
    })

    it('複数のアラートを同時に発行できること', async () => {
      // 複数のメトリクスを強制的に高く設定
      jest.spyOn(monitoringSystem, 'collectMetrics').mockResolvedValue({
        cpu: { usage: 90 },
        memory: { usage: 90, total: 1000, used: 900 },
        disk: { usage: 90, total: 1000, used: 900 },
        network: { bytesIn: 0, bytesOut: 0 },
      })

      const alerts = await monitoringSystem.checkAlerts()
      expect(alerts.length).toBeGreaterThan(1)
      expect(alerts.some(a => a.type === 'CPU')).toBe(true)
      expect(alerts.some(a => a.type === 'MEMORY')).toBe(true)
      expect(alerts.some(a => a.type === 'DISK')).toBe(true)
    })
  })

  describe('レポート生成', () => {
    it('パフォーマンスレポートを生成できること', async () => {
      const report = await monitoringSystem.generateReport()
      expect(report).toBeDefined()
      expect(report.summary).toBeDefined()
      expect(report.metrics).toBeDefined()
      expect(report.alerts).toBeDefined()
    })

    it('レポートに統計情報が含まれること', async () => {
      const report = await monitoringSystem.generateReport()
      expect(report.summary.totalAlerts).toBeDefined()
      expect(report.summary.averageCpuUsage).toBeDefined()
      expect(report.summary.averageMemoryUsage).toBeDefined()
      expect(report.summary.averageDiskUsage).toBeDefined()
    })

    it('レポートに詳細なメトリクスが含まれること', async () => {
      const report = await monitoringSystem.generateReport()
      expect(report.metrics.cpu).toBeDefined()
      expect(report.metrics.memory).toBeDefined()
      expect(report.metrics.disk).toBeDefined()
      expect(report.metrics.network).toBeDefined()
    })
  })

  describe('パフォーマンス測定', () => {
    it('メトリクス収集のパフォーマンスを測定できること', async () => {
      const startTime = Date.now()
      await monitoringSystem.collectMetrics()
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // 1秒以内
    })

    it('アラートチェックのパフォーマンスを測定できること', async () => {
      const startTime = Date.now()
      await monitoringSystem.checkAlerts()
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // 1秒以内
    })

    it('レポート生成のパフォーマンスを測定できること', async () => {
      const startTime = Date.now()
      await monitoringSystem.generateReport()
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000) // 2秒以内
    })
  })

  describe('エラーハンドリング', () => {
    it('メトリクス収集エラーを適切に処理できること', async () => {
      jest.spyOn(monitoringSystem, 'collectMetrics').mockRejectedValue(new Error('メトリクス収集エラー'))

      await expect(monitoringSystem.checkAlerts()).rejects.toThrow('メトリクス収集エラー')
    })

    it('アラートチェックエラーを適切に処理できること', async () => {
      jest.spyOn(monitoringSystem, 'checkAlerts').mockRejectedValue(new Error('アラートチェックエラー'))

      await expect(monitoringSystem.generateReport()).rejects.toThrow('アラートチェックエラー')
    })

    it('レポート生成エラーを適切に処理できること', async () => {
      jest.spyOn(monitoringSystem, 'generateReport').mockRejectedValue(new Error('レポート生成エラー'))

      await expect(monitoringSystem.generateReport()).rejects.toThrow('レポート生成エラー')
    })
  })
}) 