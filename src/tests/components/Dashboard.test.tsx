import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { Dashboard } from '../../components/Dashboard'
import { Monitor } from '../../utils/Monitor.js'
import { Logger } from '../../utils/Logger.js'
import type { Metric, Report, ReportPeriod } from '../../types/monitoring.js'

class MockMonitor extends Monitor {
  private metrics: Map<string, Metric> = new Map()
  private listeners: Map<string, Set<Function>> = new Map()

  constructor() {
    const logger = new Logger({ logPath: './logs', level: 'info' })
    super(logger)
  }

  getMetrics(): Metric[] {
    return Array.from(this.metrics.values())
  }

  on(event: string, callback: Function): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(callback)
    return this
  }

  off(event: string, callback: Function): this {
    this.listeners.get(event)?.delete(callback)
    return this
  }

  emit(event: string, data: any): boolean {
    this.listeners.get(event)?.forEach(callback => callback(data))
    return true
  }

  async generateReport(period?: ReportPeriod): Promise<Report> {
    return {
      metrics: {
        cpu: { current: 0, average: 0, max: 0, min: 0 },
        memory: { current: 0, average: 0, max: 0, min: 0 }
      }
    }
  }
}

describe('Dashboard', () => {
  let monitor: MockMonitor

  beforeEach(() => {
    monitor = new MockMonitor()
  })

  it('メトリクスの表示が正しく行われること', () => {
    render(<Dashboard monitor={monitor} refreshInterval={1000} />)
    
    expect(screen.getByText('システムモニタリングダッシュボード')).toBeInTheDocument()
    expect(screen.getByText('cpu')).toBeInTheDocument()
    expect(screen.getByText('memory')).toBeInTheDocument()
  })

  it('メトリクスの更新が正しく行われること', () => {
    render(<Dashboard monitor={monitor} refreshInterval={1000} />)

    act(() => {
      monitor.emit('metric', monitor.getMetrics())
    })

    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('60')).toBeInTheDocument()
    expect(screen.getByText('70')).toBeInTheDocument()
  })

  it('アラートの表示が正しく行われること', () => {
    render(<Dashboard monitor={monitor} refreshInterval={1000} />)

    act(() => {
      monitor.emit('alert', {
        metric: 'cpu',
        message: 'CPU使用率が高すぎます',
        severity: 'warning',
        timestamp: new Date(),
      })
    })

    expect(screen.getByText('警告')).toBeInTheDocument()
    expect(screen.getByText('CPU使用率が高すぎます')).toBeInTheDocument()
  })

  it('レポートの表示が正しく行われること', async () => {
    render(<Dashboard monitor={monitor} refreshInterval={1000} />)
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(screen.getByText('レポート')).toBeInTheDocument()
    expect(screen.getByText('平均値')).toBeInTheDocument()
    expect(screen.getByText('最大値')).toBeInTheDocument()
    expect(screen.getByText('最小値')).toBeInTheDocument()
  })
}) 