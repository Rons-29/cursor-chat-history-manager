/**
 * Cursor Watcher Service
 * .mdcルール準拠: Cursorチャット履歴の自動監視・インポート機能
 * SQLiteデータベース（state.vscdb）対応版
 */

import { EventEmitter } from 'events'
import fs from 'fs-extra'
import path from 'path'
import { watch, type FSWatcher } from 'fs'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import type { ChatHistoryService } from './ChatHistoryService.js'
import type { ConfigService } from './ConfigService.js'
import type { ChatSession, Message } from '../types/index.js'
import { Logger } from '../server/utils/Logger.js'
import type { CursorChatData, CursorConfig } from '../types/cursor.js'

export interface CursorWatcherStatus {
  isWatching: boolean
  isActive: boolean
  cursorPath?: string
  lastScan?: Date
  sessionsFound: number
  processedCount: number
  errorCount: number
  error?: string
}

/**
 * Cursorチャット履歴の監視・インポートサービス
 * SQLiteデータベース（state.vscdb）対応
 */
export class CursorWatcherService extends EventEmitter {
  private chatHistoryService: ChatHistoryService
  private configService: ConfigService
  private watcher: FSWatcher | null = null
  private isWatching = false
  private cursorPath: string
  private lastScanTime: Date | null = null
  private sessionsFound = 0
  private config: CursorConfig
  private logger: Logger
  private isInitialized: boolean = false

  constructor(chatHistoryService: ChatHistoryService, configService: ConfigService, config: CursorConfig, logger: Logger) {
    super()
    this.chatHistoryService = chatHistoryService
    this.configService = configService
    this.cursorPath = this.getDefaultCursorPath()
    this.config = {
      ...config,
      enabled: config.enabled ?? true,
      watchPath: config.watchPath ?? this.cursorPath,
      autoImport: config.autoImport ?? true,
      syncInterval: config.syncInterval ?? 300,
      batchSize: config.batchSize ?? 100,
      retryAttempts: config.retryAttempts ?? 3
    }
    this.logger = logger
  }

  /**
   * デフォルトのCursorデータパスを取得
   */
  private getDefaultCursorPath(): string {
    const os = process.platform
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''

    switch (os) {
      case 'darwin': // macOS
        return path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage')
      case 'win32': // Windows
        return path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'User', 'workspaceStorage')
      case 'linux': // Linux
        return path.join(homeDir, '.config', 'Cursor', 'User', 'workspaceStorage')
      default:
        return path.join(homeDir, '.cursor', 'workspaceStorage')
    }
  }

  /**
   * 監視を開始
   */
  async startWatching(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      // workspaceStorageディレクトリ内のstate.vscdbファイルを監視
      this.watcher = watch(this.config.watchPath, {
        recursive: true,
        persistent: true
      })

      this.watcher.on('change', async (eventType: string, filename: string | null) => {
        if (filename && filename.endsWith('state.vscdb')) {
          await this.handleFileChange(path.join(this.config.watchPath, filename))
        }
      })

      this.watcher.on('error', (error: Error) => {
        this.handleWatchError(error)
      })

      this.logger.info('Cursorログファイル監視を開始しました', { path: this.config.watchPath })
      this.isWatching = true

      // 初回スキャンを実行
      await this.scanAndImport()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      this.logger.error('監視開始エラー', { error: errorMessage })
      throw new Error(`Failed to start watching: ${errorMessage}`)
    }
  }

  /**
   * 監視を停止
   */
  async stopWatching(): Promise<void> {
    if (!this.isWatching) {
      return
    }

    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
      this.logger.info('Cursorログファイル監視を停止しました')
    }

    this.isWatching = false
    this.emit('watchStopped')
  }

  /**
   * ファイル変更ハンドラー
   */
  private async handleFileChange(filePath: string): Promise<void> {
    try {
      if (this.isCursorDbFile(filePath)) {
        await this.processCursorDbFile(filePath)
      }
    } catch (error) {
      this.logger.error('ファイル処理エラー:', error)
    }
  }

  /**
   * 監視エラーハンドラー
   */
  private handleWatchError(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err))
    this.logger.error('ファイル監視エラー:', error)
    this.emit('error', error)
  }

  /**
   * Cursorデータベースファイルかどうかを判定
   */
  private isCursorDbFile(filePath: string): boolean {
    return filePath.endsWith('state.vscdb')
  }

  /**
   * 手動スキャン・インポート
   */
  async scanAndImport(customPath?: string): Promise<number> {
    const scanPath = customPath || this.config.watchPath
    let importCount = 0

    try {
      await fs.access(scanPath)
    } catch (error) {
      throw new Error(`スキャンパスにアクセスできません: ${scanPath}`)
    }

    try {
      const entries = await fs.readdir(scanPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(scanPath, entry.name)
        
        if (entry.isDirectory()) {
          // workspaceStorageディレクトリ内のMD5ハッシュディレクトリをスキャン
          const dbFilePath = path.join(fullPath, 'state.vscdb')
          try {
            await fs.access(dbFilePath)
            await this.processCursorDbFile(dbFilePath)
            importCount++
          } catch (error) {
            // state.vscdbファイルが存在しない場合はスキップ
          }
        }
      }

      this.lastScanTime = new Date()
      this.sessionsFound = importCount
      this.emit('scanCompleted', { importCount, path: scanPath })

      return importCount
    } catch (error) {
      throw new Error(`スキャンエラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * CursorデータベースファイルからチャットデータをSQLiteで読み込み
   */
  private async processCursorDbFile(dbFilePath: string): Promise<void> {
    try {
      this.logger.info('Cursorデータベースファイルを処理中', { file: dbFilePath })

      const db = await open({
        filename: dbFilePath,
        driver: sqlite3.Database
      })

      try {
        // ItemTableからチャットデータを取得
        const rows = await db.all(`
          SELECT [key], value 
          FROM ItemTable 
          WHERE [key] IN (
            'aiService.prompts', 
            'workbench.panel.aichat.view.aichat.chatdata'
          )
        `)

        for (const row of rows) {
          try {
            const chatSessions = this.extractAllChatSessionsFromDbValueJson(row.value, row.key)
            for (const chatData of chatSessions) {
              await this.importChatSession(chatData)
              this.emit('sessionImported', { sessionId: chatData.id, file: dbFilePath })
            }
          } catch (parseError) {
            this.logger.warn('データベース値のパースに失敗', { 
              key: row.key, 
              error: parseError instanceof Error ? parseError.message : '不明なエラー' 
            })
          }
        }
      } finally {
        await db.close()
      }
    } catch (error) {
      this.logger.error(`Cursorデータベースファイル処理エラー (${dbFilePath}):`, error)
    }
  }

  /**
   * データベースの値（JSON文字列）からチャットセッションデータを抽出
   */
  private extractAllChatSessionsFromDbValueJson(valueJson: string, key: string): CursorChatData[] {
    try {
      const data = JSON.parse(valueJson)
      const sessions: CursorChatData[] = []

      if (key === 'workbench.panel.aichat.view.aichat.chatdata') {
        // チャットデータの場合
        if (Array.isArray(data)) {
          for (const item of data) {
            const sessionData = this.parsePotentialChatSessionDataFromDbValue(item)
            if (sessionData) {
              sessions.push(sessionData)
            }
          }
        } else if (typeof data === 'object' && data !== null) {
          const sessionData = this.parsePotentialChatSessionDataFromDbValue(data)
          if (sessionData) {
            sessions.push(sessionData)
          }
        }
      } else if (key === 'aiService.prompts') {
        // プロンプトデータの場合
        if (Array.isArray(data)) {
          for (const prompt of data) {
            if (prompt && typeof prompt === 'object') {
              const sessionData: CursorChatData = {
                id: prompt.id || `prompt-${Date.now()}-${Math.random()}`,
                title: prompt.title || 'Cursor Prompt',
                messages: [{
                  role: 'user',
                  content: prompt.content || prompt.text || '',
                  timestamp: prompt.timestamp || new Date().toISOString()
                }],
                createdAt: prompt.createdAt || new Date().toISOString(),
                updatedAt: prompt.updatedAt || new Date().toISOString()
              }
              sessions.push(sessionData)
            }
          }
        }
      }

      return sessions
    } catch (error) {
      this.logger.warn('JSON パースエラー', { error: error instanceof Error ? error.message : '不明なエラー' })
      return []
    }
  }

  /**
   * データベースの値からチャットセッションデータをパース
   */
  private parsePotentialChatSessionDataFromDbValue(data: any): CursorChatData | null {
    try {
      if (!data || typeof data !== 'object') {
        return null
      }

      const messages: CursorChatData['messages'] = []

      // メッセージデータの抽出
      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          if (msg && typeof msg === 'object') {
            messages.push({
              role: msg.role || 'user',
              content: msg.content || msg.text || '',
              timestamp: msg.timestamp || new Date().toISOString()
            })
          }
        }
      } else if (Array.isArray(data.conversation)) {
        for (const msg of data.conversation) {
          if (msg && typeof msg === 'object') {
            messages.push({
              role: msg.role || 'user',
              content: msg.content || msg.text || '',
              timestamp: msg.timestamp || new Date().toISOString()
            })
          }
        }
      } else if (data.content || data.text) {
        // 単一メッセージの場合
        messages.push({
          role: data.role || 'user',
          content: data.content || data.text,
          timestamp: data.timestamp || new Date().toISOString()
        })
      }

      if (messages.length === 0) {
        return null
      }

      return {
        id: data.id || `cursor-${Date.now()}-${Math.random()}`,
        title: data.title || `Cursor Chat ${new Date().toLocaleDateString()}`,
        messages,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      }
    } catch (error) {
      this.logger.warn('チャットセッションデータパースエラー', { error: error instanceof Error ? error.message : '不明なエラー' })
      return null
    }
  }

  /**
   * チャットセッションをインポート
   */
  private async importChatSession(chatData: CursorChatData): Promise<void> {
    try {
      // 既存セッションの確認
      const existingSession = await this.chatHistoryService.getSession(chatData.id)
      
      if (existingSession) {
        // 増分更新: 新しいメッセージのみ追加
        await this.updateExistingSession(existingSession, chatData)
      } else {
        // 新規セッション作成
        await this.createNewSession(chatData)
      }
    } catch (error) {
      this.logger.error('セッションインポートエラー:', error)
      throw error
    }
  }

  /**
   * 既存セッションを更新
   */
  private async updateExistingSession(existingSession: ChatSession, chatData: CursorChatData): Promise<void> {
    try {
      const existingMessageIds = new Set(existingSession.messages.map(msg => msg.id))
      const newMessages: Message[] = []

      for (const cursorMsg of chatData.messages) {
        // メッセージIDを生成（内容とタイムスタンプのハッシュベース）
        const messageId = `cursor-${Buffer.from(cursorMsg.content + cursorMsg.timestamp).toString('base64').slice(0, 16)}`
        
        if (!existingMessageIds.has(messageId)) {
          newMessages.push({
            id: messageId,
            role: cursorMsg.role as 'user' | 'assistant' | 'system',
            content: cursorMsg.content,
            timestamp: new Date(cursorMsg.timestamp),
            metadata: {
              source: 'cursor',
              originalTimestamp: cursorMsg.timestamp
            }
          })
        }
      }

      if (newMessages.length > 0) {
        for (const message of newMessages) {
          await this.chatHistoryService.addMessage(existingSession.id, {
            role: message.role,
            content: message.content,
            metadata: message.metadata
          })
        }
        this.logger.info(`既存セッションに${newMessages.length}件の新しいメッセージを追加`, { sessionId: existingSession.id })
      }
    } catch (error) {
      this.logger.error('既存セッション更新エラー:', error)
      throw error
    }
  }

  /**
   * 新規セッションを作成
   */
  private async createNewSession(chatData: CursorChatData): Promise<void> {
    try {
      const session = await this.chatHistoryService.createSession({
        id: chatData.id,
        title: chatData.title,
        messages: [],
        startTime: new Date(chatData.createdAt),
        tags: ['cursor-import'],
        metadata: {
          source: 'cursor',
          cursorId: chatData.id,
          tags: ['cursor-import']
        }
      })

      for (const cursorMsg of chatData.messages) {
        await this.chatHistoryService.addMessage(session.id, {
          role: cursorMsg.role as 'user' | 'assistant' | 'system',
          content: cursorMsg.content,
          metadata: {
            source: 'cursor',
            originalTimestamp: cursorMsg.timestamp
          }
        })
      }

      this.logger.info(`新規セッションを作成`, { 
        sessionId: session.id, 
        title: chatData.title,
        messageCount: chatData.messages.length 
      })
    } catch (error) {
      this.logger.error('新規セッション作成エラー:', error)
      throw error
    }
  }

  /**
   * ステータスを取得
   */
  getStatus(): CursorWatcherStatus {
    return {
      isWatching: this.isWatching,
      isActive: this.isWatching,
      cursorPath: this.config.watchPath,
      lastScan: this.lastScanTime || undefined,
      sessionsFound: this.sessionsFound,
      processedCount: this.sessionsFound,
      errorCount: 0,
      error: undefined
    }
  }

  /**
   * 設定を更新
   */
  async updateConfig(options: {
    enabled?: boolean
    watchPath?: string
    autoImport?: boolean
  }): Promise<void> {
    if (options.enabled !== undefined) {
      this.config.enabled = options.enabled
    }
    if (options.watchPath !== undefined) {
      this.config.watchPath = options.watchPath
    }
    if (options.autoImport !== undefined) {
      this.config.autoImport = options.autoImport
    }

    // 監視中の場合は再起動
    if (this.isWatching) {
      await this.stopWatching()
      if (this.config.enabled) {
        await this.startWatching()
      }
    }

    this.logger.info('Cursor統合設定を更新しました', options)
  }

  /**
   * サービスを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await this.logger.initialize()
      this.isInitialized = true
      this.logger.info('CursorWatcherServiceを初期化しました', { 
        watchPath: this.config.watchPath,
        enabled: this.config.enabled 
      })
    } catch (error) {
      this.logger.error('初期化に失敗しました:', error)
      throw error
    }
  }

  /**
   * 検索機能（プレースホルダー）
   */
  async search(options: {
    query?: string
    timeRange?: { start: Date; end: Date }
    types?: string[]
  }): Promise<CursorChatData[]> {
    // TODO: 統合管理機能で実装予定
    this.logger.warn('検索機能は未実装です')
    return []
  }

  /**
   * 統計情報取得（プレースホルダー）
   */
  async getStats(): Promise<{
    totalFiles: number
    totalMessages: number
    storageSize: number
  }> {
    // TODO: 統合管理機能で実装予定
    this.logger.warn('統計情報取得機能は未実装です')
    return {
      totalFiles: 0,
      totalMessages: 0,
      storageSize: 0
    }
  }
} 