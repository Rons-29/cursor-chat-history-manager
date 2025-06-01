# Chat History Manager API設計書

## 概要
本ドキュメントは、Chat History Managerの統合API仕様を記載します。

---

## 1. 統合検索API

### エンドポイント
- `POST /api/integration/search`

### 機能
- Cursorログとチャット履歴を横断的に検索し、統合結果を返します。

### リクエスト例
```json
{
  "query": "error",
  "timeRange": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-12-31T23:59:59.999Z"
  },
  "types": ["chat", "cursor"],
  "projects": ["my-project"],
  "tags": ["bug", "urgent"],
  "limit": 50,
  "offset": 0
}
```

### パラメータ説明
| パラメータ   | 型       | 必須 | 説明 |
| ------------ | -------- | ---- | ---- |
| query        | string   | ○    | 検索キーワード |
| timeRange    | object   | -    | 検索期間（start, end: ISO8601）|
| types        | array    | -    | ["chat", "cursor"] いずれか|
| projects     | array    | -    | プロジェクト名リスト |
| tags         | array    | -    | タグリスト |
| limit        | number   | -    | 最大取得件数（1-100）|
| offset       | number   | -    | 取得開始位置（0以上）|

### バリデーション仕様
- `query`は必須、1文字以上
- `timeRange`は`start`/`end`ともにISO8601形式
- `types`は`chat`または`cursor`の配列
- `limit`は1〜100、`offset`は0以上

### レスポンス例
```json
{
  "results": [
    {
      "id": "xxx",
      "timestamp": "2024-06-01T12:34:56.789Z",
      "type": "chat",
      "content": "xxx",
      "metadata": {
        "project": "my-project",
        "tags": ["bug"],
        "source": "chat"
      }
    }
    // ...more
  ]
}
```

### ステータスコード
| コード | 意味 |
|-------|------|
| 200   | 正常レスポンス |
| 400   | バリデーションエラー |
| 500   | サーバーエラー |

### 備考
- レスポンスの`timestamp`はISO8601文字列
- `metadata`にはプロジェクト名・タグ・データ種別（source）が含まれます

---

## 2. ログ分析・可視化API

### エンドポイント
- `GET /api/integration/analytics`

### 機能
- ログ・チャット履歴の統計情報を取得します
- 期間別・プロジェクト別・タグ別の集計を提供します
- アクティビティタイムラインを生成します

### クエリパラメータ
| パラメータ   | 型       | 必須 | 説明 |
| ------------ | -------- | ---- | ---- |
| startDate    | string   | -    | 集計開始日（ISO8601）|
| endDate      | string   | -    | 集計終了日（ISO8601）|
| groupBy      | string   | -    | 集計単位（day/week/month）|
| projectId    | string   | -    | プロジェクトIDでフィルタ|
| types        | string[] | -    | ログタイプ（chat/cursor）|

### レスポンス例
```json
{
  "summary": {
    "totalLogs": 1234,
    "totalChats": 900,
    "totalCursorLogs": 334,
    "uniqueProjects": 5,
    "uniqueTags": 10
  },
  "logsByType": {
    "chat": 900,
    "cursor": 334
  },
  "logsByProject": {
    "project-1": 500,
    "project-2": 400,
    "project-3": 334
  },
  "logsByTag": {
    "bug": 200,
    "feature": 300,
    "question": 400,
    "other": 334
  },
  "activityTimeline": [
    {
      "date": "2024-05-01",
      "chatCount": 20,
      "cursorCount": 10,
      "totalCount": 30
    },
    {
      "date": "2024-05-02",
      "chatCount": 35,
      "cursorCount": 15,
      "totalCount": 50
    }
  ],
  "hourlyDistribution": {
    "0": 50,
    "1": 30,
    // ... 0-23時の分布
  },
  "topKeywords": [
    { "keyword": "error", "count": 100 },
    { "keyword": "bug", "count": 80 },
    { "keyword": "feature", "count": 60 }
  ]
}
```

### ステータスコード
| コード | 意味 |
|-------|------|
| 200   | 正常レスポンス |
| 400   | パラメータ不正 |
| 500   | サーバーエラー |

### 備考
- 日付範囲が指定されない場合、過去30日間のデータを返します
- `groupBy`が指定されない場合、デフォルトは`day`です
- レスポンスの各数値は整数です

---

## 3. 今後追加予定API
- 統合ダッシュボード取得API
- 統合ログエクスポートAPI
- バックアップ・リストアAPI

---

## 4. 変更履歴
- 2025-05-31: 統合検索API初版作成
- 2025-05-31: ログ分析・可視化API初版作成 