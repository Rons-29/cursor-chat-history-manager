import { ChatHistoryService } from './ChatHistoryService.js'
import { ConfigService, CursorConfig } from './ConfigService.js'
import { ChatSession, Message } from '../types/index.js'
import { watch, FSWatcher, existsSync, readFileSync, statSync } from 'fs'
import { readdir } from 'fs/promises'
import path from 'path'
import os from 'os'
import { EventEmitter } from 'events'

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

export class CursorIntegrationService extends EventEmitter {
  private chatHistoryService: ChatHistoryService
  private configService: ConfigService
  private watchers: FSWatcher[] = []
  private isWatching = false
  private lastScanTime: Date | null = null
  private importedSessions = 0
  private foundTasks = 0

  constructor(
    chatHistoryService: ChatHistoryService,
    configService: ConfigService
  ) {
    super()
    this.chatHistoryService = chatHistoryService
    this.configService = configService
  }

  /**
   * Cursor統合を開始
   */
  async start(): Promise<void> {
    const config = await this.getConfig()

    if (!config.enabled) {
      console.log('Cursor統合が無効になっています')
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
    console.log('Cursor統合を開始しました')
  }

  /**
   * Cursor統合を停止
   */
  async stop(): Promise<void> {
    await this.stopWatching()
    this.emit('stopped')
    console.log('Cursor統合を停止しました')
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
      console.log('Cursorタスクディレクトリが見つかりません:', tasksPath)
      return
    }

    try {
      const watcher = watch(
        tasksPath,
        { recursive: true },
        (eventType, filename) => {
          if (filename && filename.includes('api_conversation_history.json')) {
            console.log(`Cursorチャット履歴が更新されました: ${filename}`)
            this.handleFileChange(path.join(tasksPath, filename))
          }
        }
      )

      this.watchers.push(watcher)
      this.isWatching = true

      console.log('Cursorチャット履歴の監視を開始しました:', tasksPath)
    } catch (error) {
      console.error('ファイル監視の開始に失敗しました:', error)
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
    console.log('Cursorチャット履歴の監視を停止しました')
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
      console.error('ファイル変更の処理に失敗しました:', error)
    }
  }

  /**
   * 全てのCursorチャット履歴をスキャンしてインポート
   */
  async scanAndImport(): Promise<void> {
    const config = await this.getConfig()
    const tasksPath = path.join(config.cursorDataPath, 'tasks')

    if (!existsSync(tasksPath)) {
      console.log('Cursorタスクディレクトリが見つかりません:', tasksPath)
      return
    }

    try {
      const taskDirs = await readdir(tasksPath)
      this.foundTasks = taskDirs.length
      let imported = 0

      for (const taskDir of taskDirs) {
        const historyFile = path.join(
          tasksPath,
          taskDir,
          'api_conversation_history.json'
        )

        if (existsSync(historyFile)) {
          try {
            await this.importChatHistory(historyFile)
            imported++
          } catch (error) {
            console.error(
              `チャット履歴のインポートに失敗: ${historyFile}`,
              error
            )
          }
        }
      }

      this.importedSessions = imported
      this.lastScanTime = new Date()

      console.log(
        `Cursorチャット履歴のスキャン完了: ${imported}/${this.foundTasks} セッションをインポート`
      )
      this.emit('scanCompleted', { imported, total: this.foundTasks })
    } catch (error) {
      console.error('チャット履歴のスキャンに失敗しました:', error)
      throw error
    }
  }

  /**
   * 個別のチャット履歴ファイルをインポート
   */
  private async importChatHistory(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const chatData = JSON.parse(content)

      // Cursorのチャット履歴形式を解析
      const cursorChat = this.parseCursorChatData(chatData, filePath)

      if (cursorChat && cursorChat.messages.length > 0) {
        // 既存セッションをチェック
        const existingSession = await this.findExistingSession(cursorChat.id)

        if (existingSession) {
          // 既存セッションを更新
          await this.updateExistingSession(existingSession.id, cursorChat)
        } else {
          // 新しいセッションを作成
          await this.createNewSession(cursorChat)
        }
      }
    } catch (error) {
      console.error(`チャット履歴の解析に失敗: ${filePath}`, error)
    }
  }

  /**
   * Cursorのチャット履歴データを解析
   */
  private parseCursorChatData(
    data: any,
    filePath: string
  ): CursorChatData | null {
    try {
      const taskId = path.basename(path.dirname(filePath))
      const stats = statSync(filePath)

      const messages: Array<{
        role: 'user' | 'assistant'
        content: string
        timestamp?: string
      }> = []

      // Cursorの履歴形式に応じて解析
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.role && item.content) {
            messages.push({
              role: item.role === 'user' ? 'user' : 'assistant',
              content:
                typeof item.content === 'string'
                  ? item.content
                  : JSON.stringify(item.content),
              timestamp: item.timestamp || item.created_at,
            })
          }
        }
      } else if (data.messages && Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          if (msg.role && msg.content) {
            messages.push({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content:
                typeof msg.content === 'string'
                  ? msg.content
                  : JSON.stringify(msg.content),
              timestamp: msg.timestamp || msg.created_at,
            })
          }
        }
      }

      if (messages.length === 0) {
        return null
      }

      return {
        id: `cursor-${taskId}`,
        messages,
        metadata: {
          taskId,
          projectPath: data.projectPath || path.dirname(filePath),
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
        },
      }
    } catch (error) {
      console.error('Cursorチャット履歴の解析エラー:', error)
      return null
    }
  }

  /**
   * 既存セッションを検索
   */
  private async findExistingSession(
    cursorId: string
  ): Promise<ChatSession | null> {
    const searchResult = await this.chatHistoryService.searchSessions({
      tags: [`cursor:${cursorId}`],
    })

    return searchResult.sessions.length > 0 ? searchResult.sessions[0] : null
  }

  /**
   * 新しいセッションを作成
   */
  private async createNewSession(cursorChat: CursorChatData): Promise<void> {
    const session = await this.chatHistoryService.createSession(
      `Cursor Task: ${cursorChat.metadata?.taskId || 'Unknown'}`,
      {
        tags: [
          'cursor',
          `cursor:${cursorChat.id}`,
          ...(cursorChat.metadata?.projectPath
            ? [`project:${path.basename(cursorChat.metadata.projectPath)}`]
            : []),
        ],
        source: 'cursor',
        taskId: cursorChat.metadata?.taskId,
        projectPath: cursorChat.metadata?.projectPath,
        importedAt: new Date().toISOString(),
      }
    )

    // メッセージを追加
    for (const [index, msg] of cursorChat.messages.entries()) {
      await this.chatHistoryService.addMessage(session.id, {
        role: msg.role,
        content: msg.content,
        metadata: {},
      })
    }

    console.log(
      `Cursorセッションをインポート: ${session.id} (${cursorChat.messages.length} メッセージ)`
    )
  }

  /**
   * 既存セッションを更新
   */
  private async updateExistingSession(
    sessionId: string,
    cursorChat: CursorChatData
  ): Promise<void> {
    const existingSession = await this.chatHistoryService.getSession(sessionId)
    if (!existingSession) {
      console.error(`セッション ${sessionId} が見つかりません`)
      return
    }

    const existingMessageCount = existingSession.messages.length
    const newMessages = cursorChat.messages.slice(existingMessageCount)

    if (newMessages.length > 0) {
      for (const msg of newMessages) {
        await this.chatHistoryService.addMessage(sessionId, {
          role: msg.role,
          content: msg.content,
          metadata: {},
        })
      }

      console.log(
        `Cursorセッションを更新: ${sessionId} (+${newMessages.length} メッセージ)`
      )
    }
  }

  /**
   * 設定を取得
   */
  private async getConfig(): Promise<Required<CursorConfig>> {
    const config = await this.configService.loadConfig()

    const defaultCursorPath = path.join(
      os.homedir(),
      'Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev'
    )

    return {
      enabled: config.cursor?.enabled ?? false,
      cursorDataPath: config.cursor?.cursorDataPath ?? defaultCursorPath,
      autoImport: config.cursor?.autoImport ?? true,
      watchInterval: config.cursor?.watchInterval ?? 5,
      importOnStartup: config.cursor?.importOnStartup ?? true,
    }
  }

  /**
   * 設定を更新
   */
  async updateConfig(newConfig: Partial<CursorConfig>): Promise<void> {
    const currentConfig = await this.configService.loadConfig()

    const updatedConfig = {
      ...currentConfig,
      cursor: {
        ...(await this.getConfig()),
        ...newConfig,
      },
    }

    await this.configService.saveConfig(updatedConfig)

    // 実行中の場合は再起動
    if (this.isWatching) {
      await this.stop()
      await this.start()
    }
  }

  /**
   * 統合状態を取得
   */
  getStatus(): CursorIntegrationStatus {
    return {
      isWatching: this.isWatching,
      lastScanTime: this.lastScanTime,
      foundTasks: this.foundTasks,
      importedSessions: this.importedSessions,
      watchedDirectories:
        this.watchers.length > 0 ? ['Cursor tasks directory'] : [],
    }
  }
}
