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

// HTTPクライアント
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Request failed: ${url}`, error)
      throw error
    }
  }

  // セッション一覧取得
  async getSessions(
    params: {
      page?: number
      limit?: number
      keyword?: string
      startDate?: string
      endDate?: string
      source?: string // 統合APIルートでソース指定をサポート
    } = {}
  ): Promise<ApiSessionsResponse> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    const query = searchParams.toString()
    const endpoint = `/sessions${query ? `?${query}` : ''}`

    return this.request<ApiSessionsResponse>(endpoint)
  }

  // 特定セッション取得
  async getSession(id: string): Promise<ApiSession> {
    return this.request<ApiSession>(`/sessions/${id}`)
  }

  // 統計情報取得
  async getStats(): Promise<ApiStats> {
    return this.request<ApiStats>('/stats')
  }

  // 検索実行
  async search(
    keyword: string,
    filters: Record<string, any> = {}
  ): Promise<ApiSearchResponse> {
    return this.request<ApiSearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify({ keyword, filters }),
    })
  }

  // セッション作成（開発・テスト用）
  async createSession(data: {
    title?: string
    description?: string
    tags?: string[]
  }): Promise<ApiSession> {
    return this.request<ApiSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ヘルスチェック
  async healthCheck(): Promise<{
    status: string
    timestamp: string
    uptime: number
  }> {
    return this.request<{ status: string; timestamp: string; uptime: number }>(
      '/health'
    )
  }

  // 設定関連API
  
  // Cursor設定取得
  async getCursorSettings(): Promise<CursorSettings> {
    const response = await this.request<SettingsApiResponse<CursorSettings>>('/settings/cursor')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Cursor設定の取得に失敗しました')
    }
    return response.data
  }

  // Cursor設定保存
  async saveCursorSettings(settings: CursorSettings): Promise<CursorSettings> {
    const response = await this.request<SettingsApiResponse<CursorSettings>>('/settings/cursor', {
      method: 'POST',
      body: JSON.stringify(settings),
    })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Cursor設定の保存に失敗しました')
    }
    return response.data
  }

  // Cursor設定リセット
  async resetCursorSettings(): Promise<CursorSettings> {
    const response = await this.request<SettingsApiResponse<CursorSettings>>('/settings/cursor/reset', {
      method: 'POST',
    })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Cursor設定のリセットに失敗しました')
    }
    return response.data
  }

  // 設定エクスポート
  async exportSettings(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/settings/export`)
    if (!response.ok) {
      throw new Error('設定のエクスポートに失敗しました')
    }
    return response.blob()
  }

  // 設定インポート
  async importSettings(settingsData: any): Promise<void> {
    const response = await this.request<SettingsApiResponse>('/settings/import', {
      method: 'POST',
      body: JSON.stringify(settingsData),
    })
    if (!response.success) {
      throw new Error(response.error || '設定のインポートに失敗しました')
    }
  }

  // バックアップ一覧取得
  async getBackupList(): Promise<BackupInfo[]> {
    const response = await this.request<SettingsApiResponse<BackupInfo[]>>('/settings/backups')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'バックアップ一覧の取得に失敗しました')
    }
    return response.data
  }

  // 設定サービスヘルスチェック
  async settingsHealthCheck(): Promise<{ status: string; message: string }> {
    const response = await this.request<SettingsApiResponse<{ status: string; message: string }>>('/settings/health')
    if (!response.success) {
      throw new Error(response.error || '設定サービスのヘルスチェックに失敗しました')
    }
    return response.data || { status: 'unknown', message: 'データなし' }
  }

  // 統合ログ取得
  async getIntegrationLogs(params: { limit?: number } = {}): Promise<any[]> {
    try {
      const searchParams = new URLSearchParams()
      if (params.limit) {
        searchParams.append('limit', params.limit.toString())
      }
      
      const endpoint = `/integration/logs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      console.log('🔍 統合ログ取得API呼び出し:', this.baseUrl + endpoint)
      
      const response = await this.request<{ logs: any[]; total: number; hasMore: boolean }>(endpoint)
      
      console.log('🔍 統合ログAPIレスポンス:', response)
      console.log('🔍 レスポンス型:', typeof response)
      console.log('🔍 レスポンスがオブジェクト:', response && typeof response === 'object')
      console.log('🔍 logsプロパティ存在:', response && 'logs' in response)
      
      // レスポンスがオブジェクトで、logsプロパティがある場合
      if (response && typeof response === 'object' && 'logs' in response) {
        const logs = response.logs
        console.log('🔍 logs プロパティ:', logs)
        console.log('🔍 logs が配列:', Array.isArray(logs))
        
        if (Array.isArray(logs)) {
          console.log('✅ レスポンスはオブジェクト形式:', logs.length + '件のログ')
          return logs
        } else {
          console.warn('⚠️ logs プロパティが配列ではありません:', logs)
          return []
        }
      }
      
      // レスポンスが配列の場合はそのまま返す
      if (Array.isArray(response)) {
        console.log('✅ レスポンスは配列形式:', (response as any[]).length + '件')
        return response as any[]
      }
      
      // その他の場合は空配列を返す
      console.warn('⚠️ 予期しないレスポンス形式:', response)
      return []
    } catch (error) {
      console.error('❌ 統合ログ取得エラー:', error)
      // エラー時は空配列を返してUIが壊れないようにする
      return []
    }
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient()

// React Query用のキー生成関数
export const queryKeys = {
  sessions: (params?: any) => ['sessions', params] as const,
  session: (id: string) => ['sessions', id] as const,
  stats: () => ['stats'] as const,
  search: (keyword: string, filters?: any) =>
    ['search', keyword, filters] as const,
  // 統合機能関連のクエリキー
  integrationStats: () => ['integration', 'stats'] as const,
  integrationLogs: (params?: any) => ['integration', 'logs', params] as const,
  integrationSettings: () => ['integration', 'settings'] as const,
  cursorStatus: () => ['integration', 'cursor', 'status'] as const,
  // 設定関連のクエリキー
  cursorSettings: () => ['settings', 'cursor'] as const,
  settingsBackups: () => ['settings', 'backups'] as const,
  settingsHealth: () => ['settings', 'health'] as const,
}
