import { Monitor } from '../../utils/Monitor.js'
import { Logger } from '../../utils/Logger.js'
import { performance } from 'perf_hooks'

describe('モニタリングシステムパフォーマンステスト', () => {
  let monitor: Monitor
  let logger: Logger

  beforeEach(() => {
    logger = new Logger('info')
    monitor = new Monitor(logger)
  })

  it('大量のメトリクス登録時のパフォーマンス', () => {
    const startTime = performance.now()
    const metricCount = 1000

    for (let i = 0; i < metricCount; i++) {
      monitor.registerMetric(`metric_${i}`, 'gauge', {
        labels: { type: 'test' },
      })
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // 1メトリクスあたり1ms未満であることを確認
    expect(duration / metricCount).toBeLessThan(1)
  })

  it('大量のメトリクス記録時のパフォーマンス', () => {
    const metricCount = 100
    const recordCount = 1000

    // メトリクスの登録
    for (let i = 0; i < metricCount; i++) {
      monitor.registerMetric(`metric_${i}`, 'gauge', {
        labels: { type: 'test' },
      })
    }

    const startTime = performance.now()

    // メトリクスの記録
    for (let i = 0; i < recordCount; i++) {
      const metricIndex = i % metricCount
      monitor.recordMetric(`metric_${metricIndex}`, Math.random() * 100, {
        type: 'test',
      })
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // 1記録あたり0.1ms未満であることを確認
    expect(duration / recordCount).toBeLessThan(0.1)
  })

  it('大量のアラート設定時のパフォーマンス', () => {
    const startTime = performance.now()
    const alertCount = 1000

    for (let i = 0; i < alertCount; i++) {
      monitor.configureAlert(`metric_${i}`, {
        condition: '>',
        threshold: 80,
        severity: 'warning',
        message: `アラート ${i}`,
      })
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // 1アラートあたり0.5ms未満であることを確認
    expect(duration / alertCount).toBeLessThan(0.5)
  })

  it('レポート生成時のパフォーマンス', async () => {
    const metricCount = 100
    const recordCount = 1000

    // メトリクスの登録と記録
    for (let i = 0; i < metricCount; i++) {
      monitor.registerMetric(`metric_${i}`, 'gauge', {
        labels: { type: 'test' },
      })
    }

    for (let i = 0; i < recordCount; i++) {
      const metricIndex = i % metricCount
      monitor.recordMetric(`metric_${metricIndex}`, Math.random() * 100, {
        type: 'test',
      })
    }

    const startTime = performance.now()
    await monitor.generateReport()
    const endTime = performance.now()
    const duration = endTime - startTime

    // レポート生成が1秒未満であることを確認
    expect(duration).toBeLessThan(1000)
  })

  it('メモリ使用量の測定', () => {
    const initialMemory = process.memoryUsage().heapUsed
    const metricCount = 1000
    const recordCount = 10000

    // メトリクスの登録と記録
    for (let i = 0; i < metricCount; i++) {
      monitor.registerMetric(`metric_${i}`, 'gauge', {
        labels: { type: 'test' },
      })
    }

    for (let i = 0; i < recordCount; i++) {
      const metricIndex = i % metricCount
      monitor.recordMetric(`metric_${metricIndex}`, Math.random() * 100, {
        type: 'test',
      })
    }

    const finalMemory = process.memoryUsage().heapUsed
    const memoryUsed = finalMemory - initialMemory

    // メモリ使用量が100MB未満であることを確認
    expect(memoryUsed).toBeLessThan(100 * 1024 * 1024)
  })
}) 