export interface LoggerConfig {
  logDir: string
  maxLogSize?: number
  maxLogFiles?: number
  cacheSize?: number
  cacheTTL?: number
}

export interface LogEntry {
  level: string
  message: string
  timestamp: Date
  metadata?: Record<string, unknown>
}
