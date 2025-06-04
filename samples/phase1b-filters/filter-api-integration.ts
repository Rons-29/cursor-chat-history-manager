/**
 * 🎨 Phase 1B: Notion風フィルタAPI統合実装
 * 
 * 実際のChatFlowデータベースと連携するフィルタシステム
 * - SQLiteによる高速フィルタ処理
 * - 複合条件対応（日付・ソース・役割・タイトル・メッセージ数）
 * - リアルタイムフィルタ統計
 * - Notion風UIとの完全統合
 */

import Database from 'better-sqlite3'
import { performance } from 'perf_hooks'
import path from 'path'
import fs from 'fs'

// フィルタ条件型定義
export interface FilterConditions {
  dateRange?: {
    start?: string // YYYY-MM-DD
    end?: string   // YYYY-MM-DD
  }
  sources?: string[]
  messageRoles?: string[]
  sessionTitleContains?: string
  hasMinMessages?: number
  tags?: string[]
}

// フィルタ結果型定義
export interface FilteredSession {
  id: string
  title: string
  created_at: number
  updated_at: number
  message_count: number
  metadata: {
    source?: string
    tags?: string[]
  }
  first_message_preview?: string
  last_activity?: number
}

export interface FilterResult {
  sessions: FilteredSession[]
  total: number
  appliedFilters: number
  searchTime: number
  filterStats: {
    sourceBreakdown: Array<{ source: string; count: number }>
    roleBreakdown: Array<{ role: string; count: number }>
    dateRange: { oldest: number; newest: number }
  }
}

// Notion風高度フィルタエンジン
export class NotionStyleFilterEngine {
  private db: Database.Database
  private initialized: boolean = false

  constructor(dbPath?: string) {
    const DB_PATH = dbPath || path.join(process.cwd(), 'data', 'chat-history.db')
    
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`ChatFlowデータベースが見つかりません: ${DB_PATH}`)
    }
    
    this.db = new Database(DB_PATH)
    this.initialize()
  }

  /**
   * フィルタエンジンの初期化
   */
  private initialize(): void {
    try {
      // 統計情報用ビューの作成
      this.db.exec(`
        CREATE VIEW IF NOT EXISTS session_stats AS
        SELECT 
          s.id,
          s.title,
          s.created_at,
          s.updated_at,
          COUNT(m.id) as message_count,
          GROUP_CONCAT(DISTINCT m.role) as roles,
          MIN(m.created_at) as first_message_time,
          MAX(m.created_at) as last_message_time,
          (
            SELECT m2.content 
            FROM messages m2 
            WHERE m2.session_id = s.id 
            ORDER BY m2.created_at ASC 
            LIMIT 1
          ) as first_message_content
        FROM sessions s
        LEFT JOIN messages m ON s.id = m.session_id
        GROUP BY s.id, s.title, s.created_at, s.updated_at
      `)

      this.initialized = true
      console.log('✅ Notion風フィルタエンジン初期化完了')
    } catch (error) {
      console.error('❌ フィルタエンジン初期化エラー:', error)
      this.initialized = false
    }
  }

  /**
   * Notion風複合フィルタ実行
   */
  async executeFilter(conditions: FilterConditions): Promise<FilterResult> {
    if (!this.initialized) {
      throw new Error('フィルタエンジンが初期化されていません')
    }

    const startTime = performance.now()
    
    try {
      // 基本クエリ構築
      let query = `
        SELECT 
          s.id,
          s.title,
          s.created_at,
          s.updated_at,
          ss.message_count,
          ss.first_message_content as first_message_preview,
          ss.last_message_time as last_activity,
          json_extract(s.metadata, '$.source') as source,
          json_extract(s.metadata, '$.tags') as tags
        FROM sessions s
        JOIN session_stats ss ON s.id = ss.id
        WHERE 1=1
      `
      
      const params: any[] = []
      const whereClauses: string[] = []

      // 日付範囲フィルタ
      if (conditions.dateRange?.start) {
        whereClauses.push('DATE(s.created_at / 1000, "unixepoch") >= DATE(?)')
        params.push(conditions.dateRange.start)
      }
      
      if (conditions.dateRange?.end) {
        whereClauses.push('DATE(s.created_at / 1000, "unixepoch") <= DATE(?)')
        params.push(conditions.dateRange.end)
      }

      // ソースフィルタ
      if (conditions.sources && conditions.sources.length > 0) {
        const sourcePlaceholders = conditions.sources.map(() => '?').join(',')
        whereClauses.push(`json_extract(s.metadata, '$.source') IN (${sourcePlaceholders})`)
        params.push(...conditions.sources)
      }

      // タイトル検索フィルタ
      if (conditions.sessionTitleContains) {
        whereClauses.push('s.title LIKE ?')
        params.push(`%${conditions.sessionTitleContains}%`)
      }

      // 最小メッセージ数フィルタ
      if (conditions.hasMinMessages && conditions.hasMinMessages > 0) {
        whereClauses.push('ss.message_count >= ?')
        params.push(conditions.hasMinMessages)
      }

      // メッセージ役割フィルタ
      if (conditions.messageRoles && conditions.messageRoles.length > 0) {
        const roleConditions = conditions.messageRoles.map(() => 
          'EXISTS(SELECT 1 FROM messages m WHERE m.session_id = s.id AND m.role = ?)'
        ).join(' OR ')
        whereClauses.push(`(${roleConditions})`)
        params.push(...conditions.messageRoles)
      }

      // WHERE句を追加
      if (whereClauses.length > 0) {
        query += ' AND ' + whereClauses.join(' AND ')
      }

      // ソート順
      query += ' ORDER BY s.updated_at DESC LIMIT 100'

      // クエリ実行
      const sessions = this.db.prepare(query).all(...params)

      // 結果の後処理
      const processedSessions: FilteredSession[] = sessions.map(row => ({
        id: row.id,
        title: row.title,
        created_at: row.created_at,
        updated_at: row.updated_at,
        message_count: row.message_count,
        metadata: {
          source: row.source,
          tags: row.tags ? JSON.parse(row.tags) : []
        },
        first_message_preview: row.first_message_preview ? 
          row.first_message_preview.substring(0, 100) + '...' : '',
        last_activity: row.last_activity
      }))

      // 統計情報計算
      const filterStats = await this.calculateFilterStats(conditions)

      const endTime = performance.now()

      return {
        sessions: processedSessions,
        total: processedSessions.length,
        appliedFilters: this.countAppliedFilters(conditions),
        searchTime: endTime - startTime,
        filterStats
      }

    } catch (error) {
      console.error('フィルタ実行エラー:', error)
      throw new Error('フィルタ処理に失敗しました')
    }
  }

  /**
   * フィルタ統計情報の計算
   */
  private async calculateFilterStats(conditions: FilterConditions): Promise<FilterResult['filterStats']> {
    try {
      // ソース別統計
      const sourceStats = this.db.prepare(`
        SELECT 
          json_extract(metadata, '$.source') as source,
          COUNT(*) as count
        FROM sessions
        WHERE json_extract(metadata, '$.source') IS NOT NULL
        GROUP BY json_extract(metadata, '$.source')
        ORDER BY count DESC
      `).all()

      // 役割別統計（全メッセージ対象）
      const roleStats = this.db.prepare(`
        SELECT 
          role,
          COUNT(*) as count
        FROM messages
        GROUP BY role
        ORDER BY count DESC
      `).all()

      // 日付範囲統計
      const dateRangeStats = this.db.prepare(`
        SELECT 
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM sessions
      `).get()

      return {
        sourceBreakdown: sourceStats.map(row => ({
          source: row.source || 'unknown',
          count: row.count
        })),
        roleBreakdown: roleStats.map(row => ({
          role: row.role,
          count: row.count
        })),
        dateRange: {
          oldest: dateRangeStats?.oldest || 0,
          newest: dateRangeStats?.newest || 0
        }
      }
    } catch (error) {
      console.error('統計情報計算エラー:', error)
      return {
        sourceBreakdown: [],
        roleBreakdown: [],
        dateRange: { oldest: 0, newest: 0 }
      }
    }
  }

  /**
   * 適用されたフィルタ数をカウント
   */
  private countAppliedFilters(conditions: FilterConditions): number {
    let count = 0
    
    if (conditions.dateRange?.start) count++
    if (conditions.dateRange?.end) count++
    if (conditions.sources && conditions.sources.length > 0) count += conditions.sources.length
    if (conditions.messageRoles && conditions.messageRoles.length > 0) count += conditions.messageRoles.length
    if (conditions.sessionTitleContains) count++
    if (conditions.hasMinMessages && conditions.hasMinMessages > 0) count++
    if (conditions.tags && conditions.tags.length > 0) count += conditions.tags.length
    
    return count
  }

  /**
   * フィルタオプション取得（Notion風UI用）
   */
  async getFilterOptions(): Promise<{
    sources: Array<{ value: string; label: string; count: number }>
    roles: Array<{ value: string; label: string; count: number }>
    dateRange: { oldest: string; newest: string }
    totalSessions: number
  }> {
    try {
      const stats = await this.calculateFilterStats({})
      
      // 総セッション数
      const totalSessions = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get()?.count || 0

      // 日付範囲を文字列形式に変換
      const formatDate = (timestamp: number) => {
        return new Date(timestamp).toISOString().split('T')[0]
      }

      return {
        sources: stats.sourceBreakdown.map(item => ({
          value: item.source,
          label: this.formatSourceLabel(item.source),
          count: item.count
        })),
        roles: stats.roleBreakdown.map(item => ({
          value: item.role,
          label: this.formatRoleLabel(item.role),
          count: item.count
        })),
        dateRange: {
          oldest: formatDate(stats.dateRange.oldest),
          newest: formatDate(stats.dateRange.newest)
        },
        totalSessions
      }
    } catch (error) {
      console.error('フィルタオプション取得エラー:', error)
      return {
        sources: [],
        roles: [],
        dateRange: { oldest: '', newest: '' },
        totalSessions: 0
      }
    }
  }

  /**
   * ソースラベルの整形
   */
  private formatSourceLabel(source: string): string {
    const labelMap: Record<string, string> = {
      'cursor': 'Cursor',
      'claude-dev': 'Claude Dev',
      'chatgpt': 'ChatGPT',
      'github-copilot': 'GitHub Copilot',
      'unknown': '不明'
    }
    return labelMap[source] || source
  }

  /**
   * 役割ラベルの整形
   */
  private formatRoleLabel(role: string): string {
    const labelMap: Record<string, string> = {
      'user': 'ユーザー',
      'assistant': 'アシスタント',
      'system': 'システム'
    }
    return labelMap[role] || role
  }

  /**
   * リソースクリーンアップ
   */
  close(): void {
    if (this.db) {
      this.db.close()
    }
  }
}

// Express.js APIエンドポイント実装
export function createNotionFilterApiHandler() {
  const filterEngine = new NotionStyleFilterEngine()

  return {
    // フィルタ実行API
    executeFilter: async (req: any, res: any) => {
      try {
        const conditions: FilterConditions = req.body

        const result = await filterEngine.executeFilter(conditions)

        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        })

      } catch (error) {
        console.error('Filter API Error:', error)
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'フィルタ処理エラー'
        })
      }
    },

    // フィルタオプション取得API
    getFilterOptions: async (req: any, res: any) => {
      try {
        const options = await filterEngine.getFilterOptions()

        res.json({
          success: true,
          data: options,
          timestamp: new Date().toISOString()
        })

      } catch (error) {
        console.error('Filter Options API Error:', error)
        res.status(500).json({
          success: false,
          error: 'フィルタオプション取得エラー'
        })
      }
    }
  }
}

// サンプル使用例・テスト
export async function testNotionFilterDemo() {
  console.log('🎨 Notion風フィルタデモAPIテスト開始')
  
  const filterEngine = new NotionStyleFilterEngine()
  
  try {
    // フィルタオプション取得テスト
    console.log('\n📊 フィルタオプション取得中...')
    const options = await filterEngine.getFilterOptions()
    console.log(`   ソース: ${options.sources.length}種類`)
    console.log(`   役割: ${options.roles.length}種類`)
    console.log(`   総セッション数: ${options.totalSessions}`)

    // 基本フィルタテスト
    console.log('\n🔍 基本フィルタテスト')
    const basicFilter = await filterEngine.executeFilter({
      sources: ['cursor'],
      hasMinMessages: 5
    })
    console.log(`   結果: ${basicFilter.sessions.length}件`)
    console.log(`   時間: ${basicFilter.searchTime.toFixed(2)}ms`)
    console.log(`   適用フィルタ: ${basicFilter.appliedFilters}個`)

    // 複合フィルタテスト
    console.log('\n🔧 複合フィルタテスト')
    const complexFilter = await filterEngine.executeFilter({
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
      },
      sources: ['cursor', 'claude-dev'],
      messageRoles: ['user', 'assistant'],
      sessionTitleContains: 'TypeScript',
      hasMinMessages: 10
    })
    console.log(`   結果: ${complexFilter.sessions.length}件`)
    console.log(`   時間: ${complexFilter.searchTime.toFixed(2)}ms`)
    console.log(`   適用フィルタ: ${complexFilter.appliedFilters}個`)

    if (complexFilter.sessions.length > 0) {
      console.log(`   例: "${complexFilter.sessions[0].title}"`)
    }

  } catch (error) {
    console.error('❌ テストエラー:', error)
  } finally {
    filterEngine.close()
    console.log('\n✅ Notion風フィルタデモAPIテスト完了')
  }
} 