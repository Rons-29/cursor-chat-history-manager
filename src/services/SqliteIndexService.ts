/**
 * 🗄️ SQLite統合サービス - Phase 3高速検索エンジン
 * 
 * 機能:
 * - SQLite FTS5全文検索 (10-100倍高速化)
 * - 増分インデックス更新
 * - 検索結果ランキング最適化
 * - データ整合性保証
 * 
 * 性能目標:
 * - 検索速度: 50-200ms
 * - インデックス更新: リアルタイム
 * - データ容量: 100,000セッション対応
 */

import Database from 'better-sqlite3'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { Session, Message, SearchResult } from '../types/ChatHistory'
import { logger } from '../utils/logger'

interface SQLiteSchema {
  sessions: 'id TEXT PRIMARY KEY, title TEXT, content TEXT, timestamp INTEGER, metadata TEXT'
  messages: 'id TEXT PRIMARY KEY, session_id TEXT, content TEXT, timestamp INTEGER, role TEXT'
  sessions_fts: 'VIRTUAL TABLE USING fts5(id, title, content, metadata)'
  messages_fts: 'VIRTUAL TABLE USING fts5(id, session_id, content, role)'
}

interface SearchOptions {
  readonly limit?: number
  readonly offset?: number
  readonly orderBy?: 'relevance' | 'timestamp' | 'title'
  readonly filters?: {
    readonly dateRange?: { start: Date; end: Date }
    readonly platform?: string[]
    readonly minLength?: number
  }
}

interface IndexStats {
  readonly totalSessions: number
  readonly totalMessages: number
  readonly indexSize: number
  readonly lastUpdate: Date
  readonly avgSearchTime: number
}

/**
 * SQLite統合高速検索サービス
 * Phase 3の核となる検索エンジン実装
 */
export class SqliteIndexService {
  private db: Database.Database | null = null
  private dbPath: string
  private initialized = false
  private readonly BATCH_SIZE = 1000
  private searchMetrics: { queries: number; totalTime: number } = { queries: 0, totalTime: 0 }

  constructor(dataPath: string = 'data') {
    this.dbPath = join(dataPath, 'chatflow-search.db')
  }

  /**
   * SQLiteデータベース初期化
   * FTS5テーブル作成・インデックス設定
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🗄️ SQLite検索エンジン初期化開始')

      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL') // 高性能設定
      this.db.pragma('synchronous = NORMAL')
      this.db.pragma('cache_size = 10000')
      this.db.pragma('temp_store = memory')

      await this.createTables()
      await this.createIndexes()
      await this.setupTriggers()

      this.initialized = true
      logger.info('✅ SQLite検索エンジン初期化完了')
    } catch (error) {
      logger.error('❌ SQLite初期化エラー:', error)
      throw new Error(`SQLite初期化に失敗しました: ${error.message}`)
    }
  }

  /**
   * テーブル作成 (通常テーブル + FTS5仮想テーブル)
   */
  private async createTables(): Promise<void> {
    const tables = [
      // 通常テーブル
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT NOT NULL,
        platform TEXT,
        message_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        role TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )`,

      // FTS5仮想テーブル (全文検索用)
      `CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
        id UNINDEXED,
        title,
        content,
        metadata,
        platform,
        content='sessions',
        content_rowid='rowid',
        tokenize='porter unicode61'
      )`,

      `CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        id UNINDEXED,
        session_id UNINDEXED,
        content,
        role UNINDEXED,
        content='messages',
        content_rowid='rowid',
        tokenize='porter unicode61'
      )`
    ]

    for (const sql of tables) {
      this.db!.exec(sql)
    }
  }

  /**
   * インデックス作成 (検索最適化)
   */
  private async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_platform ON sessions(platform)',
      'CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC)'
    ]

    for (const sql of indexes) {
      this.db!.exec(sql)
    }
  }

  /**
   * トリガー設定 (FTS5自動更新)
   */
  private async setupTriggers(): Promise<void> {
    const triggers = [
      // セッションFTS5更新トリガー
      `CREATE TRIGGER IF NOT EXISTS sessions_fts_insert AFTER INSERT ON sessions
       BEGIN
         INSERT INTO sessions_fts(rowid, id, title, content, metadata, platform)
         VALUES (new.rowid, new.id, new.title, new.content, new.metadata, new.platform);
       END`,

      `CREATE TRIGGER IF NOT EXISTS sessions_fts_update AFTER UPDATE ON sessions
       BEGIN
         UPDATE sessions_fts SET 
           title = new.title,
           content = new.content,
           metadata = new.metadata,
           platform = new.platform
         WHERE rowid = new.rowid;
         UPDATE sessions SET updated_at = strftime('%s', 'now') WHERE id = new.id;
       END`,

      `CREATE TRIGGER IF NOT EXISTS sessions_fts_delete AFTER DELETE ON sessions
       BEGIN
         DELETE FROM sessions_fts WHERE rowid = old.rowid;
       END`,

      // メッセージFTS5更新トリガー
      `CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages
       BEGIN
         INSERT INTO messages_fts(rowid, id, session_id, content, role)
         VALUES (new.rowid, new.id, new.session_id, new.content, new.role);
       END`,

      `CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages
       BEGIN
         UPDATE messages_fts SET 
           content = new.content,
           role = new.role
         WHERE rowid = new.rowid;
       END`,

      `CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages
       BEGIN
         DELETE FROM messages_fts WHERE rowid = old.rowid;
       END`
    ]

    for (const sql of triggers) {
      this.db!.exec(sql)
    }
  }

  /**
   * 高速全文検索実行 (FTS5)
   * 目標: 50-200ms応答時間
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.initialized || !this.db) {
      throw new Error('SQLite検索エンジンが初期化されていません')
    }

    const startTime = Date.now()
    
    try {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'relevance',
        filters = {}
      } = options

      // FTS5クエリ構築
      const ftsQuery = this.buildFTSQuery(query)
      let sql = `
        SELECT 
          s.id,
          s.title,
          s.content,
          s.timestamp,
          s.platform,
          s.message_count,
          s.metadata,
          sf.rank,
          snippet(sessions_fts, 2, '<mark>', '</mark>', '...', 10) as snippet
        FROM sessions_fts sf
        JOIN sessions s ON s.rowid = sf.rowid
        WHERE sessions_fts MATCH ?
      `

      const params: any[] = [ftsQuery]

      // フィルター適用
      if (filters.dateRange) {
        sql += ' AND s.timestamp BETWEEN ? AND ?'
        params.push(filters.dateRange.start.getTime(), filters.dateRange.end.getTime())
      }

      if (filters.platform?.length) {
        sql += ` AND s.platform IN (${filters.platform.map(() => '?').join(',')})`
        params.push(...filters.platform)
      }

      if (filters.minLength) {
        sql += ' AND length(s.content) >= ?'
        params.push(filters.minLength)
      }

      // ソート順設定
      switch (orderBy) {
        case 'relevance':
          sql += ' ORDER BY sf.rank'
          break
        case 'timestamp':
          sql += ' ORDER BY s.timestamp DESC'
          break
        case 'title':
          sql += ' ORDER BY s.title ASC'
          break
      }

      sql += ' LIMIT ? OFFSET ?'
      params.push(limit, offset)

      const results = this.db.prepare(sql).all(...params) as any[]

      const searchResults: SearchResult[] = results.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        snippet: row.snippet,
        timestamp: new Date(row.timestamp),
        platform: row.platform,
        metadata: JSON.parse(row.metadata || '{}'),
        relevanceScore: 1 / (row.rank + 1), // FTS5 rankを正規化
        messageCount: row.message_count
      }))

      // 性能メトリクス更新
      const searchTime = Date.now() - startTime
      this.searchMetrics.queries++
      this.searchMetrics.totalTime += searchTime

      logger.info(`🔍 検索完了: ${searchTime}ms, 結果: ${results.length}件, クエリ: "${query}"`)

      return searchResults
    } catch (error) {
      logger.error('❌ 検索エラー:', error)
      throw new Error(`検索に失敗しました: ${error.message}`)
    }
  }

  /**
   * FTS5クエリ構築 (高度な検索構文対応)
   */
  private buildFTSQuery(query: string): string {
    // 基本的なクエリサニタイズ
    let ftsQuery = query.trim()

    // 特殊文字エスケープ
    ftsQuery = ftsQuery.replace(/["']/g, '')

    // フレーズ検索対応
    if (ftsQuery.includes(' ')) {
      ftsQuery = `"${ftsQuery}"`
    }

    // ワイルドカード検索対応
    if (!ftsQuery.includes('"') && ftsQuery.length > 2) {
      ftsQuery = `${ftsQuery}*`
    }

    return ftsQuery
  }

  /**
   * セッション一括インデックス (既存データ移行用)
   */
  async indexSessions(sessions: Session[]): Promise<void> {
    if (!this.initialized || !this.db) {
      throw new Error('SQLite検索エンジンが初期化されていません')
    }

    logger.info(`📚 セッション一括インデックス開始: ${sessions.length}件`)

    const insertSession = this.db.prepare(`
      INSERT OR REPLACE INTO sessions 
      (id, title, content, timestamp, metadata, platform, message_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMessage = this.db.prepare(`
      INSERT OR REPLACE INTO messages
      (id, session_id, content, timestamp, role)
      VALUES (?, ?, ?, ?, ?)
    `)

    const transaction = this.db.transaction((sessionBatch: Session[]) => {
      for (const session of sessionBatch) {
        // セッション挿入
        insertSession.run(
          session.id,
          session.title,
          session.content || '',
          session.timestamp.getTime(),
          JSON.stringify(session.metadata || {}),
          session.metadata?.platform || 'unknown',
          session.messages?.length || 0
        )

        // メッセージ挿入
        if (session.messages) {
          for (const message of session.messages) {
            insertMessage.run(
              message.id,
              session.id,
              message.content,
              message.timestamp.getTime(),
              message.role
            )
          }
        }
      }
    })

    // バッチ処理で性能最適化
    for (let i = 0; i < sessions.length; i += this.BATCH_SIZE) {
      const batch = sessions.slice(i, i + this.BATCH_SIZE)
      transaction(batch)
      
      const progress = Math.round((i + batch.length) / sessions.length * 100)
      logger.info(`📊 インデックス進捗: ${progress}% (${i + batch.length}/${sessions.length})`)
    }

    logger.info('✅ セッション一括インデックス完了')
  }

  /**
   * インデックス統計取得
   */
  async getIndexStats(): Promise<IndexStats> {
    if (!this.initialized || !this.db) {
      throw new Error('SQLite検索エンジンが初期化されていません')
    }

    const sessionCount = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }
    const messageCount = this.db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }
    const lastUpdate = this.db.prepare('SELECT MAX(updated_at) as last_update FROM sessions').get() as { last_update: number }

    // DBファイルサイズ取得
    const { size: indexSize } = await import('fs/promises').then(fs => 
      fs.stat(this.dbPath).catch(() => ({ size: 0 }))
    )

    return {
      totalSessions: sessionCount.count,
      totalMessages: messageCount.count,
      indexSize,
      lastUpdate: new Date((lastUpdate.last_update || 0) * 1000),
      avgSearchTime: this.searchMetrics.queries > 0 
        ? this.searchMetrics.totalTime / this.searchMetrics.queries 
        : 0
    }
  }

  /**
   * インデックス最適化実行
   */
  async optimizeIndex(): Promise<void> {
    if (!this.initialized || !this.db) {
      throw new Error('SQLite検索エンジンが初期化されていません')
    }

    logger.info('🔧 インデックス最適化開始')

    try {
      // FTS5最適化
      this.db.exec('INSERT INTO sessions_fts(sessions_fts) VALUES("optimize")')
      this.db.exec('INSERT INTO messages_fts(messages_fts) VALUES("optimize")')

      // SQLite最適化
      this.db.exec('VACUUM')
      this.db.exec('ANALYZE')

      logger.info('✅ インデックス最適化完了')
    } catch (error) {
      logger.error('❌ インデックス最適化エラー:', error)
      throw new Error(`インデックス最適化に失敗しました: ${error.message}`)
    }
  }

  /**
   * リソース解放
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initialized = false
      logger.info('🔌 SQLite検索エンジン終了')
    }
  }
}
