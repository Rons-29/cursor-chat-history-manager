/**
 * Claude Dev統合サービス - データベース接続問題修正版
 *
 * Claude Dev拡張機能のデータを安全に統合し、
 * Chat History Managerの機能として提供します。
 *
 * 修正内容：
 * - データベース接続競合の解決
 * - 共有データベース使用時の適切な処理
 * - タスクベース実装の強化
 * - エラーハンドリングの改善
 */

import fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import Database from 'better-sqlite3'
import { EventEmitter } from 'events'

// 型定義
interface ClaudeDevMessage {
  role: 'user' | 'assistant'
  content: Array<{
    type: 'text' | 'image'
    text?: string
    image_url?: string
  }>
}

interface ClaudeDevTask {
  id: string
  timestamp: Date
  conversations: ClaudeDevMessage[]
  metadata?: {
    project?: string
    description?: string
    environment?: any
  }
}

interface ClaudeDevSession {
  id: string
  title: string
  content: string
  timestamp: number
  metadata: {
    source: 'claude-dev'
    taskId: string
    originalTimestamp: string
    messageCount: number
    hasAssistantResponses: boolean
    userMessageCount: number
    assistantMessageCount: number
    totalCharacters: number
    environment?: any
  }
}

interface ClaudeDevStats {
  totalTasks: number
  totalMessages: number
  userMessages: number
  assistantMessages: number
  tasksWithAIResponses: number
  averageMessagesPerTask: number
  dateRange: {
    earliest: Date
    latest: Date
  }
  totalCharacters: number
}

interface IntegrationOptions {
  includeEnvironmentData?: boolean
  filterByDateRange?: {
    start: Date
    end: Date
  }
  maxTasksToProcess?: number
  skipExisting?: boolean
}

/**
 * Claude Dev統合サービスクラス - 修正版
 */
export class ClaudeDevIntegrationService extends EventEmitter {
  private db: Database.Database | null = null
  private claudeDevPath: string
  private initialized = false
  private dbPath: string
  private isSharedDatabase: boolean = false
  private databaseConnectionAttempted = false

  constructor(dbPath?: string, sharedDb?: Database.Database) {
    super()

    // データベースパスの設定
    const defaultDbPath = path.join(process.cwd(), 'data', 'chat-history.db')
    this.dbPath = dbPath || defaultDbPath

    console.log(`🔧 Claude Dev統合: データベースパス設定: ${this.dbPath}`)

    // 共有データベース接続の設定
    if (sharedDb && this.isDatabaseOpen(sharedDb)) {
      this.db = sharedDb
      this.isSharedDatabase = true
      console.log('✅ Claude Dev統合: 有効な共有データベース接続を使用します')
    } else if (sharedDb) {
      console.warn(
        '⚠️ Claude Dev統合: 共有データベースが無効です。独自接続を使用します'
      )
    }

    // Claude Dev拡張機能のパス
    this.claudeDevPath = path.join(
      os.homedir(),
      'Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/tasks'
    )

    console.log(`📁 Claude Dev統合: タスクパス: ${this.claudeDevPath}`)
  }

  /**
   * データベース接続状況の安全確認
   */
  private isDatabaseOpen(database: Database.Database): boolean {
    try {
      if (!database) return false
      if (!database.open) return false

      // 実際のクエリで接続テスト
      database.prepare('SELECT 1').get()
      return true
    } catch (error) {
      console.warn('🔍 データベース接続テスト失敗:', error)
      return false
    }
  }

  /**
   * データベース接続の安全な初期化
   */
  private async initializeDatabase(): Promise<void> {
    // 既に試行済みの場合はスキップ
    if (this.databaseConnectionAttempted) {
      console.log('📋 Claude Dev統合: データベース接続は既に試行済みです')
      return
    }

    this.databaseConnectionAttempted = true

    // 共有データベースが有効な場合
    if (this.isSharedDatabase && this.db && this.isDatabaseOpen(this.db)) {
      console.log('✅ Claude Dev統合: 共有データベース接続を使用中')
      try {
        await this.ensureSchema()
        console.log('✅ Claude Dev統合: 共有データベーススキーマ確認完了')
        return
      } catch (error) {
        console.error(
          '❌ Claude Dev統合: 共有データベーススキーマエラー:',
          error
        )
        // 共有データベースでエラーが発生した場合、タスクベースモードに切り替え
        this.db = null
        this.isSharedDatabase = false
      }
    }

    // 独自データベース接続の試行
    if (!this.db) {
      try {
        console.log(
          `🔧 Claude Dev統合: 独自データベース接続開始: ${this.dbPath}`
        )

        // データベースファイルの存在確認
        if (!(await fs.pathExists(this.dbPath))) {
          console.log(
            `📁 Claude Dev統合: データベースファイル作成: ${this.dbPath}`
          )
          await fs.ensureFile(this.dbPath)
        }

        // 安全なデータベース接続
        this.db = new Database(this.dbPath, {
          verbose: undefined, // 詳細ログ無効化
          fileMustExist: false,
          timeout: 5000, // タイムアウト短縮
          readonly: false,
        })

        // 接続テスト
        this.db.pragma('journal_mode = WAL')
        await this.ensureSchema()

        console.log('✅ Claude Dev統合: 独自データベース接続成功')
      } catch (error) {
        console.error('❌ Claude Dev統合: データベース接続失敗:', error)
        // データベース接続に失敗してもサービスは継続（タスクベースモード）
        this.db = null
        console.log('📄 Claude Dev統合: タスクベースモードで動作します')
      }
    }
  }

  /**
   * データベーススキーマの安全な確認と作成
   */
  private async ensureSchema(): Promise<void> {
    if (!this.db || !this.isDatabaseOpen(this.db)) {
      console.log(
        '⚠️ Claude Dev統合: データベース無効のためスキーマ確認をスキップ'
      )
      return
    }

    try {
      // 既存テーブルの確認
      const tables = this.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as { name: string }[]
      const tableNames = tables.map(t => t.name)
      console.log('📋 Claude Dev統合: 既存テーブル:', tableNames)

      // 必要なテーブルが存在しない場合は作成
      if (!tableNames.includes('sessions')) {
        console.log('🔧 Claude Dev統合: sessionsテーブルを作成します')
        this.db.exec(`
          CREATE TABLE sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            message_count INTEGER NOT NULL DEFAULT 0,
            file_checksum TEXT,
            file_modified_at INTEGER,
            metadata TEXT
          )
        `)
      }

      // FTS5テーブルの作成
      if (!tableNames.includes('sessions_fts')) {
        console.log('🔧 Claude Dev統合: sessions_ftsテーブルを作成します')
        this.db.exec(`
          CREATE VIRTUAL TABLE sessions_fts USING fts5(
            id, title, content,
            content='sessions',
            content_rowid='rowid'
          )
        `)
      }

      // インデックスの作成
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_source 
        ON sessions(json_extract(metadata, '$.source'))
      `)

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_timestamp 
        ON sessions(created_at)
      `)

      console.log('✅ Claude Dev統合: スキーマ確認・初期化完了')
    } catch (error) {
      console.error('❌ Claude Dev統合: スキーマ初期化エラー:', error)
      // スキーマエラーでもサービス継続（タスクベースモード）
      this.db = null
    }
  }

  /**
   * サービスの初期化
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Claude Dev統合: サービス初期化を開始')

      // データベース接続の初期化（失敗してもサービス継続）
      await this.initializeDatabase()

      // Claude Devパスの検証（必須）
      await this.validateClaudeDevPath()
      console.log('✅ Claude Dev統合: Claude Devパス検証完了')

      this.initialized = true
      console.log('🎉 Claude Dev統合: サービス初期化完了')
      this.emit('initialized')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('❌ Claude Dev統合: 初期化エラー:', errorMessage)
      this.emit(
        'error',
        new Error(`Claude Dev統合サービスの初期化に失敗: ${errorMessage}`)
      )
      throw error
    }
  }

  /**
   * Claude Devパスの検証
   */
  private async validateClaudeDevPath(): Promise<void> {
    if (!(await fs.pathExists(this.claudeDevPath))) {
      throw new Error(
        `Claude Dev拡張機能のデータディレクトリが見つかりません: ${this.claudeDevPath}`
      )
    }
  }

  /**
   * 利用可能なタスクの検索
   */
  async findAvailableTasks(options?: IntegrationOptions): Promise<string[]> {
    this.ensureInitialized()

    try {
      // Claude Devパスの存在確認
      if (!(await fs.pathExists(this.claudeDevPath))) {
        console.warn(`⚠️ Claude Devパスが存在しません: ${this.claudeDevPath}`)
        return []
      }

      console.log(
        `🔍 Claude Dev統合: 利用可能なタスクを検索中... パス: ${this.claudeDevPath}`
      )

      // 実際のタスクディレクトリを読み込み
      const tasks = await fs.readdir(this.claudeDevPath)
      console.log(
        `📊 Claude Dev統合: ディレクトリから${tasks.length}個のアイテムを発見`
      )

      const validTasks = []

      for (const task of tasks) {
        // タスクIDの検証（タイムスタンプ形式）
        if (!/^\d{13}$/.test(task)) {
          continue
        }

        const taskPath = path.join(this.claudeDevPath, task)
        const historyFile = path.join(taskPath, 'api_conversation_history.json')

        if (await fs.pathExists(historyFile)) {
          // 日付フィルタリング
          if (options?.filterByDateRange) {
            const taskDate = new Date(parseInt(task))
            if (
              taskDate < options.filterByDateRange.start ||
              taskDate > options.filterByDateRange.end
            ) {
              continue
            }
          }

          validTasks.push(task)
        }
      }

      // 最大処理数の制限
      if (options?.maxTasksToProcess) {
        const limitedTasks = validTasks.slice(0, options.maxTasksToProcess)
        console.log(
          `🎯 Claude Dev統合: ${limitedTasks.length}個のタスクが見つかりました（制限: ${options.maxTasksToProcess}）`
        )
        return limitedTasks.sort()
      }

      console.log(
        `✅ Claude Dev統合: ${validTasks.length}個のタスクが見つかりました`
      )
      return validTasks.sort() // タイムスタンプ順にソート
    } catch (error) {
      console.error(`❌ タスク検索エラー:`, error)
      // エラーが発生した場合は空配列を返す（サービスを停止させない）
      return []
    }
  }

  /**
   * 単一タスクの詳細読み込み
   */
  async loadTaskDetails(
    taskId: string,
    includeEnvironment = false
  ): Promise<ClaudeDevTask | null> {
    this.ensureInitialized()

    try {
      const taskPath = path.join(this.claudeDevPath, taskId)
      const historyFile = path.join(taskPath, 'api_conversation_history.json')
      const metadataFile = path.join(taskPath, 'task_metadata.json')

      if (!(await fs.pathExists(historyFile))) {
        return null
      }

      const conversations: ClaudeDevMessage[] = await fs.readJson(historyFile)
      const timestamp = new Date(parseInt(taskId))

      let metadata: any = {
        project: 'unknown',
        description: `Claude Dev Task ${taskId}`,
      }

      // メタデータファイルの読み込み（存在する場合）
      if (await fs.pathExists(metadataFile)) {
        try {
          const taskMetadata = await fs.readJson(metadataFile)
          metadata = { ...metadata, ...taskMetadata }
        } catch (error) {
          // メタデータ読み込みエラーは無視
        }
      }

      // 環境データの読み込み（オプション）
      if (includeEnvironment) {
        const uiMessagesFile = path.join(taskPath, 'ui_messages.json')
        if (await fs.pathExists(uiMessagesFile)) {
          try {
            const uiMessages = await fs.readJson(uiMessagesFile)
            metadata.environment = uiMessages
          } catch (error) {
            // 環境データ読み込みエラーは無視
          }
        }
      }

      return {
        id: taskId,
        timestamp,
        conversations,
        metadata,
      }
    } catch (error) {
      console.error(`❌ タスク詳細読み込みエラー (${taskId}):`, error)
      this.emit('error', error)
      return null
    }
  }

  /**
   * Claude Dev統計情報の取得（完全タスクベース実装）
   */
  async getClaudeDevStats(): Promise<ClaudeDevStats> {
    this.ensureInitialized()

    console.log('📊 Claude Dev統合: タスクベース統計を計算します')
    return await this.getStatsFromTasks()
  }

  /**
   * タスクから直接統計を計算（ファイルシステムベース）
   */
  private async getStatsFromTasks(): Promise<ClaudeDevStats> {
    try {
      console.log('🔍 Claude Dev統合: タスクベース統計を計算中...')

      const taskIds = await this.findAvailableTasks()
      let totalMessages = 0
      let userMessages = 0
      let assistantMessages = 0
      let tasksWithAI = 0
      let totalCharacters = 0
      let earliestTimestamp = Date.now()
      let latestTimestamp = 0

      // 最大20件のタスクをサンプリング（パフォーマンス考慮）
      const sampleTasks = taskIds.slice(0, Math.min(20, taskIds.length))
      console.log(
        `📋 Claude Dev統合: ${sampleTasks.length}件のタスクをサンプリング中...`
      )

      for (const taskId of sampleTasks) {
        try {
          const task = await this.loadTaskDetails(taskId)
          if (task) {
            const userMsgs = task.conversations.filter(
              msg => msg.role === 'user'
            )
            const assistantMsgs = task.conversations.filter(
              msg => msg.role === 'assistant'
            )

            totalMessages += task.conversations.length
            userMessages += userMsgs.length
            assistantMessages += assistantMsgs.length

            if (assistantMsgs.length > 0) {
              tasksWithAI++
            }

            // 文字数計算
            for (const msg of task.conversations) {
              totalCharacters += msg.content.reduce(
                (sum, content) => sum + (content.text?.length || 0),
                0
              )
            }

            // タイムスタンプ範囲
            const taskTimestamp = task.timestamp.getTime()
            if (taskTimestamp < earliestTimestamp)
              earliestTimestamp = taskTimestamp
            if (taskTimestamp > latestTimestamp) latestTimestamp = taskTimestamp
          }
        } catch (error) {
          console.warn(`⚠️ タスク ${taskId} の統計計算をスキップ:`, error)
        }
      }

      // サンプルベースで全体を推定
      const estimationFactor = taskIds.length / Math.max(sampleTasks.length, 1)

      const stats = {
        totalTasks: taskIds.length,
        totalMessages: Math.round(totalMessages * estimationFactor),
        userMessages: Math.round(userMessages * estimationFactor),
        assistantMessages: Math.round(assistantMessages * estimationFactor),
        tasksWithAIResponses: Math.round(tasksWithAI * estimationFactor),
        averageMessagesPerTask:
          taskIds.length > 0
            ? Math.round((totalMessages / sampleTasks.length) * 10) / 10
            : 0,
        dateRange: {
          earliest:
            earliestTimestamp < Date.now()
              ? new Date(earliestTimestamp)
              : new Date(),
          latest: latestTimestamp > 0 ? new Date(latestTimestamp) : new Date(),
        },
        totalCharacters: Math.round(totalCharacters * estimationFactor),
      }

      console.log('✅ Claude Dev統合: タスクベース統計計算完了:', {
        サンプル: sampleTasks.length,
        全体: taskIds.length,
        推定係数: estimationFactor.toFixed(2),
      })

      return stats
    } catch (error) {
      console.error('❌ Claude Dev統合: タスクベース統計計算エラー:', error)
      // フォールバック: デフォルト統計
      return {
        totalTasks: 0,
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        tasksWithAIResponses: 0,
        averageMessagesPerTask: 0,
        dateRange: {
          earliest: new Date(),
          latest: new Date(),
        },
        totalCharacters: 0,
      }
    }
  }

  /**
   * Claude Devセッションの検索（完全タスクベース実装）
   */
  async searchClaudeDevSessions(
    keyword: string,
    options?: {
      limit?: number
      offset?: number
      sortBy?: 'timestamp' | 'relevance'
      sortOrder?: 'asc' | 'desc'
    }
  ): Promise<ClaudeDevSession[]> {
    this.ensureInitialized()

    console.log('🔍 Claude Dev統合: タスクベース検索を実行します')
    return await this.searchSessionsFromTasks(keyword, options)
  }

  /**
   * タスクから直接セッションを検索（ファイルシステムベース）
   */
  private async searchSessionsFromTasks(
    keyword: string,
    options?: {
      limit?: number
      offset?: number
      sortBy?: 'timestamp' | 'relevance'
      sortOrder?: 'asc' | 'desc'
    }
  ): Promise<ClaudeDevSession[]> {
    try {
      console.log('🔍 Claude Dev統合: タスクベースセッション検索実行中...')

      const limit = options?.limit || 10
      const offset = options?.offset || 0
      const sortOrder = options?.sortOrder || 'desc'

      const taskIds = await this.findAvailableTasks()
      const sessions: ClaudeDevSession[] = []

      // 最大100件のタスクから検索（パフォーマンス考慮）
      const searchTasks = taskIds.slice(0, Math.min(100, taskIds.length))
      console.log(
        `📋 Claude Dev統合: ${searchTasks.length}件のタスクを検索中...`
      )

      for (const taskId of searchTasks) {
        try {
          const task = await this.loadTaskDetails(taskId)
          if (task) {
            const session = this.convertTaskToSession(task)

            // キーワードフィルタリング
            if (
              !keyword.trim() ||
              session.title.toLowerCase().includes(keyword.toLowerCase()) ||
              session.content.toLowerCase().includes(keyword.toLowerCase())
            ) {
              sessions.push(session)
            }
          }
        } catch (error) {
          console.warn(`⚠️ タスク ${taskId} の検索処理をスキップ:`, error)
        }
      }

      // ソート
      sessions.sort((a, b) => {
        return sortOrder === 'desc'
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp
      })

      // ページネーション
      const result = sessions.slice(offset, offset + limit)
      console.log(`✅ Claude Dev統合: ${result.length}件のセッションを返します`)
      return result
    } catch (error) {
      console.error('❌ Claude Dev統合: タスクベース検索エラー:', error)
      return []
    }
  }

  /**
   * Claude Devタスクをセッション形式に変換
   */
  private convertTaskToSession(task: ClaudeDevTask): ClaudeDevSession {
    // 最初のユーザーメッセージからタイトルを生成
    const firstUserMessage = task.conversations.find(msg => msg.role === 'user')
    let title =
      firstUserMessage?.content[0]?.text?.slice(0, 100) ||
      `Claude Dev Task ${task.id}`

    // タイトルを読みやすく整形
    title = this.generateTitle(title)

    // 全メッセージのテキストを結合してコンテンツとする
    const content = task.conversations
      .map(msg => msg.content.map(content => content.text || '').join(' '))
      .join('\n')
      .slice(0, 2000) // 最大2000文字に制限

    const userMessages = task.conversations.filter(msg => msg.role === 'user')
    const assistantMessages = task.conversations.filter(
      msg => msg.role === 'assistant'
    )

    return {
      id: `claude-dev-${task.id}`, // 識別しやすいIDに変更
      title,
      content,
      timestamp: task.timestamp.getTime(),
      metadata: {
        source: 'claude-dev',
        taskId: task.id,
        originalTimestamp: task.timestamp.toISOString(),
        messageCount: task.conversations.length,
        userMessageCount: userMessages.length,
        assistantMessageCount: assistantMessages.length,
        hasAssistantResponses: assistantMessages.length > 0,
        totalCharacters: content.length,
        environment: task.metadata?.environment,
      },
    }
  }

  /**
   * タイトル生成ロジック
   */
  private generateTitle(text: string): string {
    // 改行を削除し、最初の100文字を取得
    let title = text.replace(/\n/g, ' ').trim()

    // 特定のパターンからタイトルを抽出
    const patterns = [
      /^(.{1,50}?)を/, // "〜を" で始まる場合
      /^(.{1,50}?)について/, // "〜について" で始まる場合
      /^(.{1,50}?)の/, // "〜の" で始まる場合
      /^(.{1,50}?)で/, // "〜で" で始まる場合
    ]

    for (const pattern of patterns) {
      const match = title.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    // パターンにマッチしない場合は最初の50文字
    if (title.length > 50) {
      title = title.substring(0, 50) + '...'
    }

    return title
  }

  /**
   * 特定のClaude Devセッションの取得（完全タスクベース実装）
   */
  async getClaudeDevSession(
    sessionId: string
  ): Promise<ClaudeDevSession | null> {
    this.ensureInitialized()

    console.log('🔍 Claude Dev統合: タスクベースセッション取得を実行します')
    return await this.getSessionFromTask(sessionId)
  }

  /**
   * タスクからセッションを取得
   */
  private async getSessionFromTask(
    sessionId: string
  ): Promise<ClaudeDevSession | null> {
    try {
      // セッションIDからタスクIDを抽出 (claude-dev-{taskId} 形式)
      const taskId = sessionId.replace('claude-dev-', '')

      if (!taskId || !/^\d{13}$/.test(taskId)) {
        console.warn(`⚠️ 無効なセッションID形式: ${sessionId}`)
        return null
      }

      const task = await this.loadTaskDetails(taskId)
      if (task) {
        return this.convertTaskToSession(task)
      }
      return null
    } catch (error) {
      console.warn('❌ Claude Dev統合: タスクからのセッション取得失敗:', error)
      return null
    }
  }

  /**
   * セッションをデータベースに保存（安全実装）
   */
  async saveSession(session: ClaudeDevSession): Promise<boolean> {
    this.ensureInitialized()

    // データベースが利用できない場合はスキップ
    if (!this.db || !this.isDatabaseOpen(this.db)) {
      console.log('⚠️ Claude Dev統合: データベース無効のため保存をスキップ')
      return true // エラーにはしない
    }

    try {
      const db = this.db // ローカル変数に代入
      const transaction = db.transaction(() => {
        // コンテンツをmetadataに含めて保存
        const enrichedMetadata = {
          ...session.metadata,
          content: session.content,
        }

        // メインテーブルに保存
        const insertStmt = db.prepare(`
          INSERT OR REPLACE INTO sessions (id, title, created_at, updated_at, metadata)
          VALUES (?, ?, ?, ?, ?)
        `)

        insertStmt.run(
          session.id,
          session.title,
          session.timestamp,
          session.timestamp,
          JSON.stringify(enrichedMetadata)
        )

        // FTS5インデックスの更新
        const ftsStmt = db.prepare(`
          INSERT OR REPLACE INTO sessions_fts (id, title, content)
          VALUES (?, ?, ?)
        `)

        ftsStmt.run(session.id, session.title, session.content)
      })

      transaction()
      this.emit('sessionSaved', session)
      console.log(`✅ セッション保存成功: ${session.id}`)
      return true
    } catch (error) {
      console.error('❌ セッション保存エラー:', error)
      this.emit('error', error)
      return false
    }
  }

  /**
   * 一括統合処理（改善版）
   */
  async integrateAllTasks(options?: IntegrationOptions): Promise<{
    success: number
    failed: number
    skipped: number
    totalProcessed: number
  }> {
    this.ensureInitialized()

    const result = {
      success: 0,
      failed: 0,
      skipped: 0,
      totalProcessed: 0,
    }

    try {
      this.emit('integrationStarted')
      console.log('🚀 Claude Dev統合: 一括統合処理を開始')

      const taskIds = await this.findAvailableTasks(options)
      result.totalProcessed = taskIds.length

      if (taskIds.length === 0) {
        console.log('📋 Claude Dev統合: 統合対象のタスクがありません')
        this.emit('integrationCompleted', result)
        return result
      }

      console.log(
        `📊 Claude Dev統合: ${taskIds.length}件のタスクを統合処理中...`
      )

      for (const taskId of taskIds) {
        this.emit('taskProcessing', {
          taskId,
          progress: result.success + result.failed + result.skipped + 1,
          total: taskIds.length,
        })

        const task = await this.loadTaskDetails(
          taskId,
          options?.includeEnvironmentData
        )

        if (!task) {
          result.skipped++
          console.log(`⚠️ タスク ${taskId} をスキップ`)
          continue
        }

        const session = this.convertTaskToSession(task)
        const success = await this.saveSession(session)

        if (success) {
          result.success++
          this.emit('taskIntegrated', { taskId, session })
        } else {
          result.failed++
          this.emit('taskFailed', { taskId, error: 'Database save failed' })
        }
      }

      console.log(
        `✅ Claude Dev統合: 統合処理完了 - 成功: ${result.success}, 失敗: ${result.failed}, スキップ: ${result.skipped}`
      )
      this.emit('integrationCompleted', result)
      return result
    } catch (error) {
      console.error('❌ Claude Dev統合: 一括統合処理エラー:', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Claude Devセッションの削除（安全実装）
   */
  async deleteClaudeDevSession(sessionId: string): Promise<boolean> {
    this.ensureInitialized()

    // データベースが利用できない場合はスキップ
    if (!this.db || !this.isDatabaseOpen(this.db)) {
      console.log('⚠️ Claude Dev統合: データベース無効のため削除をスキップ')
      return false
    }

    try {
      const db = this.db // ローカル変数に代入
      const transaction = db.transaction(() => {
        // メインテーブルから削除
        const deleteStmt = db.prepare('DELETE FROM sessions WHERE id = ?')
        const result = deleteStmt.run(sessionId)

        // FTSテーブルからも削除
        const deleteFtsStmt = db.prepare(
          'DELETE FROM sessions_fts WHERE id = ?'
        )
        deleteFtsStmt.run(sessionId)

        return result.changes > 0
      })

      const success = transaction()
      if (success) {
        this.emit('sessionDeleted', sessionId)
        console.log(`✅ セッション削除成功: ${sessionId}`)
      }
      return success
    } catch (error) {
      console.error('❌ セッション削除エラー:', error)
      this.emit('error', error)
      return false
    }
  }

  /**
   * 初期化状態の確認
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'Claude Dev統合サービスが初期化されていません。initialize()を呼び出してください。'
      )
    }
  }

  /**
   * デバッグ情報の取得
   */
  getDebugInfo(): any {
    return {
      initialized: this.initialized,
      hasDatabase: !!this.db,
      isSharedDatabase: this.isSharedDatabase,
      databaseOpen: this.db ? this.isDatabaseOpen(this.db) : false,
      claudeDevPath: this.claudeDevPath,
      databasePath: this.dbPath,
      connectionAttempted: this.databaseConnectionAttempted,
    }
  }

  /**
   * リソースのクリーンアップ
   */
  close(): void {
    console.log('🔄 Claude Dev統合: リソースクリーンアップ開始')

    // 共有データベースの場合は閉じない
    if (this.db && !this.isSharedDatabase) {
      try {
        this.db.close()
        console.log('✅ Claude Dev統合: データベース接続を閉じました')
      } catch (error) {
        console.warn('⚠️ Claude Dev統合: データベース接続終了エラー:', error)
      }
    }

    this.removeAllListeners()
    console.log('✅ Claude Dev統合: リソースクリーンアップ完了')
  }
}

export default ClaudeDevIntegrationService
