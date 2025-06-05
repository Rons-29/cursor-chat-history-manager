import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

interface SearchResult {
  id: string
  title: string
  metadata: {
    source: string
    description?: string
    tags?: string[]
    [key: string]: any
  }
  messages?: Array<{
    role: string
    content: string
    timestamp: string
  }>
  relevanceScore?: number
}

interface SearchResponse {
  success: boolean
  keyword: string
  results: SearchResult[]
  totalCount: number
  searchMetadata: {
    timestamp: string
    sourcesSearched: Array<{
      source: string
      status: string
      count: number
    }>
  }
}

const UnifiedSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('q') || '')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchMetadata, setSearchMetadata] = useState<any>(null)
  const [selectedSources, setSelectedSources] = useState<string[]>(['chat-history', 'claude-dev'])

  // URLパラメータからの自動検索
  useEffect(() => {
    const queryParam = searchParams.get('q')
    if (queryParam && queryParam !== keyword) {
      setKeyword(queryParam)
      handleSearch(queryParam)
    }
  }, [searchParams])

  const handleSearch = async (searchKeyword: string = keyword) => {
    if (!searchKeyword.trim()) {
      setError('検索キーワードを入力してください')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/search/all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: searchKeyword,
          filters: {
            sources: selectedSources,
            limit: 100,
          },
          options: {
            includeContent: true,
            sortBy: 'relevance',
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`検索に失敗しました: ${response.status}`)
      }

      const data: SearchResponse = await response.json()
      
      if (data.success) {
        setSearchResults(data.results)
        setSearchMetadata(data.searchMetadata)
        
        // URL更新
        if (searchKeyword !== searchParams.get('q')) {
          setSearchParams({ q: searchKeyword })
        }
      } else {
        throw new Error('検索結果の取得に失敗しました')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '検索中にエラーが発生しました'
      setError(errorMessage)
      console.error('横断検索エラー:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getSourceDisplayName = (source: string): string => {
    switch (source) {
      case 'chat-history': return 'チャット履歴'
      case 'claude-dev': return 'Claude Dev'
      case 'cursor': return 'Cursor'
      case 'sqlite': return 'ローカルDB'
      default: return source
    }
  }

  const getSourceBadgeColor = (source: string): string => {
    switch (source) {
      case 'chat-history': return 'bg-blue-100 text-blue-800'
      case 'claude-dev': return 'bg-purple-100 text-purple-800'
      case 'cursor': return 'bg-green-100 text-green-800'
      case 'sqlite': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatRelevanceScore = (score?: number): string => {
    if (!score) return '0%'
    return `${Math.min(Math.round((score / 20) * 100), 100)}%`
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 16l4-4 4 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              🔍 横断検索
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              全てのAI対話データを一括検索できます
            </p>
          </div>
        </div>

        {/* 検索フォーム */}
        <div className="flex flex-col space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="キーワードを入力してください..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={isLoading || !keyword.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '検索中...' : '検索'}
            </button>
          </div>

          {/* データソース選択 */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2">
              検索対象:
            </span>
            {[
              { id: 'chat-history', name: 'チャット履歴' },
              { id: 'claude-dev', name: 'Claude Dev' },
            ].map((source) => (
              <label key={source.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSources([...selectedSources, source.id])
                    } else {
                      setSelectedSources(selectedSources.filter(s => s !== source.id))
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {source.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 検索結果統計 */}
      {searchMetadata && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              検索結果: {searchResults.length}件
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {searchMetadata.timestamp}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {searchMetadata.sourcesSearched.map((source: any, index: number) => (
              <div key={index} className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {source.count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {getSourceDisplayName(source.source)}
                </div>
                <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                  source.status === 'fulfilled' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {source.status === 'fulfilled' ? '正常' : 'エラー'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* 検索結果一覧 */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          {searchResults.map((result) => (
            <div key={`${result.metadata.source}-${result.id}`} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                    {result.title}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {result.relevanceScore && (
                      <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        関連度: {formatRelevanceScore(result.relevanceScore)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${getSourceBadgeColor(result.metadata.source)}`}>
                      {getSourceDisplayName(result.metadata.source)}
                    </span>
                  </div>
                </div>

                {result.metadata.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    {result.metadata.description}
                  </p>
                )}

                {result.metadata.tags && result.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {result.metadata.tags.map((tag, index) => (
                      <span key={index} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {result.messages && result.messages.length > 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {result.messages.length}件のメッセージ • 
                    最終更新: {new Date(result.messages[result.messages.length - 1]?.timestamp || '').toLocaleDateString('ja-JP')}
                  </div>
                )}

                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ID: {result.id}
                  </span>
                  <button 
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
                    onClick={() => {
                      // セッション詳細ページへのナビゲーション
                      const baseUrl = result.metadata.source === 'claude-dev' ? '/claude-dev/session' : '/sessions'
                      window.location.href = `${baseUrl}/${result.id}`
                    }}
                  >
                    詳細を見る →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 検索実行前のガイド */}
      {!searchMetadata && !isLoading && !error && (
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-8 text-center">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              AI対話データを検索
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              キーワードを入力して、全てのAI対話履歴から関連する内容を見つけましょう
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-400 text-left space-y-1">
              <li>• タイトル、説明、タグから検索</li>
              <li>• メッセージ内容からも検索</li>
              <li>• 複数のデータソースを横断検索</li>
              <li>• 関連度順でソート表示</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default UnifiedSearch 