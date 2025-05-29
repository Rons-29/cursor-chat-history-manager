import { Router } from 'express'
import { ChatHistoryService } from '../../services/ChatHistoryService.js'
import { ConfigService } from '../../services/ConfigService.js'
import { ChatSession, ChatHistoryFilter } from '../../types/index.js'

const router = Router()

// サービスインスタンス作成
const configService = new ConfigService()
let chatHistoryService: ChatHistoryService

// 初期化関数
async function initializeServices() {
  try {
    const config = await configService.loadConfig()
    chatHistoryService = new ChatHistoryService(config)
    await chatHistoryService.initialize()
  } catch (error) {
    console.error('サービス初期化エラー:', error)
    // デフォルト設定で初期化を試行
    chatHistoryService = new ChatHistoryService({
      storageType: 'file',
      storagePath: './exports',
      maxSessions: 1000,
      maxMessagesPerSession: 500,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24,
    })
    await chatHistoryService.initialize()
  }
}

// 初期化実行
initializeServices()

// セッション一覧取得
router.get('/sessions', async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, startDate, endDate } = req.query

    const filter: ChatHistoryFilter = {
      limit: parseInt(String(limit)),
      offset: (parseInt(String(page)) - 1) * parseInt(String(limit)),
    }

    if (keyword) {
      filter.keyword = String(keyword)
    }
    if (startDate) {
      filter.startDate = new Date(String(startDate))
    }
    if (endDate) {
      filter.endDate = new Date(String(endDate))
    }

    const result = await chatHistoryService.searchSessions(filter)

    res.json({
      sessions: result.sessions,
      pagination: {
        page: parseInt(String(page)),
        limit: parseInt(String(limit)),
        total: result.totalCount,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      },
    })
  } catch (error) {
    console.error('セッション一覧取得エラー:', error)
    res.status(500).json({ error: 'セッション一覧の取得に失敗しました' })
  }
})

// 特定セッション取得
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const session = await chatHistoryService.getSession(id)

    if (!session) {
      return res.status(404).json({ error: 'セッションが見つかりません' })
    }

    res.json(session)
  } catch (error) {
    console.error('セッション取得エラー:', error)
    res.status(500).json({ error: 'セッションの取得に失敗しました' })
  }
})

// 検索機能
router.post('/search', async (req, res) => {
  try {
    const { keyword, filters = {} } = req.body

    if (!keyword) {
      return res.status(400).json({ error: 'キーワードが必要です' })
    }

    const searchFilter: ChatHistoryFilter = {
      keyword,
      ...filters,
    }

    const results = await chatHistoryService.searchSessions(searchFilter)

    res.json({
      keyword,
      results: results.sessions,
      total: results.totalCount,
    })
  } catch (error) {
    console.error('検索エラー:', error)
    res.status(500).json({ error: '検索に失敗しました' })
  }
})

// 統計情報取得
router.get('/stats', async (req, res) => {
  try {
    const stats = await chatHistoryService.getStats()

    res.json({
      totalSessions: stats.totalSessions,
      totalMessages: stats.totalMessages,
      thisMonthMessages: stats.totalMessages, // 簡易実装
      activeProjects: stats.totalSessions, // 簡易実装
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('統計情報取得エラー:', error)
    res.status(500).json({ error: '統計情報の取得に失敗しました' })
  }
})

// セッション作成（開発・テスト用）
router.post('/sessions', async (req, res) => {
  try {
    const { title, description, tags = [] } = req.body

    const session = await chatHistoryService.createSession(
      title || `新しいセッション ${new Date().toLocaleString('ja-JP')}`,
      {
        description: description || '',
        tags,
        source: 'web-ui',
      }
    )

    res.status(201).json(session)
  } catch (error) {
    console.error('セッション作成エラー:', error)
    res.status(500).json({ error: 'セッションの作成に失敗しました' })
  }
})

export default router
