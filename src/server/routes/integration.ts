/**
 * Integration API Routes
 * .mdcルール準拠: Cursor統合機能のAPIエンドポイント
 */

import { Router, type Request, type Response, type RequestHandler } from 'express'
import { IntegrationService } from '../services/IntegrationService.js'
import { Logger } from '../utils/Logger.js'
import type {
  IntegrationConfig,
  IntegrationAnalyticsRequest,
  IntegrationSearchOptions
} from '../types/integration.js'

// 型安全なルートハンドラー
type AsyncRequestHandler = (req: Request, res: Response) => Promise<Response | void>

const router = Router()

// 統合サービスとロガーのインスタンス
let integrationService: IntegrationService | null = null
let logger: Logger | null = null

/**
 * 統合サービスのセットアップ
 */
export function setupIntegrationRoutes(service: IntegrationService, serviceLogger: Logger) {
  integrationService = service
  logger = serviceLogger
}

// 型安全なハンドラーラッパー
const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => 
  (req, res, next) => Promise.resolve(fn(req, res)).catch(next)

/**
 * 統合検索エンドポイント
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(503).json({ 
        error: 'Integration service not available',
        message: 'サービスが初期化されていません'
      })
    }

    const options: IntegrationSearchOptions = {
      query: req.query.q as string,
      types: req.query.types ? (req.query.types as string).split(',') : undefined,
      project: req.query.project as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      pageSize: req.query.limit ? parseInt(req.query.limit as string) : 50
    }

    if (req.query.startDate && req.query.endDate) {
      options.timeRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string)
      }
    }

    const results = await integrationService.search(options)
    
    res.json({
      results,
      total: results.length,
      query: options
    })
  } catch (error) {
    logger?.error('統合検索エラー', error instanceof Error ? error : undefined)
    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * 統計情報取得エンドポイント
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(503).json({ 
        error: 'Integration service not available',
        message: 'サービスが初期化されていません'
      })
    }

    const stats = await integrationService.getStats()
    
    res.json({
      ...stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger?.error('統計取得エラー', error instanceof Error ? error : undefined)
    res.status(500).json({
      error: 'Stats retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * 分析データ取得エンドポイント
 */
router.get('/analytics', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(503).json({ 
        error: 'Integration service not available',
        message: 'サービスが初期化されていません'
      })
    }

    const request: IntegrationAnalyticsRequest = {
      timeRange: {
        start: new Date(req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        end: new Date(req.query.endDate as string || new Date())
      },
      granularity: (req.query.granularity as 'hourly' | 'daily' | 'weekly' | 'monthly') || 'daily',
      metrics: req.query.metrics ? (req.query.metrics as string).split(',') : ['messageCount', 'sessionCount']
    }

    const analytics = await integrationService.getAnalytics(request)
    
    res.json(analytics)
  } catch (error) {
    logger?.error('分析データ取得エラー', error instanceof Error ? error : undefined)
    res.status(500).json({
      error: 'Analytics retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * 同期開始エンドポイント
 */
router.post('/sync/start', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(503).json({ 
        error: 'Integration service not available',
        message: 'サービスが初期化されていません'
      })
    }

    await integrationService.startSync()
    
    res.json({
      message: '同期を開始しました',
      status: 'started',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger?.error('同期開始エラー', error instanceof Error ? error : undefined)
    res.status(500).json({
      error: 'Sync start failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * 同期停止エンドポイント
 */
router.post('/sync/stop', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(503).json({ 
        error: 'Integration service not available',
        message: 'サービスが初期化されていません'
      })
    }

    await integrationService.stopSync()
    
    res.json({
      message: '同期を停止しました',
      status: 'stopped',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger?.error('同期停止エラー', error instanceof Error ? error : undefined)
    res.status(500).json({
      error: 'Sync stop failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * 同期ステータス取得エンドポイント
 */
router.get('/sync/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(503).json({ 
        error: 'Integration service not available',
        message: 'サービスが初期化されていません'
      })
    }

    const status = integrationService.getCursorWatcherStatus()
    
    res.json({
      ...status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger?.error('ステータス取得エラー', error instanceof Error ? error : undefined)
    res.status(500).json({
      error: 'Status retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * Cursorログスキャンエンドポイント
 */
router.post('/scan', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(503).json({ 
        error: 'Integration service not available',
        message: 'サービスが初期化されていません'
      })
    }

    const { path: customPath } = req.body
    const importCount = await integrationService.scanCursorLogs(customPath)
    
    res.json({
      message: 'スキャンが完了しました',
      importCount,
      scanPath: customPath || 'default',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger?.error('ログスキャンエラー', error instanceof Error ? error : undefined)
    res.status(500).json({
      error: 'Scan failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * リアルタイムイベント（WebSocket準備）
 */
router.get('/events', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!integrationService) {
      return res.status(503).json({ 
        error: 'Integration service not available',
        message: 'サービスが初期化されていません'
      })
    }

    // SSE (Server-Sent Events) の準備
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })

    // イベントリスナーの設定
    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // 統合サービスのイベントをリッスン
    integrationService.on('syncStarted', (data) => {
      sendEvent('syncStarted', data)
    })

    integrationService.on('syncStopped', () => {
      sendEvent('syncStopped', {})
    })

    integrationService.on('syncCompleted', (data) => {
      sendEvent('syncCompleted', data)
    })

    integrationService.on('logIntegrated', (data) => {
      sendEvent('logIntegrated', data)
    })

    integrationService.on('fileProcessed', (data) => {
      sendEvent('fileProcessed', data)
    })

    integrationService.on('scanCompleted', (data) => {
      sendEvent('scanCompleted', data)
    })

    integrationService.on('syncError', (error) => {
      sendEvent('syncError', { 
        message: error instanceof Error ? error.message : String(error) 
      })
    })

    // 接続確認のハートビート
    const heartbeat = setInterval(() => {
      sendEvent('heartbeat', { timestamp: new Date().toISOString() })
    }, 30000)

    // クライアントが切断した場合のクリーンアップ
    req.on('close', () => {
      clearInterval(heartbeat)
      logger?.debug('SSEクライアントが切断されました')
    })

    // 初期接続メッセージ
    sendEvent('connected', { 
      message: 'リアルタイムイベントに接続しました',
      timestamp: new Date().toISOString() 
    })

  } catch (error) {
    logger?.error('イベントストリームエラー', error instanceof Error ? error : undefined)
    res.status(500).json({
      error: 'Event stream failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

/**
 * ヘルスチェックエンドポイント
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  try {
    const isServiceAvailable = integrationService !== null
    const status = isServiceAvailable ? integrationService?.getCursorWatcherStatus() : null
    
    res.json({
      status: isServiceAvailable ? 'healthy' : 'unavailable',
      service: {
        available: isServiceAvailable,
        sync: status ? {
          active: status.isActive,
          lastCheck: status.lastCheck,
          errorCount: status.errorCount
        } : null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger?.error('ヘルスチェックエラー', error instanceof Error ? error : undefined)
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}))

export default router 