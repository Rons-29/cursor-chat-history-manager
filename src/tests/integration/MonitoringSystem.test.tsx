import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { Monitor } from '../../utils/Monitor.js'
import { AlertNotifier } from '../../utils/AlertNotifier.js'
import { Dashboard } from '../../components/Dashboard.js'
import { Logger } from '../../utils/Logger.js'

describe('モニタリングシステム統合テスト', () => {
  let monitor: Monitor
  let alertNotifier: AlertNotifier
  let logger: Logger

  beforeEach(() => {
    logger = new Logger({
      logPath: './logs',
      maxLogSize: 1024 * 1024,
      maxLogFiles: 5,
      level: 'info',
      consoleOutput: true,
      fileOutput: true
    })
    monitor = new Monitor(logger)
    alertNotifier = new AlertNotifier({
      cooldownPeriod: 1000,
      grouping: {
        enabled: true,
        timeWindow: 5000
      }
    })
  })

  describe('メトリクス収集', () => {
    it('メトリクスの収集とアラート通知が正しく連携すること', async () => {
      monitor.registerMetric('cpu', 'gauge')
      monitor.configureAlert('cpu', {
        condition: '>',
        threshold: 80,
        severity: 'warning',
        message: 'CPU使用率が高すぎます'
      })

      await act(async () => {
        monitor.recordMetric('cpu', 85)
      })

      const alerts = alertNotifier.getAlerts()
      expect(alerts.length).toBe(1)
      expect(alerts[0].metric).toBe('cpu')
      expect(alerts[0].value).toBe(85)
    })
  })

  describe('ダッシュボード表示', () => {
    it('メトリクスの詳細表示が正しく機能すること', () => {
      monitor.registerMetric('cpu', 'gauge')
      monitor.recordMetric('cpu', 85, { server: 'server1' })

      render(<Dashboard monitor={monitor} refreshInterval={1000} />)
      
      const cpuValue = screen.getByText((content) => content.includes('85'))
      const serverLabel = screen.getByText((content) => content.includes('server1'))
      
      expect(cpuValue).toBeInTheDocument()
      expect(serverLabel).toBeInTheDocument()
    })

    it('複数メトリクスの表示が正しく機能すること', () => {
      monitor.registerMetric('cpu', 'gauge')
      monitor.registerMetric('memory', 'gauge')
      monitor.recordMetric('cpu', 85)
      monitor.recordMetric('memory', 70)

      render(<Dashboard monitor={monitor} refreshInterval={1000} />)
      
      const cpuMetric = screen.getByText((content) => content.includes('CPU使用率'))
      const memoryMetric = screen.getByText((content) => content.includes('メモリ使用率'))
      
      expect(cpuMetric).toBeInTheDocument()
      expect(memoryMetric).toBeInTheDocument()
    })
  })

  describe('アラート管理', () => {
    it('アラートのグループ化が正しく機能すること', () => {
      monitor.registerMetric('cpu', 'gauge')
      monitor.registerMetric('memory', 'gauge')
      monitor.configureAlert('cpu', {
        condition: '>',
        threshold: 80,
        severity: 'warning',
        message: 'CPU使用率が高すぎます'
      })
      monitor.configureAlert('memory', {
        condition: '>',
        threshold: 90,
        severity: 'error',
        message: 'メモリ使用量が危険なレベルです'
      })

      monitor.recordMetric('cpu', 85)
      monitor.recordMetric('memory', 95)
      monitor.recordMetric('cpu', 90)

      const groupedAlerts = alertNotifier.getGroupedAlerts()
      expect(groupedAlerts.length).toBe(2)
      expect(groupedAlerts[0].count).toBe(2)
      expect(groupedAlerts[1].count).toBe(1)
    })

    it('アラートの表示が正しく機能すること', () => {
      monitor.registerMetric('cpu', 'gauge')
      monitor.configureAlert('cpu', {
        condition: '>',
        threshold: 80,
        severity: 'warning',
        message: 'CPU使用率が高すぎます'
      })
      monitor.recordMetric('cpu', 85)

      render(<Dashboard monitor={monitor} refreshInterval={1000} />)
      
      const warningText = screen.getByText((content) => content.includes('警告'))
      const alertMessage = screen.getByText((content) => content.includes('CPU使用率が高すぎます'))
      
      expect(warningText).toBeInTheDocument()
      expect(alertMessage).toBeInTheDocument()
    })

    it('複数アラートの表示が正しく機能すること', () => {
      monitor.registerMetric('cpu', 'gauge')
      monitor.registerMetric('memory', 'gauge')
      monitor.configureAlert('cpu', {
        condition: '>',
        threshold: 80,
        severity: 'warning',
        message: 'CPU使用率が高すぎます'
      })
      monitor.configureAlert('memory', {
        condition: '>',
        threshold: 90,
        severity: 'error',
        message: 'メモリ使用量が危険なレベルです'
      })

      monitor.recordMetric('cpu', 85)
      monitor.recordMetric('memory', 95)

      render(<Dashboard monitor={monitor} refreshInterval={1000} />)
      
      const warningText = screen.getByText((content) => content.includes('警告'))
      const errorText = screen.getByText((content) => content.includes('エラー'))
      const cpuAlert = screen.getByText((content) => content.includes('CPU使用率が高すぎます'))
      const memoryAlert = screen.getByText((content) => content.includes('メモリ使用量が危険なレベルです'))
      
      expect(warningText).toBeInTheDocument()
      expect(errorText).toBeInTheDocument()
      expect(cpuAlert).toBeInTheDocument()
      expect(memoryAlert).toBeInTheDocument()
    })
  })

  describe('レポート機能', () => {
    it('レポートの詳細表示が正しく機能すること', () => {
      monitor.registerMetric('cpu', 'gauge')
      monitor.registerMetric('memory', 'gauge')
      monitor.recordMetric('cpu', 85)
      monitor.recordMetric('memory', 70)

      render(<Dashboard monitor={monitor} refreshInterval={1000} />)
      
      const reportTitle = screen.getByText((content) => content.includes('24時間レポート'))
      const avgValue = screen.getByText((content) => content.includes('平均値'))
      const maxValue = screen.getByText((content) => content.includes('最大値'))
      const minValue = screen.getByText((content) => content.includes('最小値'))
      
      expect(reportTitle).toBeInTheDocument()
      expect(avgValue).toBeInTheDocument()
      expect(maxValue).toBeInTheDocument()
      expect(minValue).toBeInTheDocument()
    })

    it('レポートの期間指定が正しく機能すること', () => {
      monitor.registerMetric('cpu', 'gauge')
      monitor.recordMetric('cpu', 85)
      monitor.recordMetric('cpu', 75)

      render(<Dashboard monitor={monitor} refreshInterval={1000} />)
      
      const reportTitle = screen.getByText((content) => content.includes('過去1時間のレポート'))
      const minValue = screen.getByText((content) => content.includes('75%'))
      const maxValue = screen.getByText((content) => content.includes('85%'))
      
      expect(reportTitle).toBeInTheDocument()
      expect(minValue).toBeInTheDocument()
      expect(maxValue).toBeInTheDocument()
    })
  })

  describe('エラー処理', () => {
    it('エラー状態のUI表示が正しく機能すること', () => {
      monitor.registerMetric('cpu', 'gauge')
      monitor.recordMetric('cpu', -1)

      render(<Dashboard monitor={monitor} refreshInterval={1000} />)
      
      const errorMessage = screen.getByText((content) => content.includes('エラーが発生しました'))
      const invalidValue = screen.getByText((content) => content.includes('無効なメトリクス値: -1'))
      
      expect(errorMessage).toBeInTheDocument()
      expect(invalidValue).toBeInTheDocument()
    })
  })
}) 