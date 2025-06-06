/**
 * 🔍 Phase 3 高速検索結果型定義
 * SQLite FTS5による高度な検索結果
 */
export interface SearchResult {
  readonly id: string
  readonly title: string
  readonly content: string
  readonly snippet: string // FTS5スニペット (ハイライト付き)
  readonly timestamp: Date
  readonly platform: string
  readonly metadata: Record<string, any>
  readonly relevanceScore: number // 0-1の関連度スコア
  readonly messageCount: number
}

/**
 * 🎯 検索フィルターオプション
 */
export interface SearchFilters {
  readonly dateRange?: {
    readonly start: Date
    readonly end: Date
  }
  readonly platforms?: string[]
  readonly minLength?: number
  readonly maxResults?: number
  readonly includeMessages?: boolean
}

/**
 * ⚡ 検索性能メトリクス
 */
export interface SearchMetrics {
  readonly queryTime: number // ms
  readonly resultCount: number
  readonly totalMatches: number
  readonly searchMethod: 'fts5' | 'fulltext' | 'hybrid'
}

/**
 * 📊 検索レスポンス
 */
export interface SearchResponse {
  readonly results: SearchResult[]
  readonly metrics: SearchMetrics
  readonly hasMore: boolean
  readonly totalCount: number
} 