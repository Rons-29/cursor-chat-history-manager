/**
 * Integration API Routes
 * .mdcルール準拠: Cursor統合機能のAPIエンドポイント
 */

import { Router } from 'express'
import type { Request, Response } from 'express'
import { IntegrationService } from '../services/IntegrationService.js'
import { Logger } from '../utils/Logger.js'
import type { IntegrationConfig, IntegrationSearchOptions } from '../types/integration.js'

const router = Router()

// IntegrationServiceのインスタンス（後で依存性注入で設定）
let integrationService: IntegrationService | null = null
let logger: Logger | null = null

/**
 * 依存性注入用のセットアップ関数
 */
export function setupIntegrationRoutes(service: IntegrationService, loggerInstance: Logger) {
  integrationService = service
  logger = loggerInstance
}

/**
 * 統合サービスの初期化
 * POST /api/integration/initialize
 */
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(500).json({
        error: 'IntegrationService not configured',
        message: 'サービスが設定されていません'
      })
    }

    await integrationService.initialize()
    logger?.info('統合サービスを初期化しました')

    res.json({
      success: true,
      message: '統合サービスの初期化が完了しました'
    })
  } catch (error) {
    logger?.error('統合サービス初期化エラー:', error)
    res.status(500).json({
      error: 'Initialization failed',
      message: error instanceof Error ? error.message : '初期化に失敗しました'
    })
  }
})

/**
 * 同期開始
 * POST /api/integration/sync/start
 */
router.post('/sync/start', async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(500).json({
        error: 'IntegrationService not configured',
        message: 'サービスが設定されていません'
      })
    }

    await integrationService.startSync()
    logger?.info('統合同期を開始しました')

    res.json({
      success: true,
      message: '同期を開始しました'
    })
  } catch (error) {
    logger?.error('同期開始エラー:', error)
    res.status(500).json({
      error: 'Sync start failed',
      message: error instanceof Error ? error.message : '同期開始に失敗しました'
    })
  }
})

/**
 * 同期停止
 * POST /api/integration/sync/stop
 */
router.post('/sync/stop', async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(500).json({
        error: 'IntegrationService not configured',
        message: 'サービスが設定されていません'
      })
    }

    await integrationService.stopSync()
    logger?.info('統合同期を停止しました')

    res.json({
      success: true,
      message: '同期を停止しました'
    })
  } catch (error) {
    logger?.error('同期停止エラー:', error)
    res.status(500).json({
      error: 'Sync stop failed',
      message: error instanceof Error ? error.message : '同期停止に失敗しました'
    })
  }
})

/**
 * Cursorログの手動スキャン
 * POST /api/integration/cursor/scan
 */
router.post('/cursor/scan', async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(500).json({
        error: 'IntegrationService not configured',
        message: 'サービスが設定されていません'
      })
    }

    const { customPath } = req.body
    const importCount = await integrationService.scanCursorLogs(customPath)

    res.json({
      success: true,
      message: `Cursorログスキャンが完了しました`,
      data: {
        importCount,
        customPath: customPath || 'デフォルトパス'
      }
    })
  } catch (error) {
    logger?.error('Cursorログスキャンエラー:', error)
    res.status(500).json({
      error: 'Cursor scan failed',
      message: error instanceof Error ? error.message : 'スキャンに失敗しました'
    })
  }
})

/**
 * CursorWatcherServiceのステータス取得
 * GET /api/integration/cursor/status
 */
router.get('/cursor/status', async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(500).json({
        error: 'IntegrationService not configured',
        message: 'サービスが設定されていません'
      })
    }

    const status = integrationService.getCursorWatcherStatus()

    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    logger?.error('Cursorステータス取得エラー:', error)
    res.status(500).json({
      error: 'Status retrieval failed',
      message: error instanceof Error ? error.message : 'ステータス取得に失敗しました'
    })
  }
})

/**
 * 統合ログ検索
 * POST /api/integration/search
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(500).json({
        error: 'IntegrationService not configured',
        message: 'サービスが設定されていません'
      })
    }

    const searchOptions: IntegrationSearchOptions = {
      query: req.body.query,
      timeRange: req.body.timeRange ? {
        start: new Date(req.body.timeRange.start),
        end: new Date(req.body.timeRange.end)
      } : undefined,
      types: req.body.types,
      project: req.body.project,
      tags: req.body.tags,
      pageSize: req.body.pageSize || 50
    }

    const results = await integrationService.search(searchOptions)

    res.json({
      success: true,
      data: {
        results,
        count: results.length,
        searchOptions
      }
    })
  } catch (error) {
    logger?.error('統合検索エラー:', error)
    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : '検索に失敗しました'
    })
  }
})

/**
 * 統合統計情報取得
 * GET /api/integration/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(500).json({
        error: 'IntegrationService not configured',
        message: 'サービスが設定されていません'
      })
    }

    const stats = await integrationService.getStats()

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger?.error('統計情報取得エラー:', error)
    res.status(500).json({
      error: 'Stats retrieval failed',
      message: error instanceof Error ? error.message : '統計情報取得に失敗しました'
    })
  }
})

/**
 * 統合分析データ取得
 * POST /api/integration/analytics
 */
router.post('/analytics', async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(500).json({
        error: 'IntegrationService not configured',
        message: 'サービスが設定されていません'
      })
    }

    const analyticsRequest = {
      timeRange: req.body.timeRange ? {
        start: new Date(req.body.timeRange.start),
        end: new Date(req.body.timeRange.end)
      } : {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30日前
        end: new Date()
      },
      granularity: req.body.granularity || 'daily',
      metrics: req.body.metrics || ['messageCount', 'sessionCount']
    }

    const analytics = await integrationService.getAnalytics(analyticsRequest)

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    logger?.error('分析データ取得エラー:', error)
    res.status(500).json({
      error: 'Analytics retrieval failed',
      message: error instanceof Error ? error.message : '分析データ取得に失敗しました'
    })
  }
})

/**
 * ヘルスチェック
 * GET /api/integration/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const status = integrationService ? 'ready' : 'not_configured'
    const cursorStatus = integrationService ? integrationService.getCursorWatcherStatus() : null

    res.json({
      success: true,
      data: {
        status,
        timestamp: new Date().toISOString(),
        cursor: cursorStatus
      }
    })
  } catch (error) {
    logger?.error('ヘルスチェックエラー:', error)
    res.status(500).json({
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'ヘルスチェックに失敗しました'
    })
  }
})

export default router 