#!/usr/bin/env tsx

/**
 * 実データ統合テストスクリプト
 * .mdcルール準拠: TypeScript First開発
 * 
 * 目的: 実際のChatHistoryService・AnalyticsServiceの動作確認
 * 使用方法: npm run test:real-data
 */

import { testRealDataIntegration, apiDataService } from '../src/server/api-router.js'

async function main() {
  console.log('🚀 実データ統合テスト開始')
  console.log('=' .repeat(50))

  try {
    // 1. 基本初期化テスト
    console.log('\n1️⃣  基本初期化テスト')
    const initSuccess = await testRealDataIntegration()
    
    if (!initSuccess) {
      console.log('❌ 初期化テスト失敗 - 仮データモードで継続')
      return
    }

    // 2. サービス状態確認
    console.log('\n2️⃣  サービス状態確認')
    const status = apiDataService.getServiceStatus()
    console.log('ステータス:', JSON.stringify(status, null, 2))

    // 3. セッション一覧取得テスト
    console.log('\n3️⃣  セッション一覧取得テスト')
    try {
      const sessions = await apiDataService.getSessions(1, 5)
      console.log(`✅ セッション取得成功: ${sessions.sessions.length}件`)
      console.log('総数:', sessions.pagination.total)
      console.log('モード:', sessions.mode)
    } catch (error) {
      console.log('❌ セッション取得エラー:', error)
    }

    // 4. 統計情報取得テスト
    console.log('\n4️⃣  統計情報取得テスト')
    try {
      const stats = await apiDataService.getStats()
      console.log('✅ 統計情報取得成功')
      console.log(`- 総セッション数: ${stats.totalSessions}`)
      console.log(`- 総メッセージ数: ${stats.totalMessages}`)
      console.log(`- 平均セッション長: ${stats.averageSessionLength}`)
      console.log(`- モード: ${stats.mode}`)
    } catch (error) {
      console.log('❌ 統計情報取得エラー:', error)
    }

    // 5. 検索テスト
    console.log('\n5️⃣  検索テスト')
    try {
      const searchResults = await apiDataService.searchSessions('test', { limit: 3 })
      console.log(`✅ 検索成功: ${searchResults.results.length}件`)
      console.log('モード:', searchResults.mode)
    } catch (error) {
      console.log('❌ 検索エラー:', error)
    }

    console.log('\n🎉 実データ統合テスト完了')

  } catch (error) {
    console.error('\n❌ 実データ統合テスト全体エラー:', error)
    process.exit(1)
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
} 