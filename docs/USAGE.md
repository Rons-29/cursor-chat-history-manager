# Chat History Manager 使用ガイド

## 目次

1. [基本使用法](#基本使用法)
2. [高度な機能](#高度な機能)
3. [パフォーマンス最適化](#パフォーマンス最適化)
4. [トラブルシューティング](#トラブルシューティング)
5. [ベストプラクティス](#ベストプラクティス)

## 基本使用法

### セッションの作成と管理

```typescript
import { ChatHistoryService } from './services/ChatHistoryService'

// サービスの初期化
const service = new ChatHistoryService({
  storagePath: './data',
  maxSessions: 1000,
  maxMessagesPerSession: 500,
})
await service.initialize()

// セッションの作成
const session = await service.createSession({
  title: '新しいチャット',
  tags: ['重要', 'プロジェクトA'],
})

// メッセージの追加
await service.addMessage(session.id, {
  role: 'user',
  content: 'こんにちは！',
})

// メッセージの取得
const messages = await service.getSessionMessages(session.id, {
  limit: 10,
  offset: 0,
})
```

### 検索機能の使用

```typescript
// セッションの検索
const searchResults = await service.searchSessions({
  keyword: 'プロジェクト',
  tags: ['重要'],
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
  page: 1,
  pageSize: 10,
})

// メッセージの検索
const messageResults = await service.searchMessages('エラー', {
  limit: 10,
  offset: 0,
  role: 'assistant',
})
```

## 高度な機能

### バックアップとリストア

```typescript
// バックアップの作成
const backup = await service.createBackup('./backups/backup-2024-03-20.zip')

// バックアップからの復元
const restoreResult = await service.restoreFromBackup('./backups/backup-2024-03-20.zip')
console.log(`復元されたセッション数: ${restoreResult.restored}`)
```

### 統計情報の取得

```typescript
const stats = await service.getStats()
console.log(`総セッション数: ${stats.totalSessions}`)
console.log(`総メッセージ数: ${stats.totalMessages}`)
console.log(`総ストレージサイズ: ${stats.totalSize} bytes`)
```

## パフォーマンス最適化

### キャッシュの設定

```typescript
import { CacheManager } from './utils/CacheManager'

const cacheManager = new CacheManager(logger, {
  maxSize: 1000,
  ttl: 3600000, // 1時間
  compression: true,
})

// キャッシュの使用
await cacheManager.set('session-123', sessionData)
const cachedSession = await cacheManager.get('session-123')
```

### バッチ処理の使用

```typescript
import { BatchProcessor } from './utils/BatchProcessor'

const batchProcessor = new BatchProcessor(logger, {
  maxSize: 100,
  maxWaitTime: 1000,
  onBatch: async (items) => {
    // バッチ処理のロジック
  },
})

// バッチ処理の使用
await batchProcessor.addMany(messages)
await batchProcessor.flush()
```

## トラブルシューティング

### よくある問題と解決方法

1. **セッションが見つからない**
   - エラー: `SessionNotFoundError`
   - 解決方法:
     - セッションIDが正しいか確認
     - インデックスを再構築
     ```typescript
     await service.rebuildIndex()
     ```

2. **ストレージエラー**
   - エラー: `StorageError`
   - 解決方法:
     - ストレージパスの権限を確認
     - ディスク容量を確認
     - バックアップから復元

3. **パフォーマンスの問題**
   - 症状: 処理が遅い
   - 解決方法:
     - キャッシュサイズの調整
     - バッチサイズの最適化
     - インデックスの最適化
     ```typescript
     await service.optimize()
     ```

### ログの確認

```typescript
import { Logger } from './utils/Logger'

const logger = new Logger('./logs')
await logger.initialize()

// ログレベルの設定
logger.setLevel('debug')

// ログの確認
const logs = await logger.getLogs({
  level: 'error',
  startDate: new Date('2024-03-20'),
  endDate: new Date(),
})
```

## ベストプラクティス

### セッション管理

1. **セッションの整理**
   - 適切なタグ付け
   - 定期的なアーカイブ
   - 古いセッションの削除

2. **メッセージの管理**
   - 適切なサイズ制限
   - 定期的なクリーンアップ
   - 重要なメッセージのバックアップ

### パフォーマンス

1. **キャッシュ戦略**
   - 頻繁にアクセスするデータのキャッシュ
   - 適切なTTLの設定
   - メモリ使用量の監視

2. **バッチ処理**
   - 適切なバッチサイズの設定
   - 並列処理の活用
   - エラーハンドリングの実装

### セキュリティ

1. **データ保護**
   - 定期的なバックアップ
   - アクセス制御の実装
   - 機密情報の暗号化

2. **エラーハンドリング**
   - 適切なエラーメッセージ
   - ログの記録
   - リカバリー処理の実装

### メンテナンス

1. **定期的なメンテナンス**
   - インデックスの最適化
   - 古いログの削除
   - パフォーマンスの監視

2. **モニタリング**
   - メトリクスの収集
   - アラートの設定
   - レポートの生成 