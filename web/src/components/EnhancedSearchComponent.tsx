import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client.js'

interface SearchResult {
  sessionId: string
  sessionTitle: string
  messageIndex: number
  content: string
  timestamp: string
  score: number
}

interface SearchSuggestion {
  text: string
  type: 'recent' | 'popular' | 'suggestion'
}

interface EnhancedSearchProps {
  onResultSelect?: (sessionId: string, messageIndex: number) => void
  placeholder?: string
  className?: string
}

/**
 * Discord風リアルタイム検索コンポーネント
 * - 300msデバウンス
 * - 検索履歴保存
 * - キーボードナビゲーション
 * - リアルタイム候補表示
 */
export const EnhancedSearchComponent: React.FC<EnhancedSearchProps> = ({
  onResultSelect,
  placeholder = "メッセージを検索... (例: React TypeScript エラー)",
  className = ""
}) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // デバウンス用のタイマー
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // 検索履歴をローカルストレージから読み込み
  useEffect(() => {
    const saved = localStorage.getItem('chatflow-search-history')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.warn('検索履歴の読み込みに失敗:', error)
      }
    }
  }, [])

  // デバウンス処理
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query])

  // リアルタイム検索クエリ
  const {
    data: searchResults = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['enhanced-search', debouncedQuery],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) return []

      try {
        // SQLite検索を優先的に使用
        try {
          const sqliteResponse = await (apiClient as any).sqliteSearch(debouncedQuery, {
            page: 1,
            pageSize: 10
          })
          
          if (sqliteResponse.success && sqliteResponse.results) {
            return sqliteResponse.results.map((result: any, index: number) => ({
              sessionId: result.session_id || result.sessionId,
              sessionTitle: result.session_title || result.sessionTitle || `セッション ${result.session_id?.slice(0, 8)}`,
              messageIndex: result.message_index || index,
              content: result.content,
              timestamp: result.timestamp,
              score: result.score || 1
            }))
          }
        } catch (sqliteError) {
          console.log('SQLite検索が利用できません、フォールバック検索を使用:', sqliteError)
        }

        // フォールバック: 通常の検索API
        const response = await apiClient.search(debouncedQuery)
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
                })
              }
            })
          })
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 10)
      } catch (error) {
        console.error('検索エラー:', error)
        return []
      }
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  })

  // 検索候補の生成
  const suggestions: SearchSuggestion[] = [
    ...recentSearches.slice(0, 3).map(text => ({ text, type: 'recent' as const })),
    ...(query.length >= 2 ? [
      { text: `${query} エラー`, type: 'suggestion' as const },
      { text: `${query} 解決`, type: 'suggestion' as const },
      { text: `${query} TypeScript`, type: 'suggestion' as const },
    ] : [])
  ]

  // 全体のアイテム（候補 + 検索結果）
  const allItems = [
    ...suggestions,
    ...(searchResults || [])
  ]

  // 検索実行
  const executeSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    // 検索履歴に追加
    const newHistory = [searchQuery, ...recentSearches.filter(item => item !== searchQuery)].slice(0, 10)
    setRecentSearches(newHistory)
    localStorage.setItem('chatflow-search-history', JSON.stringify(newHistory))

    setIsOpen(false)
    setQuery(searchQuery)
  }

  // 結果選択
  const selectResult = (result: SearchResult) => {
    if (onResultSelect) {
      onResultSelect(result.sessionId, result.messageIndex)
    } else {
      navigate(`/sessions/${result.sessionId}#message-${result.messageIndex}`)
    }
    setIsOpen(false)
  }

  // キーボードイベント処理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
        setActiveIndex(0)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        setActiveIndex(prev => Math.min(prev + 1, allItems.length - 1))
        e.preventDefault()
        break
      case 'ArrowUp':
        setActiveIndex(prev => Math.max(prev - 1, -1))
        e.preventDefault()
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < allItems.length) {
          const item = allItems[activeIndex]
          if ('sessionId' in item) {
            selectResult(item as SearchResult)
          } else {
            executeSearch(item.text)
          }
        } else {
          executeSearch(query)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        searchInputRef.current?.blur()
        break
    }
  }

  // テキストハイライト
  const highlightText = (text: string, highlight: string): string => {
    if (!highlight) return text
    
    const regex = new RegExp(`(${highlight})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100">$1</mark>')
  }

  // テキスト短縮
  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // 時間フォーマット
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '不明'
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* 検索入力 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-colors duration-200"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* 検索結果ドロップダウン */}
      {isOpen && (query.length >= 1 || recentSearches.length > 0) && (
        <div
          ref={resultsRef}
          className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                     border border-gray-200 dark:border-gray-600 max-h-96 overflow-y-auto"
        >
          {/* 検索候補 */}
          {suggestions.length > 0 && (
            <div className="py-2">
              {query.length === 0 && recentSearches.length > 0 && (
                <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  最近の検索
                </div>
              )}
              {suggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 
                             flex items-center space-x-3 ${
                               activeIndex === index ? 'bg-gray-50 dark:bg-gray-700' : ''
                             }`}
                  onClick={() => executeSearch(suggestion.text)}
                >
                  <div className="flex-shrink-0">
                    {suggestion.type === 'recent' ? (
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="text-gray-900 dark:text-gray-100">{suggestion.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* 検索結果 */}
          {searchResults && searchResults.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-600">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                検索結果 ({searchResults.length}件)
              </div>
              {searchResults.map((result, index) => {
                const itemIndex = suggestions.length + index
                return (
                  <button
                    key={`result-${result.sessionId}-${result.messageIndex}`}
                    className={`w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 
                               border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                 activeIndex === itemIndex ? 'bg-gray-50 dark:bg-gray-700' : ''
                               }`}
                    onClick={() => selectResult(result)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.sessionTitle}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                          {formatTime(result.timestamp)}
                        </span>
                      </div>
                      <p 
                        className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: highlightText(truncateText(result.content), debouncedQuery)
                        }}
                      />
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          スコア: {result.score}
                        </span>
                        <span className="text-xs text-gray-400">
                          #{result.messageIndex + 1}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="px-3 py-2 text-sm text-red-600 dark:text-red-400">
              検索中にエラーが発生しました: {error.message}
            </div>
          )}

          {/* 検索結果なし */}
          {debouncedQuery.length >= 2 && !isLoading && searchResults?.length === 0 && !error && (
            <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              「{debouncedQuery}」に一致する結果が見つかりませんでした
            </div>
          )}

          {/* 検索のヒント */}
          {query.length === 0 && recentSearches.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              2文字以上入力して検索を開始してください
            </div>
          )}
        </div>
      )}

      {/* オーバーレイ（ドロップダウンを閉じるため） */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 