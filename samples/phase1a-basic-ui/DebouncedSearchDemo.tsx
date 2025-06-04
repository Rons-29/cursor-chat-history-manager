/**
 * 🔍 Discord風デバウンス検索デモ
 * 
 * Discordの「いいところ」をChatFlowに適用：
 * - リアルタイム検索（300ms デバウンス）
 * - 検索中の視覚的フィードバック
 * - キーボードナビゲーション対応
 * - 検索履歴機能
 * 
 * 🌟 統合された「いいところ」：
 * - Discord: リアルタイム検索・UX
 * - GitHub: 高速検索結果表示
 * - VS Code: キーボードショートカット
 * - Notion: ビジュアルな検索状態表示
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Clock, Zap, Filter, X, ArrowUp, ArrowDown, Enter } from 'lucide-react'

// ChatFlow API型定義
interface Session {
  id: string
  title: string
  created_at: number
  updated_at: number
  message_count: number
  metadata: {
    source?: string
    tags?: string[]
  }
}

interface SearchResult {
  session_id: string
  session_title: string
  matching_messages: number
  snippets: string
}

interface SearchResponse {
  success: boolean
  data: SearchResult[]
  total: number
  search_time: number
}

// Discord風カスタムフック
function useDiscordSearch(debounceMs = 300) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchTime, setSearchTime] = useState(0)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const debounceRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  // Discord風デバウンス検索実行
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setError(null)
    
    // 前の検索をキャンセル（Discord風）
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    
    try {
      const startTime = performance.now()
      
      // ChatFlow API呼び出し（FTS5高速検索）
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          method: 'fts5', // GitHub風高速検索使用
          limit: 20
        }),
        signal: abortControllerRef.current.signal
      })
      
      const data: SearchResponse = await response.json()
      const endTime = performance.now()
      
      if (data.success) {
        setResults(data.data)
        setSearchTime(endTime - startTime)
        
        // 検索履歴に追加（Discord風）
        setSearchHistory(prev => {
          const newHistory = [searchQuery, ...prev.filter(q => q !== searchQuery)]
          return newHistory.slice(0, 10) // 最新10件まで
        })
      } else {
        setError('検索に失敗しました')
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('検索エラーが発生しました')
        console.error('Search error:', err)
      }
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Discord風デバウンス処理
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      performSearch(query)
    }, debounceMs)
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, performSearch, debounceMs])

  return {
    query,
    setQuery,
    results,
    isSearching,
    searchTime,
    searchHistory,
    error,
    performSearch
  }
}

// Discord風検索結果ハイライト
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  
  return (
    <span>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  )
}

// Discord風検索結果アイテム
function SearchResultItem({ result, query, isSelected }: { 
  result: SearchResult; 
  query: string;
  isSelected: boolean;
}) {
  return (
    <div className={`
      p-3 border-l-4 transition-all duration-150 cursor-pointer
      ${isSelected 
        ? 'bg-blue-50 border-l-blue-500 shadow-sm' 
        : 'bg-white border-l-gray-200 hover:bg-gray-50'
      }
    `}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900 truncate">
          <HighlightedText text={result.session_title} query={query} />
        </h4>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
            {result.matching_messages}件
          </span>
        </div>
      </div>
      
      <div className="text-sm text-gray-600 line-clamp-2">
        <HighlightedText text={result.snippets} query={query} />
      </div>
    </div>
  )
}

// メインのDiscord風検索コンポーネント
export default function DebouncedSearchDemo() {
  const {
    query,
    setQuery,
    results,
    isSearching,
    searchTime,
    searchHistory,
    error,
    performSearch
  } = useDiscordSearch(300)
  
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // VS Code風キーボードナビゲーション
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        if (selectedIndex >= 0 && results[selectedIndex]) {
          // セッション選択処理
          console.log('Selected session:', results[selectedIndex])
        }
        break
      case 'Escape':
        setQuery('')
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // 検索履歴から選択
  const selectFromHistory = (historyQuery: string) => {
    setQuery(historyQuery)
    setShowHistory(false)
    inputRef.current?.focus()
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Discord風ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🔍 Discord風リアルタイム検索デモ
        </h1>
        <p className="text-gray-600">
          各サービスの「いいところ」を統合した高速検索体験
        </p>
      </div>

      {/* 検索入力エリア */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowHistory(true)}
            placeholder="セッションを検索... (Discord風リアルタイム)"
            className="
              w-full pl-10 pr-12 py-3 text-lg border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              transition-all duration-200
            "
          />
          
          {/* 検索状態インジケータ */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isSearching ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-gray-500">検索中...</span>
              </div>
            ) : query && (
              <button
                onClick={() => setQuery('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 検索履歴ドロップダウン */}
        {showHistory && searchHistory.length > 0 && !query && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>最近の検索</span>
              </div>
            </div>
            {searchHistory.map((historyQuery, index) => (
              <button
                key={index}
                onClick={() => selectFromHistory(historyQuery)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-700">{historyQuery}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 検索統計表示 */}
      {(results.length > 0 || error) && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {results.length > 0 && (
              <>
                <div className="flex items-center space-x-1">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span>{results.length}件の結果</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>{searchTime.toFixed(1)}ms</span>
                </div>
              </>
            )}
          </div>
          
          {/* Discord風フィルタボタン */}
          <button className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span>フィルタ</span>
          </button>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Discord風検索結果 */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result, index) => (
            <SearchResultItem
              key={result.session_id}
              result={result}
              query={query}
              isSelected={index === selectedIndex}
            />
          ))}
        </div>
      )}

      {/* 空の状態表示 */}
      {query && !isSearching && results.length === 0 && !error && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            検索結果が見つかりません
          </h3>
          <p className="text-gray-500">
            別のキーワードで検索してみてください
          </p>
        </div>
      )}

      {/* デモ情報パネル */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">
          🌟 統合された「いいところ」
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong className="text-blue-600">Discord風:</strong>
            <ul className="text-gray-600 mt-1 space-y-1">
              <li>• リアルタイム検索（300msデバウンス）</li>
              <li>• 視覚的検索状態フィードバック</li>
              <li>• 検索履歴機能</li>
            </ul>
          </div>
          <div>
            <strong className="text-green-600">GitHub風:</strong>
            <ul className="text-gray-600 mt-1 space-y-1">
              <li>• FTS5高速検索エンジン</li>
              <li>• ハイライト表示</li>
              <li>• パフォーマンス表示</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
          <div className="flex items-center space-x-2 text-sm">
            <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">↑↓</kbd>
            <span>ナビゲーション</span>
            <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Enter</kbd>
            <span>選択</span>
            <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Esc</kbd>
            <span>クリア</span>
          </div>
        </div>
      </div>
    </div>
  )
} 