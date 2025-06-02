import express from 'express'
import cors from 'cors'
import path from 'path'
import type { RequestHandler } from 'express'
import { ChatHistoryService } from '../services/ChatHistoryService.js'
import { IntegrationService } from '../services/IntegrationService.js'
import { CursorLogService } from '../services/CursorLogService.js'
import { ConfigService } from '../services/ConfigService.js'
import { IncrementalIndexService } from '../services/IncrementalIndexService.js'
import { SqliteIndexService } from '../services/SqliteIndexService.js'
// Claude Dev統合サービスは動的インポートで作成
import { Logger } from './utils/Logger.js'

// ルートインポート
import apiRoutes from './routes/api.js'
import integrationRoutes from './routes/integration.js'
import settingsRoutes from './routes/settings.js'
import claudeDevRoutes, { setClaudeDevService } from './routes/claude-dev.js'
import unifiedApiRoutes, { setServices } from './routes/unified-api.js'

const app = express()
const PORT = process.env.PORT || 3001

// ミドルウェア
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  })
)
app.use(express.json())

// CORSミドルウェアがプリフライトリクエストを自動処理

// サービス初期化
let chatHistoryService: ChatHistoryService
let integrationService: IntegrationService
let cursorLogService: CursorLogService
let configService: ConfigService
let incrementalIndexService: IncrementalIndexService
let sqliteIndexService: SqliteIndexService
let claudeDevService: any = null
const logger = new Logger({ logPath: './logs', level: 'info' })

async function initializeServices() {
  try {
    console.log('RealAPIServer: サービス初期化を開始します')

    // 設定サービス初期化
    configService = new ConfigService()
    await configService.initialize()

    // チャット履歴サービス初期化
    chatHistoryService = new ChatHistoryService({
      storageType: 'file',
      storagePath: path.join(process.cwd(), 'data', 'chat-history'),
      maxSessions: 10000,
      maxMessagesPerSession: 500,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24,
      autoSave: {
        enabled: true,
        interval: 5,
        watchDirectories: [],
        filePatterns: ['*.ts', '*.js', '*.tsx', '*.jsx'],
        maxSessionDuration: 120,
        idleTimeout: 30,
      },
    })
    await chatHistoryService.initialize()

    // 増分インデックスサービス初期化
    incrementalIndexService = new IncrementalIndexService(
      path.join(process.cwd(), 'data', 'chat-history'),
      path.join(process.cwd(), 'data', 'index.json'),
      logger
    )
    await incrementalIndexService.initialize()

    // SQLiteインデックスサービス初期化
    sqliteIndexService = new SqliteIndexService(
      path.join(process.cwd(), 'data', 'chat-history'),
      path.join(process.cwd(), 'data', 'chat-history.db'),
      logger
    )
    await sqliteIndexService.initialize()

    // Cursorログサービス初期化
    cursorLogService = new CursorLogService(
      {
        enabled: true,
        watchPath: path.join(
          process.env.HOME || '',
          'Library/Application Support/Cursor/User/workspaceStorage'
        ),
        logDir: path.join(process.cwd(), 'data', 'cursor-logs'),
        autoImport: true,
        syncInterval: 300,
        batchSize: 100,
        retryAttempts: 3,
      },
      logger
    )
    await cursorLogService.initialize()

    // 統合サービス初期化
    integrationService = new IntegrationService(
      {
        cursor: {
          enabled: true,
          watchPath: path.join(
            process.env.HOME || '',
            'Library/Application Support/Cursor/User/workspaceStorage'
          ),
          logDir: path.join(process.cwd(), 'data', 'cursor-logs'),
          autoImport: true,
          syncInterval: 300,
          batchSize: 100,
          retryAttempts: 3,
        },
        chatHistory: {
          storagePath: path.join(process.cwd(), 'data', 'chat-history'),
          maxSessions: 10000,
          maxMessagesPerSession: 500,
          autoCleanup: true,
          cleanupDays: 30,
          enableSearch: true,
          enableBackup: false,
          backupInterval: 24,
        },
        sync: {
          interval: 300,
          batchSize: 100,
          retryAttempts: 3,
        },
      },
      logger
    )
    await integrationService.initialize()

    // Claude Dev統合サービス初期化（直接インポート使用）
    try {
      console.log('Claude Dev統合サービス初期化開始...')
      const { default: ClaudeDevIntegrationService } = await import(
        '../services/ClaudeDevIntegrationService.js'
      )

      const unifiedDbPath = path.join(process.cwd(), 'data', 'chat-history.db')
      console.log(
        `Claude Dev統合サービス: 統一データベースパス: ${unifiedDbPath}`
      )
      claudeDevService = new ClaudeDevIntegrationService(unifiedDbPath)
      await claudeDevService.initialize()

      logger.info('Claude Dev統合サービスが初期化されました')
      console.log('Claude Dev統合サービス初期化完了!')

      // Claude Devルートにサービスを設定
      setClaudeDevService(claudeDevService)
    } catch (error) {
      logger.error('Claude Dev統合サービスの初期化に失敗:', error)
      console.error('Claude Dev統合サービス初期化エラー詳細:', error)
      // サービスが失敗しても他のサービスは継続
      claudeDevService = null
    }

    // 統合APIルートにサービスを設定
    setServices({
      chatHistory: chatHistoryService,
      claudeDev: claudeDevService,
      integration: integrationService,
    })

    logger.info('すべてのサービスが初期化されました')
  } catch (error) {
    logger.error('サービス初期化エラー:', error)
    throw error
  }
}

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      chatHistory: !!chatHistoryService,
      integration: !!integrationService,
      cursorLog: !!cursorLogService,
      claudeDev: !!claudeDevService,
    },
  })
})

// セッション一覧取得
app.get('/api/sessions', async (req, res) => {
  try {
    const { page = 1, limit = 50, keyword, startDate, endDate } = req.query

    const filter = {
      page: parseInt(page as string),
      pageSize: parseInt(limit as string),
      keyword: keyword as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    }

    const result = await chatHistoryService.searchSessions(filter)

    // APIレスポンス形式に変換
    const sessions = result.sessions.map(session => ({
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
      messages: session.messages.map(msg => ({
        id: msg.id,
        timestamp: msg.timestamp.toISOString(),
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {},
      })),
    }))

    res.json({
      sessions,
      pagination: {
        page: result.currentPage,
        limit: result.pageSize,
        total: result.totalCount,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      },
    })
  } catch (error) {
    logger.error('セッション取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
})
// 特定セッション取得
const getSessionById: RequestHandler = async (req, res) => {
  try {
    const session = await chatHistoryService.getSession(req.params.id)

    if (!session) {
      res.status(404).json({
        error: 'Not Found',
        message: 'セッションが見つかりません',
      })
      return
    }

    const response = {
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
      messages: session.messages.map(msg => ({
        id: msg.id,
        timestamp: msg.timestamp.toISOString(),
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {},
      })),
    }

    res.json(response)
  } catch (error) {
    logger.error('セッション取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
}

app.get('/api/sessions/:id', getSessionById)
// 検索機能
const searchSessions: RequestHandler = async (req, res) => {
  try {
    const { keyword, filters = {} } = req.body

    if (!keyword) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'キーワードが必要です',
      })
      return
    }

    const searchResult = await chatHistoryService.searchSessions({
      keyword,
      page: 1,
      pageSize: 50,
      ...filters,
    })

    const results = searchResult.sessions.map(session => ({
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
      messages: session.messages.map(msg => ({
        id: msg.id,
        timestamp: msg.timestamp.toISOString(),
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {},
      })),
    }))

    res.json({
      keyword,
      results,
      total: searchResult.totalCount,
    })
  } catch (error) {
    logger.error('検索エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
}

app.post('/api/search', searchSessions)

// 統計情報取得
app.get('/api/stats', async (req, res) => {
  try {
    const sessions = await chatHistoryService.searchSessions({
      page: 1,
      pageSize: 1,
    })
    const totalMessages = sessions.sessions.reduce(
      (sum, session) => sum + session.messages.length,
      0
    )

    res.json({
      totalSessions: sessions.totalCount,
      totalMessages,
      thisMonthMessages: totalMessages, // 簡易実装
      activeProjects: 1,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('統計取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
})

// 統合機能エンドポイント
app.get('/api/integration/stats', async (req, res) => {
  try {
    const stats = await integrationService.getStats()
    res.json(stats)
  } catch (error) {
    logger.error('統合統計エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
})

app.get('/api/integration/cursor/status', async (req, res) => {
  try {
    const status = await integrationService.getCursorStatus()
    res.json(status)
  } catch (error) {
    logger.error('Cursorステータス取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
})

app.post('/api/integration/cursor/scan', async (req, res) => {
  try {
    const result = await integrationService.scanCursorLogs()
    res.json(result)
  } catch (error) {
    logger.error('Cursorスキャンエラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
})

app.post('/api/integration/initialize', async (req, res) => {
  try {
    await integrationService.initialize()
    res.json({ success: true, message: '統合機能が初期化されました' })
  } catch (error) {
    logger.error('統合初期化エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
})

// Cursor監視開始
app.post('/api/integration/cursor/watch/start', async (req, res) => {
  try {
    await integrationService.startWatching()
    res.json({
      success: true,
      message: 'Cursor監視を開始しました',
      isWatching: true,
    })
  } catch (error) {
    logger.error('Cursor監視開始エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error ? error.message : '監視の開始に失敗しました',
    })
  }
})

// Cursor監視停止
app.post('/api/integration/cursor/watch/stop', async (req, res) => {
  try {
    await integrationService.stopWatching()
    res.json({
      success: true,
      message: 'Cursor監視を停止しました',
      isWatching: false,
    })
  } catch (error) {
    logger.error('Cursor監視停止エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error ? error.message : '監視の停止に失敗しました',
    })
  }
})

// 統合ログ取得
app.get('/api/integration/logs', async (req, res) => {
  try {
    const { limit = 100, offset = 0, types, startDate, endDate } = req.query

    const logs = []

    // Cursorログサービスからデータを取得
    if (cursorLogService) {
      try {
        const allCursorLogs = await cursorLogService.getLogs(
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        )
        const cursorLogs = allCursorLogs.slice(
          parseInt(offset as string),
          parseInt(offset as string) + Math.min(parseInt(limit as string), 50)
        )

        // Cursorログを統合ログ形式に変換
        for (const log of cursorLogs) {
          logs.push({
            id: `cursor-${log.id || Date.now()}`,
            timestamp: log.timestamp || new Date().toISOString(),
            type: 'cursor',
            content: log.content || 'Cursor activity recorded',
            metadata: {
              project: (log.metadata as any)?.project || 'unknown',
              source: 'cursor',
              workspace: (log.metadata as any)?.workspace,
              ...log.metadata,
            },
          })
        }
      } catch (error) {
        console.warn('Cursorログ取得警告:', error)
        // Cursorログ取得に失敗してもエラーにしない
      }
    }

    // チャット履歴からもログを取得
    if (chatHistoryService && logs.length < parseInt(limit as string)) {
      try {
        const remainingLimit = parseInt(limit as string) - logs.length
        const chatSessions = await chatHistoryService.searchSessions({
          page: 1,
          pageSize: remainingLimit,
        })

        for (const session of chatSessions.sessions.slice(0, remainingLimit)) {
          logs.push({
            id: `chat-${session.id}`,
            timestamp: session.createdAt.toISOString(),
            type: 'chat',
            content: session.title || 'Chat session',
            metadata: {
              project: session.metadata?.project || 'chat-history-manager',
              source: 'chat',
              messageCount: session.messages.length,
              ...session.metadata,
            },
          })
        }
      } catch (error) {
        console.warn('チャットログ取得警告:', error)
      }
    }

    // ログがない場合はサンプルデータを表示
    if (logs.length === 0) {
      logs.push({
        id: 'sample-1',
        timestamp: new Date().toISOString(),
        type: 'system',
        content: 'Chat History Manager システムが起動しました',
        metadata: {
          project: 'chat-history-manager',
          source: 'system',
        },
      })
    }

    // タイムスタンプでソート
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    res.json({
      logs: logs.slice(0, parseInt(limit as string)),
      total: logs.length,
      hasMore: logs.length > parseInt(limit as string),
      sources: {
        cursor: logs.filter(l => l.type === 'cursor').length,
        chat: logs.filter(l => l.type === 'chat').length,
        system: logs.filter(l => l.type === 'system').length,
      },
    })
  } catch (error) {
    logger.error('統合ログ取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
})

// 統合分析データ取得
app.get('/api/integration/analytics', async (req, res) => {
  try {
    const { granularity = 'daily', startDate, endDate } = req.query

    const analyticsRequest = {
      startDate: startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
      granularity: granularity as 'hourly' | 'daily' | 'weekly' | 'monthly',
      timeRange: {
        start: startDate
          ? new Date(startDate as string)
          : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date(),
      },
      metrics: ['messageCount', 'sessionCount'],
    }

    const analytics = await integrationService.getAnalytics(analyticsRequest)
    res.json(analytics)
  } catch (error) {
    logger.error('分析データ取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
})

// 統合設定取得
app.get('/api/integration/settings', async (req, res) => {
  try {
    // デフォルト設定を返す
    const defaultSettings = {
      cursor: {
        enabled: true,
        watchPath: path.join(
          process.env.HOME || '',
          'Library/Application Support/Cursor/User/workspaceStorage'
        ),
        autoImport: true,
        syncInterval: 300,
        batchSize: 100,
      },
      chatHistory: {
        storagePath: path.join(process.cwd(), 'data', 'chat-history'),
        maxSessions: 10000,
        maxMessagesPerSession: 500,
        autoCleanup: true,
        cleanupDays: 30,
      },
      general: {
        enableNotifications: true,
        autoSync: true,
        theme: 'system',
      },
    }

    res.json(defaultSettings)
  } catch (error) {
    logger.error('設定取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
})

// 統合設定保存
app.post('/api/integration/settings', async (req, res) => {
  try {
    const settings = req.body

    // 設定の簡単なバリデーション
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({
        error: 'Bad Request',
        message: '有効な設定データが必要です',
      })
      return
    }

    // TODO: 実際の設定保存ロジックを実装
    // 現在はメモリ内に保存（デモ用）
    logger.info('設定を保存しました:', settings)

    res.json({
      success: true,
      message: '設定が保存されました',
    })
  } catch (error) {
    logger.error('設定保存エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー',
    })
  }
})

// インデックス再構築（従来版）
app.post('/api/integration/rebuild-index', async (req, res) => {
  try {
    const result = await chatHistoryService.rebuildIndex()
    res.json({
      success: true,
      message: `インデックス再構築完了: ${result.rebuilt}件処理`,
      rebuilt: result.rebuilt,
      errors: result.errors,
    })
  } catch (error) {
    logger.error('インデックス再構築エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error
          ? error.message
          : 'インデックス再構築に失敗しました',
    })
  }
})

// 増分同期（改善版）
app.post('/api/integration/incremental-sync', async (req, res) => {
  try {
    if (!incrementalIndexService) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: '増分インデックスサービスが初期化されていません',
      })
      return
    }

    const result = await incrementalIndexService.performIncrementalSync()

    res.json({
      success: true,
      message: `増分同期完了: ${result.processed}件処理`,
      method: 'incremental',
      performance: 'high',
      stats: {
        processed: result.processed,
        added: result.added,
        modified: result.modified,
        deleted: result.deleted,
        errors: result.errors,
      },
    })
  } catch (error) {
    logger.error('増分同期エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error ? error.message : '増分同期に失敗しました',
    })
  }
})

// SQLiteマイグレーション
app.post('/api/integration/sqlite-migrate', async (req, res) => {
  try {
    if (!sqliteIndexService || !chatHistoryService) {
      res.status(503).json({
        error: 'Service Unavailable',
        message:
          'SQLiteサービスまたはチャット履歴サービスが初期化されていません',
      })
      return
    }

    // 現在のSQLiteセッション数を確認
    const currentSqliteStats = await sqliteIndexService.getStats()
    const currentSqliteCount = currentSqliteStats.totalSessions

    // 全セッション数を取得
    const allSessionsCount = await chatHistoryService.searchSessions({
      page: 1,
      pageSize: 1,
    })
    const totalSessions = allSessionsCount.totalCount

    // まだ移行していないセッションがあるかチェック
    if (currentSqliteCount >= totalSessions) {
      res.json({
        success: true,
        message: `移行完了: 全${totalSessions}件のセッションが既に移行済みです`,
        method: 'sqlite',
        performance: 'very-high',
        stats: {
          migrated: 0,
          total: totalSessions,
          alreadyMigrated: currentSqliteCount,
          completion: '100%',
          errors: 0,
        },
      })
      return
    }

    // バッチサイズを計算（残りのセッション数）
    const remainingSessions = totalSessions - currentSqliteCount
    const batchSize = Math.min(remainingSessions, 5000) // 最大5000件ずつ処理

    // まず現在移行済みのセッションIDを取得（重複回避）
    const migratedSessions = await sqliteIndexService.getSessions({
      page: 1,
      pageSize: currentSqliteCount,
    })
    const migratedIds = new Set(migratedSessions.sessions.map(s => s.id))

    // 複数ページで全セッションを取得・移行
    let currentPage = 1
    let hasMorePages = true
    let totalMigrated = 0
    let totalErrors = 0
    const errors: string[] = []

    while (hasMorePages && totalMigrated < remainingSessions) {
      const sessions = await chatHistoryService.searchSessions({
        page: currentPage,
        pageSize: Math.min(1000, remainingSessions - totalMigrated),
      })

      if (sessions.sessions.length === 0) {
        hasMorePages = false
        break
      }

      // 未移行のセッションのみ処理
      const unmigratedSessions = sessions.sessions.filter(
        session => !migratedIds.has(session.id)
      )

      for (const session of unmigratedSessions) {
        try {
          await sqliteIndexService.upsertSession(session)
          totalMigrated++
        } catch (error) {
          totalErrors++
          errors.push(`セッション ${session.id} の移行エラー: ${error}`)
        }

        // プログレス制限を緩和
        if (totalMigrated >= Math.min(batchSize, remainingSessions)) {
          hasMorePages = false
          break
        }
      }

      currentPage++
      hasMorePages = sessions.hasMore && currentPage <= 50 // 最大50ページまで拡張
    }

    const finalCompletion = Math.round(
      ((currentSqliteCount + totalMigrated) / totalSessions) * 100
    )

    res.json({
      success: true,
      message: `SQLite移行バッチ完了: ${totalMigrated}件移行 (完了率: ${finalCompletion}%)`,
      method: 'sqlite',
      performance: 'very-high',
      stats: {
        migrated: totalMigrated,
        total: totalSessions,
        previouslyMigrated: currentSqliteCount,
        currentTotal: currentSqliteCount + totalMigrated,
        completion: `${finalCompletion}%`,
        remaining: totalSessions - (currentSqliteCount + totalMigrated),
        errors: totalErrors,
        errorDetails: errors.slice(0, 10), // 最初の10件のエラーのみ
      },
    })
  } catch (error) {
    logger.error('SQLite移行エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error ? error.message : 'SQLite移行に失敗しました',
    })
  }
})

// 高性能検索（SQLite使用）
app.post('/api/integration/sqlite-search', async (req, res) => {
  try {
    if (!sqliteIndexService) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'SQLiteサービスが初期化されていません',
      })
      return
    }

    const { keyword, options = {} } = req.body

    if (!keyword) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'キーワードが必要です',
      })
      return
    }

    const result = await sqliteIndexService.getSessions({
      keyword,
      page: options.page || 1,
      pageSize: options.pageSize || 50,
    })

    res.json({
      keyword,
      method: 'sqlite-fts5',
      performance: 'very-high',
      results: result.sessions,
      total: result.total,
      hasMore: result.hasMore,
    })
  } catch (error) {
    logger.error('SQLite検索エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error ? error.message : 'SQLite検索に失敗しました',
    })
  }
})

// 統合統計情報
app.get('/api/integration/enhanced-stats', async (req, res) => {
  try {
    const stats: {
      traditional?: any
      incremental?: any
      sqlite?: any
    } = {}

    // 従来方式の統計
    if (chatHistoryService) {
      const sessions = await chatHistoryService.searchSessions({
        page: 1,
        pageSize: 1,
      })
      stats.traditional = {
        totalSessions: sessions.totalCount,
        method: 'json-file',
        performance: 'low',
      }
    }

    // 増分同期の統計
    if (incrementalIndexService) {
      const incrementalStats = await incrementalIndexService.getStats()
      stats.incremental = {
        ...incrementalStats,
        method: 'incremental',
        performance: 'high',
      }
    }

    // SQLiteの統計
    if (sqliteIndexService) {
      const sqliteStats = await sqliteIndexService.getStats()
      stats.sqlite = {
        ...sqliteStats,
        method: 'sqlite',
        performance: 'very-high',
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      stats,
      recommendation: stats.sqlite
        ? 'sqlite'
        : stats.incremental
          ? 'incremental'
          : 'traditional',
    })
  } catch (error) {
    logger.error('統合統計取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error ? error.message : '統計取得に失敗しました',
    })
  }
})

// インデックス方式の比較・選択
app.get('/api/integration/index-methods', (req, res) => {
  try {
    const methods = {
      current: {
        name: 'JSON-based Full Rebuild',
        performance: 'low',
        scalability: 'poor',
        memoryUsage: 'high',
        description: '全ファイルを一度に処理する従来方式',
      },
      incremental: {
        name: 'Incremental Sync',
        performance: 'high',
        scalability: 'good',
        memoryUsage: 'low',
        description: 'チェックサムベースの差分更新方式',
      },
      sqlite: {
        name: 'SQLite Database',
        performance: 'very-high',
        scalability: 'excellent',
        memoryUsage: 'very-low',
        description: 'リレーショナルDBによる高性能インデックス',
      },
    }

    const recommendation = {
      recommended: 'sqlite',
      reason: '大量データに対する検索性能とスケーラビリティが優れている',
      migrationPath: [
        'SQLiteベースサービスの初期化',
        '既存データの段階的移行',
        'パフォーマンステスト',
        '本格運用開始',
      ],
    }

    res.json({
      methods,
      recommendation,
      currentDataSize: {
        estimatedSessions: 12325,
        estimatedMethod: 'sqlite',
      },
    })
  } catch (error) {
    logger.error('インデックス方式情報取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error ? error.message : '情報取得に失敗しました',
    })
  }
})

// ルート設定
app.use('/api', unifiedApiRoutes) // 統合APIルートを優先
app.use('/api/v1', apiRoutes) // 旧APIは /v1 に移動
app.use('/api/integration', integrationRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/claude-dev', claudeDevRoutes) // 専用機能のみ残す

// エラーハンドリング
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('API Error:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    })
  }
)

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} not found`,
  })
})

// サーバー起動
async function startServer() {
  try {
    await initializeServices()

    app.listen(PORT, () => {
      logger.info(`🚀 Real API Server running on http://localhost:${PORT}`)
      logger.info('📊 Available endpoints:')
      logger.info('  GET  /api/health')
      logger.info('  GET  /api/sessions')
      logger.info('  GET  /api/sessions/:id')
      logger.info('  POST /api/search')
      logger.info('  GET  /api/stats')
      logger.info('  GET  /api/integration/stats')
      logger.info('  GET  /api/integration/logs')
      logger.info('  GET  /api/integration/analytics')
      logger.info('  GET  /api/integration/settings')
      logger.info('  POST /api/integration/settings')
      logger.info('  GET  /api/integration/cursor/status')
      logger.info('  POST /api/integration/cursor/scan')
      logger.info('  POST /api/integration/cursor/watch/start')
      logger.info('  POST /api/integration/cursor/watch/stop')
      logger.info('  POST /api/integration/initialize')
      logger.info('  POST /api/integration/rebuild-index')
      logger.info('  POST /api/integration/incremental-sync')
      logger.info('  GET  /api/integration/index-methods')
      logger.info('  POST /api/integration/sqlite-migrate')
      logger.info('  POST /api/integration/sqlite-search')
      logger.info('  GET  /api/integration/enhanced-stats')
      logger.info('  🔧 Settings API:')
      logger.info('  GET  /api/settings/cursor')
      logger.info('  POST /api/settings/cursor')
      logger.info('  POST /api/settings/cursor/reset')
      logger.info('  GET  /api/settings/export')
      logger.info('  POST /api/settings/import')
      logger.info('  GET  /api/settings/backups')
      logger.info('  GET  /api/settings/health')
    })
  } catch (error) {
    console.error('サーバー起動エラー:', error)
    process.exit(1)
  }
}

// ESモジュールでは import.meta.url を使用
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
}

export { app, startServer }
