import fs from 'fs-extra'
import path from 'path'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: unknown
}

export interface LoggerConfig {
  logPath: string
  maxLogSize?: number
  maxLogFiles?: number
  level?: LogLevel
  consoleOutput?: boolean
  fileOutput?: boolean
  format?: 'json' | 'text'
}

export class Logger {
  private logDir: string
  private maxLogSize: number
  private maxLogFiles: number
  private currentLogFile: string
  private logLevel: LogLevel
  private consoleOutput: boolean
  private fileOutput: boolean
  private format: 'json' | 'text'
  private logs: LogEntry[] = []
  private initialized: boolean = false

  constructor(config: LoggerConfig) {
    this.logDir = config.logPath
    this.maxLogSize = config.maxLogSize ?? 5 * 1024 * 1024 // 5MB
    this.maxLogFiles = config.maxLogFiles ?? 5
    this.logLevel = config.level ?? 'info'
    this.consoleOutput = config.consoleOutput ?? true
    this.fileOutput = config.fileOutput ?? true
    this.format = config.format ?? 'json'
    this.currentLogFile = this.getLogFilePath()
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.fileOutput) {
      await fs.ensureDir(this.logDir)
      await this.rotateLogsIfNeeded()
    }
    this.initialized = true
  }

  private getLogFilePath(): string {
    const date = format(new Date(), 'yyyy-MM-dd')
    return path.join(this.logDir, `app-${date}.log`)
  }

  private async rotateLogsIfNeeded(): Promise<void> {
    if (!await fs.pathExists(this.currentLogFile)) {
      return
    }

    const stats = await fs.stat(this.currentLogFile)
    if (stats.size >= this.maxLogSize) {
      await this.rotateLogs()
    }
  }

  private async rotateLogs(): Promise<void> {
    const files = (await fs.readdir(this.logDir))
      .filter(file => file.startsWith('app-') && file.endsWith('.log'))
      .sort()
      .reverse()

    // 古いログファイルを削除
    while (files.length >= this.maxLogFiles) {
      const oldestFile = files.pop()
      if (oldestFile) {
        await fs.remove(path.join(this.logDir, oldestFile))
      }
    }

    // 現在のログファイルをリネーム
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
    const newPath = path.join(this.logDir, `app-${timestamp}.log`)
    await fs.move(this.currentLogFile, newPath)
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.format === 'json') {
      return JSON.stringify(entry) + '\n'
    }

    const { timestamp, level, message, data } = entry
    let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`
    if (data) {
      logMessage += ` ${JSON.stringify(data)}`
    }
    return logMessage + '\n'
  }

  private async log(level: LogLevel, message: string, data?: unknown): Promise<void> {
    if (!this.shouldLog(level)) {
      return
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS', { locale: ja })
    const entry: LogEntry = {
      timestamp,
      level,
      message,
      data
    }

    this.logs.push(entry)

    if (this.consoleOutput) {
      const consoleMessage = this.formatLogEntry(entry)
      switch (level) {
        case 'debug':
          console.debug(consoleMessage)
          break
        case 'info':
          console.info(consoleMessage)
          break
        case 'warn':
          console.warn(consoleMessage)
          break
        case 'error':
          console.error(consoleMessage)
          break
      }
    }

    if (this.fileOutput) {
      await this.rotateLogsIfNeeded()
      await fs.appendFile(this.currentLogFile, this.formatLogEntry(entry))
    }
  }

  async debug(message: string, data?: unknown): Promise<void> {
    await this.log('debug', message, data)
  }

  async info(message: string, data?: unknown): Promise<void> {
    await this.log('info', message, data)
  }

  async warn(message: string, data?: unknown): Promise<void> {
    await this.log('warn', message, data)
  }

  async error(message: string, data?: unknown): Promise<void> {
    await this.log('error', message, data)
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  setFormat(format: 'json' | 'text'): void {
    this.format = format
  }
} 