# ChatFlow 統合API仕様書

## 概要
ChatFlowの統合アーキテクチャ完了後のAPI仕様を記載します。
統合APIルート（`unified-api.ts`）による統一されたエンドポイント設計です。

---

## 🔄 統合APIアーキテクチャ

### 統合原則
- **統一エンドポイント**: `/api/sessions?source=X` 形式
- **ソース分岐**: `source` パラメータによる データソース指定
- **型安全性**: TypeScript厳格モード準拠
- **エラーハンドリング**: 統一されたエラーレスポンス形式

### サポートされるデータソース
- `chat`: チャット履歴
- `cursor`: Cursorログ
- `claude-dev`: Claude DEV拡張機能データ
- 省略時: 全ソース横断検索

---

## 📊 主要エンドポイント

### 1. セッション取得API

#### エンドポイント
```
GET /api/sessions
```

#### クエリパラメータ
| パラメータ | 型 | 必須 | 説明 | 例 |
|------------|----|----|------|-----|
| source | string | - | データソース指定 | `chat`, `cursor`, `claude-dev` |
| keyword | string | - | 検索キーワード | `error`, `bug` |
| limit | number | - | 取得件数上限(1-100) | `20` |
| offset | number | - | 取得開始位置 | `0` |
| page | number | - | ページ番号 | `1` |
| pageSize | number | - | ページサイズ | `10` |

#### レスポンス例
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session-123",
      "title": "エラー解決",
      "timestamp": "2025-06-02T10:30:00.000Z",
      "content": "TypeScriptコンパイルエラーの解決方法",
      "metadata": {
        "source": "chat",
        "project": "chat-history-manager",
        "tags": ["error", "typescript"]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 150,
    "hasMore": true
  },
  "timestamp": "2025-06-02T10:30:00.000Z"
}
```

### 2. 統合検索API

#### エンドポイント
```
POST /api/search
```

#### リクエストボディ
```json
{
  "keyword": "error handling",
  "source": "chat",
  "limit": 20,
  "options": {
    "fuzzy": true,
    "includeContent": true
  }
}
```

#### レスポンス例
```json
{
  "success": true,
  "results": [
    {
      "id": "session-456",
      "title": "エラーハンドリング実装",
      "snippet": "try-catchブロックによる例外処理...",
      "score": 0.95,
      "metadata": {
        "source": "chat",
        "matchType": "content",
        "highlightedText": "**error handling**"
      }
    }
  ],
  "searchInfo": {
    "keyword": "error handling",
    "totalResults": 25,
    "searchTime": 45,
    "searchMethod": "fts5"
  },
  "timestamp": "2025-06-02T10:30:00.000Z"
}
```

### 3. 統計情報API

#### エンドポイント
```
GET /api/stats
```

#### クエリパラメータ
| パラメータ | 型 | 必須 | 説明 |
|------------|----|----|------|
| source | string | - | 特定ソースの統計のみ取得 |

#### レスポンス例
```json
{
  "success": true,
  "overall": {
    "totalSessions": 1250,
    "totalMessages": 15000,
    "uniqueProjects": 8,
    "databaseSize": "45.2MB"
  },
  "services": {
    "chat": {
      "sessions": 800,
      "lastUpdated": "2025-06-02T10:00:00.000Z"
    },
    "cursor": {
      "sessions": 300,
      "lastUpdated": "2025-06-02T09:45:00.000Z"
    },
    "claudeDev": {
      "sessions": 150,
      "lastUpdated": "2025-06-02T09:30:00.000Z"
    },
    "integration": {
      "isHealthy": true,
      "lastCheck": "2025-06-02T10:30:00.000Z",
      "integrationScore": 99
    }
  },
  "timestamp": "2025-06-02T10:30:00.000Z"
}
```

### 4. ヘルスチェックAPI

#### エンドポイント
```
GET /api/health
```

#### レスポンス例
```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "database": {
      "status": "connected",
      "path": "./data/chat-history.db",
      "size": "45.2MB"
    },
    "integration": {
      "status": "active",
      "healthScore": 99
    }
  },
  "uptime": 86400,
  "timestamp": "2025-06-02T10:30:00.000Z"
}
```

### 5. 設定取得API

#### エンドポイント
```
GET /api/config
```

#### レスポンス例
```json
{
  "success": true,
  "config": {
    "pagination": {
      "defaultPageSize": 10,
      "maxPageSize": 100
    },
    "search": {
      "defaultMethod": "fts5",
      "fuzzyThreshold": 0.8
    },
    "sources": {
      "enabled": ["chat", "cursor", "claude-dev"],
      "defaultSource": "all"
    }
  },
  "timestamp": "2025-06-02T10:30:00.000Z"
}
```

### 6. セッション詳細取得API

#### エンドポイント
```
GET /api/sessions/:id
```

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|------------|----|----|------|
| id | string | ○ | セッションID |

#### レスポンス例
```json
{
  "success": true,
  "session": {
    "id": "session-123",
    "title": "React コンポーネント設計",
    "content": "Reactコンポーネントの設計パターンについて...",
    "timestamp": "2025-06-02T10:00:00.000Z",
    "metadata": {
      "source": "chat",
      "project": "web-app",
      "tags": ["react", "design-pattern"],
      "messageCount": 15,
      "estimatedReadTime": "5分"
    },
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "Reactのベストプラクティスを教えて",
        "timestamp": "2025-06-02T10:00:00.000Z"
      },
      {
        "id": "msg-2", 
        "role": "assistant",
        "content": "Reactコンポーネントの設計では...",
        "timestamp": "2025-06-02T10:01:00.000Z"
      }
    ]
  },
  "timestamp": "2025-06-02T10:30:00.000Z"
}
```

---

## 🔧 Integration API (特別なエンドポイント)

### 統合統計情報
```
GET /api/integration/stats
```

### SQLite検索
```
POST /api/integration/sqlite-search
```

### 統合ログ
```
GET /api/integration/logs
```

---

## 📋 共通仕様

### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "パラメータが不正です",
    "details": {
      "field": "limit",
      "value": 150,
      "constraint": "1-100の範囲内である必要があります"
    }
  },
  "timestamp": "2025-06-02T10:30:00.000Z"
}
```

### HTTPステータスコード
| コード | 意味 | 使用場面 |
|-------|------|---------|
| 200 | OK | 正常処理完了 |
| 400 | Bad Request | パラメータ不正・バリデーションエラー |
| 404 | Not Found | リソースが見つからない |
| 500 | Internal Server Error | サーバー内部エラー |
| 503 | Service Unavailable | サービス一時停止中 |

### レスポンス共通フィールド
- `success`: boolean - 処理成功フラグ
- `timestamp`: string (ISO8601) - レスポンス生成時刻
- `error`: object - エラー発生時の詳細情報

---

## 🛡️ セキュリティ・認証

### 現在の実装
- **認証**: なし（ローカル開発用途）
- **CORS**: `localhost`のみ許可
- **レート制限**: なし

### 企業用途での推奨追加実装
- JWT認証
- API Key認証
- IP制限
- レート制限

---

## 📊 パフォーマンス仕様

### 応答時間目標
- セッション取得: < 200ms
- 検索処理: < 100ms（SQLite FTS5）
- 統計情報: < 150ms

### 制限事項
- 最大ページサイズ: 100件
- 検索キーワード: 最大200文字
- 同時接続数: 制限なし（ローカル用途）

---

## 🔄 バージョニング

### 現在のバージョン
- **APIバージョン**: v1
- **統合完了日**: 2025年6月2日
- **統合健全性スコア**: 99%

### 互換性
- 統合前のAPIとの後方互換性は部分的にサポート
- 新しい統合APIルートの使用を推奨

---

## 🧪 テスト・デバッグ

### APIテスト例
```bash
# 基本セッション取得
curl -X GET "http://localhost:3001/api/sessions?limit=5"

# ソース指定セッション取得
curl -X GET "http://localhost:3001/api/sessions?source=chat&limit=10"

# 統合検索
curl -X POST -H "Content-Type: application/json" \
  -d '{"keyword":"react","limit":5}' \
  http://localhost:3001/api/search

# ヘルスチェック
curl -X GET "http://localhost:3001/api/health"

# 統計情報
curl -X GET "http://localhost:3001/api/stats"
```

---

## 📅 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-06-02 | v1.0 | 統合API完成版リリース |
| 2025-06-02 | v1.0 | unified-api.ts統合ルート実装 |
| 2025-06-02 | v1.0 | 統合健全性99%達成 |

---

**最終更新**: 2025年6月2日  
**適用範囲**: Chat History Manager統合アーキテクチャ  
**API実装**: `src/server/routes/unified-api.ts` 