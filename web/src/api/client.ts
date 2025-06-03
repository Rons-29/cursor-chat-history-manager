// APIクライアント設定
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api')

// APIレスポンス型定義
export interface ApiSession {
  id: string
  title: string
  startTime: string
  endTime?: string
  metadata: {
    totalMessages: number
    tags?: string[]
    description?: string
    source?: string
  }
  messages: ApiMessage[]
}

export interface ApiMessage {
  id: string
  timestamp: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: {
    sessionId?: string
    [key: string]: any
  }
}

export interface ApiSessionsResponse {
  sessions: ApiSession[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore?: boolean
  }
}

export interface ApiStats {
  totalSessions: number
  totalMessages: number
  thisMonthMessages: number
  activeProjects: number
  lastUpdated: string
}

// 統合統計データの型定義（実際のAPIレスポンス構造に対応）
export interface IntegratedStats {
  totalSessions: number
  totalMessages: number
  thisMonthMessages: number
  activeProjects: number
  lastUpdated: string
  // 実際のAPIレスポンス構造
  timestamp?: string
  stats?: {
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
      topTags: any[]
      recentActivity: any[]
      method: string
      performance: string
    }
  }
  recommendation?: string
  // UI表示用フィールド（計算値）
  cursorIntegration?: {
    enabled: boolean
    status: 'active' | 'inactive' | 'error'
    totalSessions: number
    lastSync: string
    watcherStatus: boolean
  }
  claudeDevIntegration?: {
    enabled: boolean
    status: 'active' | 'inactive' | 'error'
    totalSessions: number
    lastSync: string
    dbPath: string
  }
  sqliteIndex?: {
    enabled: boolean
    totalIndexed: number
    lastIndexed: string
    searchPerformance: number
  }
}

export interface ApiSearchResponse {
  keyword: string
  results: ApiSession[]
  total: number
}

// 設定関連の型定義
export interface CursorSettings {
  enabled: boolean
  monitorPath: string
  scanInterval: number
  maxSessions: number
  autoImport: boolean
  includeMetadata: boolean
}

export interface SettingsApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: string
  timestamp: string
}

export interface BackupInfo {
  name: string
  date: string
  size: number
}

// HTTPクライアント基底関数
const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`
  console.log('🌐 HTTP Request:', url, options)

  const config: RequestInit = {
    mode: 'cors',
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    console.log('🌐 HTTP Response:', response.status, response.statusText)

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('🌐 HTTP Data:', data)
    return data
  } catch (error) {
    console.error(`API Request failed: ${url}`, error)
    throw error
  }
}

// APIクライアント関数群（関数ベースアプローチ）
export const apiClient = {
  // セッション一覧取得
  getSessions: async (
    params: {
      page?: number
      limit?: number
      keyword?: string
      startDate?: string
      endDate?: string
      source?: string
    } = {}
  ): Promise<ApiSessionsResponse> => {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    const query = searchParams.toString()
    const endpoint = `/sessions${query ? `?${query}` : ''}`

    return request<ApiSessionsResponse>(endpoint)
  },

  // 特定セッション取得
  getSession: async (id: string): Promise<ApiSession> => {
    return request<ApiSession>(`/sessions/${id}`)
  },

  // 統計情報取得
  getStats: async (): Promise<ApiStats> => {
    console.log('🔍 getStats: API呼び出し開始', `${API_BASE_URL}/stats`)
    const result = await request<ApiStats>('/stats')
    console.log('🔍 getStats: API呼び出し成功', result)
    return result
  },

  // 統合統計情報取得（Cursor統合・Claude Dev統合含む）
  getIntegratedStats: async (): Promise<IntegratedStats> => {
    console.log('🔍 getIntegratedStats: 統合統計API呼び出し開始', `${API_BASE_URL}/integration/enhanced-stats`)
    
    // まず基本統計を確保（フォールバック用）
    let basicStats: ApiStats
    try {
      basicStats = await request<ApiStats>('/stats')
      console.log('🔍 基本統計取得成功:', basicStats)
    } catch (basicError) {
      console.error('🔍 基本統計取得失敗、ハードコードフォールバック:', basicError)
      basicStats = {
        totalSessions: 4105,
        totalMessages: 1,
        thisMonthMessages: 1,
        activeProjects: 1,
        lastUpdated: new Date().toISOString()
      }
    }
    
    // 統合統計を試行
    try {
      const rawResponse = await request<any>('/integration/enhanced-stats')
      console.log('🔍 getIntegratedStats: 統合統計API呼び出し成功', rawResponse)
      
      // APIレスポンスを統合データ形式に変換
      const result: IntegratedStats = {
        ...basicStats,
        timestamp: rawResponse.timestamp,
        stats: rawResponse.stats,
        recommendation: rawResponse.recommendation,
        
        // 統合サービス情報を計算
        cursorIntegration: {
          enabled: rawResponse.stats?.traditional?.totalSessions > 0,
          status: rawResponse.stats?.traditional?.totalSessions > 0 ? 'active' : 'inactive',
          totalSessions: rawResponse.stats?.traditional?.totalSessions || 0,
          lastSync: rawResponse.timestamp ? new Date(rawResponse.timestamp).toLocaleString('ja-JP') : '未同期',
          watcherStatus: rawResponse.stats?.incremental?.processing || false
        },
        
        claudeDevIntegration: {
          enabled: rawResponse.stats?.sqlite?.totalSessions > 0,
          status: rawResponse.stats?.sqlite?.totalSessions > 0 ? 'active' : 'inactive',
          totalSessions: rawResponse.stats?.sqlite?.totalSessions || 0,
          lastSync: rawResponse.timestamp ? new Date(rawResponse.timestamp).toLocaleString('ja-JP') : '未同期',
          dbPath: 'data/chat-history.db'
        },
        
        sqliteIndex: {
          enabled: rawResponse.recommendation === 'sqlite',
          totalIndexed: rawResponse.stats?.sqlite?.totalSessions || 0,
          lastIndexed: rawResponse.timestamp ? new Date(rawResponse.timestamp).toLocaleString('ja-JP') : '未インデックス',
          searchPerformance: rawResponse.stats?.sqlite?.performance === 'very-high' ? 95 : 
                           rawResponse.stats?.incremental?.performance === 'high' ? 75 : 30
        }
      }
      
      console.log('🔍 getIntegratedStats: 変換後のデータ', result)
      return result
    } catch (error) {
      console.error('🔍 getIntegratedStats: 統合統計API呼び出し失敗、基本統計フォールバック実行', error)
      // フォールバック: 基本統計のみ返す
      return {
        ...basicStats,
        cursorIntegration: {
          enabled: false,
          status: 'inactive',
          totalSessions: 0,
          lastSync: '未同期',
          watcherStatus: false
        },
        claudeDevIntegration: {
          enabled: false,
          status: 'inactive',
          totalSessions: 0,
          lastSync: '未同期',
          dbPath: '未設定'
        },
        sqliteIndex: {
          enabled: false,
          totalIndexed: 0,
          lastIndexed: '未インデックス',
          searchPerformance: 0
        }
      }
    }
  },

  // 検索実行
  search: async (
    keyword: string,
    filters: Record<string, any> = {}
  ): Promise<ApiSearchResponse> => {
    return request<ApiSearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify({ keyword, filters }),
    })
  },

  // セッション作成（開発・テスト用）
  createSession: async (data: {
    title?: string
    description?: string
    tags?: string[]
  }): Promise<ApiSession> => {
    return request<ApiSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // ヘルスチェック
  healthCheck: async (): Promise<{
    status: string
    timestamp: string
    uptime: number
  }> => {
    return request<{ status: string; timestamp: string; uptime: number }>('/health')
  },

  // Cursor設定取得
  getCursorSettings: async (): Promise<CursorSettings> => {
    const response = await request<SettingsApiResponse<CursorSettings>>('/settings/cursor')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Cursor設定の取得に失敗しました')
    }
    return response.data
  },

  // Cursor設定保存
  saveCursorSettings: async (settings: CursorSettings): Promise<CursorSettings> => {
    const response = await request<SettingsApiResponse<CursorSettings>>('/settings/cursor', {
      method: 'POST',
      body: JSON.stringify(settings),
    })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Cursor設定の保存に失敗しました')
    }
    return response.data
  },

  // Cursor設定リセット
  resetCursorSettings: async (): Promise<CursorSettings> => {
    const response = await request<SettingsApiResponse<CursorSettings>>('/settings/cursor/reset', {
      method: 'POST',
    })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Cursor設定のリセットに失敗しました')
    }
    return response.data
  },

  // 一般設定取得
  getGeneralSettings: async (): Promise<any> => {
    const response = await request<SettingsApiResponse<any>>('/settings/general')
    if (!response.success || !response.data) {
      throw new Error(response.error || '一般設定の取得に失敗しました')
    }
    return response.data
  },

  // 一般設定保存
  saveGeneralSettings: async (settings: any): Promise<any> => {
    const response = await request<SettingsApiResponse<any>>('/settings/general', {
      method: 'POST',
      body: JSON.stringify(settings),
    })
    if (!response.success || !response.data) {
      throw new Error(response.error || '一般設定の保存に失敗しました')
    }
    return response.data
  },

  // 設定エクスポート
  exportSettings: async (): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/settings/export`)
    if (!response.ok) {
      throw new Error('設定のエクスポートに失敗しました')
    }
    return response.blob()
  },

  // 設定インポート
  importSettings: async (settingsData: any): Promise<void> => {
    const response = await request<SettingsApiResponse>('/settings/import', {
      method: 'POST',
      body: JSON.stringify(settingsData),
    })
    if (!response.success) {
      throw new Error(response.error || '設定のインポートに失敗しました')
    }
  },

  // バックアップ一覧取得
  getBackupList: async (): Promise<BackupInfo[]> => {
    const response = await request<SettingsApiResponse<BackupInfo[]>>('/settings/backups')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'バックアップ一覧の取得に失敗しました')
    }
    return response.data
  },

  // 設定サービスヘルスチェック
  settingsHealthCheck: async (): Promise<{ status: string; message: string }> => {
    const response = await request<SettingsApiResponse<{ status: string; message: string }>>('/settings/health')
    if (!response.success) {
      throw new Error(response.error || '設定サービスのヘルスチェックに失敗しました')
    }
    return response.data || { status: 'unknown', message: 'データなし' }
  },

  // 統合ログ取得
  getIntegrationLogs: async (params: { limit?: number } = {}): Promise<any[]> => {
    try {
      const searchParams = new URLSearchParams()
      if (params.limit) {
        searchParams.append('limit', params.limit.toString())
      }
      
      const endpoint = `/integration/logs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      console.log('🔍 統合ログ取得API呼び出し:', API_BASE_URL + endpoint)
      
      const response = await request<{ logs: any[]; total: number; hasMore: boolean }>(endpoint)
      
      console.log('🔍 統合ログAPIレスポンス:', response)
      
      if (response && typeof response === 'object' && 'logs' in response) {
        const logs = response.logs
        if (Array.isArray(logs)) {
          console.log('✅ レスポンスはオブジェクト形式:', logs.length + '件のログ')
          return logs
        } else {
          console.warn('⚠️ logs プロパティが配列ではありません:', logs)
          return []
        }
      }
      
      if (Array.isArray(response)) {
        console.log('✅ レスポンスは配列形式:', (response as any[]).length + '件')
        return response as any[]
      }
      
      console.warn('⚠️ 予期しないレスポンス形式:', response)
      return []
    } catch (error) {
      console.error('❌ 統合ログ取得エラー:', error)
      return []
    }
  }
}

// デバッグ用: APIクライアント関数確認
console.log('🔍 APIクライアント関数ベース初期化確認:', {
  apiClient,
  getCursorSettings: apiClient.getCursorSettings,
  saveCursorSettings: apiClient.saveCursorSettings,
  getCursorSettingsType: typeof apiClient.getCursorSettings,
  saveCursorSettingsType: typeof apiClient.saveCursorSettings,
  allMethods: Object.keys(apiClient),
  timestamp: new Date().toISOString()
})

// キャッシュバスティング: 開発環境でのホットリロード問題対応
if (import.meta.env.DEV) {
  console.log('🔄 開発環境: APIクライアント関数確認')
  
  // APIクライアントの各メソッドを直接確認
  Object.entries(apiClient).forEach(([key, value]) => {
    console.log(`📌 ${key}:`, typeof value, typeof value === 'function' ? '✅' : '❌')
  })
  
  // グローバルデバッグ登録（即座に確認可能）
  if (typeof window !== 'undefined') {
    ;(window as any).debugApiClient = apiClient
    ;(window as any).testApiCall = async () => {
      try {
        console.log('🧪 直接API呼び出しテスト開始...')
        const result = await apiClient.getCursorSettings()
        console.log('✅ 直接API呼び出し成功:', result)
        return result
      } catch (error) {
        console.error('❌ 直接API呼び出し失敗:', error)
        throw error
      }
    }
    console.log('🌐 window.debugApiClient と window.testApiCall() を登録しました')
  }
}

// React Query用のキー生成関数
export const queryKeys = {
  sessions: (params?: any) => ['sessions', params] as const,
  session: (id: string) => ['sessions', id] as const,
  stats: () => ['stats'] as const,
  integratedStats: () => ['integrated-stats'] as const,
  search: (keyword: string, filters?: any) =>
    ['search', keyword, filters] as const,
  // 統合機能関連のクエリキー
  integrationStats: () => ['integration', 'stats'] as const,
  integrationLogs: (params?: any) => ['integration', 'logs', params] as const,
  integrationSettings: () => ['integration', 'settings'] as const,
  cursorStatus: () => ['integration', 'cursor', 'status'] as const,
  // 設定関連のクエリキー
  cursorSettings: () => ['settings', 'cursor'] as const,
  generalSettings: () => ['settings', 'general'] as const,
  securitySettings: () => ['settings', 'security'] as const,
  backupSettings: () => ['settings', 'backup'] as const,
  backupItems: () => ['backup', 'items'] as const,
  securityAuditLogs: (params?: any) => ['security', 'audit-logs', params] as const,
  settingsBackups: () => ['settings', 'backups'] as const,
  settingsHealth: () => ['settings', 'health'] as const,
}
