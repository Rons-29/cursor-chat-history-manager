import { EventEmitter } from 'events'
import fs from 'fs-extra'
import path from 'path'
import { CursorLogConfig } from '../types/integration'

export class CursorLogService extends EventEmitter {
  private config: CursorLogConfig
  private isInitialized: boolean = false
  private watcher: fs.FSWatcher | null = null
  private processedLogsDir: string

  constructor(config: CursorLogConfig) {
    super()
    this.config = {
      enabled: true,
      watchPath: '~/.cursor/logs',
      autoImport: true,
      syncInterval: 300,
      batchSize: 100,
      retryAttempts: 3,
      ...config
    }
    this.processedLogsDir = path.join(this.config.watchPath, 'processed')
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
      id: log.id || crypto.randomUUID(),
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
} 