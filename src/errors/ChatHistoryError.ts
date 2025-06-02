export class ChatHistoryError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'ChatHistoryError'
  }
}

export class SessionNotFoundError extends ChatHistoryError {
  constructor(sessionId: string) {
    super(`セッションが見つかりません: ${sessionId}`)
    this.name = 'SessionNotFoundError'
  }
}

export class StorageError extends ChatHistoryError {
  constructor(operation: string, cause?: Error) {
    super(`ストレージ操作エラー (${operation})`, cause)
    this.name = 'StorageError'
  }
}

export class ValidationError extends ChatHistoryError {
  constructor(message: string) {
    super(`バリデーションエラー: ${message}`)
    this.name = 'ValidationError'
  }
}

export class BackupError extends ChatHistoryError {
  constructor(operation: string, cause?: Error) {
    super(`バックアップ操作エラー (${operation})`, cause)
    this.name = 'BackupError'
  }
}

export class ImportError extends ChatHistoryError {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(`インポートエラー: ${message}`)
    this.name = 'ImportError'
  }
}
