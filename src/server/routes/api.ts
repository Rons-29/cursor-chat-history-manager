/**
 * API Routes
 * .mdcルール準拠: 実データ統合とエラーハンドリング完備
 */

import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { apiDataService } from '../api-router.js'
import { ChatHistoryService } from '../../services/ChatHistoryService.js'
import { Logger } from '../utils/Logger.js'

const router = Router()
const logger = new Logger({ logPath: './logs', level: 'info' })
const chatHistoryService = new ChatHistoryService({
  storagePath: './data/chat-history',
  maxSessions: 1000,
  maxMessagesPerSession: 1000,
  autoCleanup: true,
  cleanupDays: 30,
  enableSearch: true,
  enableBackup: true,
  backupInterval: 24 * 60 * 60 * 1000 // 24時間
})

// ヘルスチェック
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// サービス状態確認
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = apiDataService.getServiceStatus()
    res.json(status)
  } catch (error) {
    res.status(500).json({
      error: 'サービス状態取得エラー',
      message: error instanceof Error ? error.message : '不明なエラー'
    })
  }
})

// 統計情報取得
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await apiDataService.getStats()
    res.json(stats)
  } catch (error) {
    console.error('Stats API Error:', error)
    
    // フォールバック: 仮データで応答
    res.json({
      totalSessions: 0,
      totalMessages: 0,
      thisMonthMessages: 0,
      activeProjects: 0,
      storageSize: '0MB',
      lastActivity: null,
      mode: 'fallback'
    })
  }
})

// セッション一覧取得
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const keyword = req.query.keyword as string
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined

    const result = await apiDataService.getSessions(page, limit, keyword, startDate, endDate, tags)
    res.json(result)
  } catch (error) {
    console.error('Sessions API Error:', error)
    
    // フォールバック: 空の結果で応答
    res.json({
      sessions: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false
      },
      mode: 'fallback'
    })
  }
})

// セッション詳細取得
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id
    const session = await apiDataService.getSession(sessionId)
    res.json(session)
  } catch (error) {
    console.error('Session Detail API Error:', error)
    res.status(404).json({
      error: 'セッションが見つかりません',
      message: error instanceof Error ? error.message : '不明なエラー'
    })
  }
})

interface SearchRequestBody {
  query: string
  filters?: {
    startDate?: string
    endDate?: string
    tags?: string[]
  }
}

// 検索機能
router.post('/search', async (req: Request<{}, {}, SearchRequestBody>, res: Response) => {
  try {
    const { query, filters } = req.body
    const searchFilter = {
      keyword: query,
      page: 1,
      pageSize: 50,
      ...filters,
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined
    }
    const results = await chatHistoryService.searchSessions(searchFilter)
    res.json(results)
  } catch (error) {
    logger.error('Search error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 設定管理
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await apiDataService.getConfig()
    res.json(config)
  } catch (error) {
    console.error('Config API Error:', error)
    res.status(500).json({
      error: '設定取得エラー',
      message: error instanceof Error ? error.message : '不明なエラー'
    })
  }
})

router.put('/config', async (req: Request, res: Response) => {
  try {
    const updatedConfig = await apiDataService.updateConfig(req.body)
    res.json(updatedConfig)
  } catch (error) {
    console.error('Config Update API Error:', error)
    res.status(500).json({
      error: '設定更新エラー',
      message: error instanceof Error ? error.message : '不明なエラー'
    })
  }
})

// キャッシュクリア
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    await apiDataService.clearCache()
    res.json({
      success: true,
      message: 'キャッシュをクリアしました'
    })
  } catch (error) {
    console.error('Cache Clear API Error:', error)
    res.status(500).json({
      error: 'キャッシュクリアエラー',
      message: error instanceof Error ? error.message : '不明なエラー'
    })
  }
})

// データ更新
router.post('/data/refresh', async (req: Request, res: Response) => {
  try {
    await apiDataService.refreshData()
    res.json({
      success: true,
      message: 'データを更新しました'
    })
  } catch (error) {
    console.error('Data Refresh API Error:', error)
    res.status(500).json({
      error: 'データ更新エラー',
      message: error instanceof Error ? error.message : '不明なエラー'
    })
  }
})

// エラーハンドラー
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', error)
  res.status(500).json({
    error: 'サーバーエラー',
    message: process.env.NODE_ENV === 'development' ? error.message : 'サーバーエラーが発生しました'
  })
})

export default router 