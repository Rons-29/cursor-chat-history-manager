# Chat History Manager API ドキュメント

## 目次

1. [概要](#概要)
2. [セッション管理](#セッション管理)
3. [メッセージ管理](#メッセージ管理)
4. [検索機能](#検索機能)
5. [バックアップ/リストア](#バックアップリストア)
6. [統計情報](#統計情報)
7. [エラーハンドリング](#エラーハンドリング)

## 概要

Chat History Managerは、チャットセッションとメッセージを管理するためのAPIを提供します。主な機能は以下の通りです：

- セッションの作成、取得、更新、削除
- メッセージの追加、取得、更新、削除
- セッションとメッセージの検索
- バックアップとリストア
- 統計情報の取得

## セッション管理

### セッションの作成

```typescript
async createSession(session: ChatSession): Promise<ChatSession>
```

新しいチャットセッションを作成します。

**パラメータ:**
- `session`: 作成するセッションの情報

**戻り値:**
- 作成されたセッション

### セッションの取得

```typescript
async getSession(sessionId: string): Promise<ChatSession | null>
```

指定されたIDのセッションを取得します。

**パラメータ:**
- `sessionId`: 取得するセッションのID

**戻り値:**
- セッション（存在しない場合はnull）

### セッションの更新

```typescript
async updateSession(
  sessionId: string,
  updates: Partial<ChatSession>
): Promise<ChatSession | null>
```

セッションの情報を更新します。

**パラメータ:**
- `sessionId`: 更新するセッションのID
- `updates`: 更新する情報

**戻り値:**
- 更新されたセッション（存在しない場合はnull）

### セッションの削除

```typescript
async deleteSession(sessionId: string): Promise<boolean>
```

セッションを削除します。

**パラメータ:**
- `sessionId`: 削除するセッションのID

**戻り値:**
- 削除成功時はtrue、失敗時はfalse

## メッセージ管理

### メッセージの追加

```typescript
async addMessage(
  sessionId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<void>
```

セッションにメッセージを追加します。

**パラメータ:**
- `sessionId`: メッセージを追加するセッションのID
- `message`: 追加するメッセージの情報

### メッセージの取得

```typescript
async getMessage(
  sessionId: string,
  messageId: string
): Promise<ChatMessage | null>
```

指定されたIDのメッセージを取得します。

**パラメータ:**
- `sessionId`: メッセージが属するセッションのID
- `messageId`: 取得するメッセージのID

**戻り値:**
- メッセージ（存在しない場合はnull）

### メッセージの更新

```typescript
async updateMessage(
  sessionId: string,
  messageId: string,
  updates: Partial<ChatMessage>
): Promise<ChatMessage | null>
```

メッセージの情報を更新します。

**パラメータ:**
- `sessionId`: メッセージが属するセッションのID
- `messageId`: 更新するメッセージのID
- `updates`: 更新する情報

**戻り値:**
- 更新されたメッセージ（存在しない場合はnull）

### メッセージの削除

```typescript
async deleteMessage(
  sessionId: string,
  messageId: string
): Promise<boolean>
```

メッセージを削除します。

**パラメータ:**
- `sessionId`: メッセージが属するセッションのID
- `messageId`: 削除するメッセージのID

**戻り値:**
- 削除成功時はtrue、失敗時はfalse

### セッションメッセージの取得

```typescript
async getSessionMessages(
  sessionId: string,
  options: {
    limit?: number
    offset?: number
    before?: Date
    after?: Date
  }
): Promise<{
  messages: ChatMessage[]
  total: number
  hasMore: boolean
}>
```

セッション内のメッセージを取得します。

**パラメータ:**
- `sessionId`: メッセージを取得するセッションのID
- `options`: 取得オプション
  - `limit`: 取得するメッセージの最大数
  - `offset`: スキップするメッセージの数
  - `before`: この日時以前のメッセージを取得
  - `after`: この日時以降のメッセージを取得

**戻り値:**
- メッセージ一覧と総数、追加取得可能フラグ

## 検索機能

### セッションの検索

```typescript
async searchSessions(
  filter: ChatHistoryFilter
): Promise<ChatHistorySearchResult>
```

条件に一致するセッションを検索します。

**パラメータ:**
- `filter`: 検索条件
  - `keyword`: 検索キーワード
  - `tags`: タグの配列
  - `startDate`: 開始日
  - `endDate`: 終了日
  - `page`: ページ番号
  - `pageSize`: 1ページあたりの件数

**戻り値:**
- 検索結果（セッション一覧、総数、ページ情報）

### メッセージの検索

```typescript
async searchMessages(
  query: string,
  options: {
    limit?: number
    offset?: number
    sessionId?: string
    role?: 'user' | 'assistant' | 'system'
  }
): Promise<{
  messages: Array<{
    message: ChatMessage
    sessionId: string
    sessionTitle: string
  }>
  total: number
  hasMore: boolean
}>
```

メッセージの内容を検索します。

**パラメータ:**
- `query`: 検索クエリ
- `options`: 検索オプション
  - `limit`: 取得するメッセージの最大数
  - `offset`: スキップするメッセージの数
  - `sessionId`: 特定のセッション内で検索
  - `role`: 特定のロールのメッセージを検索

**戻り値:**
- 検索結果（メッセージ一覧、総数、追加取得可能フラグ）

## バックアップ/リストア

### バックアップの作成

```typescript
async createBackup(backupPath?: string): Promise<{
  backupPath: string
  sessionCount: number
  size: number
}>
```

現在のセッションをバックアップします。

**パラメータ:**
- `backupPath`: バックアップファイルのパス（省略可）

**戻り値:**
- バックアップ情報（パス、セッション数、サイズ）

### バックアップからの復元

```typescript
async restoreFromBackup(backupPath: string): Promise<{
  restored: number
  errors: string[]
}>
```

バックアップからセッションを復元します。

**パラメータ:**
- `backupPath`: バックアップファイルのパス

**戻り値:**
- 復元結果（復元したセッション数、エラー一覧）

### バックアップ一覧の取得

```typescript
async getBackupList(): Promise<Array<{
  path: string
  name: string
  createdAt: Date
  size: number
  sessionCount?: number
}>>
```

利用可能なバックアップの一覧を取得します。

**戻り値:**
- バックアップ一覧

## 統計情報

### 統計情報の取得

```typescript
async getStats(): Promise<ChatHistoryStats>
```

システムの統計情報を取得します。

**戻り値:**
- 統計情報
  - `totalSessions`: 総セッション数
  - `totalMessages`: 総メッセージ数
  - `totalSize`: 総ストレージサイズ
  - `averageMessagesPerSession`: セッションあたりの平均メッセージ数
  - `tagDistribution`: タグの分布
  - `lastUpdated`: 最終更新日時

## エラーハンドリング

### エラーの種類

- `ChatHistoryError`: 基本エラークラス
- `SessionNotFoundError`: セッションが見つからない場合
- `StorageError`: ストレージ操作エラー
- `ValidationError`: バリデーションエラー
- `BackupError`: バックアップ操作エラー
- `ImportError`: インポートエラー

### エラーハンドリングの例

```typescript
try {
  await service.createSession(session)
} catch (error) {
  if (error instanceof ValidationError) {
    // バリデーションエラーの処理
  } else if (error instanceof StorageError) {
    // ストレージエラーの処理
  } else {
    // その他のエラーの処理
  }
}
``` 