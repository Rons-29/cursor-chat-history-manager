/**
 * 🗄️ SQLite統合API - Phase 3高速検索エンドポイント
 * 既存パターンに合わせた安全な実装
 */

import { Router, Request, Response } from 'express'
import path from 'path'
import { SqliteIndexService } from '../../services/SqliteIndexService.js'
import { ChatHistoryService } from '../../services/ChatHistoryService.js'
import { Logger } from '../utils/Logger.js'

const router = Router()
const logger = new Logger('info')

// Phase 3: 新規サービスインスタンス（既存サービスと分離）
let phase3SqliteService: SqliteIndexService | null = null
let chatHistoryService: ChatHistoryService | null = null

/**
 * Phase 3サービス初期化
 */
async function initializePhase3Services(): Promise<void> {
  if (!phase3SqliteService) {
    // Phase 3専用のSqliteIndexService初期化
    phase3SqliteService = new SqliteIndexService(
      path.join(process.cwd(), 'data', 'chat-history'),
      path.join(process.cwd(), 'data', 'phase3-search.db'), // 既存DBと分離
      logger
    )
    await phase3SqliteService.initialize()
    
    // ChatHistoryService初期化
    chatHistoryService = new ChatHistoryService({
      storageType: 'file',
      storagePath: path.join(process.cwd(), 'data', 'chat-history'),
      maxSessions: 10000,
      maxMessagesPerSession: 500,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24
    })
    await chatHistoryService.initialize()
    
    logger.info('🗄️ Phase 3 SQLite統合サービス初期化完了')
  }
}

/**
 * 🔍 Phase 3高速検索テストAPI
 * GET /api/sqlite/fast-search?q={query}
 */
router.get('/fast-search', async (req: Request, res: Response) => {
  try {
    await initializePhase3Services()
    
    const query = req.query.q as string
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    if (!query) {
      return res.status(400).json({
        success: false,
        error: '検索クエリが必要です'
      })
    }

    const startTime = Date.now()

    // Phase 3高速検索実行
    const results = await phase3SqliteService!.fastSearch(query, {
      limit,
      offset,
      orderBy: 'relevance'
    })

    const queryTime = Date.now() - startTime

    logger.info(`🔍 Phase 3検索実行: ${queryTime}ms, 結果: ${results.length}件`)

    res.json({
      success: true,
      data: {
        results,
        metrics: {
          queryTime,
          resultCount: results.length,
          searchMethod: 'phase3-fts5'
        },
        query,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    logger.error('❌ Phase 3検索エラー:', error)
    res.status(500).json({
      success: false,
      error: `検索エラー: ${errorMessage}`
    })
  }
})

/**
 * 📚 Phase 3データマイグレーション API
 * POST /api/sqlite/phase3-migrate
 */
router.post('/phase3-migrate', async (req: Request, res: Response) => {
  try {
    await initializePhase3Services()
    
    logger.info('📚 Phase 3データマイグレーション開始')
    const startTime = Date.now()

    // 既存セッション取得
    const sessions = await chatHistoryService!.getAllSessions()
    logger.info(`📊 移行対象: ${sessions.length}セッション`)

    // Phase 3形式でマイグレーション
    for (const session of sessions) {
      await phase3SqliteService!.upsertSession(session)
    }

    const migrationTime = Date.now() - startTime
    const stats = await phase3SqliteService!.getStats()

    logger.info(`✅ Phase 3マイグレーション完了: ${migrationTime}ms`)

    res.json({
      success: true,
      data: {
        migratedSessions: sessions.length,
        migrationTime,
        stats,
        method: 'phase3'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    logger.error('❌ Phase 3マイグレーションエラー:', error)
    res.status(500).json({
      success: false,
      error: `マイグレーションエラー: ${errorMessage}`
    })
  }
})

/**
 * 📊 Phase 3検索性能統計API
 * GET /api/sqlite/phase3-metrics
 */
router.get('/phase3-metrics', async (req: Request, res: Response) => {
  try {
    await initializePhase3Services()
    
    const searchMetrics = phase3SqliteService!.getSearchMetrics()
    const dbStats = await phase3SqliteService!.getStats()

    res.json({
      success: true,
      data: {
        searchPerformance: searchMetrics,
        databaseStats: dbStats,
        timestamp: new Date().toISOString(),
        version: 'phase3'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    logger.error('❌ Phase 3統計取得エラー:', error)
    res.status(500).json({
      success: false,
      error: `統計取得エラー: ${errorMessage}`
    })
  }
})

/**
 * 🎯 Phase 3性能ベンチマークAPI
 * POST /api/sqlite/phase3-benchmark
 */
router.post('/phase3-benchmark', async (req: Request, res: Response) => {
  try {
    await initializePhase3Services()
    
    const testQueries = req.body.queries || ['cursor', 'claude', 'ai', 'search', 'test']
    const results = []

    logger.info('⚡ Phase 3性能ベンチマーク開始')

    for (const query of testQueries) {
      const startTime = Date.now()
      const searchResults = await phase3SqliteService!.fastSearch(query, { limit: 10 })
      const queryTime = Date.now() - startTime

      results.push({
        query,
        queryTime,
        resultCount: searchResults.length,
        avgRelevance: searchResults.length > 0 
          ? searchResults.reduce((sum, r) => sum + r.relevanceScore, 0) / searchResults.length
          : 0
      })

      logger.info(`📊 ベンチマーク: "${query}" - ${queryTime}ms, ${searchResults.length}件`)
    }

    const avgQueryTime = results.reduce((sum, r) => sum + r.queryTime, 0) / results.length
    const totalResults = results.reduce((sum, r) => sum + r.resultCount, 0)

    logger.info(`✅ Phase 3ベンチマーク完了: 平均${avgQueryTime.toFixed(1)}ms`)

    res.json({
      success: true,
      data: {
        testResults: results,
        summary: {
          avgQueryTime,
          totalQueries: testQueries.length,
          totalResults,
          performance: avgQueryTime < 200 ? 'excellent' : avgQueryTime < 500 ? 'good' : 'needs-improvement',
          targetAchieved: avgQueryTime <= 200 // 50-200ms目標
        },
        version: 'phase3'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    logger.error('❌ Phase 3ベンチマークエラー:', error)
    res.status(500).json({
      success: false,
      error: `ベンチマークエラー: ${errorMessage}`
    })
  }
})

/**
 * 🔧 Phase 3最適化API
 * POST /api/sqlite/phase3-optimize
 */
router.post('/phase3-optimize', async (req: Request, res: Response) => {
  try {
    await initializePhase3Services()
    
    logger.info('🔧 Phase 3インデックス最適化開始')
    const startTime = Date.now()

    await phase3SqliteService!.optimize()

    const optimizeTime = Date.now() - startTime
    const stats = await phase3SqliteService!.getStats()

    logger.info(`✅ Phase 3最適化完了: ${optimizeTime}ms`)

    res.json({
      success: true,
      data: {
        optimizeTime,
        stats,
        version: 'phase3'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    logger.error('❌ Phase 3最適化エラー:', error)
    res.status(500).json({
      success: false,
      error: `最適化エラー: ${errorMessage}`
    })
  }
})

/**
 * 🚀 Phase 3ステータス確認API
 * GET /api/sqlite/phase3-status
 */
router.get('/phase3-status', async (req: Request, res: Response) => {
  try {
    const isInitialized = phase3SqliteService?.isInitialized() || false
    
    if (isInitialized) {
      const stats = await phase3SqliteService!.getStats()
      const metrics = phase3SqliteService!.getSearchMetrics()
      
      res.json({
        success: true,
        data: {
          initialized: true,
          stats,
          searchMetrics: metrics,
          dbPath: 'data/phase3-search.db',
          version: 'phase3',
          timestamp: new Date().toISOString()
        }
      })
    } else {
      res.json({
        success: true,
        data: {
          initialized: false,
          message: 'Phase 3サービスは未初期化です',
          version: 'phase3'
        }
      })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    logger.error('❌ Phase 3ステータス確認エラー:', error)
    res.status(500).json({
      success: false,
      error: `ステータス確認エラー: ${errorMessage}`
    })
  }
})

export default router 