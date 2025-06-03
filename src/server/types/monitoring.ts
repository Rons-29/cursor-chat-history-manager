// 監視システムの型定義

// レポート期間型
export type ReportPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly'

export interface Metric {
  id: string
  name: string
  value: number
  unit: string
  timestamp: Date
  type: 'counter' | 'gauge' | 'histogram'
  tags?: Record<string, string>
}

export interface Report {
  id: string
  title: string
  period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  startTime: Date
  endTime: Date
  metrics: Metric[]
  summary: {
    totalEvents: number
    averageValue: number
    minValue: number
    maxValue: number
  }
  charts: ChartData[]
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie'
  title: string
  data: Array<{
    x: string | number
    y: number
    label?: string
  }>
  config?: {
    color?: string
    showLegend?: boolean
    showTooltip?: boolean
  }
}

export interface Alert {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  timestamp: Date
  source: string
  acknowledged: boolean
  metadata?: Record<string, any>
}

export interface MonitoringConfig {
  enabled: boolean
  interval: number
  retentionDays: number
  alertThresholds: {
    cpu: number
    memory: number
    disk: number
    errorRate: number
  }
  notifications: {
    email: boolean
    webhook: boolean
    slack: boolean
  }
}

export interface SystemStatus {
  status: 'healthy' | 'warning' | 'error' | 'critical'
  uptime: number
  version: string
  lastCheck: Date
  services: ServiceStatus[]
  resources: ResourceUsage
}

export interface ServiceStatus {
  name: string
  status: 'running' | 'stopped' | 'error'
  lastUpdate: Date
  health?: {
    cpu: number
    memory: number
    responseTime: number
  }
}

export interface ResourceUsage {
  cpu: {
    usage: number
    cores: number
    load: number[]
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  network: {
    incoming: number
    outgoing: number
  }
}
