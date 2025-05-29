/**
 * API Routes
 * .mdcルール準拠: 実データ統合とエラーハンドリング完備
 */

import { Router } from 'express'
import { apiDataService } from '../api-router.js'

const router = Router()

// ヘルスチェック
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// サービス状態確認
router.get('/status', (req, res) => {
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
router.get('/stats', async (req, res) => {
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
router.get('/sessions', async (req, res) => {
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
router.get('/sessions/:id', async (req, res) => {
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

// 検索機能
router.post('/search', async (req: any, res: any) => {
  try {
    const { keyword, filters = {} } = req.body
    
    if (!keyword) {
      return res.status(400).json({
        error: 'キーワードが必要です'
      })
    }

    const result = await apiDataService.searchSessions(keyword, filters)
    res.json(result)
  } catch (error) {
    console.error('Search API Error:', error)
    
    // フォールバック: 空の検索結果で応答
    res.json({
      keyword: req.body.keyword || '',
      results: [],
      total: 0,
      hasMore: false,
      mode: 'fallback'
    })
  }
})

// 設定管理
router.get('/config', async (req, res) => {
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

router.put('/config', async (req, res) => {
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
router.post('/cache/clear', async (req, res) => {
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
router.post('/data/refresh', async (req, res) => {
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
router.use((error: any, req: any, res: any, next: any) => {
  console.error('API Error:', error)
  res.status(500).json({
    error: 'サーバーエラー',
    message: process.env.NODE_ENV === 'development' ? error.message : 'サーバーエラーが発生しました'
  })
})

export default router 