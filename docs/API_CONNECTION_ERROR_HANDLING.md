# APIサーバー接続エラーハンドリング

## 概要

Chat History ManagerのWebダッシュボードでは、APIサーバーが起動していない場合に適切なエラーメッセージを表示し、ユーザーに解決方法を案内する機能を実装しています。

## 実装内容

### 1. API接続チェック機能

#### `checkApiConnection` 関数
- **場所**: `web/src/api/integration.ts`
- **機能**: APIサーバーの接続状態を確認
- **タイムアウト**: 5秒
- **エンドポイント**: `/api/health`

```typescript
export const checkApiConnection = async (): Promise<ApiConnectionStatus> => {
  const serverUrl = window.location.origin
  const lastChecked = new Date()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    return {
      isConnected: response.ok,
      serverUrl,
      lastChecked,
      error: response.ok ? undefined : `サーバーエラー: ${response.status}`
    }
  } catch (error) {
    return {
      isConnected: false,
      serverUrl,
      lastChecked,
      error: 'APIサーバーが起動していません'
    }
  }
}
```

### 2. 接続チェック付きAPI呼び出し

#### `fetchWithConnectionCheck` 関数
- **機能**: API呼び出し前に接続状態を確認
- **エラー**: 接続失敗時に詳細なエラーメッセージを表示

```typescript
const fetchWithConnectionCheck = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const connectionStatus = await checkApiConnection()
  
  if (!connectionStatus.isConnected) {
    throw new Error(connectionStatus.error || 'APIサーバーに接続できません')
  }
  
  return await fetch(url, options)
}
```

### 3. リアルタイム接続監視

#### `useApiConnection` フック
- **場所**: `web/src/hooks/useIntegration.ts`
- **機能**: 30秒ごとに接続状態を監視
- **キャッシュ**: 10秒間はキャッシュを使用

```typescript
export const useApiConnection = () => {
  return useQuery({
    queryKey: ['api-connection'],
    queryFn: checkApiConnection,
    refetchInterval: 30000, // 30秒ごと
    retry: 1,
    staleTime: 10000 // 10秒キャッシュ
  })
}
```

### 4. UI表示コンポーネント

#### `ApiConnectionIndicator`
- **場所**: `web/src/components/ui/ApiConnectionIndicator.tsx`
- **バリエーション**: 
  - `default`: 詳細表示
  - `compact`: コンパクト表示
  - `minimal`: アイコンのみ

```typescript
interface ApiConnectionIndicatorProps {
  variant?: 'default' | 'compact' | 'minimal'
  className?: string
  showDetails?: boolean
}
```

## エラーメッセージ

### 1. スキャン実行時のエラー

```
❌ APIサーバーが起動していません

💡 解決方法:
1. APIサーバーを起動してください: npm run server
2. サーバーが起動するまで少し待ってから再試行してください
```

### 2. 監視開始/停止時のエラー

```
❌ APIサーバーに接続できません

💡 解決方法:
1. APIサーバーを起動してください: npm run server
2. サーバーが起動するまで少し待ってから再試行してください
```

### 3. データ更新時のエラー

```
❌ APIサーバーに接続できません

💡 解決方法:
1. APIサーバーを起動してください: npm run server
2. サーバーが起動するまで少し待ってから再試行してください
```

## ボタンの無効化

### 対象ボタン
- **スキャン実行**: `!connectionStatus?.isConnected`
- **監視開始/停止**: `!connectionStatus?.isConnected`
- **データ更新**: `!connectionStatus?.isConnected`

### 視覚的フィードバック
- **背景色**: `bg-gray-400`
- **カーソル**: `cursor-not-allowed`
- **ツールチップ**: 「APIサーバーが起動していません」

## 警告メッセージ

### ダッシュボード
```jsx
{!connectionStatus?.isConnected && (
  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
    <div className="flex">
      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
      <div className="ml-3">
        <p className="text-sm text-yellow-800">
          <strong>APIサーバーが起動していません。</strong>
          最新のデータを表示するには、APIサーバーを起動してください。
        </p>
        <p className="text-sm text-yellow-700 mt-1">
          コマンド: <code className="bg-yellow-100 px-1 rounded">npm run server</code>
        </p>
      </div>
    </div>
  </div>
)}
```

### 統合ページ
```jsx
{!connectionStatus?.isConnected && (
  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
    <div className="flex">
      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
      <div className="ml-3">
        <p className="text-sm text-yellow-800">
          <strong>APIサーバーが起動していません。</strong>
          スキャンや監視機能を使用するには、まずAPIサーバーを起動してください。
        </p>
        <p className="text-sm text-yellow-700 mt-1">
          コマンド: <code className="bg-yellow-100 px-1 rounded">npm run server</code>
        </p>
      </div>
    </div>
  </div>
)}
```

## 使用方法

### 1. 基本的な使用

```typescript
import { useApiConnection } from '../hooks/useIntegration'
import ApiConnectionIndicator from '../components/ui/ApiConnectionIndicator'

const MyComponent = () => {
  const { data: connectionStatus } = useApiConnection()
  
  return (
    <div>
      <ApiConnectionIndicator variant="compact" />
      
      <button
        disabled={!connectionStatus?.isConnected}
        onClick={handleAction}
      >
        実行
      </button>
    </div>
  )
}
```

### 2. エラーハンドリング付きAPI呼び出し

```typescript
import { checkApiConnection } from '../api/integration'

const handleAction = async () => {
  try {
    const connectionCheck = await checkApiConnection()
    
    if (!connectionCheck.isConnected) {
      throw new Error(`❌ ${connectionCheck.error}\n\n💡 解決方法:\n1. APIサーバーを起動してください: npm run server`)
    }
    
    // API呼び出し実行
    await performAction()
  } catch (error) {
    setError(error.message)
  }
}
```

## トラブルシューティング

### 1. 接続チェックが失敗する場合
- APIサーバーが起動しているか確認
- `/api/health` エンドポイントが実装されているか確認
- ネットワーク接続を確認

### 2. 接続状態が更新されない場合
- React Queryのキャッシュをクリア
- ページをリロード
- ブラウザの開発者ツールでネットワークタブを確認

### 3. エラーメッセージが表示されない場合
- コンソールでエラーログを確認
- `useApiConnection`フックが正しく使用されているか確認
- `ApiConnectionIndicator`コンポーネントが正しく配置されているか確認

## 今後の改善点

1. **WebSocket接続**: リアルタイムでの接続状態監視
2. **自動再接続**: 接続が復旧した際の自動リトライ
3. **詳細なエラー分類**: タイムアウト、ネットワークエラー、サーバーエラーの区別
4. **オフラインモード**: 接続できない場合のローカルデータ表示
5. **接続履歴**: 接続状態の履歴表示

---

**最終更新**: 2025年1月
**バージョン**: 1.0.0 