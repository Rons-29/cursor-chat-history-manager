import { EventEmitter } from 'events'
import type { MetricConfig, MetricValue, Report, ReportPeriod, GroupedAlert } from '../types/monitoring.js'
import { Logger } from '../server/utils/Logger.js'
import { AlertNotifier } from './AlertNotifier.js'
import type { ChatSession } from '../types/index.js'

type MetricType = 'counter' | 'gauge' | 'histogram'
type AlertCondition = '>' | '<' | '>=' | '<=' | '=='
type AlertSeverity = 'info' | 'warning' | 'error'
type ReportFormat = 'json' | 'csv' | 'html'
type ErrorLevel = 'error' | 'warn' | 'info' | 'debug'

interface AlertConfig {
  condition: AlertCondition
  threshold: number
  message: string
  severity: AlertSeverity
}

interface Metric {
  type: MetricType
  value: number
  timestamp: Date
  labels: Record<string, string>
  name: string
  config: MetricConfig
  alerts: Alert[]
  values: MetricValue[]
}

interface Alert {
  condition: AlertCondition
  threshold: number
  message: string
  enabled: boolean
  severity: AlertSeverity
}

interface ReportOptions {
  startTime?: Date
  endTime?: Date
  format?: ReportFormat
  metrics?: string[]
}

interface MemoryMonitoringOptions {
  threshold: number
  interval: number
}

interface MonitorConfig {
  alertCooldown?: number
  alertGrouping?: {
    enabled: boolean
    timeWindow: number
  }
}

interface DashboardConfig {
  metrics: MetricConfig[]
  alerts: AlertConfig[]
  refreshInterval: number
  retentionPeriod: number
}

export class Monitor extends EventEmitter {
  private metrics: Map<string, Metric> = new Map()
  private alerts: Map<string, Alert> = new Map()
  private logger: Logger
  private interval: number
  private dashboardConfig: DashboardConfig
  private alertNotifier: AlertNotifier
  private memoryMonitoringInterval?: NodeJS.Timeout

  constructor(logger: Logger, config?: MonitorConfig) {
    super()
    this.logger = logger
    this.interval = 1000
    this.dashboardConfig = {
      refreshInterval: 1000,
      metrics: [],
      alerts: [],
      retentionPeriod: 24 * 60 * 60 * 1000
    }
    this.alertNotifier = new AlertNotifier({
      cooldownPeriod: config?.alertCooldown,
      grouping: config?.alertGrouping
    })

    this.initializeMetrics()
  }

  private initializeMetrics(): void {
    for (const config of this.dashboardConfig.metrics) {
      this.registerMetric(config.name, config.type as MetricType)
    }
  }

  /**
   * メトリクスを登録します
   * @param name メトリクス名
   * @param type メトリクスのタイプ
   */
  async registerMetric(name: string, type: MetricType): Promise<void> {
    if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error('無効なメトリクス名です')
    }

    if (!['counter', 'gauge', 'histogram'].includes(type)) {
      throw new Error('無効なメトリクスタイプです')
    }

    if (this.metrics.has(name)) {
      throw new Error(`メトリクス "${name}" は既に登録されています`)
    }

    const metric: Metric = {
      type,
      value: 0,
      timestamp: new Date(),
      labels: {},
      name,
      config: { name, type },
      alerts: [],
      values: []
    }

    this.metrics.set(name, metric)
    this.logger.info(`メトリクスを登録: ${name} (${type})`)
  }

  /**
   * メトリクス値を記録します
   * @param name メトリクス名
   * @param value メトリクス値
   * @param labels ラベル
   */
  async recordMetric(name: string, value: number, labels: Record<string, string> = {}): Promise<void> {
    const metric = this.metrics.get(name)
    if (!metric) {
      throw new Error(`メトリクス ${name} は登録されていません`)
    }

    if (value < 0 || isNaN(value) || !isFinite(value)) {
      throw new Error('無効なメトリクス値です')
    }

    metric.value = value
    metric.timestamp = new Date()
    metric.labels = { ...metric.labels, ...labels }

    await this.checkAlerts(name, value)
    this.logger.debug(`メトリクスを記録: ${name} = ${value}`)
  }

  /**
   * アラートを設定します
   * @param name メトリクス名
   * @param config アラート設定
   */
  async configureAlert(name: string, config: AlertConfig): Promise<void> {
    const metric = this.metrics.get(name)
    if (!metric) {
      throw new Error(`メトリクス "${name}" は登録されていません`)
    }

    this.alerts.set(name, {
      condition: config.condition,
      threshold: config.threshold,
      message: config.message,
      enabled: true,
      severity: config.severity
    })
    this.logger.info(`アラートを設定: ${name} ${config.condition} ${config.threshold}`)
  }

  /**
   * アラート条件をチェックします
   * @param name メトリクス名
   * @param value メトリクス値
   */
  private async checkAlerts(name: string, value: number): Promise<void> {
    const alert = this.alerts.get(name)
    if (!alert || !alert.enabled) return

    let triggered = false
    switch (alert.condition) {
      case '>':
        triggered = value > alert.threshold
        break
      case '<':
        triggered = value < alert.threshold
        break
      case '>=':
        triggered = value >= alert.threshold
        break
      case '<=':
        triggered = value <= alert.threshold
        break
      case '==':
        triggered = value === alert.threshold
        break
    }

    if (triggered) {
      this.alertNotifier.notify({
        metric: name,
        value,
        config: {
          condition: alert.condition,
          threshold: alert.threshold,
          message: alert.message,
          severity: alert.severity
        },
        timestamp: new Date(),
        severity: alert.severity
      })
      this.logger.warn(`アラート: ${name} が ${alert.condition} ${alert.threshold} を超えました (現在値: ${value})`)
    }
  }

  /**
   * メトリクスの値を取得します
   * @param name メトリクス名
   * @returns メトリクスの値の配列
   */
  getMetricValues(name: string): MetricValue[] {
    const metric = this.metrics.get(name)
    if (!metric) {
      throw new Error(`メトリクス "${name}" は登録されていません`)
    }
    return metric.values
  }

  /**
   * レポートを生成します
   * @param period レポート期間
   * @returns レポート
   */
  generateReport(period: ReportPeriod = { startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), endTime: new Date() }): Report {
    const now = new Date()
    const startTime = period.startTime
    let endTime = period.endTime

    if (endTime > now) {
      endTime = now
    }

    const report: Report = {
      metrics: {}
    }

    for (const [name, metric] of this.metrics.entries()) {
      const periodValues = metric.values.filter((v: MetricValue) => v.timestamp >= startTime && v.timestamp <= endTime)
      if (periodValues.length === 0) continue

      const values = periodValues.map((v: MetricValue) => v.value)
      report.metrics[name] = {
        current: values[values.length - 1] || 0,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values)
      }
    }

    return report
  }

  /**
   * 登録されているメトリクスの一覧を取得します
   * @returns メトリクスの一覧
   */
  getMetrics(): Metric[] {
    return Array.from(this.metrics.values())
  }

  getAlerts(): Alert[] {
    return Array.from(this.alerts.values())
  }

  getGroupedAlerts(): GroupedAlert[] {
    return this.alertNotifier.getGroupedAlerts()
  }

  clearAlerts(): void {
    this.alerts.clear()
    this.alertNotifier.clearAlerts()
    this.logger.info('アラート履歴をクリアしました')
  }

  /**
   * セッション監視を開始します
   * @param sessionId セッションID
   * @param session セッション情報
   */
  async startSessionMonitoring(sessionId: string, session?: ChatSession): Promise<void> {
    if (!sessionId || sessionId.trim() === '') {
      throw new Error('無効なセッションIDです')
    }

    if (session && (!session.title || session.title.trim() === '')) {
      throw new Error('無効なセッションデータです')
    }

    await this.registerMetric(`session_${sessionId}_messages`, 'counter')
    await this.registerMetric(`session_${sessionId}_duration`, 'gauge')
    
    this.logger.info(`セッション監視を開始: ${sessionId}`)
  }

  /**
   * セッション監視を停止します
   * @param sessionId セッションID
   */
  async stopSessionMonitoring(sessionId: string): Promise<void> {
    if (!this.metrics.has(`session_${sessionId}_messages`)) {
      throw new Error(`セッション "${sessionId}" の監視は開始されていません`)
    }

    this.metrics.delete(`session_${sessionId}_messages`)
    this.metrics.delete(`session_${sessionId}_duration`)
    
    this.logger.info(`セッション監視を停止: ${sessionId}`)
  }

  /**
   * メモリ使用量の監視を開始します
   * @param options 監視オプション
   */
  async startMemoryMonitoring(options: MemoryMonitoringOptions): Promise<void> {
    if (options.threshold <= 0) {
      throw new Error('無効なメモリ閾値です')
    }

    if (options.interval <= 0) {
      throw new Error('無効な監視間隔です')
    }

    await this.registerMetric('memory_usage', 'gauge')
    
    this.memoryMonitoringInterval = setInterval(async () => {
      const memoryUsage = process.memoryUsage()
      const usageInMB = memoryUsage.heapUsed / 1024 / 1024
      
      await this.recordMetric('memory_usage', usageInMB)
      
      if (usageInMB > options.threshold) {
        this.emit('memoryThresholdExceeded', { usage: usageInMB, threshold: options.threshold })
      }
    }, options.interval)

    this.logger.info(`メモリ使用量監視を開始: 閾値=${options.threshold}MB, 間隔=${options.interval}ms`)
  }

  /**
   * メモリ使用量の監視を停止します
   */
  stopMemoryMonitoring(): void {
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval)
      this.memoryMonitoringInterval = undefined
      this.logger.info('メモリ使用量監視を停止しました')
    }
  }

  /**
   * エラーをログに記録します
   * @param message エラーメッセージ
   * @param error エラーオブジェクト
   * @param level ログレベル
   */
  async logError(message: string, error?: Error, level: ErrorLevel = 'error'): Promise<void> {
    if (!error) {
      throw new Error('エラーオブジェクトは必須です')
    }

    if (!['error', 'warn', 'info', 'debug'].includes(level)) {
      throw new Error('無効なエラーレベルです')
    }

    switch (level) {
      case 'error':
        this.logger.error(message, error)
        break
      case 'warn':
        this.logger.warn(message, error)
        break
      case 'info':
        this.logger.info(message, error)
        break
      case 'debug':
        this.logger.debug(message, error)
        break
    }

    await this.recordMetric('error_count', 1)
  }
} 