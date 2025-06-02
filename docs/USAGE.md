# Chat History Manager 使用ガイド（統合完了版）

## 目次

1. [基本使用法](#基本使用法)
2. [統合WebUI使用法](#統合webui使用法)
3. [統合API使用法](#統合api使用法)
4. [パフォーマンス最適化](#パフォーマンス最適化)
5. [トラブルシューティング](#トラブルシューティング)
6. [ベストプラクティス](#ベストプラクティス)

## 基本使用法

### 🚀 統合システムの起動

```bash
# 統合開発環境の起動（推奨）
npm run dev:full      # 統合API + WebUI

# 個別起動
npm run server        # 統合APIサーバーのみ
npm run web          # WebUIのみ

# プロダクション環境
npm run start:all     # 統合API + WebUI（本番）
```

### 🌐 アクセス先
- **WebUI**: http://localhost:5173 （開発）/ http://localhost:5000 （本番）
- **統合API**: http://localhost:3001

### 📊 WebUIダッシュボード

#### メイン機能
1. **統合検索**: 全データソース横断検索
2. **ソース分岐**: Chat/Cursor/Claude DEV個別表示
3. **統計ダッシュボード**: リアルタイム統計情報
4. **セッション詳細**: 個別セッションの詳細表示

#### 基本操作
```typescript
// WebUIでの基本操作例
// 1. ダッシュボード表示: トップページにアクセス
// 2. 統合検索: 検索ボックスにキーワード入力
// 3. フィルタリング: ソース・日付範囲での絞り込み
// 4. セッション表示: 個別セッションをクリック
```

---

## 統合WebUI使用法

### 🔍 統合検索機能

#### 全ソース横断検索
```typescript
// WebUI検索フォーム使用
// キーワード: "React"
// ソース: "全て" （デフォルト）
// 結果: Chat + Cursor + Claude DEV から検索
```

#### ソース限定検索
```typescript
// Chat履歴のみ検索
// ソース選択: "Chat"
// キーワード: "エラー処理"

// Cursorログのみ検索  
// ソース選択: "Cursor"
// キーワード: "デバッグ"

// Claude DEVタスクのみ検索
// ソース選択: "Claude DEV"
// キーワード: "リファクタリング"
```

### 📈 統計ダッシュボード

#### 表示される統計情報
```typescript
interface DashboardStats {
  overall: {
    totalSessions: number        // 総セッション数
    totalMessages: number        // 総メッセージ数  
    uniqueProjects: number       // プロジェクト数
    databaseSize: string         // データベースサイズ
  }
  services: {
    chat: { sessions: number }
    cursor: { sessions: number }
    claudeDev: { sessions: number }
    integration: { healthScore: number }  // 統合健全性スコア
  }
}
```

### 🎨 ユーザーインターフェース

#### レスポンシブ対応
- **デスクトップ**: 3カラムレイアウト
- **タブレット**: 2カラムレイアウト  
- **モバイル**: 1カラム + タブ切り替え

#### ダークモード対応
```typescript
// WebUIでのテーマ切り替え
// ヘッダーのテーマボタンをクリック
// ライト/ダークモード自動切り替え
```

---

## 統合API使用法

### 🔧 基本APIクライアント

```typescript
import { apiClient } from './api/client.js'

// APIクライアント初期化は不要（自動設定済み）

// 統合セッション取得（全ソース）
const allSessions = await apiClient.getSessions()

// ソース指定セッション取得
const chatSessions = await apiClient.getSessions({ source: 'chat' })
const cursorSessions = await apiClient.getSessions({ source: 'cursor' })
const claudeDevSessions = await apiClient.getSessions({ source: 'claude-dev' })

// 統合検索
const searchResults = await apiClient.search('React hooks', {
  source: 'chat',  // 省略時は全ソース検索
  limit: 20
})

// 統計情報取得
const stats = await apiClient.getStats()
```

### 📡 REST API直接使用

```bash
# 統合セッション取得
curl -X GET "http://localhost:3001/api/sessions"

# ソース指定取得
curl -X GET "http://localhost:3001/api/sessions?source=chat&limit=10"
curl -X GET "http://localhost:3001/api/sessions?source=cursor&keyword=error"
curl -X GET "http://localhost:3001/api/sessions?source=claude-dev"

# 統合検索
curl -X POST -H "Content-Type: application/json" \
  -d '{"keyword":"TypeScript","limit":5}' \
  http://localhost:3001/api/search

# 統計情報
curl -X GET "http://localhost:3001/api/stats"

# ヘルスチェック
curl -X GET "http://localhost:3001/api/health"
```

### 🔄 React Query統合

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient, queryKeys } from './api/client.js'

// 統合セッション取得フック
const useIntegratedSessions = (source?: string) => {
  return useQuery({
    queryKey: queryKeys.sessions({ source }),
    queryFn: () => apiClient.getSessions({ source }),
    refetchInterval: 30000  // 30秒ごと更新
  })
}

// 使用例
const AllSessionsComponent = () => {
  const { data: allSessions } = useIntegratedSessions()
  const { data: chatSessions } = useIntegratedSessions('chat')
  
  return (
    <div>
      <h2>全セッション: {allSessions?.sessions.length}</h2>
      <h2>チャットセッション: {chatSessions?.sessions.length}</h2>
    </div>
  )
}
```

---

## パフォーマンス最適化

### ⚡ SQLite統合による高速化

```typescript
// 統合SQLiteデータベースの利用
// - 10-100倍の検索速度向上
// - FTS5全文検索エンジン活用
// - 統一データベース（chat-history.db）

// 高速検索例
const fastSearch = await apiClient.search('error handling', {
  limit: 100,  // 大量データも高速処理
  source: 'chat'  // ソース限定でさらに高速化
})
```

### 🔄 キャッシュ戦略

```typescript
// React Query自動キャッシュ
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,     // 30秒間はフレッシュ
      cacheTime: 300000,    // 5分間キャッシュ保持
      refetchOnWindowFocus: false
    }
  }
})

// 手動キャッシュ無効化
queryClient.invalidateQueries({ queryKey: ['sessions'] })
```

### 📊 バッチ処理最適化

```typescript
// ページング利用（大量データ処理）
const useInfiniteSessions = () => {
  return useInfiniteQuery({
    queryKey: ['sessions', 'infinite'],
    queryFn: ({ pageParam = 1 }) => 
      apiClient.getSessions({ page: pageParam, pageSize: 20 }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined
  })
}
```

---

## トラブルシューティング

### 🚨 統合健全性チェック

```bash
# 統合状況確認
npm run check:integration

# 詳細統合ステータス
npm run integration:status

# 月次統合レビュー
npm run monthly:review
```

### 🔧 よくある問題と解決方法

#### 1. APIサーバー接続エラー
```bash
# サーバー状況確認
curl -X GET "http://localhost:3001/api/health"

# サーバー再起動
npm run server

# ポート使用状況確認
lsof -i :3001
```

#### 2. データベース関連エラー
```bash
# 統合データベース確認
ls -la ./data/chat-history.db

# SQLite直接確認
sqlite3 ./data/chat-history.db ".tables"

# 統合状況確認
npm run check:integration
```

#### 3. WebUI表示問題
```bash
# フロントエンドビルド確認
cd web && npm run build

# 開発サーバー再起動
npm run web

# ブラウザキャッシュクリア推奨
```

#### 4. 検索結果が表示されない
```typescript
// 統合検索デバッグ
const debugSearch = async () => {
  try {
    // 基本検索テスト
    const results = await apiClient.search('test', { limit: 1 })
    console.log('検索結果:', results)
    
    // 統計情報確認
    const stats = await apiClient.getStats()
    console.log('データ統計:', stats)
    
  } catch (error) {
    console.error('検索エラー:', error)
  }
}
```

### 🛡️ セキュリティ関連問題

```bash
# セキュリティチェック
npm run precommit

# 機密情報検索
curl -X POST -H "Content-Type: application/json" \
  -d '{"keyword":"password","limit":10}' \
  http://localhost:3001/api/search
```

---

## ベストプラクティス

### 📝 統合データ管理

#### 1. ソース別アクセスパターン
```typescript
// 用途別のソース選択指針
const getBestSource = (purpose: string) => {
  switch (purpose) {
    case 'コード相談': return 'chat'
    case 'デバッグログ': return 'cursor'  
    case 'タスク履歴': return 'claude-dev'
    case '全体検索': return undefined  // 全ソース横断
  }
}

// 効率的な検索
const searchByPurpose = async (keyword: string, purpose: string) => {
  const source = getBestSource(purpose)
  return await apiClient.getSessions({ keyword, source, limit: 20 })
}
```

#### 2. パフォーマンス重視の実装
```typescript
// 適切な制限値設定
const OPTIMAL_LIMITS = {
  dashboard: 10,      // ダッシュボード表示
  search: 20,         // 検索結果
  detail: 50,         // 詳細画面
  export: 100         // エクスポート用
}

// 段階的ローディング
const useProgressiveLoading = () => {
  const [limit, setLimit] = useState(10)
  
  const { data } = useQuery({
    queryKey: ['sessions', limit],
    queryFn: () => apiClient.getSessions({ limit })
  })
  
  const loadMore = () => setLimit(prev => prev + 10)
  return { data, loadMore }
}
```

### 🔍 効果的な検索戦略

#### キーワード選択指針
```typescript
// 効果的な検索キーワード例
const SEARCH_PATTERNS = {
  技術調査: ['React', 'TypeScript', 'API'],
  問題解決: ['error', 'bug', 'issue', '解決'],
  実装作業: ['実装', 'component', 'function'],
  リファクタリング: ['refactor', '改善', '最適化']
}

// 複合検索
const advancedSearch = async (category: string, specific: string) => {
  const keywords = SEARCH_PATTERNS[category] || []
  const searchTerm = `${keywords.join(' OR ')} AND ${specific}`
  
  return await apiClient.search(searchTerm, { limit: 30 })
}
```

### 📊 統計情報活用

```typescript
// 定期的な統計確認
const useHealthMonitoring = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const [stats, health] = await Promise.all([
        apiClient.getStats(),
        fetch('/api/health').then(r => r.json())
      ])
      return { stats, health }
    },
    refetchInterval: 60000  // 1分ごと
  })
}

// 統計ベースの最適化判断
const optimizeBasedOnStats = (stats: any) => {
  const { overall } = stats
  
  if (overall.totalSessions > 1000) {
    console.log('大量データモード: ページング推奨')
  }
  
  if (stats.services.integration.healthScore < 95) {
    console.log('統合健全性警告: チェック実行推奨')
  }
}
```

### 🚀 開発フロー統合

```bash
# 開発開始時の推奨フロー
npm run integration:status   # 統合状況確認
npm run dev:full            # 統合開発環境起動

# コミット前の推奨フロー  
npm run precommit           # セキュリティ+統合+品質チェック
npm run check:integration   # 統合健全性確認

# 定期メンテナンス
npm run monthly:review      # 月次統合レビュー
```

---

**🎯 このガイドに従うことで、Chat History Manager統合アーキテクチャを最大限活用した効率的な開発・運用が可能になります。**

---

**最終更新**: 2025年6月2日（統合完了版）  
**適用範囲**: Chat History Manager統合アーキテクチャ  
**関連ドキュメント**: 
- [統合APIリファレンス](./API_SPEC.md)
- [フロントエンド統合ガイド](./FRONTEND_INTEGRATION_GUIDE.md)
- [統合監視ガイド](./INTEGRATION_MONITORING_GUIDE.md) 