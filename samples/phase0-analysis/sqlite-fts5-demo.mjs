#!/usr/bin/env node

/**
 * 🔍 SQLite FTS5 動作検証デモ (ES Modules版)
 * 
 * ChatFlowの実際のデータベース構造で検証します：
 * - sessions テーブル：セッション情報（title, metadata）
 * - messages テーブル：メッセージ内容（content）
 * - FTS5による高速全文検索の実装・検証
 * 
 * 🌟 GitHubの「いいところ」をChatFlowに適用：
 * - GitHub Code Search風の高速全文検索（FTS5）
 * - セッション+メッセージ統合検索
 * - 大規模データセット対応
 */

import Database from 'better-sqlite3'
import { performance } from 'perf_hooks'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ChatFlow設定
const DB_PATH = path.join(process.cwd(), 'data', 'chat-history.db')
const TEST_KEYWORDS = [
  'cursor',
  'search',
  'TypeScript',
  'React',
  'API',
  'function',
  'component',
  'error',
  'import',
  'interface',
  '検索',
  'データベース',
  'ChatFlow'
]

/**
 * SQLite FTS5 検証デモクラス
 * ChatFlow実データ構造での高速検索実装
 */
class SqliteFts5Demo {
  constructor() {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`データベースファイルが見つかりません: ${DB_PATH}`)
    }
    
    this.db = new Database(DB_PATH)
    console.log('🔍 ChatFlow FTS5 検証デモを開始します')
    console.log('🎯 目標: GitHub風高速検索をChatFlow実データで実現')
  }

  /**
   * データベース基本統計を取得
   */
  async getDatabaseStats() {
    console.log('\n📊 ChatFlowデータベース統計を取得中...')
    
    // セッション統計
    const sessionStats = this.db.prepare(`
      SELECT COUNT(*) as count,
        AVG(LENGTH(title)) as avg_title_length
      FROM sessions
    `).get()
    
    // メッセージ統計  
    const messageStats = this.db.prepare(`
      SELECT COUNT(*) as count,
        SUM(LENGTH(content)) as total_content_size,
        AVG(LENGTH(content)) as avg_content_length,
        MIN(LENGTH(content)) as min_content_length,
        MAX(LENGTH(content)) as max_content_length
      FROM messages
    `).get()
    
    // FTS5テーブル存在確認
    const fts5Check = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='chatflow_fts'
    `).get()
    
    const stats = {
      total_sessions: sessionStats.count,
      avg_title_length: Math.round(sessionStats.avg_title_length || 0),
      total_messages: messageStats.count,
      total_content_size: messageStats.total_content_size || 0,
      avg_content_length: Math.round(messageStats.avg_content_length || 0),
      min_content_length: messageStats.min_content_length || 0,
      max_content_length: messageStats.max_content_length || 0,
      has_fts5_table: !!fts5Check
    }
    
    console.log('📊 ChatFlow実データ統計:')
    console.log(`   - 総セッション数: ${stats.total_sessions.toLocaleString()}`)
    console.log(`   - 平均セッションタイトル長: ${stats.avg_title_length} 文字`)
    console.log(`   - 総メッセージ数: ${stats.total_messages.toLocaleString()}`)
    console.log(`   - 総コンテンツサイズ: ${(stats.total_content_size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   - 平均メッセージ長: ${stats.avg_content_length.toLocaleString()} 文字`)
    console.log(`   - メッセージ長範囲: ${stats.min_content_length} ～ ${stats.max_content_length.toLocaleString()} 文字`)
    console.log(`   - FTS5テーブル存在: ${stats.has_fts5_table ? '✅' : '❌'}`)
    
    return stats
  }

  /**
   * ChatFlow用FTS5テーブルを作成（GitHub風高速検索）
   */
  async createFts5Table() {
    console.log('\n🏗️ ChatFlow統合FTS5検索エンジンを構築中...')
    
    const startTime = performance.now()
    
    // 既存FTS5テーブルを削除
    try {
      this.db.exec('DROP TABLE IF EXISTS chatflow_fts')
    } catch (error) {
      console.log('   既存FTS5テーブルなし（初回作成）')
    }
    
    // ChatFlow統合FTS5テーブルを作成
    // セッション情報 + メッセージ内容を統合
    this.db.exec(`
      CREATE VIRTUAL TABLE chatflow_fts USING fts5(
        session_id,
        session_title,
        message_id,
        message_role,
        message_content,
        tokenize = 'unicode61 remove_diacritics 1'
      )
    `)
    
    console.log('   ✅ ChatFlow統合FTS5テーブル作成完了')
    
    // 既存データを統合FTS5テーブルにコピー
    console.log('   📝 セッション+メッセージデータを統合インデックスに追加中...')
    
    const insertStmt = this.db.prepare(`
      INSERT INTO chatflow_fts(session_id, session_title, message_id, message_role, message_content)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    // セッション+メッセージの結合データを取得
    const messageCount = this.db.prepare('SELECT COUNT(*) as count FROM messages').get().count
    const batchSize = 1000
    
    for (let offset = 0; offset < messageCount; offset += batchSize) {
      const combinedData = this.db.prepare(`
        SELECT 
          s.id as session_id,
          s.title as session_title,
          m.id as message_id,
          m.role as message_role,
          m.content as message_content
        FROM messages m
        JOIN sessions s ON m.session_id = s.id
        LIMIT ? OFFSET ?
      `).all(batchSize, offset)
      
      const transaction = this.db.transaction(() => {
        for (const data of combinedData) {
          try {
            insertStmt.run(
              data.session_id,
              data.session_title,
              data.message_id,
              data.message_role,
              data.message_content
            )
          } catch (error) {
            console.log(`   ⚠️  メッセージ ${data.message_id} のインデックス作成をスキップ`)
          }
        }
      })
      
      transaction()
      
      const progress = Math.min(100, ((offset + batchSize) / messageCount * 100))
      console.log(`   📊 統合インデックス作成進捗: ${progress.toFixed(1)}%`)
    }
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    console.log(`✅ ChatFlow統合FTS5検索エンジン構築完了 (${duration.toFixed(2)}ms)`)
    console.log(`📈 処理速度: ${(messageCount / (duration / 1000)).toFixed(0)} メッセージ/秒`)
  }

  /**
   * 従来検索を実行（LIKE検索）
   */
  async performTraditionalSearch(keyword) {
    const startTime = performance.now()
    
    const results = this.db.prepare(`
      SELECT DISTINCT
        s.id as session_id,
        s.title as session_title,
        COUNT(m.id) as matching_messages,
        GROUP_CONCAT(SUBSTR(m.content, 1, 100), ' | ') as snippets
      FROM sessions s
      JOIN messages m ON s.id = m.session_id
      WHERE s.title LIKE ? OR m.content LIKE ?
      GROUP BY s.id, s.title
      LIMIT 50
    `).all(`%${keyword}%`, `%${keyword}%`)
    
    const endTime = performance.now()
    const time = endTime - startTime
    
    return { results, time }
  }

  /**
   * FTS5検索を実行（GitHub風新方式）
   */
  async performFts5Search(keyword) {
    const startTime = performance.now()
    
    try {
      const results = this.db.prepare(`
        SELECT 
          session_id,
          session_title,
          COUNT(*) as matching_messages,
          GROUP_CONCAT(SUBSTR(message_content, 1, 100), ' | ') as snippets
        FROM chatflow_fts
        WHERE chatflow_fts MATCH ?
        GROUP BY session_id, session_title
        ORDER BY COUNT(*) DESC
        LIMIT 50
      `).all(keyword)
      
      const endTime = performance.now()
      const time = endTime - startTime
      
      return { results, time }
    } catch (error) {
      console.log(`   ⚠️  FTS5検索エラー (${keyword}): ${error.message}`)
      return { results: [], time: 999999 }
    }
  }

  /**
   * 包括的検索パフォーマンステストを実行
   */
  async runPerformanceTest() {
    console.log('\n⚡ ChatFlow検索パフォーマンス比較テスト')
    console.log('📋 テストキーワード:', TEST_KEYWORDS)
    console.log('🎯 従来LIKE検索 vs GitHub風FTS5検索')
    
    const results = []
    
    for (let i = 0; i < TEST_KEYWORDS.length; i++) {
      const keyword = TEST_KEYWORDS[i]
      console.log(`\n🔍 [${i + 1}/${TEST_KEYWORDS.length}] テスト中: "${keyword}"`)
      
      // 従来のLIKE検索
      const traditionalResult = await this.performTraditionalSearch(keyword)
      console.log(`   📊 LIKE検索: ${traditionalResult.results.length}セッション (${traditionalResult.time.toFixed(2)}ms)`)
      
      // GitHub風FTS5検索
      const fts5Result = await this.performFts5Search(keyword)
      console.log(`   🚀 FTS5検索: ${fts5Result.results.length}セッション (${fts5Result.time.toFixed(2)}ms)`)
      
      // 改善比率計算
      const improvementRatio = traditionalResult.time > 0 ? (traditionalResult.time / fts5Result.time) : 1
      const speedupText = improvementRatio > 1 ? 
        `🎉 ${improvementRatio.toFixed(2)}倍高速化！` : 
        `⚠️  ${(1/improvementRatio).toFixed(2)}倍低速化`
      
      console.log(`   ${speedupText}`)
      
      results.push({
        keyword,
        traditional_results: traditionalResult.results.length,
        traditional_time: traditionalResult.time,
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
  generateReport(results) {
    console.log('\n🏆 === ChatFlow FTS5検索パフォーマンス検証レポート ===')
    
    const totalTraditionalTime = results.reduce((sum, r) => sum + r.traditional_time, 0)
    const totalFts5Time = results.reduce((sum, r) => sum + r.fts5_time, 0)
    const averageImprovement = results.reduce((sum, r) => sum + r.improvement_ratio, 0) / results.length
    const maxImprovement = Math.max(...results.map(r => r.improvement_ratio))
    const minImprovement = Math.min(...results.map(r => r.improvement_ratio))
    
    console.log('\n🎯 総合パフォーマンス結果:')
    console.log(`   - 従来LIKE検索総時間: ${totalTraditionalTime.toFixed(2)}ms`)
    console.log(`   - GitHub風FTS5総時間: ${totalFts5Time.toFixed(2)}ms`)
    console.log(`   - 平均パフォーマンス向上: ${averageImprovement.toFixed(2)}倍`)
    console.log(`   - 総合パフォーマンス向上: ${(totalTraditionalTime / totalFts5Time).toFixed(2)}倍`)
    console.log(`   - 最大向上倍率: ${maxImprovement.toFixed(2)}倍`)
    console.log(`   - 最小向上倍率: ${minImprovement.toFixed(2)}倍`)
    
    console.log('\n📊 詳細検索結果比較:')
    console.table(results.map(r => ({
      'キーワード': r.keyword,
      'LIKE結果': r.traditional_results,
      'LIKE時間': r.traditional_time.toFixed(2) + 'ms',
      'FTS5結果': r.fts5_results,
      'FTS5時間': r.fts5_time.toFixed(2) + 'ms',
      '向上倍率': r.improvement_ratio.toFixed(2) + '倍',
      '評価': r.improvement_ratio > 2 ? '🎉優秀' : r.improvement_ratio > 1.5 ? '👍良好' : '⚠️要改善'
    })))
    
    console.log('\n✅ ChatFlow検索機能評価:')
    if (averageImprovement > 3) {
      console.log('🏆 GitHub以上の検索性能を実現！素晴らしい成果')
      console.log('🚀 本格実装を強く推奨します')
    } else if (averageImprovement > 2) {
      console.log('🎉 GitHub並みの高速検索を実現！実装推奨')
      console.log('👍 ChatFlowユーザーの生産性が大幅向上します')
    } else if (averageImprovement > 1.5) {
      console.log('👍 良好なパフォーマンス向上！実装検討推奨')
      console.log('💡 さらなる最適化でGitHub並みの性能も可能')
    } else {
      console.log('⚠️  効果は限定的。最適化が必要')
      console.log('🔧 インデックス戦略・クエリ最適化を検討')
    }
    
    console.log('\n📈 次のステップ:')
    if (averageImprovement > 1.5) {
      console.log('   1. 🏗️  FTS5をChatFlow本体に統合')
      console.log('   2. 🎨 GitHub風検索UI実装（デバウンス・ハイライト）')
      console.log('   3. ⚡ VS Code風Command Palette（Cmd+K）')
      console.log('   4. 🔍 Discord風リアルタイム検索')
      console.log('   5. 📝 Notion風ビジュアルフィルタ')
    } else {
      console.log('   1. 🔧 SQLiteクエリ最適化')
      console.log('   2. 📊 FTS5設定チューニング')
      console.log('   3. 🎯 検索対象データの精査')
    }
    
    console.log('\n🌟 実装予定サンプル:')
    console.log('   - Phase 1A: デバウンス検索（Discord風）')
    console.log('   - Phase 1B: ソースフィルタ（Notion風）')
    console.log('   - Advanced: 検索演算子（GitHub風）')
  }

  /**
   * クリーンアップ
   */
  cleanup() {
    if (this.db) {
      this.db.close()
      console.log('\n🔧 データベース接続をクローズしました')
    }
  }

  /**
   * メイン実行メソッド
   */
  async run() {
    try {
      console.log('🎯 ChatFlow実データでのGitHub風検索検証開始')
      
      // 1. データベース統計取得
      const stats = await this.getDatabaseStats()
      
      // 2. FTS5テーブル作成
      await this.createFts5Table()
      
      // 3. パフォーマンステスト実行
      const results = await this.runPerformanceTest()
      
      // 4. 結果レポート生成
      this.generateReport(results)
      
      console.log('\n🎊 検証完了！各サービスの「いいところ」をChatFlowに統合する準備が整いました')
      
    } catch (error) {
      console.error('❌ エラーが発生しました:', error)
      console.error('スタックトレース:', error.stack)
    } finally {
      this.cleanup()
    }
  }
}

// 実行
const demo = new SqliteFts5Demo()
demo.run().catch(console.error) 