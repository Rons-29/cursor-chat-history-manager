import type { Alert } from '../types/monitoring.js'

export class AlertNotifier {
  private alerts: Alert[] = []
  private subscribers: Array<(alert: Alert) => void> = []

  /**
   * アラートを送信
   */
  sendAlert(alert: Alert): void {
    this.alerts.push(alert)

    // 購読者に通知
    this.subscribers.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('アラート通知エラー:', error)
      }
    })

    // 古いアラートを削除（最新500件を保持）
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(-500)
    }
  }

  /**
   * アラート購読
   */
  subscribe(callback: (alert: Alert) => void): () => void {
    this.subscribers.push(callback)

    // 購読解除関数を返す
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  /**
   * アラート一覧を取得
   */
  getAlerts(): Alert[] {
    return this.alerts
  }

  /**
   * 未確認アラートを取得
   */
  getUnacknowledgedAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.acknowledged)
  }

  /**
   * アラートを確認済みにする
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      return true
    }
    return false
  }

  /**
   * 重要度別アラート数を取得
   */
  getAlertCounts(): Record<string, number> {
    const counts = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    }

    this.alerts.forEach(alert => {
      counts[alert.severity]++
    })

    return counts
  }

  /**
   * アラートをクリア
   */
  clearAlerts(): void {
    this.alerts = []
  }

  /**
   * 緊急アラートを作成
   */
  createCriticalAlert(title: string, message: string, source: string): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      severity: 'critical',
      timestamp: new Date(),
      source,
      acknowledged: false,
    }

    this.sendAlert(alert)
  }

  /**
   * 警告アラートを作成
   */
  createWarningAlert(title: string, message: string, source: string): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      severity: 'warning',
      timestamp: new Date(),
      source,
      acknowledged: false,
    }

    this.sendAlert(alert)
  }

  /**
   * 情報アラートを作成
   */
  createInfoAlert(title: string, message: string, source: string): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      severity: 'info',
      timestamp: new Date(),
      source,
      acknowledged: false,
    }

    this.sendAlert(alert)
  }
}
