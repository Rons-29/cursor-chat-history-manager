# 🎨 フロントエンド開発統合ガイド

**更新日**: 2025年6月2日  
**対象**: Chat History Manager フロントエンド開発者  
**前提**: 統合APIルート (unified-api.ts) 完成済み

---

## 🎯 統合原則

### 🔄 統合APIルート優先原則
```typescript
// ❌ 避けるべき: 個別APIエンドポイント
fetch('/api/claude-dev/sessions')
fetch('/api/cursor/sessions')

// ✅ 推奨: 統合APIルート + sourceパラメータ
fetch('/api/sessions?source=claude-dev')
fetch('/api/sessions?source=cursor')
```

### 📊 ソース分岐処理パターン
```typescript
// 全ソース統合検索
const allSessions = await apiClient.getSessions()

// Claude DEV専用データ
const claudeDevSessions = await apiClient.getSessions({ source: 'claude-dev' })

// Cursor専用データ  
const cursorSessions = await apiClient.getSessions({ source: 'cursor' })

// チャット履歴専用データ
const chatSessions = await apiClient.getSessions({ source: 'chat' })
```

---

## 🛠️ APIクライアント活用パターン

### 🔧 基本APIクライアント使用法

```typescript
import { apiClient, queryKeys } from '../api/client.js'
import { useQuery, useMutation } from '@tanstack/react-query'

// 統合セッション取得（全ソース）
const { data: allSessions } = useQuery({
  queryKey: queryKeys.sessions(),
  queryFn: () => apiClient.getSessions()
})

// ソース指定セッション取得
const { data: claudeDevSessions } = useQuery({
  queryKey: queryKeys.sessions({ source: 'claude-dev' }),
  queryFn: () => apiClient.getSessions({ source: 'claude-dev' })
})

// 統合統計情報取得
const { data: stats } = useQuery({
  queryKey: queryKeys.stats(),
  queryFn: () => apiClient.getStats()
})
```

### 🔍 検索機能の統合パターン

```typescript
// 統合検索（全ソース横断）
const searchAllSources = async (keyword: string) => {
  return await apiClient.search(keyword, {})
}

// ソース限定検索
const searchClaudeDevOnly = async (keyword: string) => {
  return await apiClient.search(keyword, { source: 'claude-dev' })
}

// 複数ソース指定検索
const searchMultipleSources = async (keyword: string) => {
  return await apiClient.search(keyword, { 
    source: ['claude-dev', 'cursor'] 
  })
}
```

---

## 🎨 コンポーネント設計パターン

### 📱 統合対応コンポーネント例

```typescript
// SessionList.tsx - 統合セッション一覧
interface SessionListProps {
  source?: 'all' | 'claude-dev' | 'cursor' | 'chat'
  limit?: number
  searchKeyword?: string
}

const SessionList: React.FC<SessionListProps> = ({ 
  source = 'all', 
  limit = 50, 
  searchKeyword 
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.sessions({ 
      source: source === 'all' ? undefined : source,
      limit,
      keyword: searchKeyword
    }),
    queryFn: () => apiClient.getSessions({
      source: source === 'all' ? undefined : source,
      limit,
      keyword: searchKeyword
    })
  })

  // ソース別アイコン表示
  const getSourceIcon = (sessionSource: string) => {
    switch (sessionSource) {
      case 'claude-dev': return <ClaudeDevIcon />
      case 'cursor': return <CursorIcon />
      case 'chat': return <ChatIcon />
      default: return <DefaultIcon />
    }
  }

  return (
    <div className="session-list">
      {data?.sessions.map(session => (
        <SessionCard 
          key={session.id}
          session={session}
          sourceIcon={getSourceIcon(session.metadata.source)}
        />
      ))}
    </div>
  )
}
```

### 📊 統計ダッシュボード統合

```typescript
// StatsPanel.tsx - 統合統計パネル
const StatsPanel: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: queryKeys.stats(),
    queryFn: () => apiClient.getStats()
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 全体統計 */}
      <StatCard 
        title="総セッション数"
        value={stats?.overall?.totalSessions}
        icon={<DocumentTextIcon />}
      />
      
      {/* Claude DEV統計 */}
      <StatCard 
        title="Claude DEVタスク"
        value={stats?.services?.claudeDev?.stats?.totalTasks}
        icon={<ClaudeDevIcon />}
      />
      
      {/* Cursor統計 */}
      <StatCard 
        title="Cursorセッション"
        value={stats?.services?.integration?.cursorSessions}
        icon={<CursorIcon />}
      />
    </div>
  )
}
```

---

## 🔍 新機能開発時の統合原則

### 🆕 新APIエンドポイント開発チェックリスト

```bash
# 🔍 開発前必須チェック
1. ✅ 既存の統合APIで実現可能か？
   - GET /api/sessions?source=X で対応可能か
   - GET /api/stats の拡張で対応可能か
   - POST /api/search のフィルター追加で対応可能か

2. ✅ 新エンドポイントが本当に必要か？
   - 既存エンドポイントの拡張では不可能か
   - パラメータ追加では対応不可能か
   - レスポンス形式の変更では対応不可能か

3. ✅ 統合原則に準拠しているか？
   - sourceパラメータによる分岐処理
   - 統一レスポンス形式の維持
   - エラーハンドリングの一貫性
```

### 🛡️ 開発フロー（統合原則準拠）

```typescript
// Step 1: 既存API確認
const checkExistingAPI = async () => {
  // 統合APIルートで対応可能かテスト
  const sessions = await apiClient.getSessions({ 
    source: 'new-feature',
    customParam: 'value'
  })
}

// Step 2: 新機能実装（統合パターン使用）
const NewFeatureComponent: React.FC = () => {
  const { data } = useQuery({
    queryKey: queryKeys.sessions({ source: 'new-feature' }),
    queryFn: () => apiClient.getSessions({ source: 'new-feature' })
  })
  
  return <FeatureUI data={data} />
}

// Step 3: 型安全性確保
interface NewFeatureSession extends ApiSession {
  metadata: ApiSession['metadata'] & {
    newFeatureSpecificData?: string
    customMetadata?: any
  }
}
```

---

## 🔄 Integration API活用パターン

### 📡 Integration APIクライアント使用

```typescript
import * as integrationClient from '../api/integration.js'

// 統合統計情報取得
const useIntegrationStats = () => {
  return useQuery({
    queryKey: queryKeys.integrationStats(),
    queryFn: () => integrationClient.getIntegrationStats(),
    refetchInterval: 30000 // 30秒ごと更新
  })
}

// Cursor専用セッション取得
const useCursorSessions = (limit = 20) => {
  return useQuery({
    queryKey: ['cursor-sessions', limit],
    queryFn: () => integrationClient.getCursorSessions(limit),
    refetchInterval: 60000 // 1分ごと更新
  })
}

// 統合ログ取得
const useIntegrationLogs = (limit = 100) => {
  return useQuery({
    queryKey: queryKeys.integrationLogs({ limit }),
    queryFn: () => integrationClient.getIntegrationLogs(limit),
    refetchInterval: 10000 // 10秒ごと更新
  })
}
```

### 🎮 リアルタイム統合コンポーネント

```typescript
// IntegrationDashboard.tsx
const IntegrationDashboard: React.FC = () => {
  const { data: stats } = useIntegrationStats()
  const { data: logs } = useIntegrationLogs(50)
  const { data: cursorSessions } = useCursorSessions(10)

  return (
    <div className="integration-dashboard">
      {/* リアルタイム統計 */}
      <div className="stats-grid">
        <StatCard title="総セッション" value={stats?.totalSessions} />
        <StatCard title="Cursorセッション" value={stats?.cursorSessions} />
        <StatCard title="監視状態" value={stats?.isWatching ? 'ON' : 'OFF'} />
      </div>

      {/* 最新ログ */}
      <div className="logs-panel">
        <h3>最新アクティビティ</h3>
        {logs?.map(log => (
          <LogEntry key={log.id} log={log} />
        ))}
      </div>

      {/* Cursorセッション */}
      <div className="cursor-sessions">
        <h3>最新Cursorセッション</h3>
        {cursorSessions?.sessions?.map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )
}
```

---

## 🚨 エラーハンドリングパターン

### 🛡️ 統合API用エラーハンドリング

```typescript
// APIエラーハンドリングフック
const useApiErrorHandler = () => {
  const [error, setError] = useState<string | null>(null)

  const handleApiError = useCallback((err: unknown) => {
    if (err instanceof Error) {
      setError(err.message)
    } else {
      setError('API通信エラーが発生しました')
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { error, handleApiError, clearError }
}

// 使用例
const SessionsPage: React.FC = () => {
  const { error, handleApiError, clearError } = useApiErrorHandler()
  
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.sessions(),
    queryFn: () => apiClient.getSessions(),
    onError: handleApiError
  })

  if (error) {
    return <ErrorBoundary error={error} onRetry={clearError} />
  }

  return <SessionsList sessions={data?.sessions} />
}
```

### 🔄 フォールバック戦略

```typescript
// 統合API + フォールバック パターン
const useSessionsWithFallback = (source?: string) => {
  const { data: primaryData, error } = useQuery({
    queryKey: queryKeys.sessions({ source }),
    queryFn: () => apiClient.getSessions({ source }),
    retry: 1
  })

  const { data: fallbackData } = useQuery({
    queryKey: ['sessions', 'fallback', source],
    queryFn: () => integrationClient.getCursorSessions(), // フォールバック
    enabled: !!error && source === 'cursor' // エラー時のみ実行
  })

  return {
    data: primaryData || fallbackData,
    isUsingFallback: !primaryData && !!fallbackData,
    error: !primaryData && !fallbackData ? error : null
  }
}
```

---

## 📱 レスポンシブ対応パターン

### 📊 モバイル統合UI

```typescript
// MobileIntegrationView.tsx
const MobileIntegrationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'claude-dev' | 'cursor'>('all')
  
  const { data } = useQuery({
    queryKey: queryKeys.sessions({ 
      source: activeTab === 'all' ? undefined : activeTab,
      limit: 20 
    }),
    queryFn: () => apiClient.getSessions({ 
      source: activeTab === 'all' ? undefined : activeTab,
      limit: 20 
    })
  })

  return (
    <div className="mobile-integration">
      {/* タブ切り替え */}
      <div className="flex border-b">
        {['all', 'claude-dev', 'cursor'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 ${activeTab === tab ? 'border-b-2 border-blue-500' : ''}`}
          >
            {tab === 'all' ? '全て' : 
             tab === 'claude-dev' ? 'Claude DEV' : 'Cursor'}
          </button>
        ))}
      </div>

      {/* セッション一覧 */}
      <div className="overflow-y-auto">
        {data?.sessions.map(session => (
          <MobileSessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )
}
```

---

## 🧪 テストパターン

### 🔬 統合API用テスト

```typescript
// __tests__/integration-api.test.ts
import { apiClient } from '../api/client'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('統合API テスト', () => {
  test('全ソースセッション取得', async () => {
    const sessions = await apiClient.getSessions()
    expect(sessions.sessions).toBeDefined()
    expect(sessions.pagination).toBeDefined()
  })

  test('Claude DEVセッション取得', async () => {
    const sessions = await apiClient.getSessions({ source: 'claude-dev' })
    expect(sessions.sessions.every(s => s.metadata.source === 'claude-dev')).toBe(true)
  })

  test('統合統計情報取得', async () => {
    const stats = await apiClient.getStats()
    expect(stats.overall).toBeDefined()
    expect(stats.services).toBeDefined()
  })
})

// コンポーネントテスト
describe('SessionList コンポーネント', () => {
  const queryClient = new QueryClient()
  
  test('ソース指定表示', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SessionList source="claude-dev" />
      </QueryClientProvider>
    )
    
    expect(screen.getByText(/Claude DEV/)).toBeInTheDocument()
  })
})
```

---

## 📈 パフォーマンス最適化

### ⚡ React Query最適化

```typescript
// queryClient設定の最適化
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30秒間はフレッシュとみなす
      cacheTime: 300000, // 5分間キャッシュ保持
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        // API統合エラー時の自動リトライ戦略
        if (error?.message?.includes('統合API')) {
          return failureCount < 2
        }
        return failureCount < 3
      }
    }
  }
})

// インフィニットクエリによる大量データ処理
const useInfiniteIntegratedSessions = (source?: string) => {
  return useInfiniteQuery({
    queryKey: ['sessions', 'infinite', source],
    queryFn: ({ pageParam = 1 }) => 
      apiClient.getSessions({ 
        source, 
        page: pageParam, 
        limit: 20 
      }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined
  })
}
```

### 🔄 バックグラウンド同期

```typescript
// バックグラウンド同期フック
const useBackgroundSync = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const interval = setInterval(() => {
      // 統合APIデータのバックグラウンド更新
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['integration'] })
    }, 60000) // 1分ごと

    return () => clearInterval(interval)
  }, [queryClient])
}
```

---

## 🎯 まとめ: 統合原則チェックリスト

### ✅ 開発前チェック
- [ ] 統合APIルートで実現可能かを確認
- [ ] `source` パラメータによる分岐処理を検討
- [ ] 既存エンドポイントの拡張可能性を調査
- [ ] レスポンス形式の一貫性を確認

### ✅ 実装時チェック
- [ ] `apiClient.getSessions({ source })` パターンを使用
- [ ] React Query + 統合APIの組み合わせ
- [ ] エラーハンドリング + フォールバック戦略
- [ ] モバイル対応 + レスポンシブ設計

### ✅ テスト時チェック
- [ ] 統合API呼び出しのテスト
- [ ] ソース分岐処理のテスト
- [ ] エラーケースのテスト
- [ ] パフォーマンステスト

### ✅ デプロイ前チェック
- [ ] 統合ガード実行 (`npm run check:integration`)
- [ ] TypeScriptビルド成功確認
- [ ] フロントエンドビルド成功確認
- [ ] API整合性確認

---

**🎯 このガイドに従うことで、Chat History Managerの統合アーキテクチャを最大限活用した、保守性・拡張性・パフォーマンスに優れたフロントエンド開発が可能になります。** 