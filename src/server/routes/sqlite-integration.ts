/**
 * 🗄️ SQLite統合API - Phase 3高速検索エンドポイント
 * 
 * 機能:
 * - FTS5高速全文検索 (50-200ms目標)
 * - 増分インデックス更新
 * - 検索統計・メトリクス
 * - データマイグレーション
 */

import { Router } from 'express'
import { SqliteIndexService } from '../../services/SqliteIndexService'
import { ChatHistoryService } from '../../services/ChatHistoryService'
import { logger } from '../../utils/logger'
import type { SearchFilters, SearchResponse } from '../../types/ChatHistory'

const router = Router()
let sqliteService: SqliteIndexService | null = null
let historyService: ChatHistoryService | null = null

/**
 * SQLiteサービス初期化
 */
async function initializeSqliteService(): Promise<void> {
  if (!sqliteService) {
    sqliteService = new SqliteIndexService()
    await sqliteService.initialize()
    
    historyService = new ChatHistoryService()
    await historyService.initialize()
    
    logger.info('🗄️ SQLite統合サービス初期化完了')
  }
}

/**
 * 🔍 高速全文検索API
 * GET /api/sqlite/search?q={query}&limit={limit}&offset={offset}
 */
router.get('/search', async (req, res) => {
  try {
    await initializeSqliteService()
    
    const {
      q: query,
      limit = '50',
      offset = '0',
      orderBy = 'relevance',
      startDate,
      endDate,
      platforms,
      minLength
    } = req.query

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: '検索クエリが必要です'
      })
    }

    const startTime = Date.now()

    // 検索オプション構築
    const searchOptions = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      orderBy: orderBy as 'relevance' | 'timestamp' | 'title',
      filters: {} as any
    }

    // フィルター適用
    if (startDate && endDate) {
      searchOptions.filters.dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      }
    }

    if (platforms) {
      searchOptions.filters.platform = Array.isArray(platforms) 
        ? platforms 
        : [platforms]
    }

    if (minLength) {
      searchOptions.filters.minLength = parseInt(minLength as string)
    }

    // 高速検索実行
    const results = await sqliteService!.search(query, searchOptions)
    const queryTime = Date.now() - startTime

    const response: SearchResponse = {
      results,
      metrics: {
        queryTime,
        resultCount: results.length,
        totalMatches: results.length,
        searchMethod: 'fts5'
      },
      hasMore: results.length === searchOptions.limit,
      totalCount: results.length
    }

    logger.info(`🔍 SQLite検索実行: ${queryTime}ms, 結果: ${results.length}件`)

    res.json({
      success: true,
      data: response
    })

  } catch (error) {
    logger.error('❌ SQLite検索エラー:', error)
    res.status(500).json({
      success: false,
      error: `検索エラー: ${error.message}`
    })
  }
})

/**
 * 📚 データマイグレーション API
 * POST /api/sqlite/migrate
 */
router.post('/migrate', async (req, res) => {
  try {
    await initializeSqliteService()
    
    logger.info('📚 SQLiteデータマイグレーション開始')
    const startTime = Date.now()

    // 既存セッション取得
    const sessions = await historyService!.getAllSessions()
    logger.info(`📊 移行対象: ${sessions.length}セッション`)

    // SQLiteインデックス作成
    await sqliteService!.indexSessions(sessions)

    const migrationTime = Date.now() - startTime
    const stats = await sqliteService!.getIndexStats()

    logger.info(`✅ SQLiteマイグレーション完了: ${migrationTime}ms`)

    res.json({
      success: true,
      data: {
        migratedSessions: sessions.length,
        migrationTime,
        indexStats: stats
      }
    })

  } catch (error) {
    logger.error('❌ SQLiteマイグレーションエラー:', error)
    res.status(500).json({
      success: false,
      error: `マイグレーションエラー: ${error.message}`
    })
  }
})

/**
 * 📊 インデックス統計API
 * GET /api/sqlite/stats
 */
router.get('/stats', async (req, res) => {
  try {
    await initializeSqliteService()
    
    const stats = await sqliteService!.getIndexStats()

    res.json({
      success: true,
      data: stats
    })

  } catch (error) {
    logger.error('❌ SQLite統計取得エラー:', error)
    res.status(500).json({
      success: false,
      error: `統計取得エラー: ${error.message}`
    })
  }
})

/**
 * 🔧 インデックス最適化API
 * POST /api/sqlite/optimize
 */
router.post('/optimize', async (req, res) => {
  try {
    await initializeSqliteService()
    
    logger.info('🔧 SQLiteインデックス最適化開始')
    const startTime = Date.now()

    await sqliteService!.optimizeIndex()

    const optimizeTime = Date.now() - startTime
    const stats = await sqliteService!.getIndexStats()

    logger.info(`✅ SQLiteインデックス最適化完了: ${optimizeTime}ms`)

    res.json({
      success: true,
      data: {
        optimizeTime,
        indexStats: stats
      }
    })

  } catch (error) {
    logger.error('❌ SQLite最適化エラー:', error)
    res.status(500).json({
      success: false,
      error: `最適化エラー: ${error.message}`
    })
  }
})

/**
 * 🎯 検索パフォーマンステストAPI
 * POST /api/sqlite/performance-test
 */
router.post('/performance-test', async (req, res) => {
  try {
    await initializeSqliteService()
    
    const { queries = ['cursor', 'claude', 'ai', 'search', 'test'] } = req.body
    const results = []

    logger.info('⚡ SQLite性能テスト開始')

    for (const query of queries) {
      const startTime = Date.now()
      const searchResults = await sqliteService!.search(query, { limit: 10 })
      const queryTime = Date.now() - startTime

      results.push({
        query,
        queryTime,
        resultCount: searchResults.length,
        avgRelevance: searchResults.length > 0 
          ? searchResults.reduce((sum, r) => sum + r.relevanceScore, 0) / searchResults.length
          : 0
      })

      logger.info(`📊 性能テスト: "${query}" - ${queryTime}ms, ${searchResults.length}件`)
    }

    const avgQueryTime = results.reduce((sum, r) => sum + r.queryTime, 0) / results.length
    const totalResults = results.reduce((sum, r) => sum + r.resultCount, 0)

    logger.info(`✅ SQLite性能テスト完了: 平均${avgQueryTime.toFixed(1)}ms`)

    res.json({
      success: true,
      data: {
        testResults: results,
        summary: {
          avgQueryTime,
          totalQueries: queries.length,
          totalResults,
          performance: avgQueryTime < 200 ? 'excellent' : avgQueryTime < 500 ? 'good' : 'needs-improvement'
        }
      }
    })

  } catch (error) {
    logger.error('❌ SQLite性能テストエラー:', error)
    res.status(500).json({
      success: false,
      error: `性能テストエラー: ${error.message}`
    })
  }
})

/**
 * 🔄 増分インデックス更新API
 * POST /api/sqlite/incremental-update
 */
router.post('/incremental-update', async (req, res) => {
  try {
    await initializeSqliteService()
    
    const { sessionIds } = req.body

    if (!sessionIds || !Array.isArray(sessionIds)) {
      return res.status(400).json({
        success: false,
        error: 'セッションIDリストが必要です'
      })
    }

    logger.info(`🔄 増分インデックス更新開始: ${sessionIds.length}セッション`)
    const startTime = Date.now()

    // 指定セッションを再取得・更新
    const updatedSessions = []
    for (const sessionId of sessionIds) {
      try {
        const session = await historyService!.getSession(sessionId)
        if (session) {
          updatedSessions.push(session)
        }
      } catch (error) {
        logger.warn(`⚠️ セッション取得エラー: ${sessionId}`, error)
      }
    }

    // インデックス更新
    if (updatedSessions.length > 0) {
      await sqliteService!.indexSessions(updatedSessions)
    }

    const updateTime = Date.now() - startTime
    logger.info(`✅ 増分インデックス更新完了: ${updateTime}ms, ${updatedSessions.length}セッション`)

    res.json({
      success: true,
      data: {
        requestedSessions: sessionIds.length,
        updatedSessions: updatedSessions.length,
        updateTime
      }
    })

  } catch (error) {
    logger.error('❌ 増分インデックス更新エラー:', error)
    res.status(500).json({
      success: false,
      error: `増分更新エラー: ${error.message}`
    })
  }
})

export default router 