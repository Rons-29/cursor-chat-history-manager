/**
 * Cursor Watcher Service
 * .mdcルール準拠: Cursorチャット履歴の自動監視・インポート機能
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import path from 'path'
import { watch, FSWatcher } from 'chokidar'
import type { ChatHistoryService } from './ChatHistoryService.js'
import type { ConfigService } from './ConfigService.js'
import type { ChatSession, Message } from '../types/index.js'

export interface CursorWatcherStatus {
  isWatching: boolean
  cursorPath?: string
  lastScan?: Date
  sessionsFound: number
  error?: string
}

export interface CursorChatData {
  id: string
  title: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
  }>
  createdAt: string
  updatedAt: string
}

/**
 * Cursorチャット履歴の監視・インポートサービス
 */
export class CursorWatcherService extends EventEmitter {
  private chatHistoryService: ChatHistoryService
  private configService: ConfigService
  private watcher: FSWatcher | null = null
  private isWatching = false
  private cursorPath: string
  private lastScanTime: Date | null = null
  private sessionsFound = 0
  private config: any

  constructor(chatHistoryService: ChatHistoryService, configService: ConfigService) {
    super()
    this.chatHistoryService = chatHistoryService
    this.configService = configService
    this.cursorPath = this.getDefaultCursorPath()
    this.config = configService.getConfig()
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
    if (!this.config.cursor?.enabled) {
      throw new Error('Cursor統合が無効です')
    }

    this.cursorPath = this.config.cursor.watchPath || this.getDefaultCursorPath()
    console.log(`Cursorチャット履歴を監視開始: ${this.cursorPath}`)

    this.isWatching = true

    // ファイルウォッチャーを作成
    this.watcher = watch(`${this.cursorPath}/**/*.db`, {
      ignored: [/^\\./, /node_modules/],
      persistent: true,
      ignoreInitial: false,
      depth: 10
    })

    this.watcher.on('add', this.handleFileChange.bind(this))
    this.watcher.on('change', this.handleFileChange.bind(this))
    this.watcher.on('error', this.handleWatchError.bind(this))

    // 初回スキャンを実行
    await this.scanAndImport()
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
    }

    this.isWatching = false
    this.emit('watchStopped')
  }

  /**
   * ファイル変更ハンドラー
   */
  private async handleFileChange(filePath: string): Promise<void> {
    try {
      // チャット履歴ファイルかチェック
      if (this.isChatHistoryFile(filePath)) {
        await this.processChatFile(filePath)
      }
    } catch (error) {
      console.error('ファイル処理エラー:', error)
    }
  }

  /**
   * 監視エラーハンドラー
   */
  private handleWatchError(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('ファイル監視エラー:', error)
    this.emit('error', error)
  }

  /**
   * チャット履歴ファイルかどうかを判定
   */
  private isChatHistoryFile(filePath: string): boolean {
    // Cursorのチャット履歴ファイルパターンを検出
    // 実際のCursorのファイル構造に応じて調整が必要
    return filePath.includes('chat') || 
           filePath.includes('conversation') ||
           filePath.endsWith('.json')
  }

  /**
   * 手動スキャン・インポート
   */
  async scanAndImport(customPath?: string): Promise<number> {
    const scanPath = customPath || this.cursorPath
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
          // 再帰的にディレクトリをスキャン
          importCount += await this.scanAndImport(fullPath)
        } else if (this.isChatHistoryFile(fullPath)) {
          try {
            await this.processChatFile(fullPath)
            importCount++
          } catch (error) {
            console.error(`ファイル処理エラー (${fullPath}):`, error)
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
   * チャットファイルを処理
   */
  private async processChatFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const chatData = this.parseChatData(content, filePath)
      
      if (chatData) {
        await this.importChatSession(chatData)
        this.emit('sessionImported', { sessionId: chatData.id, file: filePath })
      }
    } catch (error) {
      console.error(`チャットファイル処理エラー (${filePath}):`, error)
    }
  }

  /**
   * チャットデータをパース
   */
  private parseChatData(content: string, filePath: string): CursorChatData | null {
    try {
      // 複数のフォーマットに対応
      if (content.trim().startsWith('{')) {
        return this.parseJsonChatData(content, filePath)
      } else {
        return this.parseTextChatData(content, filePath)
      }
    } catch (error) {
      console.error('チャットデータパースエラー:', error)
      return null
    }
  }

  /**
   * JSONフォーマットのチャットデータをパース
   */
  private parseJsonChatData(content: string, filePath: string): CursorChatData | null {
    try {
      const data = JSON.parse(content)
      
      // Cursorの実際のデータ構造に応じて調整
      return {
        id: data.id || path.basename(filePath, path.extname(filePath)),
        title: data.title || `Cursor Chat ${new Date().toLocaleDateString()}`,
        messages: this.extractMessages(data),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      }
    } catch (error) {
      return null
    }
  }

  /**
   * テキストフォーマットのチャットデータをパース
   */
  private parseTextChatData(content: string, filePath: string): CursorChatData | null {
    try {
      const lines = content.split('\n').filter(line => line.trim())
      const messages: CursorChatData['messages'] = []
      
      let currentRole: 'user' | 'assistant' | 'system' = 'user'
      let currentContent = ''
      
      for (const line of lines) {
        if (line.startsWith('User:') || line.startsWith('Human:')) {
          if (currentContent) {
            messages.push({
              role: currentRole,
              content: currentContent.trim(),
              timestamp: new Date().toISOString()
            })
          }
          currentRole = 'user'
          currentContent = line.replace(/^(User:|Human:)/, '').trim()
        } else if (line.startsWith('Assistant:') || line.startsWith('AI:')) {
          if (currentContent) {
            messages.push({
              role: currentRole,
              content: currentContent.trim(),
              timestamp: new Date().toISOString()
            })
          }
          currentRole = 'assistant'
          currentContent = line.replace(/^(Assistant:|AI:)/, '').trim()
        } else {
          currentContent += '\n' + line
        }
      }
      
      // 最後のメッセージを追加
      if (currentContent) {
        messages.push({
          role: currentRole,
          content: currentContent.trim(),
          timestamp: new Date().toISOString()
        })
      }

      if (messages.length === 0) {
        return null
      }

      return {
        id: path.basename(filePath, path.extname(filePath)),
        title: `Cursor Chat ${new Date().toLocaleDateString()}`,
        messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    } catch (error) {
      return null
    }
  }

  /**
   * データからメッセージを抽出
   */
  private extractMessages(data: any): CursorChatData['messages'] {
    const messages: CursorChatData['messages'] = []
    
    // 複数のデータ構造に対応
    if (Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        messages.push({
          role: msg.role || 'user',
          content: msg.content || msg.text || '',
          timestamp: msg.timestamp || new Date().toISOString()
        })
      }
    } else if (Array.isArray(data.conversation)) {
      for (const msg of data.conversation) {
        messages.push({
          role: msg.role || 'user',
          content: msg.content || msg.text || '',
          timestamp: msg.timestamp || new Date().toISOString()
        })
      }
    }
    
    return messages
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
      console.error('セッションインポートエラー:', error)
      throw error
    }
  }

  /**
   * 既存セッションを更新
   */
  private async updateExistingSession(existingSession: ChatSession, chatData: CursorChatData): Promise<void> {
    const existingMessageCount = existingSession.messages.length
    const newMessages = chatData.messages.slice(existingMessageCount)
    
    if (newMessages.length > 0) {
      for (const msgData of newMessages) {
        const message: Omit<Message, 'id' | 'timestamp'> = {
          role: msgData.role,
          content: msgData.content,
          metadata: {
            source: 'cursor-import',
            originalTimestamp: msgData.timestamp
          }
        }
        
        await this.chatHistoryService.addMessage(existingSession.id, message)
      }
    }
  }

  /**
   * 新規セッションを作成
   */
  private async createNewSession(chatData: CursorChatData): Promise<void> {
    const session = await this.chatHistoryService.createSession({
      id: chatData.id,
      title: chatData.title,
      tags: ['cursor-import'],
      metadata: {
        source: 'cursor-import',
        originalCreatedAt: chatData.createdAt,
        originalUpdatedAt: chatData.updatedAt
      }
    })

    // メッセージを追加
    for (const msgData of chatData.messages) {
      const message: Omit<Message, 'id' | 'timestamp'> = {
        role: msgData.role,
        content: msgData.content,
        metadata: {
          source: 'cursor-import',
          originalTimestamp: msgData.timestamp
        }
      }
      
      await this.chatHistoryService.addMessage(session.id, message)
    }
  }

  /**
   * 監視状態を取得
   */
  getStatus(): CursorWatcherStatus {
    return {
      isWatching: this.isWatching,
      cursorPath: this.cursorPath,
      lastScan: this.lastScanTime || undefined,
      sessionsFound: this.sessionsFound
    }
  }

  /**
   * Cursor統合設定を更新
   */
  async updateConfig(options: {
    enabled?: boolean
    watchPath?: string
    autoImport?: boolean
  }): Promise<void> {
    const config = await this.configService.getConfig()

    if (!config.cursor) {
      config.cursor = { enabled: false, autoImport: false }
    }

    if (options.enabled !== undefined) {
      config.cursor.enabled = options.enabled
    }

    if (options.watchPath !== undefined) {
      config.cursor.watchPath = options.watchPath
    }

    if (options.autoImport !== undefined) {
      config.cursor.autoImport = options.autoImport
    }

    await this.configService.saveConfig(config)
  }
} 