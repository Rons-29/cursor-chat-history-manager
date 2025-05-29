import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient, queryKeys } from '../api/client'

interface SearchResult {
  sessionId: string
  sessionTitle: string
  messageIndex: number
  content: string
  timestamp: string
  score: number
}

const Search: React.FC = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchExecuted, setSearchExecuted] = useState(false)

  // 検索実行
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
    refetch: executeSearch,
  } = useQuery({
    queryKey: queryKeys.search(searchQuery),
    queryFn: async (): Promise<SearchResult[]> => {
      if (!searchQuery.trim()) return []

      // 実際の検索APIがない場合のモック実装
      // 実装時にはapiClient.search(searchQuery)を呼び出す
      const sessions = await apiClient.getSessions({ limit: 100 })
      const results: SearchResult[] = []

      sessions.sessions.forEach(session => {
        session.messages?.forEach((message, index) => {
          if (
            message.content.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            results.push({
              sessionId: session.id,
              sessionTitle:
                session.title || `セッション ${session.id.slice(0, 8)}`,
              messageIndex: index,
              content: message.content,
              timestamp: message.timestamp,
              score: searchQuery
                .toLowerCase()
                .split(' ')
                .reduce((score, word) => {
                  const matches = (
                    message.content
                      .toLowerCase()
                      .match(new RegExp(word, 'g')) || []
                  ).length
                  return score + matches
                }, 0),
            })
          }
        })
      })

      return results.sort((a, b) => b.score - a.score).slice(0, 50)
    },
    enabled: false, // 手動実行
    retry: 1,
  })

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchExecuted(true)
      executeSearch()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleResultClick = (sessionId: string, messageIndex: number) => {
    navigate(`/sessions/${sessionId}#message-${messageIndex}`)
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text

    const words = query
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 0)
    let highlightedText = text

    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi')
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200">$1</mark>'
      )
    })

    return highlightedText
  }

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const formatTime = (dateString: string) => {
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

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">検索</h1>
        <p className="text-gray-600">チャット履歴からメッセージを検索</p>
      </div>

      {/* 検索フォーム */}
      <div className="card">
        <div className="space-y-4">
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="キーワードを入力して検索... (例: React TypeScript エラー)"
              className="input-field text-lg flex-1"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="btn-primary px-6"
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searchLoading}
            >
              {searchLoading ? (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
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
              )}
              <span className="ml-2">検索</span>
            </button>
          </div>

          {/* 検索のヒント */}
          <div className="text-sm text-gray-500">
            <p>💡 検索のコツ:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>複数のキーワードをスペースで区切って入力</li>
              <li>英語・日本語両方に対応</li>
              <li>部分一致で検索されます</li>
            </ul>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="w-5 h-5 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">検索エラー</h3>
              <p className="text-sm text-red-700 mt-1">
                {searchError?.message || '検索中にエラーが発生しました'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {searchExecuted && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">検索結果</h2>
            {searchResults && (
              <span className="text-sm text-gray-500">
                {searchResults.length} 件見つかりました
              </span>
            )}
          </div>

          {searchLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.sessionId}-${result.messageIndex}`}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer"
                  onClick={() =>
                    handleResultClick(result.sessionId, result.messageIndex)
                  }
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">
                      {result.sessionTitle}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatTime(result.timestamp)}
                    </span>
                  </div>
                  <div
                    className="text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(
                        truncateText(result.content),
                        searchQuery
                      ),
                    }}
                  />
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      メッセージ #{result.messageIndex + 1}
                    </span>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, result.score) }).map(
                        (_, i) => (
                          <div
                            key={i}
                            className="w-1 h-1 bg-yellow-400 rounded-full"
                          ></div>
                        )
                      )}
                      <span className="text-xs text-gray-400 ml-2">
                        関連度 {result.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchExecuted ? (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                検索結果が見つかりませんでした
              </h3>
              <p className="text-gray-500">
                「{searchQuery}」に一致するメッセージがありません。
                <br />
                別のキーワードで試してみてください。
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                検索を開始してください
              </h3>
              <p className="text-gray-500">
                上の検索ボックスにキーワードを入力して、チャット履歴を検索できます。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Search
