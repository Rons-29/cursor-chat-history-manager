import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { 
  initializeRealDataMiddleware,
  realDataMiddleware,
  healthHandler,
  getSessionsHandler,
  getSessionHandler,
  getStatsHandler,
  searchHandler
} from './middleware/real-data-middleware.js'

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

// 実データMiddleware適用
app.use(realDataMiddleware)

// ヘルスチェックエンドポイント
app.get('/health', healthHandler)

// セッション一覧取得API
app.get('/api/sessions', getSessionsHandler)

// 特定セッション取得API
app.get('/api/sessions/:id', getSessionHandler)

// 統計情報取得API
app.get('/api/stats', getStatsHandler)

// 検索API
app.post('/api/search', searchHandler)

// 404ハンドラー
app.use((req, res, next) => {
  if (!res.headersSent) {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    })
  }
})

// グローバルエラーハンドラー
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  })
})

// サーバー起動
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`🚀 APIサーバーがポート ${PORT} で起動しました`)
    console.log(`📋 ヘルスチェック: http://localhost:${PORT}/health`)
    console.log(`🌐 API エンドポイント: http://localhost:${PORT}/api`)
    console.log(`🔄 Middleware方式: 実データ統合 + Express型安全性確保`)
    
    // 実データサービス初期化（非ブロッキング）
    initializeRealDataMiddleware()
  })
}

export default app
