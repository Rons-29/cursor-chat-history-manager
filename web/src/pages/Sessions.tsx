import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient, queryKeys } from '../api/client.js'
// Session型は使用されていないため削除
import { SessionCard } from '../components/SessionCard'

const Sessions: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // フィルター状態
  const [keyword, setKeyword] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'messages'>(
    'newest'
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [limit, setLimit] = useState(50)

  // 新規追加: 横断検索モード切り替え
  const [isUnifiedMode, setIsUnifiedMode] = useState(false)

  // 通常のセッション一覧取得（API側ページネーション活用）
  const {
    data: sessionsData,
    isLoading: regularLoading,
    error: regularError,
  } = useQuery({
    queryKey: queryKeys.sessions({ 
      page: currentPage, 
      limit, 
      keyword: keyword || undefined,
      sort: sortOrder 
    }),
    queryFn: () =>
      apiClient.getSessions({
        page: currentPage,
        limit,
        keyword: keyword || undefined,
        // sortOrder: sortOrder,  // API側ソート対応時に有効化
      }),
    refetchInterval: 60000, // 1分ごとに更新
    staleTime: 30000, // 30秒間はキャッシュ有効
    enabled: !isUnifiedMode, // 通常モード時のみ実行
  })

  // 新規追加: 横断検索統合セッション一覧取得
  const {
    data: unifiedSessionsData,
    isLoading: unifiedLoading,
    error: unifiedError,
  } = useQuery({
    queryKey: ['sessions-unified', { 
      page: currentPage, 
      limit, 
      keyword: keyword || undefined 
    }],
    queryFn: () =>
      apiClient.getAllSessions({
        page: currentPage,
        limit,
        keyword: keyword || undefined,
        includeStatistics: true,
      }),
    refetchInterval: 60000, // 1分ごとに更新
    staleTime: 30000, // 30秒間はキャッシュ有効
    enabled: isUnifiedMode, // 横断検索モード時のみ実行
  })

  // 現在のモードに応じてデータを選択
  const currentData = isUnifiedMode ? unifiedSessionsData : sessionsData
  const isLoading = isUnifiedMode ? unifiedLoading : regularLoading
  const error = isUnifiedMode ? unifiedError : regularError

  // データ手動更新
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (isUnifiedMode) {
        queryClient.invalidateQueries({ queryKey: ['sessions-unified'] })
        await queryClient.refetchQueries({ queryKey: ['sessions-unified'] })
      } else {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      await queryClient.refetchQueries({ queryKey: ['sessions'] })
      }
    } catch (error) {
      console.error('データ更新エラー:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // セッション詳細ページに遷移
  const handleSessionClick = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`)
  }

  // モード切り替え処理
  const handleModeToggle = () => {
    setIsUnifiedMode(!isUnifiedMode)
    setCurrentPage(1) // ページを1にリセット
  }

  // formatTime関数は使用されていないため削除

  // API側のページネーションデータを直接使用（効率的）
  const sessions = currentData?.sessions || []
  const totalSessions = currentData?.pagination?.total || 0
  const totalPages = currentData?.pagination?.totalPages || 1
  const currentLimit = currentData?.pagination?.limit || limit
  const hasMore = currentData?.pagination?.hasMore || false
  
  // 表示情報の計算
  const startIndex = (currentPage - 1) * currentLimit + 1
  const endIndex = Math.min(currentPage * currentLimit, totalSessions)
  
  console.log('📊 Sessions pagination info:', {
    currentPage,
    limit,
    totalSessions,
    totalPages,
    hasMore,
    startIndex,
    endIndex,
    sessionsCount: sessions.length,
    isUnifiedMode
  })

  // キーワード変更時の処理
  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    setCurrentPage(1) // ページを1にリセット
  }

  // ソート変更時の処理
  const handleSortChange = (value: typeof sortOrder) => {
    setSortOrder(value)
    setCurrentPage(1) // ページを1にリセット
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI対話記録一覧</h1>
          <p className="text-gray-600">
            {isLoading ? '読み込み中...' : `全 ${totalSessions} 件のAI対話記録`}
            {isUnifiedMode && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                全データソース統合
              </span>
            )}
          </p>
          
          {/* 新規追加: 横断検索統計表示 */}
          {isUnifiedMode && unifiedSessionsData && (
            <div className="mt-2 text-sm text-gray-500">
              <div className="flex flex-wrap gap-4">
                <span>Traditional: {unifiedSessionsData.sources.traditional}件</span>
                <span>Incremental: {unifiedSessionsData.sources.incremental}件</span>
                <span>SQLite: {unifiedSessionsData.sources.sqlite}件</span>
                <span>Claude Dev: {unifiedSessionsData.sources.claudeDev}件</span>
                <span className="text-green-600">
                  統合総数: {unifiedSessionsData.sources.total}件
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          {/* 新規追加: モード切り替えボタン */}
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              isUnifiedMode
                ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
            onClick={handleModeToggle}
            disabled={isLoading || isRefreshing}
          >
            {isUnifiedMode ? (
              <>
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                横断検索ON
              </>
            ) : (
              <>
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                標準表示
              </>
            )}
          </button>
          
        <button
          className="btn-primary flex items-center space-x-2"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
        >
          <svg
            className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`}
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
          <span>
            {isRefreshing ? '更新中...' : isLoading ? '読み込み中...' : '更新'}
          </span>
        </button>
        </div>
      </div>

      {/* フィルター・検索 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キーワード検索
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isUnifiedMode ? "全データソースから検索..." : "AI対話記録を検索..."}
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              並び順
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={sortOrder}
              onChange={(e) => handleSortChange(e.target.value as typeof sortOrder)}
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="messages">メッセージ数順</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="w-full">
              <div className="text-sm text-gray-600">
                {isUnifiedMode ? (
                  <div>
                    <strong className="text-green-600">横断検索モード</strong>
                    <br />
                    全データソースから検索
                  </div>
                ) : (
                  <div>
                    <strong>標準モード</strong>
                    <br />
                    メインデータベースのみ
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
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
              <h3 className="text-sm font-medium text-red-800">
                データの読み込みエラー
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error?.message || 'セッションデータを取得できませんでした'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* セッション一覧 */}
      <div className="space-y-4">
        {isLoading ? (
          // 読み込み中の表示
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : sessions.length > 0 ? (
          sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onSelect={handleSessionClick}
              showPreview={true}
            />
          ))
        ) : (
          <div className="card text-center py-8">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              AI対話記録が見つかりません
            </h3>
            <p className="text-gray-500">
              {keyword
                ? '検索条件に一致するAI対話記録がありません'
                : 'AI対話記録データがありません'}
            </p>
            {keyword && (
              <button
                onClick={() => handleKeywordChange('')}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                検索をクリア
              </button>
            )}
          </div>
        )}
      </div>

      {/* ページネーション */}
      {!isLoading && totalPages > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{startIndex.toLocaleString()}</span> -
                <span className="font-medium">{endIndex.toLocaleString()}</span> 件 / 
                全 <span className="font-medium">{totalSessions.toLocaleString()}</span> 件
                {keyword && <span className="text-blue-600 ml-2">(検索中)</span>}
              </p>
              <div className="text-sm text-gray-500">
                ページ <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* 最初のページ */}
              <button
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                最初
              </button>
              
              {/* 前のページ */}
              <button
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                ← 前
              </button>
              
              {/* ページ番号表示 */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  const isCurrentPage = pageNum === currentPage
                  
                  return (
                    <button
                      key={pageNum}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        isCurrentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              {/* 次のページ */}
              <button
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === totalPages || !hasMore}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                次 →
              </button>
              
              {/* 最後のページ */}
              <button
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                最後
              </button>
            </div>
          </div>
          
          {/* ページサイズ選択 */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">表示件数:</span>
              <select
                className="text-sm border border-gray-300 rounded px-2 py-1"
                value={limit}
                onChange={e => {
                  setLimit(parseInt(e.target.value))
                  setCurrentPage(1)
                }}
              >
                <option value={10}>10件</option>
                <option value={25}>25件</option>
                <option value={50}>50件</option>
                <option value={100}>100件</option>
              </select>
            </div>
            
            <div className="text-xs text-gray-500">
              {hasMore ? `他にも ${totalSessions - endIndex} 件のAI対話記録があります` : 'すべてのページを表示中'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sessions
