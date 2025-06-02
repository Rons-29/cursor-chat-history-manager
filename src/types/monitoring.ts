export type MetricLabel = {
  [key: string]: string | number | boolean
}

export interface MetricConfig {
  name: string
  type: string
  description?: string
  labels?: Record<string, string>
}

export interface MetricValue {
  value: number
  timestamp: Date
  labels?: Record<string, string>
}

export type AlertCondition = '>' | '<' | '>=' | '<=' | '=='

export interface AlertConfig {
  condition: AlertCondition
  threshold: number
  severity: 'info' | 'warning' | 'error'
  message: string
}

export interface Alert {
  metric: string
  value: number
  config: AlertConfig
  timestamp: Date
  severity: 'info' | 'warning' | 'error'
}

export interface Metric {
  name: string
  type: string
  description?: string
  labels: Record<string, string>
  config: MetricConfig
  alerts: Alert[]
  values: MetricValue[]
}

export type GroupedAlert = Alert & {
  count: number
}

export interface ReportPeriod {
  startTime: Date
  endTime: Date
}

export interface Report {
  metrics: {
    [key: string]: {
      current: number
      average: number
      max: number
      min: number
    }
  }
}
