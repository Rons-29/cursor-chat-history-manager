import EventEmitter from 'events'
import type { Metric, Report, ReportPeriod } from '../types/monitoring.js'

export class Monitor extends EventEmitter {
  private metrics: Metric[] = []
  private reports: Report[] = []
  private isRunning = false

  /**
   * モニターを開始
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.emit('started')
  }

  /**
   * モニターを停止
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    this.emit('stopped')
  }

  /**
   * メトリクスを取得
   */
  getMetrics(): Metric[] {
    return [...this.metrics]
  }

  /**
   * メトリクスを追加
   */
  addMetric(metric: Metric): void {
    this.metrics.push(metric)

    // 古いメトリクスを削除（最新1000件を保持）
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    this.emit('metric', metric)
  }

  /**
   * レポートを生成
   */
  generateReport(period: ReportPeriod = 'daily'): Report {
    const now = new Date()
    const periodMs = this.getPeriodMs(period)
    const startTime = new Date(now.getTime() - periodMs)

    const periodMetrics = this.metrics.filter(
      metric => metric.timestamp >= startTime
    )

    const report: Report = {
      id: `report-${Date.now()}`,
      title: `System Report (${period})`,
      period,
      startTime,
      endTime: now,
      metrics: periodMetrics,
      summary: this.calculateSummary(periodMetrics),
      charts: this.generateCharts(periodMetrics, period),
    }

    this.reports.push(report)

    // 古いレポートを削除（最新100件を保持）
    if (this.reports.length > 100) {
      this.reports = this.reports.slice(-100)
    }

    this.emit('report', report)
    return report
  }

  /**
   * 期間をミリ秒に変換
   */
  private getPeriodMs(period: ReportPeriod): number {
    const periods = {
      hourly: 60 * 60 * 1000, // 1時間
      daily: 24 * 60 * 60 * 1000, // 1日
      weekly: 7 * 24 * 60 * 60 * 1000, // 1週間
      monthly: 30 * 24 * 60 * 60 * 1000, // 30日
    }
    return periods[period]
  }

  /**
   * サマリーを計算
   */
  private calculateSummary(metrics: Metric[]) {
    if (metrics.length === 0) {
      return {
        totalEvents: 0,
        averageValue: 0,
        minValue: 0,
        maxValue: 0,
      }
    }

    const values = metrics.map(m => m.value)
    return {
      totalEvents: metrics.length,
      averageValue: values.reduce((a, b) => a + b, 0) / values.length,
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    }
  }

  /**
   * チャートデータを生成
   */
  private generateCharts(metrics: Metric[], period: ReportPeriod) {
    // 時系列チャート
    const timelineChart = {
      type: 'line' as const,
      title: `Activity Timeline (${period})`,
      data: this.groupMetricsByTime(metrics, period).map(group => ({
        x: group.timestamp.toISOString(),
        y: group.count,
        label: group.timestamp.toLocaleString(),
      })),
      config: {
        color: '#3b82f6',
        showLegend: false,
        showTooltip: true,
      },
    }

    // タイプ別分布チャート
    const typeDistributionChart = {
      type: 'pie' as const,
      title: 'Metrics by Type',
      data: this.groupMetricsByType(metrics).map(group => ({
        x: group.type,
        y: group.count,
        label: `${group.type} (${group.count})`,
      })),
      config: {
        showLegend: true,
        showTooltip: true,
      },
    }

    return [timelineChart, typeDistributionChart]
  }

  /**
   * 時間別グループ化
   */
  private groupMetricsByTime(metrics: Metric[], period: ReportPeriod) {
    const groups = new Map<string, { timestamp: Date; count: number }>()

    metrics.forEach(metric => {
      const key = this.getTimeKey(metric.timestamp, period)
      const existing = groups.get(key)

      if (existing) {
        existing.count++
      } else {
        groups.set(key, {
          timestamp: this.roundToTimeUnit(metric.timestamp, period),
          count: 1,
        })
      }
    })

    return Array.from(groups.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )
  }

  /**
   * タイプ別グループ化
   */
  private groupMetricsByType(metrics: Metric[]) {
    const groups = new Map<string, number>()

    metrics.forEach(metric => {
      const count = groups.get(metric.type) || 0
      groups.set(metric.type, count + 1)
    })

    return Array.from(groups.entries()).map(([type, count]) => ({
      type,
      count,
    }))
  }

  /**
   * 時間キーを生成
   */
  private getTimeKey(timestamp: Date, period: ReportPeriod): string {
    switch (period) {
      case 'hourly':
        return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`
      case 'daily':
        return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}`
      case 'weekly':
        const weekStart = new Date(timestamp)
        weekStart.setDate(timestamp.getDate() - timestamp.getDay())
        return `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`
      case 'monthly':
        return `${timestamp.getFullYear()}-${timestamp.getMonth()}`
      default:
        return timestamp.toISOString()
    }
  }

  /**
   * 時間単位に丸める
   */
  private roundToTimeUnit(timestamp: Date, period: ReportPeriod): Date {
    const rounded = new Date(timestamp)

    switch (period) {
      case 'hourly':
        rounded.setMinutes(0, 0, 0)
        break
      case 'daily':
        rounded.setHours(0, 0, 0, 0)
        break
      case 'weekly':
        rounded.setDate(timestamp.getDate() - timestamp.getDay())
        rounded.setHours(0, 0, 0, 0)
        break
      case 'monthly':
        rounded.setDate(1)
        rounded.setHours(0, 0, 0, 0)
        break
    }

    return rounded
  }

  /**
   * 状態を取得
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      metricsCount: this.metrics.length,
      reportsCount: this.reports.length,
      lastMetric:
        this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null,
    }
  }
}
