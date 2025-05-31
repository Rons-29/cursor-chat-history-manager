import { v4 as uuidv4 } from 'uuid'
import fs from 'fs-extra'
import path from 'path'
import type { FSWatcher } from 'chokidar'
import chokidar from 'chokidar'
import { CursorLogConfig, IntegrationError, IntegratedLog } from '../types/integration'

export class CursorLogService {
  private config: CursorLogConfig
  private watcher: FSWatcher | null = null
  private isWatching: boolean = false
  private lastProcessedTimestamp: number = 0

  constructor(config: CursorLogConfig) {
    this.config = {
      ...config,
      enabled: config.enabled ?? true,
      watchPath: config.watchPath ?? '~/.cursor/logs',
      autoImport: config.autoImport ?? true,
      syncInterval: config.syncInterval ?? 300,
      batchSize: config.batchSize ?? 100,
      retryAttempts: config.retryAttempts ?? 3
    }
  }

  async initialize(): Promise<void> {
    try {
      await fs.ensureDir(this.config.watchPath)
      this.lastProcessedTimestamp = Date.now()
    } catch (error) {
      throw this.createError('INIT_ERROR', 'Failed to initialize CursorLogService', error)
    }
  }

  async startWatching(): Promise<void> {
    if (this.isWatching) {
      return
    }

    try {
      this.watcher = chokidar.watch(this.config.watchPath, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        }
      })

      this.watcher
        .on('add', this.handleNewLog.bind(this))
        .on('change', this.handleLogChange.bind(this))
        .on('error', this.handleError.bind(this))

      this.isWatching = true
    } catch (error) {
      throw this.createError('WATCH_ERROR', 'Failed to start watching logs', error)
    }
  }

  async stopWatching(): Promise<void> {
    if (!this.isWatching || !this.watcher) {
      return
    }

    try {
      await this.watcher.close()
      this.watcher = null
      this.isWatching = false
    } catch (error) {
      throw this.createError('STOP_ERROR', 'Failed to stop watching logs', error)
    }
  }

  private async handleNewLog(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath)
      if (stats.mtimeMs <= this.lastProcessedTimestamp) {
        return
      }

      const content = await fs.readFile(filePath, 'utf-8')
      await this.processLog(filePath, content)
      this.lastProcessedTimestamp = stats.mtimeMs
    } catch (error) {
      this.handleError(error)
    }
  }

  private async handleLogChange(filePath: string): Promise<void> {
    await this.handleNewLog(filePath)
  }

  private async processLog(filePath: string, content: string): Promise<void> {
    try {
      const logLines = content.split('\n').filter(line => line.trim())
      const processedLogs: IntegratedLog[] = []

      for (const line of logLines) {
        try {
          const log = this.parseLogLine(line, filePath)
          if (log) {
            processedLogs.push(log)
          }
        } catch (error) {
          console.warn(`Failed to parse log line: ${line}`, error)
        }
      }

      if (processedLogs.length > 0) {
        await this.saveLogs(processedLogs)
      }
    } catch (error) {
      throw this.createError('PROCESS_ERROR', 'Failed to process log file', error)
    }
  }

  private parseLogLine(line: string, filePath: string): IntegratedLog | null {
    try {
      const logData = JSON.parse(line)
      return {
        id: uuidv4(),
        timestamp: new Date(logData.timestamp || Date.now()),
        type: 'cursor',
        content: logData.message || line,
        metadata: {
          project: logData.project || path.basename(path.dirname(filePath)),
          tags: logData.tags || [],
          source: 'cursor',
          filePath,
          ...logData.metadata
        }
      }
    } catch {
      // JSONとして解析できない場合は、プレーンテキストとして処理
      return {
        id: uuidv4(),
        timestamp: new Date(),
        type: 'cursor',
        content: line,
        metadata: {
          project: path.basename(path.dirname(filePath)),
          tags: [],
          source: 'cursor',
          filePath
        }
      }
    }
  }

  private async saveLogs(logs: IntegratedLog[]): Promise<void> {
    const logDir = path.join(this.config.watchPath, 'processed')
    await fs.ensureDir(logDir)

    const batchSize = this.config.batchSize || 100
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize)
      const batchFile = path.join(logDir, `batch_${Date.now()}_${i}.json`)
      await fs.writeJson(batchFile, batch, { spaces: 2 })
    }
  }

  private handleError(error: any): void {
    const integrationError = this.createError('WATCH_ERROR', 'Error watching logs', error)
    console.error(integrationError)
    // TODO: エラー通知の実装
  }

  private createError(code: string, message: string, originalError?: any): IntegrationError {
    const error = new Error(message) as IntegrationError
    error.code = code
    error.details = originalError
    error.timestamp = new Date()
    return error
  }
} 