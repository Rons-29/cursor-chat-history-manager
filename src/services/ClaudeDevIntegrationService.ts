/**
 * Claude Dev統合サービス
 *
 * Claude Dev拡張機能のデータを独立したサービスとして統合し、
 * Chat History Managerの機能として提供します。
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
  taskId: string
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
 * Claude Dev統合サービスクラス
 */
export class ClaudeDevIntegrationService extends EventEmitter {
  private db: Database.Database
  private claudeDevPath: string
  private initialized = false

  constructor(dbPath?: string) {
    super()

    // データベースパスの設定
    const defaultDbPath = path.join(process.cwd(), 'data', 'chat-history.db')
    const finalDbPath = dbPath || defaultDbPath

    console.log(`Claude Dev統合: データベースを初期化中: ${finalDbPath}`)

    try {
      // better-sqlite3のオプションを明示的に設定
      this.db = new Database(finalDbPath, {
        verbose: console.log,
        fileMustExist: false,
        timeout: 5000,
        readonly: false,
      })

      // 接続テスト
      this.db.pragma('journal_mode = WAL')
      console.log('Claude Dev統合: データベース接続成功')
    } catch (error) {
      console.error('Claude Dev統合: データベース接続エラー:', error)
      throw error
    }

    // Claude Dev拡張機能のパス
    this.claudeDevPath = path.join(
      os.homedir(),
      'Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/tasks'
    )
  }

  /**
   * サービスの初期化
   */
  async initialize(): Promise<void> {
    try {
      console.log('Claude Dev統合: サービス初期化を開始')

      // データベーステーブルの作成
      this.initializeDatabase()
      console.log('Claude Dev統合: データベーステーブル初期化完了')

      // Claude Devパスの検証
      await this.validateClaudeDevPath()
      console.log('Claude Dev統合: Claude Devパス検証完了')

      this.initialized = true
      console.log('Claude Dev統合: サービス初期化完了')
      this.emit('initialized')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Claude Dev統合: 初期化エラー:', errorMessage)
      this.emit(
        'error',
        new Error(`Claude Dev統合サービスの初期化に失敗: ${errorMessage}`)
      )
      throw error
    }
  }

  /**
   * データベースの初期化
   */
  private initializeDatabase(): void {
    try {
      // データベースファイルの存在確認
      console.log(
        `Claude Dev統合: データベースファイルを確認中: ${this.db.name}`
      )

      // セッションテーブルの作成（既存スキーマと整合性確保）
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          message_count INTEGER NOT NULL DEFAULT 0,
          file_checksum TEXT,
          file_modified_at INTEGER,
          metadata TEXT
        )
      `)
      console.log('Claude Dev統合: sessionsテーブル作成完了')

      // FTS5全文検索テーブルの作成
      this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
        id, title, content,
        content='sessions',
        content_rowid='rowid'
      )
    `)

      // Claude Dev専用インデックス
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_source 
        ON sessions(json_extract(metadata, '$.source'))
      `)
      console.log('Claude Dev統合: sourceインデックス作成完了')

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_timestamp 
        ON sessions(created_at)
      `)
      console.log('Claude Dev統合: timestampインデックス作成完了')

      // テーブル存在確認
      const tables = this.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
      console.log('Claude Dev統合: 利用可能なテーブル:', tables)
    } catch (error) {
      console.error('Claude Dev統合: データベース初期化エラー:', error)
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
        console.warn(`Claude Devパスが存在しません: ${this.claudeDevPath}`)
        return []
      }

      console.log(
        `Claude Dev統合: 利用可能なタスクを検索中... パス: ${this.claudeDevPath}`
      )

      // 実際のタスクディレクトリを読み込み
      const tasks = await fs.readdir(this.claudeDevPath)
      console.log(
        `Claude Dev統合: ディレクトリから${tasks.length}個のアイテムを発見`
      )
      const validTasks = []

      for (const task of tasks) {
        console.log(`Claude Dev統合: タスク候補を検証中: ${task}`)

        // タスクIDの検証（タイムスタンプ形式）
        if (!/^\d{13}$/.test(task)) {
          console.log(`Claude Dev統合: タスクID形式が無効: ${task}`)
          continue
        }

        const taskPath = path.join(this.claudeDevPath, task)
        const historyFile = path.join(taskPath, 'api_conversation_history.json')
        console.log(`Claude Dev統合: 履歴ファイルを確認中: ${historyFile}`)

        if (await fs.pathExists(historyFile)) {
          console.log(`Claude Dev統合: 有効なタスクを発見: ${task}`)
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

          // 既存データのスキップ
          if (options?.skipExisting) {
            const sessionId = `claude-dev-${task}`
            const existing = this.db
              .prepare('SELECT id FROM sessions WHERE id = ?')
              .get(sessionId)
            if (existing) continue
          }

          validTasks.push(task)
        }
      }

      // 最大処理数の制限
      if (options?.maxTasksToProcess) {
        return validTasks.slice(0, options.maxTasksToProcess)
      }

      console.log(
        `Claude Dev統合: ${validTasks.length}個のタスクが見つかりました`
      )
      return validTasks.sort() // タイムスタンプ順にソート
    } catch (error) {
      console.error(`タスク検索エラー:`, error)
      console.error(`エラーの詳細:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        claudeDevPath: this.claudeDevPath,
      })
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
        taskId,
        timestamp,
        conversations,
        metadata,
      }
    } catch (error) {
      this.emit('error', error)
      return null
    }
  }

  /**
   * タスクをセッション形式に変換
   */
  convertTaskToSession(task: ClaudeDevTask): ClaudeDevSession {
    // 統計情報の計算
    const userMessages = task.conversations.filter(msg => msg.role === 'user')
    const assistantMessages = task.conversations.filter(
      msg => msg.role === 'assistant'
    )

    // 会話内容の結合
    const content = task.conversations
      .map((msg, index) => {
        const role = msg.role === 'user' ? 'ユーザー' : 'アシスタント'
        const text = msg.content
          .filter(c => c.type === 'text')
          .map(c => c.text || '')
          .join('\n')

        const timestamp = new Date(
          task.timestamp.getTime() + index * 1000
        ).toISOString()

        return `[${role}] ${timestamp}\n${text}`
      })
      .join('\n\n---\n\n')

    // タイトルの生成（最初のユーザーメッセージから）
    const firstUserMessage = userMessages[0]
    let title = `Claude Dev Task ${task.taskId}`

    if (firstUserMessage) {
      const firstText =
        firstUserMessage.content.find(c => c.type === 'text')?.text || ''

      if (firstText) {
        // タイトルの生成ロジック
        title = this.generateTitle(firstText)
      }
    }

    // 文字数の計算
    const totalCharacters = task.conversations.reduce((total, msg) => {
      return (
        total +
        msg.content.reduce((msgTotal, content) => {
          return msgTotal + (content.text?.length || 0)
        }, 0)
      )
    }, 0)

    return {
      id: `claude-dev-${task.taskId}`,
      title,
      content,
      timestamp: task.timestamp.getTime(),
      metadata: {
        source: 'claude-dev',
        taskId: task.taskId,
        originalTimestamp: task.timestamp.toISOString(),
        messageCount: task.conversations.length,
        hasAssistantResponses: assistantMessages.length > 0,
        userMessageCount: userMessages.length,
        assistantMessageCount: assistantMessages.length,
        totalCharacters,
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
   * セッションをデータベースに保存
   */
  async saveSession(session: ClaudeDevSession): Promise<boolean> {
    this.ensureInitialized()

    try {
      const transaction = this.db.transaction(() => {
        // メインテーブルに保存
        const insertStmt = this.db.prepare(`
          INSERT OR REPLACE INTO sessions (id, title, content, created_at, updated_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?)
        `)

        insertStmt.run(
          session.id,
          session.title,
          session.content,
          session.timestamp,
          session.timestamp,
          JSON.stringify(session.metadata)
        )

        // FTS5インデックスの更新
        const ftsStmt = this.db.prepare(`
          INSERT OR REPLACE INTO sessions_fts (id, title, content)
          VALUES (?, ?, ?)
        `)

        ftsStmt.run(session.id, session.title, session.content)
      })

      transaction()
      this.emit('sessionSaved', session)
      return true
    } catch (error) {
      this.emit('error', error)
      return false
    }
  }

  /**
   * 一括統合処理
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

      const taskIds = await this.findAvailableTasks(options)
      result.totalProcessed = taskIds.length

      if (taskIds.length === 0) {
        this.emit('integrationCompleted', result)
        return result
      }

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

      this.emit('integrationCompleted', result)
      return result
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Claude Dev統計情報の取得
   */
  async getClaudeDevStats(): Promise<ClaudeDevStats> {
    this.ensureInitialized()

    try {
      // 基本統計
      const totalTasks = this.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM sessions 
        WHERE json_extract(metadata, '$.source') = 'claude-dev'
      `
        )
        .get() as { count: number }

      const messageStats = this.db
        .prepare(
          `
        SELECT 
          SUM(json_extract(metadata, '$.messageCount')) as totalMessages,
          SUM(json_extract(metadata, '$.userMessageCount')) as userMessages,
          SUM(json_extract(metadata, '$.assistantMessageCount')) as assistantMessages,
          SUM(json_extract(metadata, '$.totalCharacters')) as totalCharacters
        FROM sessions 
        WHERE json_extract(metadata, '$.source') = 'claude-dev'
      `
        )
        .get() as {
        totalMessages: number
        userMessages: number
        assistantMessages: number
        totalCharacters: number
      }

      const tasksWithAI = this.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM sessions 
        WHERE json_extract(metadata, '$.source') = 'claude-dev'
        AND json_extract(metadata, '$.hasAssistantResponses') = 1
      `
        )
        .get() as { count: number }

      // 日付範囲
      const dateRange = this.db
        .prepare(
          `
        SELECT 
          MIN(created_at) as earliest,
          MAX(created_at) as latest
        FROM sessions 
        WHERE json_extract(metadata, '$.source') = 'claude-dev'
      `
        )
        .get() as { earliest: number; latest: number }

      return {
        totalTasks: totalTasks.count,
        totalMessages: messageStats.totalMessages || 0,
        userMessages: messageStats.userMessages || 0,
        assistantMessages: messageStats.assistantMessages || 0,
        tasksWithAIResponses: tasksWithAI.count,
        averageMessagesPerTask:
          totalTasks.count > 0
            ? Math.round(
                ((messageStats.totalMessages || 0) / totalTasks.count) * 10
              ) / 10
            : 0,
        dateRange: {
          earliest: dateRange.earliest
            ? new Date(dateRange.earliest)
            : new Date(),
          latest: dateRange.latest ? new Date(dateRange.latest) : new Date(),
        },
        totalCharacters: messageStats.totalCharacters || 0,
      }
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Claude Devセッションの検索
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

    try {
      const limit = options?.limit || 10
      const offset = options?.offset || 0
      const sortBy = options?.sortBy || 'timestamp'
      const sortOrder = options?.sortOrder || 'desc'

      let query: string
      let params: any[]

      if (keyword.trim()) {
        // FTS5を使用した全文検索
        query = `
          SELECT s.id, s.title, s.content, s.created_at as timestamp, s.metadata
          FROM sessions s
          JOIN sessions_fts fts ON s.id = fts.id
          WHERE fts MATCH ? 
          AND json_extract(s.metadata, '$.source') = 'claude-dev'
          ORDER BY ${sortBy === 'relevance' ? 'rank' : 's.created_at'} ${sortOrder}
          LIMIT ? OFFSET ?
        `
        params = [keyword, limit, offset]
      } else {
        // 全Claude Devセッションを取得
        query = `
          SELECT id, title, content, created_at as timestamp, metadata
          FROM sessions 
          WHERE json_extract(metadata, '$.source') = 'claude-dev'
          ORDER BY created_at ${sortOrder}
          LIMIT ? OFFSET ?
        `
        params = [limit, offset]
      }

      const rows = this.db.prepare(query).all(...params) as any[]

      return rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        timestamp: row.timestamp,
        metadata: JSON.parse(row.metadata),
      }))
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 特定のClaude Devセッションの取得
   */
  async getClaudeDevSession(
    sessionId: string
  ): Promise<ClaudeDevSession | null> {
    this.ensureInitialized()

    try {
      const row = this.db
        .prepare(
          `
        SELECT id, title, content, created_at as timestamp, metadata
        FROM sessions 
        WHERE id = ? AND json_extract(metadata, '$.source') = 'claude-dev'
      `
        )
        .get(sessionId) as any

      if (!row) return null

      return {
        id: row.id,
        title: row.title,
        content: row.content,
        timestamp: row.timestamp,
        metadata: JSON.parse(row.metadata),
      }
    } catch (error) {
      this.emit('error', error)
      return null
    }
  }

  /**
   * Claude Devセッションの削除
   */
  async deleteClaudeDevSession(sessionId: string): Promise<boolean> {
    this.ensureInitialized()

    try {
      const transaction = this.db.transaction(() => {
        // メインテーブルから削除
        const deleteStmt = this.db.prepare('DELETE FROM sessions WHERE id = ?')
        const result = deleteStmt.run(sessionId)

        // FTSテーブルからも削除
        const deleteFtsStmt = this.db.prepare(
          'DELETE FROM sessions_fts WHERE id = ?'
        )
        deleteFtsStmt.run(sessionId)

        return result.changes > 0
      })

      const success = transaction()
      if (success) {
        this.emit('sessionDeleted', sessionId)
      }
      return success
    } catch (error) {
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
   * リソースのクリーンアップ
   */
  close(): void {
    if (this.db) {
      this.db.close()
    }
    this.removeAllListeners()
  }
}

export default ClaudeDevIntegrationService
