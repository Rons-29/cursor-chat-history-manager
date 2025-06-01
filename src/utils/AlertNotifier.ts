import { EventEmitter } from 'events'
import type { Alert, GroupedAlert } from '../types/monitoring.js'
import { Logger } from './Logger.js'

interface AlertNotifierConfig {
  cooldownPeriod: number // ms
  grouping: {
    enabled: boolean
    timeWindow: number // ms
  }
}

export class AlertNotifier {
  private alerts: Alert[] = []
  private lastAlertTime: Map<string, number> = new Map()
  private logger: Logger
  private config: AlertNotifierConfig

  constructor(config?: Partial<AlertNotifierConfig>) {
    this.logger = new Logger({ logPath: './logs', level: 'info' })
    this.config = {
      cooldownPeriod: config?.cooldownPeriod ?? 5 * 60 * 1000, // 5分
      grouping: {
        enabled: config?.grouping?.enabled ?? true,
        timeWindow: config?.grouping?.timeWindow ?? 60 * 1000 // 1分
      }
    }
  }

  notify(alert: Alert): void {
    const now = Date.now()
    const lastTime = this.lastAlertTime.get(alert.metric) || 0
    if (now - lastTime < this.config.cooldownPeriod) {
      this.logger.debug(`アラート ${alert.metric} はクールダウン中です`)
      return
    }
    this.alerts.push(alert)
    this.lastAlertTime.set(alert.metric, now)
    this.logger.info(`アラート通知: ${alert.config.message}`)
  }

  getAlerts(): Alert[] {
    return [...this.alerts]
  }

  getGroupedAlerts(): GroupedAlert[] {
    if (!this.config.grouping.enabled) {
      return this.alerts.map(alert => ({ ...alert, count: 1 }))
    }
    const grouped = new Map<string, GroupedAlert>()
    for (const alert of this.alerts) {
      const key = `${alert.metric}-${alert.config.severity}`
      const existing = grouped.get(key)
      if (existing) {
        existing.count++
      } else {
        grouped.set(key, { ...alert, count: 1 })
      }
    }
    return Array.from(grouped.values())
  }

  clearAlerts(): void {
    this.alerts = []
    this.lastAlertTime.clear()
    this.logger.info('アラート履歴をクリアしました')
  }
} 