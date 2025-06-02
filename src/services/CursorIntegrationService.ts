import fs from 'fs-extra'
import path from 'path'
import type {
  ChatSession,
  Message,
  ChatHistoryConfig,
  ChatMessage,
} from '../types/index.js'
import { watch, type FSWatcher, existsSync, readFileSync, statSync } from 'fs'
import { readdir } from 'fs/promises'
import os from 'os'
import { EventEmitter } from 'events'
import { promises as fsPromises } from 'fs'
import { Logger } from '../server/utils/Logger.js'
import { CursorLogService } from './CursorLogService.js'
import { ConfigService } from './ConfigService.js'
import type { CursorConfig } from './ConfigService.js'
import { ChatHistoryService } from './ChatHistoryService.js'
import { v4 as uuidv4 } from 'uuid'

export interface CursorChatData {
  id: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp?: string
  }>
  metadata?: {
    taskId?: string
    projectPath?: string
    createdAt?: string
    updatedAt?: string
  }
}

export interface CursorIntegrationStatus {
  isWatching: boolean
  lastScanTime: Date | null
  foundTasks: number
  importedSessions: number
  watchedDirectories: string[]
}

interface IntegrationConfig {
  enabled: boolean
  autoImport: boolean
  watchPath: string
  syncInterval: number
  batchSize: number
  retryAttempts: number
}

interface ImportResult {
  success: boolean
  sessionId?: string
  error?: string
  stats?: {
    messagesImported: number
    filesProcessed: number
  }
}

export class CursorIntegrationService extends EventEmitter {
  private chatHistoryService: ChatHistoryService
  private configService: ConfigService
  private watchers: FSWatcher[] = []
  private isWatching = false
  private lastScanTime: Date | null = null
  private importedSessions = 0
  private foundTasks = 0
  private config: IntegrationConfig
  private logger: Logger
  private cursorLogService: CursorLogService
  private isInitialized: boolean = false

  constructor(
    chatHistoryService: ChatHistoryService,
    configService: ConfigService,
    cursorLogService: CursorLogService,
    logger: Logger
  ) {
    super()
    this.chatHistoryService = chatHistoryService
    this.configService = configService
    this.cursorLogService = cursorLogService
    this.logger = logger
    this.config = {
      enabled: true,
      autoImport: true,
      watchPath: '',
      syncInterval: 5000,
      batchSize: 100,
      retryAttempts: 3,
    }
  }

  /**
   * Cursor統合を開始
   */
  async start(): Promise<void> {
    const config = await this.getConfig()

    if (!config.enabled) {
      this.logger.info('Cursor統合が無効になっています')
      return
    }

    if (!existsSync(config.cursorDataPath)) {
      throw new Error(
        `Cursorデータパスが見つかりません: ${config.cursorDataPath}`
      )
    }

    // 起動時インポート
    if (config.importOnStartup) {
      await this.scanAndImport()
    }

    // 自動インポートが有効な場合は監視開始
    if (config.autoImport) {
      await this.startWatching()
    }

    this.emit('started')
    this.logger.info('Cursor統合を開始しました')
  }

  /**
   * Cursor統合を停止
   */
  async stop(): Promise<void> {
    await this.stopWatching()
    this.emit('stopped')
    this.logger.info('Cursor統合を停止しました')
  }

  /**
   * ファイル監視を開始
   */
  private async startWatching(): Promise<void> {
    if (this.isWatching) {
      return
    }

    const config = await this.getConfig()
    const tasksPath = path.join(config.cursorDataPath, 'tasks')

    if (!existsSync(tasksPath)) {
      this.logger.warn('Cursorタスクディレクトリが見つかりません:', tasksPath)
      return
    }

    try {
      const watcher = watch(
        tasksPath,
        { recursive: true },
        (eventType, filename) => {
          if (filename && filename.includes('api_conversation_history.json')) {
            this.logger.info(`Cursorチャット履歴が更新されました: ${filename}`)
            this.handleFileChange(path.join(tasksPath, filename))
          }
        }
      )

      this.watchers.push(watcher)
      this.isWatching = true

      this.logger.info('Cursorチャット履歴の監視を開始しました:', tasksPath)
    } catch (error) {
      this.logger.error('ファイル監視の開始に失敗しました:', error)
      throw error
    }
  }

  /**
   * ファイル監視を停止
   */
  private async stopWatching(): Promise<void> {
    this.watchers.forEach(watcher => watcher.close())
    this.watchers = []
    this.isWatching = false
    this.logger.info('Cursorチャット履歴の監視を停止しました')
  }

  /**
   * ファイル変更を処理
   */
  private async handleFileChange(filePath: string): Promise<void> {
    try {
      // ファイルが存在し、読み取り可能になるまで少し待つ
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (existsSync(filePath)) {
        await this.importChatHistory(filePath)
      }
    } catch (error) {
      this.logger.error('ファイル変更の処理に失敗しました:', error)
    }
  }

  /**
   * 全てのCursorチャット履歴をスキャンしてインポート
   */
  async scanAndImport(): Promise<void> {
    const config = await this.getConfig()
    const tasksPath = path.join(config.cursorDataPath, 'tasks')

    if (!existsSync(tasksPath)) {
      this.logger.warn('Cursorタスクディレクトリが見つかりません:', tasksPath)
      return
    }

    try {
      const taskDirs = await readdir(tasksPath)
      this.foundTasks = taskDirs.length

      for (const dir of taskDirs) {
        const historyPath = path.join(
          tasksPath,
          dir,
          'api_conversation_history.json'
        )
        if (existsSync(historyPath)) {
          await this.importChatHistory(historyPath)
        }
      }

      this.lastScanTime = new Date()
      this.logger.info(
        `スキャン完了: ${this.foundTasks}件のタスクを処理しました`
      )
    } catch (error) {
      this.logger.error('スキャン処理に失敗しました:', error)
      throw error
    }
  }

  /**
   * Cursorチャット履歴をインポート
   */
  async importChatHistory(filePath: string): Promise<ImportResult> {
    try {
      const content = await fsPromises.readFile(filePath, 'utf-8')
      const cursorChat = this.parseChatData(content)

      if (!cursorChat) {
        return {
          success: false,
          error: 'チャットデータの解析に失敗しました',
        }
      }

      const existingSession = await this.findExistingSession(cursorChat.id)

      if (existingSession) {
        await this.updateExistingSession(existingSession.id, cursorChat)
        return {
          success: true,
          sessionId: existingSession.id,
          stats: {
            messagesImported: cursorChat.messages.length,
            filesProcessed: 1,
          },
        }
      } else {
        await this.createNewSession(cursorChat)
        return {
          success: true,
          stats: {
            messagesImported: cursorChat.messages.length,
            filesProcessed: 1,
          },
        }
      }
    } catch (error) {
      this.logger.error('チャット履歴のインポートに失敗しました:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : '不明なエラーが発生しました',
      }
    }
  }

  /**
   * チャットデータを解析
   */
  private parseChatData(content: string): CursorChatData | null {
    try {
      const data = JSON.parse(content)
      if (!this.validateChatData(data)) {
        return null
      }

      const messages = this.extractMessages(data)
      if (!messages.length) {
        return null
      }

      return {
        id: path.basename(path.dirname(content)),
        messages,
        metadata: {
          taskId: data.metadata?.taskId,
          projectPath: data.metadata?.projectPath,
          createdAt: data.metadata?.createdAt,
          updatedAt: data.metadata?.updatedAt,
        },
      }
    } catch (error) {
      this.logger.error('チャットデータの解析に失敗しました:', error)
      return null
    }
  }

  /**
   * チャットデータの検証
   */
  private validateChatData(data: unknown): data is {
    messages: unknown[]
    metadata?: {
      taskId?: string
      projectPath?: string
      createdAt?: string
      updatedAt?: string
    }
  } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'messages' in data &&
      Array.isArray((data as { messages: unknown[] }).messages)
    )
  }

  /**
   * メッセージの抽出
   */
  private extractMessages(data: {
    messages: unknown[]
  }): CursorChatData['messages'] {
    return data.messages
      .filter((msg): msg is { role: string; content: string } => {
        return (
          typeof msg === 'object' &&
          msg !== null &&
          'role' in msg &&
          'content' in msg &&
          (msg.role === 'user' || msg.role === 'assistant') &&
          typeof msg.content === 'string'
        )
      })
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date().toISOString(),
      }))
  }

  /**
   * 既存セッションの検索
   */
  private async findExistingSession(
    cursorId: string
  ): Promise<ChatSession | null> {
    try {
      const sessions = await this.chatHistoryService.getSession(cursorId)
      return sessions?.metadata?.source === 'cursor' ? sessions : null
    } catch (error) {
      this.logger.error('セッション検索に失敗しました:', error)
      return null
    }
  }

  /**
   * 新規セッションの作成
   */
  private async createNewSession(cursorChat: CursorChatData): Promise<void> {
    const session: Omit<ChatSession, 'createdAt' | 'updatedAt'> = {
      id: cursorChat.id,
      title: `Cursor Chat ${cursorChat.id}`,
      messages: cursorChat.messages.map(msg => ({
        id: uuidv4(),
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp || Date.now()),
      })),
      tags: ['cursor'],
      metadata: {
        source: 'cursor',
        project: cursorChat.metadata?.projectPath,
        summary: `Cursor Chat Session ${cursorChat.id}`,
      },
      startTime: new Date(cursorChat.metadata?.createdAt || Date.now()),
    }

    await this.chatHistoryService.createSession(session)
    this.importedSessions++
  }

  /**
   * 既存セッションの更新
   */
  private async updateExistingSession(
    sessionId: string,
    cursorChat: CursorChatData
  ): Promise<void> {
    const session = await this.chatHistoryService.getSession(sessionId)
    if (!session) {
      throw new Error('セッションが見つかりません')
    }

    const newMessages = cursorChat.messages
      .filter(msg => !session.messages.some(m => m.content === msg.content))
      .map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp || Date.now()),
      }))

    if (newMessages.length > 0) {
      for (const msg of newMessages) {
        await this.chatHistoryService.addMessage(sessionId, msg)
      }
    }
  }

  /**
   * 設定の取得
   */
  private async getConfig(): Promise<Required<CursorConfig>> {
    const config = (await this.configService.getConfig()) as CursorConfig
    if (!config.cursorDataPath) {
      throw new Error('Cursorデータパスが設定されていません')
    }
    return {
      ...config,
      enabled: config.enabled ?? true,
      cursorDataPath: config.cursorDataPath,
      autoImport: config.autoImport ?? true,
      watchInterval: config.watchInterval ?? 5000,
      importOnStartup: config.importOnStartup ?? true,
    }
  }

  /**
   * 設定の更新
   */
  async updateConfig(newConfig: Partial<CursorConfig>): Promise<void> {
    const currentConfig = await this.configService.getConfig()
    const chatHistoryConfig: ChatHistoryConfig = {
      storagePath: currentConfig.storagePath,
      maxSessions: currentConfig.maxSessions,
      maxMessagesPerSession: currentConfig.maxMessagesPerSession,
      autoCleanup: currentConfig.autoCleanup,
      cleanupDays: currentConfig.cleanupDays,
      enableSearch: currentConfig.enableSearch,
      enableBackup: currentConfig.enableBackup,
      backupInterval: currentConfig.backupInterval,
      cursor: {
        enabled: newConfig.enabled ?? true,
        autoImport: newConfig.autoImport ?? true,
        watchPath: newConfig.cursorDataPath,
      },
    }
    await this.configService.saveConfig(chatHistoryConfig)
    this.logger.info('Cursor統合の設定を更新しました')
  }

  /**
   * ステータスの取得
   */
  getStatus(): CursorIntegrationStatus {
    return {
      isWatching: this.isWatching,
      lastScanTime: this.lastScanTime,
      foundTasks: this.foundTasks,
      importedSessions: this.importedSessions,
      watchedDirectories: this.watchers.map(w => (w as any).path || ''),
    }
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      const config = await this.getConfig()
      this.config = {
        enabled: config.enabled ?? true,
        autoImport: config.autoImport ?? true,
        watchPath: config.cursorDataPath,
        syncInterval: 5000,
        batchSize: 100,
        retryAttempts: 3,
      }
      this.isInitialized = true
      this.logger.info('Cursor統合サービスを初期化しました')
    } catch (error) {
      this.logger.error('初期化に失敗しました:', error)
      throw error
    }
  }

  /**
   * 統計情報の取得
   */
  async getStats(): Promise<{
    totalSessions: number
    totalMessages: number
    lastImport?: Date
  }> {
    const stats = await this.chatHistoryService.getStats()
    return {
      totalSessions: stats.totalSessions,
      totalMessages: stats.totalMessages,
      lastImport: this.lastScanTime || undefined,
    }
  }
}
