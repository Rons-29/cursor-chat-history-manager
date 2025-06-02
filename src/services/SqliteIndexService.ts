import Database from 'better-sqlite3'
import fs from 'fs-extra'
import path from 'path'
import { Logger } from '../server/utils/Logger.js'
import type { ChatSession } from '../types/index.js'

/**
 * SQLiteベースの高性能インデックス管理サービス
 * リレーショナルDBでスケーラブルなインデックス管理
 */
export class SqliteIndexService {
  private db: Database.Database | null = null
  private dbPath: string
  private sessionDir: string
  private logger: Logger
  private initialized = false

  constructor(sessionDir: string, dbPath: string, logger: Logger) {
    this.sessionDir = sessionDir
    this.dbPath = dbPath
    this.logger = logger
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // データベースディレクトリを作成
      await fs.ensureDir(path.dirname(this.dbPath))

      // SQLiteデータベースを開く
      this.db = new Database(this.dbPath)

      // テーブル作成
      this.createTables()

      // インデックス作成
      this.createIndexes()

      this.initialized = true
      this.logger.info('SQLiteインデックスサービスが初期化されました', {
        dbPath: this.dbPath,
      })
    } catch (error) {
      this.logger.error('SQLiteインデックス初期化エラー:', error)
      throw error
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized')

    // セッションテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 0,
        file_checksum TEXT,
        file_modified_at INTEGER,
        metadata TEXT
      )
    `)

    // タグテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `)

    // セッション-タグ関連テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_tags (
        session_id TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (session_id, tag_id),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `)

    // メッセージテーブル（検索用）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `)

    // FTS5 全文検索テーブル
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        id UNINDEXED,
        session_id UNINDEXED,
        role UNINDEXED,
        content,
        content='messages',
        content_rowid='rowid'
      )
    `)
  }

  private createIndexes(): void {
    if (!this.db) throw new Error('Database not initialized')

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
    `)
  }

  /**
   * セッションを追加/更新
   */
  async upsertSession(
    sessionData: ChatSession,
    fileStats?: { checksum: string; modifiedAt: Date }
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const transaction = this.db.transaction(() => {
      // セッション情報を挿入/更新
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO sessions (
          id, title, created_at, updated_at, message_count, 
          file_checksum, file_modified_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        sessionData.id,
        sessionData.title,
        sessionData.createdAt.getTime(),
        sessionData.updatedAt.getTime(),
        sessionData.messages.length,
        fileStats?.checksum || null,
        fileStats?.modifiedAt.getTime() || null,
        JSON.stringify(sessionData.metadata || {})
      )

      // 既存のタグを削除
      this.db!.prepare('DELETE FROM session_tags WHERE session_id = ?').run(
        sessionData.id
      )

      // タグを処理
      if (sessionData.tags && sessionData.tags.length > 0) {
        const insertTag = this.db!.prepare(
          'INSERT OR IGNORE INTO tags (name) VALUES (?)'
        )
        const getTagId = this.db!.prepare('SELECT id FROM tags WHERE name = ?')
        const insertSessionTag = this.db!.prepare(
          'INSERT INTO session_tags (session_id, tag_id) VALUES (?, ?)'
        )

        for (const tagName of sessionData.tags) {
          insertTag.run(tagName)
          const tagResult = getTagId.get(tagName) as { id: number }
          insertSessionTag.run(sessionData.id, tagResult.id)
        }
      }

      // メッセージを削除して再挿入
      this.db!.prepare('DELETE FROM messages WHERE session_id = ?').run(
        sessionData.id
      )

      if (sessionData.messages.length > 0) {
        const insertMessage = this.db!.prepare(`
          INSERT INTO messages (id, session_id, role, content, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `)

        for (const message of sessionData.messages) {
          insertMessage.run(
            message.id,
            sessionData.id,
            message.role,
            message.content,
            message.timestamp.getTime()
          )
        }
      }
    })

    transaction()
  }

  /**
   * セッションを削除
   */
  async removeSession(sessionId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?')
    const result = stmt.run(sessionId)

    return result.changes > 0
  }

  /**
   * セッション一覧を取得（ページネーション対応）
   */
  async getSessions(
    options: {
      page?: number
      pageSize?: number
      keyword?: string
      tags?: string[]
      startDate?: Date
      endDate?: Date
    } = {}
  ): Promise<{
    sessions: Array<{
      id: string
      title: string
      createdAt: Date
      updatedAt: Date
      messageCount: number
      tags: string[]
    }>
    total: number
    hasMore: boolean
  }> {
    if (!this.db) throw new Error('Database not initialized')

    const {
      page = 1,
      pageSize = 50,
      keyword,
      tags,
      startDate,
      endDate,
    } = options

    const offset = (page - 1) * pageSize

    // 条件構築
    let whereClause = '1=1'
    const params: any[] = []

    if (keyword) {
      whereClause += ` AND (s.title LIKE ? OR s.id IN (
        SELECT session_id FROM messages_fts WHERE content MATCH ?
      ))`
      params.push(`%${keyword}%`, keyword)
    }

    if (startDate) {
      whereClause += ' AND s.created_at >= ?'
      params.push(startDate.getTime())
    }

    if (endDate) {
      whereClause += ' AND s.created_at <= ?'
      params.push(endDate.getTime())
    }

    if (tags && tags.length > 0) {
      const tagPlaceholders = tags.map(() => '?').join(',')
      whereClause += ` AND s.id IN (
        SELECT st.session_id FROM session_tags st
        JOIN tags t ON st.tag_id = t.id
        WHERE t.name IN (${tagPlaceholders})
        GROUP BY st.session_id
        HAVING COUNT(*) = ?
      )`
      params.push(...tags, tags.length)
    }

    // 総数取得
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM sessions s
      WHERE ${whereClause}
    `)
    const { total } = countStmt.get(...params) as { total: number }

    // セッション取得
    const sessionStmt = this.db.prepare(`
      SELECT s.*, GROUP_CONCAT(t.name) as tag_names
      FROM sessions s
      LEFT JOIN session_tags st ON s.id = st.session_id
      LEFT JOIN tags t ON st.tag_id = t.id
      WHERE ${whereClause}
      GROUP BY s.id
      ORDER BY s.updated_at DESC
      LIMIT ? OFFSET ?
    `)

    const sessionResults = sessionStmt.all(
      ...params,
      pageSize,
      offset
    ) as Array<{
      id: string
      title: string
      created_at: number
      updated_at: number
      message_count: number
      tag_names: string | null
    }>

    const sessions = sessionResults.map(row => ({
      id: row.id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      messageCount: row.message_count,
      tags: row.tag_names ? row.tag_names.split(',') : [],
    }))

    return {
      sessions,
      total,
      hasMore: offset + pageSize < total,
    }
  }

  /**
   * メッセージ検索
   */
  async searchMessages(
    query: string,
    options: {
      limit?: number
      offset?: number
      sessionId?: string
      role?: string
    } = {}
  ): Promise<{
    messages: Array<{
      id: string
      sessionId: string
      role: string
      content: string
      timestamp: Date
      sessionTitle: string
    }>
    total: number
    hasMore: boolean
  }> {
    if (!this.db) throw new Error('Database not initialized')

    const { limit = 50, offset = 0, sessionId, role } = options

    let whereClause = 'messages_fts MATCH ?'
    const params: any[] = [query]

    if (sessionId) {
      whereClause += ' AND m.session_id = ?'
      params.push(sessionId)
    }

    if (role) {
      whereClause += ' AND m.role = ?'
      params.push(role)
    }

    // 総数取得
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM messages_fts
      JOIN messages m ON messages_fts.id = m.id
      WHERE ${whereClause}
    `)
    const { total } = countStmt.get(...params) as { total: number }

    // メッセージ取得
    const messageStmt = this.db.prepare(`
      SELECT m.*, s.title as session_title
      FROM messages_fts
      JOIN messages m ON messages_fts.id = m.id
      JOIN sessions s ON m.session_id = s.id
      WHERE ${whereClause}
      ORDER BY m.timestamp DESC
      LIMIT ? OFFSET ?
    `)

    const messageResults = messageStmt.all(...params, limit, offset) as Array<{
      id: string
      session_id: string
      role: string
      content: string
      timestamp: number
      session_title: string
    }>

    const messages = messageResults.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: new Date(row.timestamp),
      sessionTitle: row.session_title,
    }))

    return {
      messages,
      total,
      hasMore: offset + limit < total,
    }
  }

  /**
   * 統計情報取得
   */
  async getStats(): Promise<{
    totalSessions: number
    totalMessages: number
    topTags: Array<{ name: string; count: number }>
    recentActivity: Array<{ date: string; sessionCount: number }>
  }> {
    if (!this.db) throw new Error('Database not initialized')

    // 総セッション数
    const { totalSessions } = this.db
      .prepare('SELECT COUNT(*) as totalSessions FROM sessions')
      .get() as { totalSessions: number }

    // 総メッセージ数
    const { totalMessages } = this.db
      .prepare('SELECT COUNT(*) as totalMessages FROM messages')
      .get() as { totalMessages: number }

    // トップタグ
    const topTagsResults = this.db
      .prepare(
        `
      SELECT t.name, COUNT(*) as count
      FROM tags t
      JOIN session_tags st ON t.id = st.tag_id
      GROUP BY t.id, t.name
      ORDER BY count DESC
      LIMIT 10
    `
      )
      .all() as Array<{ name: string; count: number }>

    // 最近のアクティビティ（過去7日間）
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentActivityResults = this.db
      .prepare(
        `
      SELECT 
        DATE(created_at / 1000, 'unixepoch') as date,
        COUNT(*) as sessionCount
      FROM sessions
      WHERE created_at >= ?
      GROUP BY DATE(created_at / 1000, 'unixepoch')
      ORDER BY date DESC
    `
      )
      .all(sevenDaysAgo) as Array<{ date: string; sessionCount: number }>

    return {
      totalSessions,
      totalMessages,
      topTags: topTagsResults,
      recentActivity: recentActivityResults,
    }
  }

  /**
   * インデックス最適化
   */
  async optimize(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    this.db.exec('VACUUM')
    this.db.exec('ANALYZE')
    this.db.exec('INSERT INTO messages_fts(messages_fts) VALUES("optimize")')

    this.logger.info('SQLiteインデックスが最適化されました')
  }

  /**
   * データベースを閉じる
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initialized = false
    }
  }
}
