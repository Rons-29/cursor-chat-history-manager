/**
 * Integration API Client - 統合機能のAPIクライアント
 * .mdcルール準拠: 型安全、エラーハンドリング、再利用可能
 */

// 統計情報の型定義
export interface IntegrationStats {
  totalSessions: number
  totalMessages: number
  cursorSessions: number
  cursorMessages: number
  regularSessions: number
  regularMessages: number
  lastSync?: string
  isWatching: boolean
  error?: string
}

// Cursorステータスの型定義
export interface CursorStatus {
  isWatching: boolean
  cursorPath?: string
  lastScan?: string
  sessionsFound: number
  error?: string
}

// 初期化設定の型定義
export interface IntegrationConfig {
  cursor: {
    enabled: boolean
    watchPath: string
    autoImport: boolean
  }
}

// スキャン結果の型定義
export interface ScanResult {
  success: boolean
  sessionsFound: number
  messagesImported: number
  errors?: string[]
  duration: number
}

// APIエラーの型定義
export interface ApiError {
  error: string
  message: string
  details?: any
}

/**
 * 統計情報を取得
 */
export const getIntegrationStats = async (): Promise<IntegrationStats> => {
  try {
    const response = await fetch('/api/integration/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || '統計情報の取得に失敗しました')
    }

    return await response.json()
  } catch (error) {
    console.error('統計情報取得エラー:', error)
    throw error
  }
}

/**
 * Cursorステータスを取得
 */
export const getCursorStatus = async (): Promise<CursorStatus> => {
  try {
    const response = await fetch('/api/integration/cursor/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || 'Cursorステータスの取得に失敗しました')
    }

    return await response.json()
  } catch (error) {
    console.error('Cursorステータス取得エラー:', error)
    throw error
  }
}

/**
 * 統合機能を初期化
 */
export const initializeIntegration = async (config: IntegrationConfig): Promise<void> => {
  try {
    const response = await fetch('/api/integration/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || '初期化に失敗しました')
    }
  } catch (error) {
    console.error('初期化エラー:', error)
    throw error
  }
}

/**
 * Cursorスキャンを実行
 */
export const scanCursor = async (): Promise<ScanResult> => {
  try {
    const response = await fetch('/api/integration/cursor/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || 'スキャンに失敗しました')
    }

    return await response.json()
  } catch (error) {
    console.error('スキャンエラー:', error)
    throw error
  }
}

/**
 * 監視を開始
 */
export const startWatching = async (): Promise<void> => {
  try {
    const response = await fetch('/api/integration/cursor/watch/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || '監視の開始に失敗しました')
    }
  } catch (error) {
    console.error('監視開始エラー:', error)
    throw error
  }
}

/**
 * 監視を停止
 */
export const stopWatching = async (): Promise<void> => {
  try {
    const response = await fetch('/api/integration/cursor/watch/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || '監視の停止に失敗しました')
    }
  } catch (error) {
    console.error('監視停止エラー:', error)
    throw error
  }
}

/**
 * Cursorセッション一覧を取得
 */
export const getCursorSessions = async (limit?: number, offset?: number) => {
  try {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())
    params.append('source', 'cursor')

    const response = await fetch(`/api/sessions?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || 'Cursorセッションの取得に失敗しました')
    }

    return await response.json()
  } catch (error) {
    console.error('Cursorセッション取得エラー:', error)
    throw error
  }
}

/**
 * 統合ログを取得
 */
export const getIntegrationLogs = async (limit: number = 100) => {
  try {
    const response = await fetch(`/api/integration/logs?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || 'ログの取得に失敗しました')
    }

    return await response.json()
  } catch (error) {
    console.error('ログ取得エラー:', error)
    throw error
  }
}

/**
 * 設定保存
 */
export const saveIntegrationSettings = async (settings: any): Promise<void> => {
  try {
    const response = await fetch('/api/integration/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    })
    
    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || '設定保存に失敗しました')
    }
  } catch (error) {
    console.error('設定保存エラー:', error)
    throw error
  }
}

/**
 * 設定取得
 */
export const getIntegrationSettings = async (): Promise<any> => {
  try {
    const response = await fetch('/api/integration/settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || '設定取得に失敗しました')
    }
    
    return await response.json()
  } catch (error) {
    console.error('設定取得エラー:', error)
    throw error
  }
} 