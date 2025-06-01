const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// 簡易テストサーバー
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/sessions', (req, res) => {
  res.json({
    sessions: [
      {
        id: '1',
        title: '実データ統合テストセッション',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        metadata: {
          totalMessages: 2,
          tags: ['test', 'real-data'],
          description: '実データ統合のテストセッション',
          source: 'test'
        },
        messages: [
          {
            id: 'msg1',
            timestamp: new Date().toISOString(),
            role: 'user',
            content: '実データ統合のテストです',
            metadata: {}
          },
          {
            id: 'msg2',
            timestamp: new Date().toISOString(),
            role: 'assistant',
            content: '実データ統合が正常に動作しています！',
            metadata: {}
          }
        ]
      }
    ],
    pagination: {
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
      hasMore: false
    }
  });
});

app.get('/api/sessions/:id', (req, res) => {
  res.json({
    id: req.params.id,
    title: '実データ統合テストセッション',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    metadata: {
      totalMessages: 2,
      tags: ['test', 'real-data'],
      description: '実データ統合のテストセッション',
      source: 'test'
    },
    messages: [
      {
        id: 'msg1',
        timestamp: new Date().toISOString(),
        role: 'user',
        content: '実データ統合のテストです',
        metadata: {}
      },
      {
        id: 'msg2',
        timestamp: new Date().toISOString(),
        role: 'assistant',
        content: '実データ統合が正常に動作しています！',
        metadata: {}
      }
    ]
  });
});

app.post('/api/search', (req, res) => {
  const { keyword } = req.body;
  res.json({
    keyword,
    results: [
      {
        id: '1',
        title: '実データ統合テストセッション',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        metadata: {
          totalMessages: 2,
          tags: ['test', 'real-data'],
          description: '実データ統合のテストセッション',
          source: 'test'
        },
        messages: [
          {
            id: 'msg1',
            timestamp: new Date().toISOString(),
            role: 'user',
            content: '実データ統合のテストです',
            metadata: {}
          }
        ]
      }
    ],
    total: 1
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalSessions: 1,
    totalMessages: 2,
    thisMonthMessages: 2,
    activeProjects: 1,
    lastUpdated: new Date().toISOString()
  });
});

// 統合機能エンドポイント
app.get('/api/integration/stats', (req, res) => {
  res.json({
    totalSessions: 1,
    totalMessages: 2,
    cursorSessions: 0,
    lastSync: new Date().toISOString(),
    syncStatus: 'active'
  });
});

app.get('/api/integration/cursor/status', (req, res) => {
  res.json({
    enabled: true,
    connected: false,
    lastScan: new Date().toISOString(),
    workspacesFound: 0,
    sessionsImported: 0
  });
});

app.post('/api/integration/cursor/scan', (req, res) => {
  res.json({
    success: true,
    sessionsFound: 0,
    messagesImported: 0,
    duration: 100,
    message: 'Cursorワークスペースのスキャンが完了しました'
  });
});

app.post('/api/integration/initialize', (req, res) => {
  res.json({
    success: true,
    message: '統合機能が初期化されました'
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('🚀 簡易実データAPIサーバーが起動しました');
  console.log('📊 http://localhost:3001');
  console.log('✅ エンドポイント:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/sessions');
  console.log('  GET  /api/sessions/:id');
  console.log('  POST /api/search');
  console.log('  GET  /api/stats');
  console.log('  GET  /api/integration/stats');
  console.log('  GET  /api/integration/cursor/status');
  console.log('  POST /api/integration/cursor/scan');
  console.log('  POST /api/integration/initialize');
  console.log('');
  console.log('🌐 WebUIは http://localhost:5173 でアクセス可能です');
}); 