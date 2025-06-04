import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { EnhancedSearchComponent } from '../components/EnhancedSearchComponent.tsx'
import { SearchFilters } from '../components/SearchFilters.tsx'
import { useEnhancedSearch } from '../hooks/useEnhancedSearch.ts'
import { apiClient } from '../api/client.js'

/**
 * ChatFlow統合検索ページ (改善版)
 * - Discord風リアルタイム検索
 * - Notion風フィルタリング
 * - 検索結果とAI対話記録の統合表示
 * - SQLite高速検索統合
 */
const EnhancedSearchPage: React.FC = () => {
  const navigate = useNavigate()
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const {
    query,
    setQuery,
    setFilters,
    results,
    isLoading: searchLoading,
    error: searchError,
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

  // AI対話記録一覧取得（検索していない時用）
  const {
    data: dialoguesList = [],
    isLoading: dialoguesLoading,
    error: dialoguesError
  } = useQuery({
    queryKey: ['ai-dialogues', 'recent'],
    queryFn: async () => {
      const response = await apiClient.getSessions({ page: 1, limit: 20 })
      return response.sessions || []
    },
    enabled: !query && activeFiltersCount === 0, // 検索・フィルターなしの時のみ実行
    staleTime: 1000 * 60 * 2, // 2分間キャッシュ
  })

  const handleResultClick = (sessionId: string, messageIndex?: number) => {
    if (messageIndex !== undefined) {
      navigate(`/sessions/${sessionId}#message-${messageIndex}`)
    } else {
      navigate(`/sessions/${sessionId}`)
    }
  }

  const handleDialogueClick = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`)
  }

  // より読みやすいテキストプレビュー
  const getReadablePreview = (text: string, maxLength: number = 120) => {
    if (!text) return ''
    // HTMLタグを除去
    const cleanText = text.replace(/<[^>]*>/g, '')
    // 改行やタブを統一
    const normalizedText = cleanText.replace(/[\r\n\t]+/g, ' ').trim()
    if (normalizedText.length <= maxLength) return normalizedText
    return normalizedText.substring(0, maxLength) + '...'
  }

  // 表示する内容を決定
  const isSearchMode = Boolean(query || activeFiltersCount > 0)
  const isLoading = isSearchMode ? searchLoading : dialoguesLoading
  const error = isSearchMode ? searchError : dialoguesError
  const displayItems = isSearchMode ? filteredResults : dialoguesList

  // デバッグ出力
  React.useEffect(() => {
    console.log('🔍 EnhancedSearchPage Debug (Optimized):', {
      query,
      activeFiltersCount,
      isSearchMode,
      searchLoading,
      dialoguesLoading,
      resultsCount: results.length,
      filteredResultsCount: filteredResults.length,
      dialoguesListCount: dialoguesList.length,
      displayItemsCount: displayItems.length,
      totalResults,
      results: results.slice(0, 2) // 最初の2件だけ表示
    })
  }, [query, activeFiltersCount, isSearchMode, searchLoading, dialoguesLoading, results.length, filteredResults.length, dialoguesList.length, displayItems.length, totalResults, results])

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🔍 統合検索 v2.0</h1>
              <p className="text-gray-600 dark:text-gray-400">
                AI対話記録から高速検索 - 最適化された統合検索システム
              </p>
            </div>
            
            {/* 検索のコツ - インフォアイコン */}
            <div className="relative group">
              <div className="p-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-help transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              {/* ホバー時のツールチップ */}
              <div className="absolute left-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">🔍 検索のコツ</h3>
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">キーワード検索:</div>
                    <ul className="text-gray-600 dark:text-gray-400 space-y-1 pl-2">
                      <li>• 「React エラー」「TypeScript 型」</li>
                      <li>• 複数キーワードでAND検索</li>
                      <li>• 部分一致で幅広く検索</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">検索対象:</div>
                    <ul className="text-gray-600 dark:text-gray-400 space-y-1 pl-2">
                      <li>• チャット履歴の全メッセージ内容</li>
                      <li>• セッションタイトル・メタデータ</li>
                      <li>• SQLite高速検索 + JSONフォールバック</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">フィルター活用:</div>
                    <ul className="text-gray-600 dark:text-gray-400 space-y-1 pl-2">
                      <li>• ソース別（Cursor、Claude Dev等）</li>
                      <li>• 日付範囲で期間絞り込み</li>
                      <li>• タグでカテゴリ検索</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
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

      {/* Notion風フィルターセクション - 検索バーの上に移動 */}
      {showFilters && (
        <div className="card">
          <div className="border-b border-gray-200 dark:border-gray-600 pb-3 mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">🎯 検索フィルター</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              検索結果をより詳細に絞り込むことができます
            </p>
          </div>
          <SearchFilters
            onFiltersChange={setFilters}
            className="space-y-4"
          />
        </div>
      )}

      {/* 🚀 統合検索バー - 最適化版 */}
      <div className="card">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-12 py-4 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-lg
                       placeholder-gray-500 dark:placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
            placeholder="AI対話記録を検索... (例: React TypeScript エラー)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* 検索履歴 - 非検索時のみ表示 */}
        {!query && recentSearches.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">最近の検索</span>
              <button
                onClick={clearSearchHistory}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                クリア
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setQuery(search)}
                >
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 検索統計・状態表示 */}
      {isSearchMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-medium">{totalResults}</span> 件の検索結果
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
            <button
              className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium"
              onClick={clearSearch}
            >
              検索をクリア
            </button>
          </div>
        </div>
      )}

      {/* AI対話記録状態表示（非検索時） */}
      {!isSearchMode && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              📝 最新のAI対話記録 ({dialoguesList.length} 件)
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              検索で絞り込み・フィルターで詳細検索可能
            </div>
          </div>
        </div>
      )}

      {/* 統合結果エリア：検索結果 または AI対話記録一覧 */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {isSearchMode ? '🔍 検索結果' : '📝 最新のAI対話記録'}
          </h2>
        </div>

        {/* ローディング状態 */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              {isSearchMode ? '検索中...' : 'AI対話記録取得中...'}
            </span>
          </div>
        )}

        {/* エラー状態 */}
        {error && (
          <div className="border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  {isSearchMode ? '検索エラーが発生しました' : 'AI対話記録の取得エラーが発生しました'}
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 結果なし状態 */}
        {!isLoading && !error && displayItems.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {isSearchMode ? '検索結果が見つかりませんでした' : 'AI対話記録が見つかりませんでした'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {isSearchMode 
                ? `「${query}」に一致する結果がありません。キーワードを変更するか、フィルターを調整してください。`
                : 'データが見つかりません。先にCursorチャット履歴をインポートしてください。'
              }
            </p>
            {isSearchMode && (
              <button
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                onClick={clearSearch}
              >
                検索をクリア
              </button>
            )}
          </div>
        )}

        {/* 結果表示 - 改善版レイアウト */}
        {!isLoading && !error && displayItems.length > 0 && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {displayItems.map((item) => {
              // 検索結果の場合
              if (isSearchMode && 'messageIndex' in item) {
                const result = item
                return (
                  <div
                    key={`${result.sessionId}-${result.messageIndex}`}
                    className="group border border-gray-200 dark:border-gray-600 rounded-lg p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer transition-all duration-200 bg-white dark:bg-gray-800"
                    onClick={() => handleResultClick(result.sessionId, result.messageIndex)}
                  >
                    {/* ヘッダー行 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                          🔍 {result.sessionTitle}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>#{result.messageIndex + 1}</span>
                          <span>•</span>
                          <span>{formatTime(result.timestamp)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                          スコア: {result.score}
                        </span>
                      </div>
                    </div>

                    {/* コンテンツプレビュー */}
                    <div 
                      className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3 line-clamp-3"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(getReadablePreview(result.content), query)
                      }}
                    />

                    {/* メタデータタグ */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {result.source && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                            {result.source}
                          </span>
                        )}
                        {result.messageType && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                            {result.messageType}
                          </span>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )
              } 
              // AI対話記録一覧の場合 - 改善版
              else {
                const dialogue = item as any // 型安全性のため一時的にany使用
                const firstMessage = dialogue.messages?.[0]
                const lastMessage = dialogue.messages?.[dialogue.messages?.length - 1]
                
                return (
                  <div
                    key={dialogue.id}
                    className="group border border-gray-200 dark:border-gray-600 rounded-lg p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer transition-all duration-200 bg-white dark:bg-gray-800"
                    onClick={() => handleDialogueClick(dialogue.id)}
                  >
                    {/* ヘッダー行 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          💬 {dialogue.title || `AI対話 ${dialogue.id.slice(0, 8)}`}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{dialogue.messages?.length || 0} メッセージ</span>
                          <span>•</span>
                          <span>{formatTime(dialogue.createdAt || dialogue.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {new Date(dialogue.createdAt || dialogue.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* コンテンツプレビュー - 最初と最後のメッセージ */}
                    {firstMessage && (
                      <div className="space-y-2 mb-3">
                        <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          <span className="text-xs text-gray-400 block mb-1">開始:</span>
                          {getReadablePreview(firstMessage.content, 100)}
                        </div>
                        {lastMessage && lastMessage !== firstMessage && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            <span className="text-xs text-gray-400 block mb-1">最新:</span>
                            {getReadablePreview(lastMessage.content, 80)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* メタデータとタグ */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {dialogue.metadata?.source && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                            {dialogue.metadata.source}
                          </span>
                        )}
                        {dialogue.metadata?.tags && dialogue.metadata.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {dialogue.metadata.tags.slice(0, 2).map((tag: string) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
                              >
                                {tag}
                              </span>
                            ))}
                            {dialogue.metadata.tags.length > 2 && (
                              <span className="text-xs text-gray-400">+{dialogue.metadata.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedSearchPage 