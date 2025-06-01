import fs from 'fs-extra'
import path from 'path'
import { format } from 'date-fns'

/**
 * ログレベル
 */
export type LogLevel = 'info' | 'error' | 'warn' | 'debug'

/**
 * ログエントリ
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
}

/**
 * ログ統計
 */
export interface LogStats {
  total: number
  levels: Record<LogLevel, number>
  errorRate: number
}

/**
 * ログ設定
 */
export interface LoggerConfig {
  logDir?: string
  logPath?: string  // 下位互換性のため追加
  maxLogFiles?: number
  maxLogSize?: number
  level?: LogLevel
}

/**
 * ロガークラス
 * アプリケーション全体のログ出力を管理
 */
export class Logger {
  private static instance: Logger | null = null
  private logDir: string
  private maxLogFiles: number = 30
  private maxLogSize: number = 10 * 1024 * 1024 // 10MB
  private initialized: boolean = false

  constructor(config?: LoggerConfig) {
    this.logDir = config?.logDir || config?.logPath || path.join(process.cwd(), 'logs')
    this.maxLogFiles = config?.maxLogFiles || 30
    this.maxLogSize = config?.maxLogSize || (10 * 1024 * 1024)
  }

  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(logDir?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger({ logDir })
    }
    return Logger.instance
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      await this.ensureLogDir()
      this.initialized = true
    } catch (error) {
      console.error('Logger初期化エラー:', error)
      throw error
    }
  }

  /**
   * ログディレクトリの確保
   */
  private async ensureLogDir(): Promise<void> {
    await fs.ensureDir(this.logDir)
  }

  /**
   * ログファイルパスの取得
   */
  private getLogFilePath(): string {
    const date = format(new Date(), 'yyyy-MM-dd')
    return path.join(this.logDir, `app-${date}.log`)
  }

  /**
   * ログエントリの作成
   */
  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS'),
      level,
      message,
      data
    }
  }

  /**
   * ログの書き込み
   */
  private async writeLog(entry: LogEntry): Promise<void> {
    try {
      await this.ensureLogDir()
      const logLine = JSON.stringify(entry) + '\n'
      const logFilePath = this.getLogFilePath()
      await fs.appendFile(logFilePath, logLine)
      await this.rotateLogsIfNeeded()
    } catch (error) {
      console.error('ログファイルの書き込みに失敗しました:', error)
      // ファイル書き込みエラーでも処理を継続
    }
  }

  /**
   * ログローテーション
   */
  private async rotateLogsIfNeeded(): Promise<void> {
    try {
      const logFiles = await fs.readdir(this.logDir)
      const appLogFiles = logFiles
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .sort()

      // 古いログファイルの削除
      if (appLogFiles.length > this.maxLogFiles) {
        const filesToDelete = appLogFiles.slice(0, appLogFiles.length - this.maxLogFiles)
        for (const file of filesToDelete) {
          await fs.remove(path.join(this.logDir, file))
        }
      }

      // ファイルサイズチェック
      const currentLogFile = this.getLogFilePath()
      if (await fs.pathExists(currentLogFile)) {
        const stats = await fs.stat(currentLogFile)
        if (stats.size > this.maxLogSize) {
          const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss')
          const rotatedFile = path.join(this.logDir, `app-${timestamp}.log`)
          await fs.move(currentLogFile, rotatedFile)
        }
      }
    } catch (error) {
      console.error('ログローテーションに失敗しました:', error)
    }
  }

  /**
   * ログレベルの検証
   */
  private validateLogLevel(level: string): level is LogLevel {
    return ['info', 'error', 'warn', 'debug'].includes(level)
  }

  /**
   * メッセージの検証
   */
  private validateMessage(message: string): void {
    if (!message || message.trim() === '') {
      throw new Error('メッセージは空にできません')
    }
  }

  /**
   * 汎用ログメソッド
   */
  async log(level: LogLevel, message: string, data?: any): Promise<void> {
    if (!this.validateLogLevel(level)) {
      throw new Error('無効なログレベル')
    }
    this.validateMessage(message)

    const entry = this.createLogEntry(level, message, data)
    await this.writeLog(entry)
  }

  /**
   * 情報ログの出力
   */
  async info(message: string, data?: any): Promise<void> {
    console.log(`[INFO] ${message}`, data ? data : '')
    await this.log('info', message, data)
  }

  /**
   * エラーログの出力 - 統一されたシグネチャ
   */
  async error(message: string, error?: Error | any): Promise<void> {
    console.error(`[ERROR] ${message}`, error || '')
    
    let logData: any = undefined
    if (error) {
      if (error instanceof Error) {
        logData = {
          error: error.message,
          stack: error.stack
        }
      } else {
        logData = error
      }
    }
    
    await this.log('error', message, logData)
  }

  /**
   * 警告ログの出力
   */
  async warn(message: string, data?: any): Promise<void> {
    console.warn(`[WARN] ${message}`, data ? data : '')
    await this.log('warn', message, data)
  }

  /**
   * デバッグログの出力
   */
  async debug(message: string, data?: any): Promise<void> {
    console.debug(`[DEBUG] ${message}`, data ? data : '')
    await this.log('debug', message, data)
  }

  /**
   * ログ検索
   */
  async searchLogs(
    keyword: string,
    level?: LogLevel,
    startDate?: Date,
    endDate?: Date
  ): Promise<string[]> {
    try {
      const logFiles = await fs.readdir(this.logDir)
      const appLogFiles = logFiles
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .sort()

      const results: string[] = []

      for (const file of appLogFiles) {
        const filePath = path.join(this.logDir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const lines = content.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const entry: LogEntry = JSON.parse(line)
            
            // キーワードフィルタ
            if (!entry.message.includes(keyword)) continue
            
            // レベルフィルタ
            if (level && entry.level !== level) continue
            
            // 日付フィルタ
            const entryDate = new Date(entry.timestamp)
            if (startDate && entryDate < startDate) continue
            if (endDate && entryDate > endDate) continue
            
            results.push(line)
          } catch (parseError) {
            // JSON解析エラーは無視
          }
        }
      }

      return results
    } catch (error) {
      console.error('ログ検索に失敗しました:', error)
      return []
    }
  }

  /**
   * ログ統計の取得
   */
  async getLogStats(): Promise<LogStats> {
    try {
      const logFiles = await fs.readdir(this.logDir)
      const appLogFiles = logFiles
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))

      const levels: Record<LogLevel, number> = {
        info: 0,
        error: 0,
        warn: 0,
        debug: 0
      }
      let total = 0

      for (const file of appLogFiles) {
        const filePath = path.join(this.logDir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const lines = content.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const entry: LogEntry = JSON.parse(line)
            levels[entry.level]++
            total++
          } catch (parseError) {
            // JSON解析エラーは無視
          }
        }
      }

      const errorRate = total > 0 ? levels.error / total : 0

      return {
        total,
        levels,
        errorRate
      }
    } catch (error) {
      console.error('ログ統計の取得に失敗しました:', error)
      return {
        total: 0,
        levels: { info: 0, error: 0, warn: 0, debug: 0 },
        errorRate: 0
      }
    }
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    // 現在の実装では特に何もしない
    // 必要に応じてリソースの解放などを行う
  }

  /**
   * インスタンスのリセット（テスト用）
   */
  static reset(): void {
    Logger.instance = null
  }
} 