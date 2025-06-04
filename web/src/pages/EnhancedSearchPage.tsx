import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EnhancedSearchComponent } from '../components/EnhancedSearchComponent.tsx'
import { SearchFilters } from '../components/SearchFilters.tsx'
import { useEnhancedSearch } from '../hooks/useEnhancedSearch.ts'

/**
 * ChatFlow統合検索ページ
 * - Discord風リアルタイム検索
 * - Notion風フィルタリング
 * - 検索履歴・統計表示
 * - SQLite高速検索統合
 */
const EnhancedSearchPage: React.FC = () => {
  const navigate = useNavigate()
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const {
    query,
    setFilters,
    isLoading,
    error,
    recentSearches,
    clearSearchHistory,
    executeSearch,
    clearSearch,
    totalResults,
    searchDuration,
    filteredResults,
    activeFiltersCount,
    highlightText,
    formatTime
  } = useEnhancedSearch({
    enableFilters: true,
    maxResults: 50,
    onResultSelect: (result) => {
      navigate(`/sessions/${result.sessionId}#message-${result.messageIndex}`)
    }
  })

  const handleResultClick = (sessionId: string, messageIndex: number) => {
    navigate(`/sessions/${sessionId}#message-${messageIndex}`)
  }

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🔍 統合検索</h1>
            <p className="text-gray-600 dark:text-gray-400">
              AI履歴から高速検索 - Discord風リアルタイム + Notion風フィルタリング
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* 表示モード切り替え */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
                onClick={() => setViewMode('list')}
              >
                リスト
              </button>
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
                onClick={() => setViewMode('grid')}
              >
                グリッド
              </button>
            </div>

            {/* フィルター切り替え */}
            <button
              className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                showFilters
                  ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              フィルター
              {activeFiltersCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Discord風検索バー */}
      <div className="card">
        <EnhancedSearchComponent
          onResultSelect={handleResultClick}
          placeholder="メッセージを検索... (例: React TypeScript エラー)"
          className="w-full"
        />
      </div>

      {/* Notion風フィルターセクション */}
      {showFilters && (
        <div className="card">
          <div className="border-b border-gray-200 dark:border-gray-600 pb-3 mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">検索フィルター</h3>
          </div>
          <SearchFilters
            onFiltersChange={setFilters}
            className="space-y-4"
          />
        </div>
      )}

      {/* 検索統計 */}
      {(totalResults > 0 || query) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-medium">{totalResults}</span> 件の結果
                {query && (
                  <>
                    {' '}・ 「<span className="font-medium">{query}</span>」
                  </>
                )}
              </div>
              {searchDuration > 0 && (
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  検索時間: {searchDuration}ms
                </div>
              )}
              {activeFiltersCount > 0 && (
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {activeFiltersCount} 個のフィルター適用中
                </div>
              )}
            </div>
            {(query || activeFiltersCount > 0) && (
              <button
                className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium"
                onClick={clearSearch}
              >
                検索をクリア
              </button>
            )}
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">検索中...</span>
        </div>
      )}

      {error && (
        <div className="card border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                検索エラーが発生しました
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && filteredResults.length === 0 && query && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">検索結果なし</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            「{query}」に一致する結果が見つかりませんでした
          </p>
          <div className="mt-6">
            <button
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setShowFilters(true)}
            >
              フィルターを調整
            </button>
          </div>
        </div>
      )}

      {/* 検索結果表示 */}
      {!isLoading && !error && filteredResults.length > 0 && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
          {filteredResults.map((result) => (
            <div
              key={`${result.sessionId}-${result.messageIndex}`}
              className="card card-hover cursor-pointer transition-all duration-200"
              onClick={() => handleResultClick(result.sessionId, result.messageIndex)}
            >
              <div className="space-y-3">
                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {result.sessionTitle}
                  </h3>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(result.timestamp)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                      #{result.messageIndex + 1}
                    </span>
                  </div>
                </div>

                {/* コンテンツ */}
                <div 
                  className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(truncateText(result.content), query)
                  }}
                />

                {/* メタデータ */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {result.source && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                        {result.source}
                      </span>
                    )}
                    {result.messageType && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                        {result.messageType}
                      </span>
                    )}
                    {result.tags && result.tags.length > 0 && (
                      <div className="flex space-x-1">
                        {result.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
                          >
                            {tag}
                          </span>
                        ))}
                        {result.tags.length > 2 && (
                          <span className="text-gray-400">+{result.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">
                    スコア: {result.score}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 検索履歴セクション */}
      {recentSearches.length > 0 && !query && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">最近の検索</h3>
            <button
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={clearSearchHistory}
            >
              履歴をクリア
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                onClick={() => executeSearch(search)}
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 使い方ヒント */}
      {!query && recentSearches.length === 0 && (
        <div className="card border-blue-200 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">💡 検索のコツ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
              <div>
                <h4 className="font-medium mb-2">🔍 リアルタイム検索</h4>
                <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                  <li>• 2文字以上で自動検索開始</li>
                  <li>• 300msデバウンスで高速表示</li>
                  <li>• キーボードナビゲーション対応</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">🎛️ 高度なフィルタリング</h4>
                <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                  <li>• ソース別フィルター (Cursor, Claude Dev)</li>
                  <li>• 日付範囲指定</li>
                  <li>• スコア範囲調整</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedSearchPage 