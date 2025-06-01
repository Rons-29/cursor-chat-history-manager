/**
 * 簡単なAPIサーバー - WebUIテスト用
 */

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 3001

// ミドルウェア
app.use(cors())
app.use(express.json())

// モックデータ
const mockStats = {
  totalSessions: 1234,
  totalMessages: 5678,
  cursorSessions: 456,
  cursorMessages: 1890,
  regularSessions: 778,
  regularMessages: 3788,
  lastSync: new Date().toISOString(),
  isWatching: false
}

const mockCursorStatus = {
  isWatching: false,
  cursorPath: '/Users/shirokki22/Library/Application Support/Cursor/User/workspaceStorage',
  lastScan: new Date().toISOString(),
  sessionsFound: 456,
  error: null
}

// API エンドポイント
app.get('/api/integration/stats', (req, res) => {
  console.log('GET /api/integration/stats')
  res.json(mockStats)
})

app.get('/api/integration/cursor/status', (req, res) => {
  console.log('GET /api/integration/cursor/status')
  res.json(mockCursorStatus)
})

app.post('/api/integration/cursor/scan', (req, res) => {
  console.log('POST /api/integration/cursor/scan')
  
  // スキャン結果をシミュレート
  const result = {
    success: true,
    sessionsFound: Math.floor(Math.random() * 10) + 1,
    messagesImported: Math.floor(Math.random() * 50) + 10,
    duration: Math.floor(Math.random() * 3000) + 1000
  }
  
  // 統計を更新
  mockStats.cursorSessions += result.sessionsFound
  mockStats.cursorMessages += result.messagesImported
  mockStats.totalSessions += result.sessionsFound
  mockStats.totalMessages += result.messagesImported
  mockStats.lastSync = new Date().toISOString()
  
  // ステータスを更新
  mockCursorStatus.lastScan = new Date().toISOString()
  mockCursorStatus.sessionsFound = mockStats.cursorSessions
  
  res.json(result)
})

app.post('/api/integration/initialize', (req, res) => {
  console.log('POST /api/integration/initialize')
  
  // 初期化をシミュレート
  mockCursorStatus.isWatching = true
  mockStats.isWatching = true
  
  res.json({ success: true, message: '初期化が完了しました' })
})

app.post('/api/integration/cursor/watch/start', (req, res) => {
  console.log('POST /api/integration/cursor/watch/start')
  
  mockCursorStatus.isWatching = true
  mockStats.isWatching = true
  
  res.json({ success: true, message: '監視を開始しました' })
})

app.post('/api/integration/cursor/watch/stop', (req, res) => {
  console.log('POST /api/integration/cursor/watch/stop')
  
  mockCursorStatus.isWatching = false
  mockStats.isWatching = false
  
  res.json({ success: true, message: '監視を停止しました' })
})

// 基本的なエンドポイント（他のページで使用）
app.get('/api/health', (req, res) => {
  console.log('GET /api/health')
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/sessions', (req, res) => {
  console.log('GET /api/sessions')
  
  const mockSessions = [
    {
      id: '1',
      title: 'Cursor統合テスト',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      metadata: {
        totalMessages: 15,
        tags: ['test', 'integration'],
        description: 'Cursor統合機能のテスト',
        source: 'cursor'
      },
      messages: [
        {
          id: 'msg-1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          role: 'user',
          content: 'Cursor統合機能をテストしています',
          metadata: { sessionId: '1' }
        },
        {
          id: 'msg-2',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
          role: 'assistant',
          content: 'Cursor統合機能のテストを開始します。まず、ログファイルの監視を設定しましょう。',
          metadata: { sessionId: '1' }
        }
      ]
    },
    {
      id: '2',
      title: 'WebUI開発',
      startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      metadata: {
        totalMessages: 23,
        tags: ['webui', 'react'],
        description: 'React WebUIの開発',
        source: 'cursor'
      },
      messages: [
        {
          id: 'msg-3',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          role: 'user',
          content: 'React TypeScriptでWebUIを実装したいです',
          metadata: { sessionId: '2' }
        },
        {
          id: 'msg-4',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000 + 30000).toISOString(),
          role: 'assistant',
          content: 'React TypeScriptでWebUIを実装しましょう。まず、コンポーネント構造を設計します。',
          metadata: { sessionId: '2' }
        }
      ]
    }
  ]
  
  // ApiSessionsResponse形式で返す
  const response = {
    sessions: mockSessions,
    pagination: {
      page: 1,
      limit: 50,
      total: mockSessions.length,
      totalPages: 1,
      hasMore: false
    }
  }
  
  res.json(response)
})

app.get('/api/sessions/:id', (req, res) => {
  console.log(`GET /api/sessions/${req.params.id}`)
  
  const mockSession = {
    id: req.params.id,
    title: 'サンプルセッション',
    startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    endTime: new Date().toISOString(),
    metadata: {
      totalMessages: 15,
      tags: ['test'],
      description: 'サンプルセッション',
      source: 'cursor'
    },
    messages: [
      {
        id: '1',
        role: 'user',
        content: 'こんにちは',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        metadata: { sessionId: req.params.id }
      },
      {
        id: '2',
        role: 'assistant',
        content: 'こんにちは！何かお手伝いできることはありますか？',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000 + 30000).toISOString(),
        metadata: { sessionId: req.params.id }
      }
    ]
  }
  
  res.json(mockSession)
})

app.post('/api/search', (req, res) => {
  console.log('POST /api/search', req.body)
  
  const { keyword, filters = {} } = req.body
  
  const mockResults = [
    {
      id: '1',
      title: 'Cursor統合テスト',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      metadata: {
        totalMessages: 15,
        tags: ['test', 'integration'],
        description: 'Cursor統合機能のテスト',
        source: 'cursor'
      },
      messages: [
        {
          id: 'msg-1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          role: 'user',
          content: `Cursor統合機能をテストしています。キーワード: ${keyword}`,
          metadata: { sessionId: '1' }
        }
      ]
    }
  ]
  
  const response = {
    keyword,
    results: mockResults,
    total: mockResults.length
  }
  
  res.json(response)
})

app.get('/api/integration/logs', (req, res) => {
  console.log('GET /api/integration/logs')
  
  const mockLogs = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Cursorスキャンが完了しました',
      details: { sessionsFound: 5, messagesImported: 25 },
      source: 'cursor'
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'success',
      message: '統合機能が初期化されました',
      details: { watchPath: mockCursorStatus.cursorPath },
      source: 'integration'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      level: 'warn',
      message: '一部のセッションでメタデータが不完全です',
      details: { affectedSessions: 3 },
      source: 'cursor'
    }
  ]
  
  res.json(mockLogs)
})

// 設定関連のエンドポイント
let mockSettings = {
  cursor: {
    enabled: true,
    watchPath: '/Users/shirokki22/Library/Application Support/Cursor/User/workspaceStorage',
    autoImport: true,
    scanInterval: 300,
    maxSessions: 1000,
    includeMetadata: true
  },
  sync: {
    enabled: true,
    interval: 300,
    batchSize: 100,
    retryAttempts: 3
  },
  security: {
    maskSensitiveData: true,
    allowedProjects: ['chat-history-manager'],
    excludePatterns: ['*.secret', '*password*']
  },
  backup: {
    enabled: true,
    frequency: 'daily',
    retention: 30,
    location: '/Users/shirokki22/.chat-history/backups'
  }
}

app.get('/api/integration/settings', (req, res) => {
  console.log('GET /api/integration/settings')
  res.json(mockSettings)
})

app.post('/api/integration/settings', (req, res) => {
  console.log('POST /api/integration/settings', req.body)
  
  // 設定を更新
  mockSettings = { ...mockSettings, ...req.body }
  
  res.json({ success: true, message: '設定が保存されました' })
})

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('API Error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  })
})

// 404ハンドリング
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`)
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} not found`
  })
})

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`)
  console.log('📊 Available endpoints:')
  console.log('  GET  /api/health')
  console.log('  GET  /api/sessions')
  console.log('  GET  /api/sessions/:id')
  console.log('  POST /api/search')
  console.log('  GET  /api/integration/stats')
  console.log('  GET  /api/integration/cursor/status')
  console.log('  POST /api/integration/cursor/scan')
  console.log('  POST /api/integration/initialize')
  console.log('  POST /api/integration/cursor/watch/start')
  console.log('  POST /api/integration/cursor/watch/stop')
  console.log('  GET  /api/integration/logs')
  console.log('  GET  /api/integration/settings')
  console.log('  POST /api/integration/settings')
}) 