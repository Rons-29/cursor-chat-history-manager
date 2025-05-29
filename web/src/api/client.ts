// APIクライアント設定
const API_BASE_URL = import.meta.env.VITE_API_URL || 
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
}
