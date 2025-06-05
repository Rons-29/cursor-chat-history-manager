import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client.js'
import { SessionCard } from '../components/SessionCard'

/**
 * 🌐 横断検索統合セッションページ
 * 
 * 全データソース（Traditional、Incremental、SQLite、Claude Dev）
 * からセッションを取得・統合表示
 */
const UnifiedSessions: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // フィルター状態
  const [keyword, setKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [limit, setLimit] = useState(50)

  // 横断検索統合セッション一覧取得
  const {
    data: unifiedData,
    isLoading,
    error,
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
  })

  // データ手動更新
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      queryClient.invalidateQueries({ queryKey: ['sessions-unified'] })
      await queryClient.refetchQueries({ queryKey: ['sessions-unified'] })
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

  // キーワード変更時の処理
  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    setCurrentPage(1) // ページを1にリセット
  }

  // データ取得
  const sessions = unifiedData?.sessions || []
  const totalSessions = unifiedData?.pagination?.total || 0
  const totalPages = unifiedData?.pagination?.totalPages || 1
  const currentLimit = unifiedData?.pagination?.limit || limit
  const hasMore = unifiedData?.pagination?.hasMore || false
  
  // 表示情報の計算
  const startIndex = (currentPage - 1) * currentLimit + 1
  const endIndex = Math.min(currentPage * currentLimit, totalSessions)
  
  console.log('🌐 Unified Sessions info:', {
    currentPage,
    limit,
    totalSessions,
    totalPages,
    hasMore,
    startIndex,
    endIndex,
    sessionsCount: sessions.length,
    dataSources: unifiedData?.sources
  })

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🌐 全データソース統合表示
          </h1>
          <p className="text-gray-600">
            {isLoading ? '読み込み中...' : `全 ${totalSessions.toLocaleString()} 件のAI対話記録`}
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              横断検索統合
            </span>
          </p>
          
          {/* データソース別統計表示 */}
          {unifiedData && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">データソース別内訳</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Traditional:</span>
                  <span className="font-medium text-blue-600">
                    {unifiedData.sources.traditional.toLocaleString()}件
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Incremental:</span>
                  <span className="font-medium text-purple-600">
                    {unifiedData.sources.incremental.toLocaleString()}件
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">SQLite:</span>
                  <span className="font-medium text-green-600">
                    {unifiedData.sources.sqlite.toLocaleString()}件
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Claude Dev:</span>
                  <span className="font-medium text-orange-600">
                    {unifiedData.sources.claudeDev.toLocaleString()}件
                  </span>
                </div>
              </div>
              
              {/* 統合統計 */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>アクティブソース: {unifiedData.metadata.dataSourcesActive.length}</span>
                  <span className="text-green-600">
                    統合総数: {unifiedData.sources.total.toLocaleString()}件
                  </span>
                  <span>
                    処理時間: {new Date(unifiedData.metadata.timestamp).toLocaleTimeString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
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
              {isRefreshing ? '統合更新中...' : isLoading ? '統合読み込み中...' : '統合更新'}
            </span>
          </button>
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 横断検索
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="全データソースから横断検索..."
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
            />
            <div className="mt-1 text-xs text-gray-500">
              Traditional、Incremental、SQLite、Claude Dev すべてから検索
            </div>
          </div>
          
          <div className="flex items-end">
            <div className="w-full">
              <div className="text-sm text-gray-600 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <strong className="text-green-800">横断検索統合モード</strong>
                </div>
                <div className="text-xs text-green-700 mt-1">
                  全データソースを統合し、重複を除去して表示
                </div>
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
                統合データの読み込みエラー
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error?.message || '横断検索統合データを取得できませんでした'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* セッション一覧 */}
      <div className="space-y-4">
        {isLoading ? (
          // 読み込み中の表示
          Array.from({ length: 5 }).map((_, index) => (
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
            <div key={session.id} className="relative">
              <SessionCard
                session={session}
                onSelect={handleSessionClick}
                showPreview={true}
              />
              {/* データソース表示バッジ */}
              {session.metadata?.source && (
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    session.metadata.source === 'traditional' ? 'bg-blue-100 text-blue-800' :
                    session.metadata.source === 'incremental' ? 'bg-purple-100 text-purple-800' :
                    session.metadata.source === 'sqlite' ? 'bg-green-100 text-green-800' :
                    session.metadata.source === 'claude-dev' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {session.metadata.source}
                  </span>
                </div>
              )}
            </div>
          ))
        ) : (
          // データなし表示
          <div className="text-center py-12">
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
              {keyword ? '検索結果が見つかりませんでした' : 'セッションデータがありません'}
            </h3>
            <p className="text-gray-500 mb-4">
              {keyword 
                ? 'キーワードを変更して再度検索してみてください' 
                : '全データソースを確認しましたが、セッションデータが見つかりませんでした'
              }
            </p>
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="btn-secondary"
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
                {keyword && <span className="text-green-600 ml-2">(横断検索中)</span>}
              </p>
              <div className="text-sm text-gray-500">
                ページ <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                最初
              </button>
              <button
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                前へ
              </button>
              <button
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                次へ
              </button>
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

export default UnifiedSessions 