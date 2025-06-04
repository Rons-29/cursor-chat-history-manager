/**
 * 統合API ルート
 *
 * 全サービスの機能を統合したAPIエンドポイント
 * 重複排除と一貫性のあるレスポンス形式を提供
 */

import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from 'express'
import type { ChatHistoryService } from '../../services/ChatHistoryService.js'
import type ClaudeDevIntegrationService from '../../services/ClaudeDevIntegrationService.js'
import type { IntegrationService } from '../../services/IntegrationService.js'

// 型安全なルートハンドラー
type AsyncRequestHandler = (req: Request, res: Response) => Promise<void>

const router = Router()

// サービスインスタンス
let chatHistoryService: ChatHistoryService | null = null
let claudeDevService: ClaudeDevIntegrationService | null = null
let integrationService: IntegrationService | null = null

// 型安全なハンドラーラッパー
const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res)).catch(next)

/**
 * サービス設定関数
 */
export function setServices(services: {
  chatHistory?: ChatHistoryService
  claudeDev?: ClaudeDevIntegrationService
  integration?: IntegrationService
}): void {
  if (services.chatHistory) chatHistoryService = services.chatHistory
  if (services.claudeDev) claudeDevService = services.claudeDev
  if (services.integration) integrationService = services.integration
}

/**
 * GET /api/health
 * 統合ヘルスチェック - 全サービスの状態確認
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const services = {
      chatHistory: !!chatHistoryService,
      claudeDev: !!claudeDevService,
      integration: !!integrationService,
    }

    const allHealthy = Object.values(services).every(status => status)

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
    })
  })
)

/**
 * GET /api/status
 * 統合ステータス - 詳細な稼働状況
 */
router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result: any = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {},
    }

    // Chat History Service
    if (chatHistoryService) {
      try {
        const stats = await chatHistoryService.getStats()
        result.services.chatHistory = {
          status: 'active',
          stats,
        }
      } catch (error) {
        result.services.chatHistory = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    } else {
      result.services.chatHistory = { status: 'not_initialized' }
    }

    // Claude Dev Service
    if (claudeDevService) {
      try {
        const stats = await claudeDevService.getClaudeDevStats()
        result.services.claudeDev = {
          status: 'active',
          stats,
        }
      } catch (error) {
        result.services.claudeDev = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    } else {
      result.services.claudeDev = { status: 'not_initialized' }
    }

    // Integration Service
    if (integrationService) {
      try {
        const stats = await integrationService.getStats()
        result.services.integration = {
          status: 'active',
          stats,
        }
      } catch (error) {
        result.services.integration = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    } else {
      result.services.integration = { status: 'not_initialized' }
    }

    res.json(result)
  })
)

/**
 * GET /api/sessions
 * 統合セッション取得 - 全ソースからのセッション
 */
router.get(
  '/sessions',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 50,
      keyword,
      startDate,
      endDate,
      source,
    } = req.query

    const filter = {
      page: parseInt(page as string),
      pageSize: parseInt(limit as string),
      keyword: keyword as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      source: source as string,
    }

    let result: any

    // ソース指定による分岐
    if (source === 'claude-dev' && claudeDevService) {
      // Claude Dev専用検索
      const sessions = await claudeDevService.searchClaudeDevSessions(
        (keyword as string) || '',
        {
          limit: filter.pageSize,
          offset: (filter.page - 1) * filter.pageSize,
          sortBy: 'timestamp',
          sortOrder: 'desc',
        }
      )

      result = {
        sessions: sessions.map(session => ({
          ...session,
          metadata: {
            ...session.metadata,
            source: 'claude-dev',
          },
        })),
        pagination: {
          page: filter.page,
          limit: filter.pageSize,
          total: sessions.length,
          totalPages: Math.ceil(sessions.length / filter.pageSize),
          hasMore: sessions.length === filter.pageSize,
        },
      }
    } else if (chatHistoryService) {
      // 通常のチャット履歴検索
      result = await chatHistoryService.searchSessions(filter)

      // APIレスポンス形式に変換
      const sessions = result.sessions.map((session: any) => ({
        id: session.id,
        title: session.title,
        startTime: session.createdAt.toISOString(),
        endTime: session.updatedAt.toISOString(),
        metadata: {
          totalMessages: session.messages.length,
          tags: session.tags || [],
          description: session.metadata?.summary || '',
          source: session.metadata?.source || 'chat',
        },
        messages: session.messages.map((msg: any) => ({
          id: msg.id,
          timestamp: msg.timestamp.toISOString(),
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata || {},
        })),
      }))

      result = {
        sessions,
        pagination: {
          page: result.currentPage,
          limit: result.pageSize,
          total: result.totalCount,
          totalPages: result.totalPages,
          hasMore: result.hasMore,
        },
      }
    } else {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'チャット履歴サービスが利用できません',
      })
      return
    }

    res.json(result)
  })
)

/**
 * GET /api/sessions/:id
 * 統合セッション詳細取得
 */
router.get(
  '/sessions/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.params.id
    let session: any = null

    // まずClaude Devから検索
    if (claudeDevService) {
      try {
        session = await claudeDevService.getClaudeDevSession(sessionId)
        if (session) {
          session.metadata = { ...session.metadata, source: 'claude-dev' }
        }
      } catch (error) {
        // Claude Devで見つからない場合は通常検索へ
      }
    }

    // Claude Devで見つからない場合、通常のチャット履歴から検索
    if (!session && chatHistoryService) {
      try {
        const chatSession = await chatHistoryService.getSession(sessionId)
        if (chatSession) {
          session = {
            id: chatSession.id,
            title: chatSession.title,
            startTime: chatSession.createdAt.toISOString(),
            endTime: chatSession.updatedAt.toISOString(),
            metadata: {
              totalMessages: chatSession.messages.length,
              tags: chatSession.tags || [],
              description: chatSession.metadata?.summary || '',
              source: chatSession.metadata?.source || 'chat',
            },
            messages: chatSession.messages.map(msg => ({
              id: msg.id,
              timestamp: msg.timestamp.toISOString(),
              role: msg.role,
              content: msg.content,
              metadata: msg.metadata || {},
            })),
          }
        }
      } catch (error) {
        // エラーログは既に各サービスで処理済み
      }
    }

    if (!session) {
      res.status(404).json({
        error: 'Not Found',
        message: 'セッションが見つかりません',
      })
      return
    }

    res.json(session)
  })
)

/**
 * GET /api/stats
 * 統合統計情報 - 全サービスの統計
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result: any = {
      timestamp: new Date().toISOString(),
      overall: {},
      services: {},
    }

    let totalSessions = 0
    let totalMessages = 0

    // Chat History Stats
    if (chatHistoryService) {
      try {
        const chatStats = await chatHistoryService.getStats()
        result.services.chatHistory = chatStats
        totalSessions += chatStats.totalSessions || 0
        totalMessages += chatStats.totalMessages || 0
      } catch (error) {
        result.services.chatHistory = {
          error: 'Failed to fetch chat history stats',
        }
      }
    }

    // Claude Dev Stats
    if (claudeDevService) {
      try {
        const claudeDevStats = await claudeDevService.getClaudeDevStats()
        result.services.claudeDev = claudeDevStats
        totalSessions += claudeDevStats.totalTasks || 0
      } catch (error) {
        result.services.claudeDev = {
          error: 'Failed to fetch Claude Dev stats',
        }
      }
    }

    // Integration Stats
    if (integrationService) {
      try {
        const integrationStats = await integrationService.getStats()
        result.services.integration = integrationStats
      } catch (error) {
        result.services.integration = {
          error: 'Failed to fetch integration stats',
        }
      }
    }

    result.overall = {
      totalSessions,
      totalMessages,
      activeServices: [
        !!chatHistoryService,
        !!claudeDevService,
        !!integrationService,
      ].filter(Boolean).length,
    }

    res.json(result)
  })
)

/**
 * POST /api/search
 * 統合検索 - 全ソースを横断検索
 */
router.post(
  '/search',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { keyword, filters = {}, options = {} } = req.body

    // フィルターのみの検索も許可
    const hasFilters = filters && Object.keys(filters).length > 0
    if (!keyword && !hasFilters) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'キーワードまたはフィルターが必要です',
      })
      return
    }

    const results: any[] = []

    // Chat History Search
    if (chatHistoryService && (!filters.source || filters.source === 'chat')) {
      try {
        const chatResult = await chatHistoryService.searchSessions({
          keyword,
          page: 1,
          pageSize: options.limit || 20,
        })

        results.push(
          ...chatResult.sessions.map((session: any) => ({
            ...session,
            source: 'chat',
            relevance: 1.0, // 基本的な関連度
          }))
        )
      } catch (error) {
        // エラーは結果に影響させない
      }
    }

    // Claude Dev Search
    if (
      claudeDevService &&
      (!filters.source || filters.source === 'claude-dev')
    ) {
      try {
        const claudeDevResult = await claudeDevService.searchClaudeDevSessions(
          keyword,
          {
            limit: options.limit || 20,
            offset: 0,
            sortBy: 'relevance',
            sortOrder: 'desc',
          }
        )

        results.push(
          ...claudeDevResult.map(session => ({
            ...session,
            source: 'claude-dev',
            relevance: 0.9, // Claude Dev結果の関連度
          }))
        )
      } catch (error) {
        // エラーは結果に影響させない
      }
    }

    // 関連度でソート
    results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0))

    res.json({
      query: keyword,
      filters,
      results: results.slice(0, options.limit || 50),
      totalCount: results.length,
      sources: [...new Set(results.map(r => r.source))],
    })
  })
)

export default router
