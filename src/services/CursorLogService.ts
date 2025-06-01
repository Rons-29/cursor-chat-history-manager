import { EventEmitter } from 'events'
import fs from 'fs-extra'
import path from 'path'
import type { CursorLogConfig, CursorLog, CursorLogStats } from '../server/types/integration.js'
import { v4 as uuidv4 } from 'uuid'
import { Logger } from '../server/utils/Logger.js'
import { CacheManager } from '../utils/CacheManager.js'

export class CursorLogService extends EventEmitter {
  private config: CursorLogConfig
  private isInitialized: boolean = false
  private watcher: fs.FSWatcher | null = null
  private processedLogsDir: string
  private logger: Logger
  private cache: CacheManager<CursorLog[]>
  private maxLogSize: number
  private maxLogFiles: number

  constructor(config: CursorLogConfig, logger: Logger) {
    super()
    this.config = {
      ...config,
      enabled: config.enabled ?? true,
      watchPath: config.watchPath ?? '~/.cursor/logs',
      autoImport: config.autoImport ?? true,
      syncInterval: config.syncInterval ?? 300,
      batchSize: config.batchSize ?? 100,
      retryAttempts: config.retryAttempts ?? 3
    }
    this.processedLogsDir = path.join(this.config.watchPath, 'processed')
    this.logger = logger
    this.maxLogSize = config.maxLogSize ?? 5 * 1024 * 1024 // 5MB
    this.maxLogFiles = config.maxLogFiles ?? 5

    this.cache = new CacheManager<CursorLog[]>({
      max: config.cacheSize ?? 1000,
      maxAge: config.cacheTTL ?? 3600000, // 1時間
      updateAgeOnGet: true
    }, logger)

    this.initialize()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await fs.ensureDir(this.config.watchPath)
      await fs.ensureDir(this.processedLogsDir)
      this.isInitialized = true
    } catch (error) {
      throw new Error(`Failed to initialize CursorLogService: ${error}`)
    }
  }

  async startWatching(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      this.watcher = fs.watch(this.config.watchPath, async (eventType, filename) => {
        if (eventType === 'rename' && filename) {
          await this.processNewLog(filename)
        }
      })
    } catch (error) {
      throw new Error(`Failed to start watching: ${error}`)
    }
  }

  async stopWatching(): Promise<void> {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  private async processNewLog(filename: string): Promise<void> {
    try {
      const logPath = path.join(this.config.watchPath, filename)
      if (!await fs.pathExists(logPath)) {
        return
      }

      const logContent = await fs.readJson(logPath)
      const processedLog = this.transformLog(logContent)
      
      const processedPath = path.join(this.processedLogsDir, `${filename}.json`)
      await fs.writeJson(processedPath, processedLog, { spaces: 2 })

      this.emit('logProcessed', processedLog)
    } catch (error) {
      this.emit('error', new Error(`Failed to process log ${filename}: ${error}`))
    }
  }

  private transformLog(log: any): any {
    return {
      id: log.id || uuidv4(),
      timestamp: new Date(log.timestamp || Date.now()),
      type: 'cursor',
      content: log.content || '',
      metadata: {
        project: log.metadata?.project || '',
        tags: log.metadata?.tags || [],
        source: 'cursor',
        ...log.metadata
      }
    }
  }

  async search(options: {
    query?: string
    timeRange?: { start: Date; end: Date }
    types?: string[]
  }): Promise<CursorLog[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const processedLogsDir = path.join(this.config.watchPath, 'processed')
      if (!await fs.pathExists(processedLogsDir)) {
        return []
      }

      const logFiles = await fs.readdir(processedLogsDir)
      const logs: CursorLog[] = []

      for (const file of logFiles) {
        if (file.endsWith('.json')) {
          const log = await fs.readJson(path.join(processedLogsDir, file))
          if (this.matchesSearchCriteria(log, options)) {
            logs.push(log)
          }
        }
      }

      return logs
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to search logs: ${error.message}`)
      }
      throw new Error('Failed to search logs: Unknown error')
    }
  }

  async getStats(): Promise<CursorLogStats> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const processedLogsDir = path.join(this.config.watchPath, 'processed')
      let totalLogs = 0
      let totalSize = 0

      if (await fs.pathExists(processedLogsDir)) {
        const logFiles = await fs.readdir(processedLogsDir)
        for (const file of logFiles) {
          if (file.endsWith('.json')) {
            const filePath = path.join(processedLogsDir, file)
            const stats = await fs.stat(filePath)
            totalSize += stats.size

            const logs = await fs.readJson(filePath)
            totalLogs += Array.isArray(logs) ? logs.length : 1
          }
        }
      }

      return {
        totalLogs,
        storageSize: totalSize
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to get stats: ${error.message}`)
      }
      throw new Error('Failed to get stats: Unknown error')
    }
  }

  private matchesSearchCriteria(log: CursorLog, options: {
    query?: string
    timeRange?: { start: Date; end: Date }
    types?: string[]
  }): boolean {
    if (options.query) {
      const searchText = options.query.toLowerCase()
      if (!log.content.toLowerCase().includes(searchText)) {
        return false
      }
    }

    if (options.timeRange) {
      const logTime = new Date(log.timestamp).getTime()
      if (logTime < options.timeRange.start.getTime() || 
          logTime > options.timeRange.end.getTime()) {
        return false
      }
    }

    if (options.types && !options.types.includes(log.type)) {
      return false
    }

    return true
  }

  async log(log: Omit<CursorLog, 'id' | 'timestamp'>): Promise<CursorLog> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }
    const newLog: CursorLog = {
      id: uuidv4(),
      timestamp: new Date(),
      ...log,
      metadata: {
        ...log.metadata
      }
    }
    const filePath = path.join(this.processedLogsDir, `${newLog.id}.json`)
    await fs.writeJson(filePath, newLog, { spaces: 2 })
    return newLog
  }

  private getLogFilePath(date: Date): string {
    const dateStr = date.toISOString().split('T')[0]
    return path.join(this.config.watchPath, `cursor-${dateStr}.log`)
  }

  private async rotateLogs(): Promise<void> {
    const files = await fs.readdir(this.config.watchPath)
      .then(files => files.filter(file => file.startsWith('cursor-') && file.endsWith('.log')))
      .then(files => files.sort().reverse())

    while (files.length >= this.maxLogFiles) {
      const oldestFile = files.pop()
      if (oldestFile) {
        await fs.unlink(path.join(this.config.watchPath, oldestFile))
      }
    }
  }

  async logToFile(type: string, data: Record<string, unknown>, sessionId?: string, userId?: string): Promise<void> {
    const log: CursorLog = {
      id: uuidv4(),
      timestamp: new Date(),
      type,
      content: JSON.stringify(data),
      sessionId,
      userId
    }

    const logFile = this.getLogFilePath(new Date())
    const logLine = JSON.stringify(log) + '\n'

    try {
      await this.rotateLogs()
      await fs.appendFile(logFile, logLine)
      this.logger.debug('ログを記録しました', { type, sessionId })
    } catch (error) {
      this.logger.error('ログ記録エラー', { 
        error: error instanceof Error ? error.message : String(error), 
        type, 
        sessionId 
      })
      throw error
    }
  }

  async getLogs(
    startDate?: Date,
    endDate?: Date,
    type?: string,
    sessionId?: string,
    userId?: string
  ): Promise<CursorLog[]> {
    const cacheKey = `${startDate?.toISOString()}-${endDate?.toISOString()}-${type}-${sessionId}-${userId}`
    const cachedLogs = await this.cache.get(cacheKey)
    if (cachedLogs) {
      return cachedLogs
    }

    const logs: CursorLog[] = []
    const files = await fs.readdir(this.config.watchPath)
      .then(files => files.filter(file => file.startsWith('cursor-') && file.endsWith('.log')))
      .then(files => files.sort())

    for (const file of files) {
      const filePath = path.join(this.config.watchPath, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const log = this.transformLog(JSON.parse(line))
          if (
            (!startDate || log.timestamp >= startDate.getTime()) &&
            (!endDate || log.timestamp <= endDate.getTime()) &&
            (!type || log.type === type) &&
            (!sessionId || log.sessionId === sessionId) &&
            (!userId || log.userId === userId)
          ) {
            logs.push(log)
          }
        } catch (error) {
          this.logger.warn('ログ解析エラー', { error, line })
        }
      }
    }

    await this.cache.set(cacheKey, logs)
    return logs
  }

  async clearLogs(): Promise<void> {
    const files = await fs.readdir(this.config.watchPath)
      .then(files => files.filter(file => file.startsWith('cursor-') && file.endsWith('.log')))

    for (const file of files) {
      await fs.unlink(path.join(this.config.watchPath, file))
    }

    await this.cache.clear()
    this.logger.info('ログをクリアしました')
  }

  async getLogStats(): Promise<{
    totalLogs: number
    types: Record<string, number>
    sessions: Record<string, number>
    users: Record<string, number>
  }> {
    const logs = await this.getLogs()
    const stats = {
      totalLogs: logs.length,
      types: {} as Record<string, number>,
      sessions: {} as Record<string, number>,
      users: {} as Record<string, number>
    }

    for (const log of logs) {
      stats.types[log.type] = (stats.types[log.type] || 0) + 1
      if (log.sessionId) {
        stats.sessions[log.sessionId] = (stats.sessions[log.sessionId] || 0) + 1
      }
      if (log.userId) {
        stats.users[log.userId] = (stats.users[log.userId] || 0) + 1
      }
    }

    return stats
  }
} 