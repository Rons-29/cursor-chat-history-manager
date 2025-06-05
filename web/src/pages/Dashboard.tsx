import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ExclamationTriangleIcon, ArrowRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { apiClient, queryKeys } from '../api/client.js'

const Dashboard: React.FC = () => {
  console.log('🚀 Dashboard component mounting...')
  
  // 最小限の状態のみ
  const [hasError, setHasError] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const queryClient = useQueryClient()

  console.log('🚀 Dashboard state initialized')

  // セッション統計データ取得
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: queryKeys.sessions({ page: 1, limit: 5 }),
    queryFn: () => apiClient.getSessions({ page: 1, limit: 5 }),
    refetchInterval: 60000, // 1分ごとに更新
  })

  // ヘルスチェック
  const {
    data: healthData,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch('http://localhost:3001/api/health').then(res => res.json()),
    refetchInterval: 30000, // 30秒ごとに更新
  })

  // 統合統計データ取得（正確なセッション数のため）
  const {
    data: unifiedStatsData,
    isLoading: unifiedStatsLoading,
    refetch: refetchUnifiedStats,
  } = useQuery({
    queryKey: ['unified-stats'],
    queryFn: () => fetch('http://localhost:3001/api/unified/all-sessions?page=1&pageSize=1').then(res => res.json()),
    refetchInterval: 60000, // 1分ごとに更新
  })

  // 統計データ取得（セッション数確保のため）
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiClient.getStats(),
    refetchInterval: 60000, // 1分ごとに更新
  })

  // 手動更新機能
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      // 全てのクエリを並行して更新
      await Promise.all([
        refetchSessions(),
        refetchHealth(),
        refetchStats(),
        refetchUnifiedStats(),
        queryClient.invalidateQueries({ queryKey: ['sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['health'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
        queryClient.invalidateQueries({ queryKey: ['unified-stats'] })
      ])
    } catch (error) {
      console.error('Manual refresh error:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // エラーハンドリング
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('⚠️ Dashboard Global Error:', error)
      setHasError(true)
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  // エラー時のフォールバック表示
  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            ダッシュボード読み込みエラー
          </h2>
          <p className="text-gray-600 mb-4">
            アプリケーションの読み込みに問題が発生しました
          </p>
          <button
            onClick={() => {
              setHasError(false)
              window.location.reload()
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  // セッション数計算 - 統合APIからの正確な値を優先
  const totalSessions = (() => {
    // 1. 統合APIからの値を最優先（最も正確）
    if (unifiedStatsData?.pagination?.total && !unifiedStatsLoading) {
      console.log('📊 Using unified API for total sessions:', unifiedStatsData.pagination.total)
      return unifiedStatsData.pagination.total
    }
    
    // 2. セッションAPIのpaginationから取得
    if (sessionsData?.pagination?.total && !sessionsLoading) {
      console.log('📊 Using sessions pagination for total sessions:', sessionsData.pagination.total)
      return sessionsData.pagination.total
    }
    
    // 3. 統計APIからの値（フォールバック）
    if (statsData?.totalSessions && !statsLoading) {
      console.log('📊 Using stats API for total sessions (fallback):', statsData.totalSessions)
      return statsData.totalSessions
    }
    
    // 4. ローディング中の場合
    if (unifiedStatsLoading || sessionsLoading || statsLoading) {
      console.log('📊 Loading sessions data...')
      return '...'
    }
    
    // 5. フォールバック
    console.warn('📊 No session count available, falling back to 0')
    return 0
  })()
  
  const recentSessions = sessionsData?.sessions?.slice(0, 3) || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* === クリーンアップ済みレイアウト === */}
      
      {/* メインコンテンツ */}
      <div className="max-w-full px-3 sm:px-4 lg:px-6 pt-6 pb-8">
        {/* ヘッダー */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              ChatFlow Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              AI開発支援プラットフォーム - データ統合管理
            </p>
          </div>
          
          {/* 手動更新ボタン - レスポンシブ対応 */}
          <div className="flex-shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-all duration-200 ${
                isRefreshing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
              }`}
              title="データを手動で更新"
            >
              <ArrowPathIcon 
                className={`w-4 h-4 mr-2 transition-transform duration-200 ${
                  isRefreshing ? 'animate-spin' : ''
                }`} 
              />
              {isRefreshing ? '更新中...' : '更新'}
            </button>
          </div>
        </div>

        {/* 統計カード - レスポンシブグリッド */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              総AI対話記録数
            </h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {typeof totalSessions === 'string' ? totalSessions : totalSessions.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              AI開発支援記録
            </p>
            {/* エラー表示は重要なので残す */}
            {sessionsError && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                エラー: {sessionsError.message}
              </p>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              システム状態
            </h3>
            <p className="text-lg font-medium text-green-600 dark:text-green-400">
              {healthLoading ? '確認中...' : healthData?.status === 'ok' ? '✅ 正常動作中' : '⚠️ 要確認'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              API & データベース
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              最新活動
            </h3>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {recentSessions.length > 0 ? '最近のAI対話記録' : 'データなし'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {recentSessions.length} 件表示中
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              クイックアクション
            </h3>
            <div className="space-y-2">
              <Link
                to="/sessions"
                className="block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                → AI対話記録一覧
              </Link>
              <Link
                to="/search"
                className="block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                → 検索
              </Link>
              <Link
                to="/integration"
                className="block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                → 統合設定
              </Link>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="block text-left text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium disabled:opacity-50"
              >
                → {isRefreshing ? '更新中...' : 'データ更新'}
              </button>
            </div>
          </div>
        </div>

        {/* 最近のセッション */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              最近のAI対話記録
            </h2>
            <Link
              to="/sessions"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              すべて表示
              <ArrowRightIcon className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="p-6">
            {sessionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : sessionsError ? (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-gray-500">AI対話記録データの読み込みに失敗しました</p>
                <p className="text-sm text-gray-400 mt-1">{sessionsError.message}</p>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRefreshing ? '更新中...' : 'データ再取得'}
                </button>
              </div>
            ) : recentSessions.length > 0 ? (
              <div className="space-y-4">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    className="block p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                      {session.title || 'Untitled Session'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {session.metadata.totalMessages} メッセージ • {new Date(session.startTime).toLocaleDateString('ja-JP')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {session.metadata.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  AI対話記録データがありません
                </h3>
                <p className="text-gray-500 mb-4">
                  Cursorチャット履歴をインポートしてください
                </p>
                <Link
                  to="/integration"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  統合設定へ
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
