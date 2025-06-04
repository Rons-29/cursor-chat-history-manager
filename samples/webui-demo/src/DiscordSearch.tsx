import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Clock, ArrowUp, ArrowDown } from 'lucide-react'
import { mockAPI, type MockSession, type SearchResult } from './mock-api'

interface HighlightedTextProps {
  text: string
  highlight: string
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>
  }

  const regex = new RegExp(`(${highlight})`, 'gi')
  const parts = text.split(regex)

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-1">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  )
}

interface SearchResultItemProps {
  session: MockSession
  searchKeyword: string
  isSelected: boolean
  onClick: () => void
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ 
  session, 
  searchKeyword, 
  isSelected,
  onClick 
}) => {
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'cursor': return '⚡'
      case 'claude-dev': return '🤖'
      case 'chatgpt': return '💬'
      case 'github-copilot': return '🐙'
      default: return '💻'
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div
      className={`search-result-item ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <span className="source-icon text-lg">{getSourceIcon(session.source)}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">
            <HighlightedText text={session.title} highlight={searchKeyword} />
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{session.messageCount} メッセージ</span>
            <span>{formatDate(session.timestamp)}</span>
            <span className="capitalize">{session.source}</span>
          </div>
          {session.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {session.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  <HighlightedText text={tag} highlight={searchKeyword} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const DiscordSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showHistory, setShowHistory] = useState(false)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // 検索履歴を読み込み
  useEffect(() => {
    const loadSearchHistory = async () => {
      const history = await mockAPI.getSearchHistory()
      setSearchHistory(history)
    }
    loadSearchHistory()
  }, [])

  // デバウンス検索
  const debouncedSearch = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setSearchResults(null)
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      try {
        const result = await mockAPI.searchSessions({ keyword: term })
        setSearchResults(result)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('検索エラー:', error)
      } finally {
        setIsSearching(false)
      }
    },
    []
  )

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, debouncedSearch])

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!searchResults?.sessions) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < searchResults.sessions.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && searchResults.sessions[selectedIndex]) {
            handleSessionSelect(searchResults.sessions[selectedIndex])
          }
          break
        case 'Escape':
          setSearchTerm('')
          setSearchResults(null)
          setSelectedIndex(-1)
          setShowHistory(false)
          searchInputRef.current?.blur()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchResults, selectedIndex])

  const handleSessionSelect = async (session: MockSession) => {
    console.log('選択されたセッション:', session)
    if (searchTerm.trim()) {
      await mockAPI.saveSearchHistory(searchTerm)
      const updatedHistory = await mockAPI.getSearchHistory()
      setSearchHistory(updatedHistory)
    }
  }

  const handleHistorySelect = (historyItem: string) => {
    setSearchTerm(historyItem)
    setShowHistory(false)
    searchInputRef.current?.focus()
  }

  const handleFocus = () => {
    if (!searchTerm.trim() && searchHistory.length > 0) {
      setShowHistory(true)
    }
  }

  const handleBlur = () => {
    // 少し遅延させて、履歴項目のクリックを可能にする
    setTimeout(() => setShowHistory(false), 150)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Discord風リアルタイム検索
        </h1>
        <p className="text-gray-600">
          300msデバウンス • キーボードナビゲーション • 検索履歴
        </p>
      </div>

      {/* 検索入力 */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="チャット履歴を検索... (Escでクリア)"
            className="search-input pl-10 pr-4"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* 検索履歴 */}
        {showHistory && searchHistory.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <div className="p-2 border-b border-gray-100 flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>最近の検索</span>
            </div>
            {searchHistory.map((item, index) => (
              <button
                key={index}
                onClick={() => handleHistorySelect(item)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* キーボードショートカットヒント */}
      {searchResults && searchResults.sessions.length > 0 && (
        <div className="mb-4 flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <ArrowUp className="w-4 h-4" />
            <ArrowDown className="w-4 h-4" />
            <span>ナビゲート</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd>
            <span>選択</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
            <span>クリア</span>
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {searchResults && (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <span>
              {searchResults.totalCount} 件の結果 ({searchResults.executionTime}ms)
            </span>
          </div>

          {searchResults.sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>検索結果が見つかりませんでした</p>
              <p className="text-sm">別のキーワードで試してみてください</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.sessions.map((session, index) => (
                <SearchResultItem
                  key={session.id}
                  session={session}
                  searchKeyword={searchTerm}
                  isSelected={index === selectedIndex}
                  onClick={() => handleSessionSelect(session)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 検索状態の説明 */}
      {!searchTerm && !searchResults && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">ChatFlow検索を開始</p>
          <p className="text-sm">キーワードを入力してチャット履歴を検索</p>
          {searchHistory.length > 0 && (
            <p className="text-sm mt-2">
              検索ボックスをクリックして履歴を表示
            </p>
          )}
        </div>
      )}
    </div>
  )
} 