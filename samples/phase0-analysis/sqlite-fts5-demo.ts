#!/usr/bin/env ts-node

/**
 * 🔍 SQLite FTS5 動作検証デモ
 * 
 * ChatFlowの既存データベースでFTS5全文検索機能を検証します
 * - 既存sessionsテーブルからFTS5テーブル作成
 * - パフォーマンス比較（LIKE検索 vs FTS5検索）
 * - 実際のデータでの検索精度・速度テスト
 */

import Database from 'better-sqlite3'
import { performance } from 'perf_hooks'
import path from 'path'
import fs from 'fs'

// ChatFlow設定
const DB_PATH = path.join(process.cwd(), 'data', 'chat-history.db')
const TEST_KEYWORDS = [
  'cursor',
  'search',
  'TypeScript',
  'React',
  'ChatFlow',
  'API',
  'データベース',
  'パフォーマンス',
  'SQLite',
  'Claude'
]

interface TestResult {
  keyword: string
  like_results: number
  like_time: number
  fts5_results: number
  fts5_time: number
  improvement_ratio: number
}

interface DatabaseStats {
  total_sessions: number
  total_content_size: number
  average_content_length: number
  has_fts5_table: boolean
}

/**
 * SQLite FTS5 検証デモクラス
 */
class SqliteFts5Demo {
  private db: Database.Database

  constructor() {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`データベースファイルが見つかりません: ${DB_PATH}`)
    }
    
    this.db = new Database(DB_PATH)
    console.log('📊 SQLite FTS5 検証デモを開始します')
  }

  /**
   * データベース基本統計を取得
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    console.log('\n🔍 データベース基本統計を取得中...')
    
    const totalSessions = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }
    
    const contentStats = this.db.prepare(`
      SELECT 
        SUM(LENGTH(content)) as total_size,
        AVG(LENGTH(content)) as avg_length
      FROM sessions
    `).get() as { total_size: number; avg_length: number }
    
    // FTS5テーブルの存在確認
    const fts5Check = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='sessions_fts'
    `).get()
    
    const stats: DatabaseStats = {
      total_sessions: totalSessions.count,
      total_content_size: contentStats.total_size || 0,
      average_content_length: Math.round(contentStats.avg_length || 0),
      has_fts5_table: !!fts5Check
    }
    
    console.log('📊 データベース統計:')
    console.log(`   - 総セッション数: ${stats.total_sessions.toLocaleString()}`)
    console.log(`   - 総コンテンツサイズ: ${(stats.total_content_size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   - 平均コンテンツ長: ${stats.average_content_length} 文字`)
    console.log(`   - FTS5テーブル存在: ${stats.has_fts5_table ? '✅' : '❌'}`)
    
    return stats
  }

  /**
   * FTS5テーブルを作成（存在しない場合のみ）
   */
  async createFts5Table(): Promise<void> {
    console.log('\n🏗️ FTS5テーブルの作成・更新...')
    
    const startTime = performance.now()
    
    // 既存FTS5テーブルを削除（再作成のため）
    this.db.exec('DROP TABLE IF EXISTS sessions_fts')
    
    // FTS5テーブルを作成
    this.db.exec(`
      CREATE VIRTUAL TABLE sessions_fts USING fts5(
        id,
        title,
        content,
        content='sessions',
        content_rowid='rowid'
      )
    `)
    
    // 既存データをFTS5テーブルにコピー
    this.db.exec(`
      INSERT INTO sessions_fts(rowid, id, title, content)
      SELECT rowid, id, title, content FROM sessions
    `)
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    console.log(`✅ FTS5テーブル作成完了 (${duration.toFixed(2)}ms)`)
  }

  /**
   * LIKE検索を実行（従来方式）
   */
  async performLikeSearch(keyword: string): Promise<{ results: any[]; time: number }> {
    const startTime = performance.now()
    
    const results = this.db.prepare(`
      SELECT id, title, content
      FROM sessions 
      WHERE title LIKE ? OR content LIKE ?
      LIMIT 100
    `).all(`%${keyword}%`, `%${keyword}%`)
    
    const endTime = performance.now()
    const time = endTime - startTime
    
    return { results, time }
  }

  /**
   * FTS5検索を実行（新方式）
   */
  async performFts5Search(keyword: string): Promise<{ results: any[]; time: number }> {
    const startTime = performance.now()
    
    const results = this.db.prepare(`
      SELECT sessions.id, sessions.title, sessions.content
      FROM sessions_fts
      JOIN sessions ON sessions.rowid = sessions_fts.rowid
      WHERE sessions_fts MATCH ?
      ORDER BY rank
      LIMIT 100
    `).all(keyword)
    
    const endTime = performance.now()
    const time = endTime - startTime
    
    return { results, time }
  }

  /**
   * 包括的検索パフォーマンステストを実行
   */
  async runPerformanceTest(): Promise<TestResult[]> {
    console.log('\n⚡ 検索パフォーマンステストを実行中...')
    console.log('📋 テストキーワード:', TEST_KEYWORDS)
    
    const results: TestResult[] = []
    
    for (const keyword of TEST_KEYWORDS) {
      console.log(`\n🔍 テスト中: "${keyword}"`)
      
      // LIKE検索
      const likeResult = await this.performLikeSearch(keyword)
      console.log(`   LIKE検索: ${likeResult.results.length}件 (${likeResult.time.toFixed(2)}ms)`)
      
      // FTS5検索
      const fts5Result = await this.performFts5Search(keyword)
      console.log(`   FTS5検索: ${fts5Result.results.length}件 (${fts5Result.time.toFixed(2)}ms)`)
      
      // 改善比率計算
      const improvementRatio = likeResult.time > 0 ? (likeResult.time / fts5Result.time) : 1
      console.log(`   🚀 パフォーマンス向上: ${improvementRatio.toFixed(2)}倍`)
      
      results.push({
        keyword,
        like_results: likeResult.results.length,
        like_time: likeResult.time,
        fts5_results: fts5Result.results.length,
        fts5_time: fts5Result.time,
        improvement_ratio: improvementRatio
      })
    }
    
    return results
  }

  /**
   * 結果を分析・レポート生成
   */
  generateReport(results: TestResult[]): void {
    console.log('\n📊 === SQLite FTS5 検証レポート ===')
    
    const totalLikeTime = results.reduce((sum, r) => sum + r.like_time, 0)
    const totalFts5Time = results.reduce((sum, r) => sum + r.fts5_time, 0)
    const averageImprovement = results.reduce((sum, r) => sum + r.improvement_ratio, 0) / results.length
    
    console.log('\n🎯 総合結果:')
    console.log(`   - LIKE検索総時間: ${totalLikeTime.toFixed(2)}ms`)
    console.log(`   - FTS5検索総時間: ${totalFts5Time.toFixed(2)}ms`)
    console.log(`   - 平均パフォーマンス向上: ${averageImprovement.toFixed(2)}倍`)
    console.log(`   - 総パフォーマンス向上: ${(totalLikeTime / totalFts5Time).toFixed(2)}倍`)
    
    console.log('\n📋 詳細結果:')
    console.table(results.map(r => ({
      'キーワード': r.keyword,
      'LIKE結果数': r.like_results,
      'LIKE時間(ms)': r.like_time.toFixed(2),
      'FTS5結果数': r.fts5_results,
      'FTS5時間(ms)': r.fts5_time.toFixed(2),
      '向上倍率': r.improvement_ratio.toFixed(2) + '倍'
    })))
    
    console.log('\n✅ 検証結果評価:')
    if (averageImprovement > 2) {
      console.log('🎉 FTS5は大幅なパフォーマンス向上を実現！実装推奨')
    } else if (averageImprovement > 1.5) {
      console.log('👍 FTS5は良好なパフォーマンス向上を実現！実装検討推奨')
    } else {
      console.log('⚠️  FTS5の効果は限定的。データ量・クエリパターンの見直し必要')
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    if (this.db) {
      this.db.close()
      console.log('\n🔧 データベース接続をクローズしました')
    }
  }

  /**
   * メイン実行メソッド
   */
  async run(): Promise<void> {
    try {
      // 1. データベース統計取得
      await this.getDatabaseStats()
      
      // 2. FTS5テーブル作成
      await this.createFts5Table()
      
      // 3. パフォーマンステスト実行
      const results = await this.runPerformanceTest()
      
      // 4. 結果レポート生成
      this.generateReport(results)
      
    } catch (error) {
      console.error('❌ エラーが発生しました:', error)
    } finally {
      this.cleanup()
    }
  }
}

// 実行
if (require.main === module) {
  const demo = new SqliteFts5Demo()
  demo.run().catch(console.error)
}

export { SqliteFts5Demo, TestResult, DatabaseStats } 