/**
 * Claude Dev統合API ルート
 *
 * Claude Dev拡張機能との統合機能を提供するAPIエンドポイント
 */

import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from 'express'
import ClaudeDevIntegrationService from '../../services/ClaudeDevIntegrationService.js'
import serviceRegistry from '../../services/ServiceRegistry.js'
import path from 'path'

// 型安全なルートハンドラー
type AsyncRequestHandler = (req: Request, res: Response) => Promise<void>

const router = Router()

// 型安全なハンドラーラッパー
const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res)).catch(next)

/**
 * Claude Dev統合サービスの取得
 * ServiceRegistryを使用してサービスを取得
 */
function getClaudeDevService(): ClaudeDevIntegrationService {
  return serviceRegistry.getClaudeDevService()
}

/**
 * Claude Dev統合サービスの設定
 * ServiceRegistryを使用してサービスを設定
 */
export function setClaudeDevService(
  service: ClaudeDevIntegrationService
): void {
  serviceRegistry.setClaudeDevService(service)
}

/**
 * GET /api/claude-dev/status
 * Claude Dev統合サービスの状態確認
 */
router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getClaudeDevService()
    const stats = await service.getClaudeDevStats()

    res.json({
      success: true,
      data: {
        status: 'active',
        stats,
        timestamp: new Date().toISOString(),
      },
    })
  })
)

/**
 * GET /api/claude-dev/tasks
 * 利用可能なClaude Devタスクの一覧取得
 */
router.get(
  '/tasks',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getClaudeDevService()

    // クエリパラメータの解析
    const maxTasks = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined
    const skipExisting = req.query.skipExisting === 'true'

    const options = {
      maxTasksToProcess: maxTasks,
      skipExisting,
    }

    const tasks = await service.findAvailableTasks(options)

    res.json({
      success: true,
      data: {
        tasks,
        count: tasks.length,
        options,
      },
      timestamp: new Date().toISOString(),
    })
  })
)

/**
 * POST /api/claude-dev/integrate
 * Claude Devタスクの一括統合実行
 */
router.post(
  '/integrate',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getClaudeDevService()

    // リクエストボディからオプションを取得
    const {
      includeEnvironmentData = false,
      maxTasksToProcess,
      skipExisting = true,
      filterByDateRange,
    } = req.body

    const options = {
      includeEnvironmentData,
      maxTasksToProcess,
      skipExisting,
      filterByDateRange: filterByDateRange
        ? {
            start: new Date(filterByDateRange.start),
            end: new Date(filterByDateRange.end),
          }
        : undefined,
    }

    // 統合処理の実行
    const result = await service.integrateAllTasks(options)

    res.json({
      success: true,
      data: {
        result,
        message: `統合完了: 成功 ${result.success}件, 失敗 ${result.failed}件, スキップ ${result.skipped}件`,
      },
      timestamp: new Date().toISOString(),
    })
  })
)

/**
 * GET /api/claude-dev/sessions
 * Claude Devセッションの検索・一覧取得
 */
router.get(
  '/sessions',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getClaudeDevService()

    const {
      keyword = '',
      limit = 10,
      offset = 0,
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = req.query

    const options = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sortBy: sortBy as 'timestamp' | 'relevance',
      sortOrder: sortOrder as 'asc' | 'desc',
    }

    const sessions = await service.searchClaudeDevSessions(
      keyword as string,
      options
    )

    res.json({
      success: true,
      data: {
        sessions,
        count: sessions.length,
        query: {
          keyword,
          ...options,
        },
      },
      timestamp: new Date().toISOString(),
    })
  })
)

/**
 * GET /api/claude-dev/sessions/:id
 * 特定のClaude Devセッション詳細取得
 */
router.get(
  '/sessions/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getClaudeDevService()
    const sessionId = req.params.id

    const session = await service.getClaudeDevSession(sessionId)

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'セッションが見つかりません',
        timestamp: new Date().toISOString(),
      })
      return
    }

    res.json({
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    })
  })
)

/**
 * DELETE /api/claude-dev/sessions/:id
 * Claude Devセッションの削除
 */
router.delete(
  '/sessions/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getClaudeDevService()
    const sessionId = req.params.id

    const success = await service.deleteClaudeDevSession(sessionId)

    if (!success) {
      res.status(404).json({
        success: false,
        error: 'セッションが見つからないか、削除に失敗しました',
        timestamp: new Date().toISOString(),
      })
      return
    }

    res.json({
      success: true,
      data: {
        message: 'セッションが正常に削除されました',
        sessionId,
      },
      timestamp: new Date().toISOString(),
    })
  })
)

/**
 * GET /api/claude-dev/stats
 * Claude Dev統計情報の取得
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getClaudeDevService()
    const stats = await service.getClaudeDevStats()

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    })
  })
)

/**
 * GET /api/claude-dev/task/:taskId/details
 * 特定タスクの詳細情報取得
 */
router.get(
  '/task/:taskId/details',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getClaudeDevService()
    const taskId = req.params.taskId
    const includeEnvironment = req.query.includeEnvironment === 'true'

    const task = await service.loadTaskDetails(taskId, includeEnvironment)

    if (!task) {
      res.status(404).json({
        success: false,
        error: 'タスクが見つかりません',
        timestamp: new Date().toISOString(),
      })
      return
    }

    res.json({
      success: true,
      data: task,
      timestamp: new Date().toISOString(),
    })
  })
)

/**
 * GET /api/claude-dev/task/:taskId/convert
 * 特定タスクをセッション形式に変換（プレビュー）
 */
router.get(
  '/task/:taskId/convert',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getClaudeDevService()
    const taskId = req.params.taskId
    const includeEnvironment = req.query.includeEnvironment === 'true'

    const task = await service.loadTaskDetails(taskId, includeEnvironment)

    if (!task) {
      res.status(404).json({
        success: false,
        error: 'タスクが見つかりません',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const session = service.convertTaskToSession(task)

    res.json({
      success: true,
      data: {
        originalTask: task,
        convertedSession: session,
      },
      timestamp: new Date().toISOString(),
    })
  })
)

// サービスのクリーンアップ
process.on('SIGINT', () => {
  try {
    const service = serviceRegistry.getClaudeDevService()
    if (service) {
      service.close()
    }
  } catch (error) {
    // サービスが初期化されていない場合は無視
  }
})

process.on('SIGTERM', () => {
  try {
    const service = serviceRegistry.getClaudeDevService()
    if (service) {
      service.close()
    }
  } catch (error) {
    // サービスが初期化されていない場合は無視
  }
})

export default router
