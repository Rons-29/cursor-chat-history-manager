import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'

const app = express()
const PORT = process.env.PORT || 3001

// セキュリティとパフォーマンスのミドルウェア
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite開発サーバーとの互換性のため
  })
)
app.use(compression())
app.use(morgan('combined'))

// CORS設定
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : 'http://localhost:3000',
    credentials: true,
  })
)

// JSONパーサー
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// 基本的なAPIエンドポイント（仮実装）
app.get('/api/sessions', (req, res) => {
  res.json({
    sessions: [
      {
        id: '1',
        title: 'サンプルセッション',
        startTime: new Date().toISOString(),
        metadata: { totalMessages: 5, tags: ['開発'] },
        messages: [],
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    },
  })
})

app.get('/api/stats', (req, res) => {
  res.json({
    totalSessions: 1,
    totalMessages: 5,
    thisMonthMessages: 5,
    activeProjects: 1,
    lastUpdated: new Date().toISOString(),
  })
})

app.post('/api/search', (req, res) => {
  res.json({
    keyword: req.body.keyword || '',
    results: [],
    total: 0,
  })
})

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
  })
})

// グローバルエラーハンドラー
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Server error:', err)
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Something went wrong',
    })
  }
)

// サーバー起動
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 サーバーがポート ${PORT} で起動しました`)
    console.log(`📋 ヘルスチェック: http://localhost:${PORT}/health`)
    console.log(`🌐 API エンドポイント: http://localhost:${PORT}/api`)
  })
}

export default app
