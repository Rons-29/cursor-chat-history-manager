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

// Enhanced統計情報の型定義（実際のAPIレスポンス）
export interface EnhancedStats {
  timestamp: string
  stats: {
    traditional: {
      totalSessions: number
      method: string
      performance: string
    }
    incremental: {
      totalSessions: number
      queueSize: number
      processing: boolean
      method: string
      performance: string
    }
    sqlite: {
      totalSessions: number
      totalMessages: number
      topTags: Array<{ name: string; count: number }>
      recentActivity: Array<{ date: string; sessionCount: number }>
      method: string
      performance: string
    }
  }
  recommendation: string
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
 * APIサーバーの接続状態
 */
export interface ApiConnectionStatus {
  isConnected: boolean
  serverUrl: string
  lastChecked: Date
  error?: string
}

/**
 * APIサーバーの接続チェック
 */
export const checkApiConnection = async (): Promise<ApiConnectionStatus> => {
  const serverUrl = window.location.origin
  const lastChecked = new Date()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒タイムアウト
    
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      return {
        isConnected: true,
        serverUrl,
        lastChecked
      }
    } else {
      return {
        isConnected: false,
        serverUrl,
        lastChecked,
        error: `サーバーエラー: ${response.status} ${response.statusText}`
      }
    }
  } catch (error) {
    let errorMessage = 'APIサーバーに接続できません'
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'APIサーバーへの接続がタイムアウトしました（5秒）'
      } else if (error.message.includes('fetch')) {
        errorMessage = 'APIサーバーが起動していません'
      } else {
        errorMessage = `接続エラー: ${error.message}`
      }
    }
    
    return {
      isConnected: false,
      serverUrl,
      lastChecked,
      error: errorMessage
    }
  }
}

/**
 * APIサーバー接続チェック付きのfetch関数
 */
const fetchWithConnectionCheck = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  // まず接続チェック
  const connectionStatus = await checkApiConnection()
  
  if (!connectionStatus.isConnected) {
    throw new Error(connectionStatus.error || 'APIサーバーに接続できません')
  }
  
  // 正しいベースURLを構築
  const baseUrl = 'http://localhost:3001'
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
  
  console.log(`🌐 API Request: ${options.method || 'GET'} ${fullUrl}`)
  
  // 通常のfetch実行
  const response = await fetch(fullUrl, options)
  
  console.log(`📡 API Response: ${response.status} ${response.statusText}`)
  
  return response
}

/**
 * 統計情報を取得
 */
export const getIntegrationStats = async (): Promise<IntegrationStats> => {
  console.log('🔍 統計情報を取得中...')
  
  try {
    const response = await fetch('/api/integration/enhanced-stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('📊 統計情報APIレスポンス:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 統計情報API エラー:', errorText)
      throw new Error(`統計情報の取得に失敗しました: ${response.status} ${response.statusText}`)
    }

    const enhancedStats: EnhancedStats = await response.json()
    console.log('✅ Enhanced統計情報取得成功:', enhancedStats)
    
    // Enhanced統計情報を従来の形式に変換
    const convertedStats = {
      totalSessions: enhancedStats.stats.sqlite.totalSessions || enhancedStats.stats.traditional.totalSessions,
      totalMessages: enhancedStats.stats.sqlite.totalMessages || 0,
      cursorSessions: enhancedStats.stats.sqlite.totalSessions || 0,
      cursorMessages: enhancedStats.stats.sqlite.totalMessages || 0,
      regularSessions: enhancedStats.stats.traditional.totalSessions || 0,
      regularMessages: 0,
      lastSync: enhancedStats.timestamp,
      isWatching: enhancedStats.stats.incremental.processing,
      error: undefined
    }
    
    console.log('🔄 変換後の統計情報:', convertedStats)
    return convertedStats
  } catch (error) {
    console.error('❌ 統計情報取得エラー:', error)
    
    // フォールバック: デフォルト値を返す
    const fallbackStats = {
      totalSessions: 0,
      totalMessages: 0,
      cursorSessions: 0,
      cursorMessages: 0,
      regularSessions: 0,
      regularMessages: 0,
      lastSync: new Date().toISOString(),
      isWatching: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    
    console.log('🔄 フォールバック統計情報:', fallbackStats)
    return fallbackStats
  }
}

/**
 * Enhanced統計情報を直接取得
 */
export const getEnhancedStats = async (): Promise<EnhancedStats> => {
  try {
    const response = await fetch('/api/integration/enhanced-stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json()
      throw new Error(errorData.message || 'Enhanced統計情報の取得に失敗しました')
    }

    return await response.json()
  } catch (error) {
    console.error('Enhanced統計情報取得エラー:', error)
    throw error
  }
}

/**
 * Cursorステータスを取得
 */
export const getCursorStatus = async (): Promise<CursorStatus> => {
  try {
    const response = await fetchWithConnectionCheck('/api/integration/cursor/status', {
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
    const response = await fetchWithConnectionCheck('/api/integration/cursor/scan', {
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
    const response = await fetchWithConnectionCheck('/api/integration/cursor/watch/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      // レスポンスが空の場合の処理
      let errorMessage = '監視の開始に失敗しました'
      try {
        const errorData: ApiError = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch (jsonError) {
        // JSONパースエラーの場合はステータステキストを使用
        errorMessage = `${errorMessage} (${response.status} ${response.statusText})`
      }
      throw new Error(errorMessage)
    }

    // 成功時のレスポンス処理（空の場合もある）
    try {
      const responseText = await response.text()
      if (responseText) {
        const result = JSON.parse(responseText)
        console.log('✅ 監視開始成功:', result)
      } else {
        console.log('✅ 監視開始成功 (レスポンスなし)')
      }
    } catch (jsonError) {
      // JSONパースエラーは無視（成功時でもレスポンスが空の場合がある）
      console.log('✅ 監視開始成功 (レスポンス解析不可)')
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
    const response = await fetchWithConnectionCheck('/api/integration/cursor/watch/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      // レスポンスが空の場合の処理
      let errorMessage = '監視の停止に失敗しました'
      try {
        const errorData: ApiError = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch (jsonError) {
        // JSONパースエラーの場合はステータステキストを使用
        errorMessage = `${errorMessage} (${response.status} ${response.statusText})`
      }
      throw new Error(errorMessage)
    }

    // 成功時のレスポンス処理（空の場合もある）
    try {
      const responseText = await response.text()
      if (responseText) {
        const result = JSON.parse(responseText)
        console.log('✅ 監視停止成功:', result)
      } else {
        console.log('✅ 監視停止成功 (レスポンスなし)')
      }
    } catch (jsonError) {
      // JSONパースエラーは無視（成功時でもレスポンスが空の場合がある）
      console.log('✅ 監視停止成功 (レスポンス解析不可)')
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
    params.append('source', 'cursor') // 統合APIルートでCursorデータを指定

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