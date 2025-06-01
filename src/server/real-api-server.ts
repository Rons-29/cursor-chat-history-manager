import express from 'express'
import cors from 'cors'
import path from 'path'
import type { RequestHandler } from 'express'
import { ChatHistoryService } from '../services/ChatHistoryService.js'
import { IntegrationService } from '../services/IntegrationService.js'
import { CursorLogService } from '../services/CursorLogService.js'
import { ConfigService } from '../services/ConfigService.js'
import { Logger } from './utils/Logger.js'

const app = express()
const PORT = process.env.PORT || 3001

// ミドルウェア
app.use(cors())
app.use(express.json())

// サービス初期化
let chatHistoryService: ChatHistoryService
let integrationService: IntegrationService
let cursorLogService: CursorLogService
let configService: ConfigService
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
        idleTimeout: 30
      }
    })
    await chatHistoryService.initialize()
    
    // Cursorログサービス初期化
    cursorLogService = new CursorLogService({
      enabled: true,
      watchPath: path.join(process.env.HOME || '', 'Library/Application Support/Cursor/User/workspaceStorage'),
      logDir: path.join(process.cwd(), 'data', 'cursor-logs'),
      autoImport: true,
      syncInterval: 300,
      batchSize: 100,
      retryAttempts: 3
    }, logger)
    await cursorLogService.initialize()
    
    // 統合サービス初期化
    integrationService = new IntegrationService({
      cursor: {
        enabled: true,
        watchPath: path.join(process.env.HOME || '', 'Library/Application Support/Cursor/User/workspaceStorage'),
        logDir: path.join(process.cwd(), 'data', 'cursor-logs'),
        autoImport: true,
        syncInterval: 300,
        batchSize: 100,
        retryAttempts: 3
      },
      chatHistory: {
        storagePath: path.join(process.cwd(), 'data', 'chat-history'),
        maxSessions: 10000,
        maxMessagesPerSession: 500,
        autoCleanup: true,
        cleanupDays: 30,
        enableSearch: true,
        enableBackup: false,
        backupInterval: 24
      },
      sync: {
        interval: 300,
        batchSize: 100,
        retryAttempts: 3
      }
    }, logger)
    await integrationService.initialize()
    
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
      cursorLog: !!cursorLogService
    }
  })
})

// セッション一覧取得
app.get('/api/sessions', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      keyword,
      startDate,
      endDate
    } = req.query

    const filter = {
      page: parseInt(page as string),
      pageSize: parseInt(limit as string),
      keyword: keyword as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
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
        source: session.metadata?.source || 'chat'
      },
      messages: session.messages.map(msg => ({
        id: msg.id,
        timestamp: msg.timestamp.toISOString(),
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {}
      }))
    }))

    res.json({
      sessions,
      pagination: {
        page: result.currentPage,
        limit: result.pageSize,
        total: result.totalCount,
        totalPages: result.totalPages,
        hasMore: result.hasMore
      }
    })
  } catch (error) {
    logger.error('セッション取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー'
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
        message: 'セッションが見つかりません'
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
        source: session.metadata?.source || 'chat'
      },
      messages: session.messages.map(msg => ({
        id: msg.id,
        timestamp: msg.timestamp.toISOString(),
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {}
      }))
    }

    res.json(response)
  } catch (error) {
    logger.error('セッション取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー'
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
        message: 'キーワードが必要です'
      })
      return
    }

    const searchResult = await chatHistoryService.searchSessions({
      keyword,
      page: 1,
      pageSize: 50,
      ...filters
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
        source: session.metadata?.source || 'chat'
      },
      messages: session.messages.map(msg => ({
        id: msg.id,
        timestamp: msg.timestamp.toISOString(),
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {}
      }))
    }))

    res.json({
      keyword,
      results,
      total: searchResult.totalCount
    })
  } catch (error) {
    logger.error('検索エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー'
    })
  }
}

app.post('/api/search', searchSessions)

// 統計情報取得
app.get('/api/stats', async (req, res) => {
  try {
    const sessions = await chatHistoryService.searchSessions({ page: 1, pageSize: 1 })
    const totalMessages = sessions.sessions.reduce((sum, session) => sum + session.messages.length, 0)
    
    res.json({
      totalSessions: sessions.totalCount,
      totalMessages,
      thisMonthMessages: totalMessages, // 簡易実装
      activeProjects: 1,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    logger.error('統計取得エラー:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : '不明なエラー'
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
      message: error instanceof Error ? error.message : '不明なエラー'
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
      message: error instanceof Error ? error.message : '不明なエラー'
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
      message: error instanceof Error ? error.message : '不明なエラー'
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
      message: error instanceof Error ? error.message : '不明なエラー'
    })
  }
})

// エラーハンドリング
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('API Error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  })
})

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} not found`
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
      logger.info('  GET  /api/integration/cursor/status')
      logger.info('  POST /api/integration/cursor/scan')
      logger.info('  POST /api/integration/initialize')
    })
  } catch (error) {
    console.error('サーバー起動エラー:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  startServer()
}

export { app, startServer } 