import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient, queryKeys } from '../api/client.js'

interface SearchResult {
  sessionId: string
  sessionTitle: string
  messageIndex: number
  content: string
  timestamp: string
  score: number
  source?: string
  messageType?: string
  tags?: string[]
}

interface SearchFilters {
  dateRange: {
    start?: string
    end?: string
  }
  sources: string[]
  tags: string[]
  messageTypes: string[]
  scorRange: [number, number]
}

interface UseEnhancedSearchOptions {
  debounceMs?: number
  enableFilters?: boolean
  maxResults?: number
  enableCache?: boolean
  onResultSelect?: (result: SearchResult) => void
}

interface UseEnhancedSearchReturn {
  // 検索状態
  query: string
  setQuery: (query: string) => void
  filters: SearchFilters
  setFilters: (filters: SearchFilters) => void
  
  // 検索結果
  results: SearchResult[]
  isLoading: boolean
  error: Error | null
  
  // 検索履歴
  recentSearches: string[]
  clearSearchHistory: () => void
  
  // 検索実行
  executeSearch: (searchQuery?: string) => void
  clearSearch: () => void
  
  // 統計情報
  totalResults: number
  searchDuration: number
  
  // フィルタリング
  filteredResults: SearchResult[]
  activeFiltersCount: number
  
  // ユーティリティ
  highlightText: (text: string, query: string) => string
  formatTime: (dateString: string) => string
}

/**
 * ChatFlow用統合検索カスタムフック
 * - Discord風リアルタイム検索
 * - Notion風フィルタリング
 * - 検索履歴管理
 * - SQLite統合検索
 * - パフォーマンス最適化
 */
export const useEnhancedSearch = (options: UseEnhancedSearchOptions = {}): UseEnhancedSearchReturn => {
  const {
    debounceMs = 300,
    enableFilters = true,
    maxResults = 50,
    enableCache = true
  } = options

  // 検索状態
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: {},
    sources: [],
    tags: [],
    messageTypes: [],
    scorRange: [0, 100]
  })
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [searchDuration, setSearchDuration] = useState(0)
  
  // デバウンス用
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const searchStartTimeRef = useRef<number>(0)

  // 検索履歴の読み込み
  useEffect(() => {
    const saved = localStorage.getItem('chatflow-enhanced-search-history')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.warn('検索履歴の読み込みに失敗:', error)
      }
    }
  }, [])

  // アクティブフィルター数の計算（先に定義）
  const activeFiltersCount = useMemo(() => {
    return filters.sources.length +
           filters.tags.length +
           filters.messageTypes.length +
           (filters.dateRange.start || filters.dateRange.end ? 1 : 0) +
           (filters.scorRange[0] > 0 || filters.scorRange[1] < 100 ? 1 : 0)
  }, [filters])

  // デバウンス処理
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query)
      if (query.trim()) {
        searchStartTimeRef.current = Date.now()
      }
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, debounceMs])

  // 検索条件判定（useQuery外で定義）
  const hasActiveFilters = activeFiltersCount > 0
  const hasValidQuery = debouncedQuery.trim() && debouncedQuery.length >= 2

  // メイン検索クエリ（フィルターのみでも実行可能）
  const {
    data: searchResults = [],
    isLoading,
    error
  } = useQuery({
    queryKey: (queryKeys as any).enhancedSearch(debouncedQuery, filters),
    queryFn: async (): Promise<SearchResult[]> => {
      // フィルターのみの場合も検索実行
      if (!hasValidQuery && !hasActiveFilters) return []

      try {
        // SQLite検索を優先使用
        try {
          const sqliteResponse = await (apiClient as any).sqliteSearch(hasValidQuery ? debouncedQuery : '', {
            page: 1,
            pageSize: maxResults,
            filters: enableFilters ? filters : undefined,
            filterOnly: !hasValidQuery // フィルターのみモード
          })
          
          if (sqliteResponse.success && sqliteResponse.results) {
            const results = sqliteResponse.results.map((result: any, index: number) => ({
              sessionId: result.session_id || result.sessionId,
              sessionTitle: result.session_title || result.sessionTitle || `セッション ${result.session_id?.slice(0, 8)}`,
              messageIndex: result.message_index || index,
              content: result.content,
              timestamp: result.timestamp,
              score: result.score || 1,
              source: result.source || 'unknown',
              messageType: result.message_type || result.messageType || 'user',
              tags: result.tags || []
            }))

            // 検索時間を記録
            setSearchDuration(Date.now() - searchStartTimeRef.current)
            return results
          }
        } catch (sqliteError) {
          console.log('SQLite検索が利用できません、フォールバック検索を使用:', sqliteError)
        }

        // フォールバック: 通常の検索API（フィルターのみでも対応）
        if (!hasValidQuery && !hasActiveFilters) {
          return []
        }
        
        const response = await apiClient.search(hasValidQuery ? debouncedQuery : ' ', { 
          ...filters,
          filterOnly: !hasValidQuery
        })
        const results: SearchResult[] = []

        if (response.results && Array.isArray(response.results)) {
          response.results.forEach(session => {
            if (!session || !session.messages) return
            session.messages.forEach((message, index) => {
              if (message.content.toLowerCase().includes(debouncedQuery.toLowerCase())) {
                results.push({
                  sessionId: session.id,
                  sessionTitle: session.title || `セッション ${session.id.slice(0, 8)}`,
                  messageIndex: index,
                  content: message.content,
                  timestamp: message.timestamp,
                  score: debouncedQuery
                    .toLowerCase()
                    .split(' ')
                    .reduce((score, word) => {
                      const matches = (message.content.toLowerCase().match(new RegExp(word, 'g')) || []).length
                      return score + matches
                    }, 0),
                                     source: (session as any).source || 'unknown',
                   messageType: message.role || 'user',
                   tags: (message as any).tags || []
                })
              }
            })
          })
        }

        const sortedResults = results.sort((a, b) => b.score - a.score).slice(0, maxResults)
        setSearchDuration(Date.now() - searchStartTimeRef.current)
        return sortedResults
      } catch (error) {
        console.error('検索エラー:', error)
        setSearchDuration(Date.now() - searchStartTimeRef.current)
        return []
      }
    },
    enabled: hasValidQuery || hasActiveFilters, // フィルターのみでも有効
    staleTime: enableCache ? 1000 * 60 * 5 : 0, // 5分間キャッシュ
    retry: 1,
  })

  // フィルタリング処理
  const filteredResults = useMemo(() => {
    if (!enableFilters || !searchResults) return searchResults

    return searchResults.filter(result => {
      // 日付フィルター
      if (filters.dateRange.start || filters.dateRange.end) {
        const resultDate = new Date(result.timestamp)
        if (filters.dateRange.start && resultDate < new Date(filters.dateRange.start)) return false
        if (filters.dateRange.end && resultDate > new Date(filters.dateRange.end + 'T23:59:59')) return false
      }

      // ソースフィルター
      if (filters.sources.length > 0 && !filters.sources.includes(result.source || '')) return false

      // メッセージタイプフィルター
      if (filters.messageTypes.length > 0 && !filters.messageTypes.includes(result.messageType || '')) return false

      // タグフィルター
      if (filters.tags.length > 0) {
        const resultTags = result.tags || []
        const hasMatchingTag = filters.tags.some(tag => resultTags.includes(tag))
        if (!hasMatchingTag) return false
      }

      // スコアフィルター
      if (result.score < filters.scorRange[0] || result.score > filters.scorRange[1]) return false

      return true
    })
  }, [searchResults, filters, enableFilters])



  // 検索実行
  const executeSearch = (searchQuery?: string) => {
    const queryToExecute = searchQuery || query
    if (!queryToExecute.trim()) return

    // 検索履歴に追加
    const newHistory = [queryToExecute, ...recentSearches.filter(item => item !== queryToExecute)].slice(0, 10)
    setRecentSearches(newHistory)
    localStorage.setItem('chatflow-enhanced-search-history', JSON.stringify(newHistory))

    // クエリ更新（デバウンス経由で検索実行）
    setQuery(queryToExecute)
  }

  // 検索履歴クリア
  const clearSearchHistory = () => {
    setRecentSearches([])
    localStorage.removeItem('chatflow-enhanced-search-history')
  }

  // 検索クリア
  const clearSearch = () => {
    setQuery('')
    setDebouncedQuery('')
    setFilters({
      dateRange: {},
      sources: [],
      tags: [],
      messageTypes: [],
      scorRange: [0, 100]
    })
  }

  // テキストハイライト（React要素ではなく文字列を返すように変更）
  const highlightText = (text: string, highlight: string): string => {
    if (!highlight) return text
    
    const regex = new RegExp(`(${highlight})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100">$1</mark>')
  }

  // 時間フォーマット
  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '不明'
    }
  }

  return {
    // 検索状態
    query,
    setQuery,
    filters,
    setFilters,
    
    // 検索結果
    results: filteredResults,
    isLoading,
    error,
    
    // 検索履歴
    recentSearches,
    clearSearchHistory,
    
    // 検索実行
    executeSearch,
    clearSearch,
    
    // 統計情報
    totalResults: filteredResults.length,
    searchDuration,
    
    // フィルタリング
    filteredResults,
    activeFiltersCount,
    
    // ユーティリティ
    highlightText,
    formatTime
  }
}

// QueryKeysはapi/client.jsで既に定義済み 