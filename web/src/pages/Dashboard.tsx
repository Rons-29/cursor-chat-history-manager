import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient, queryKeys } from '../api/client'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 統計データ取得
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: queryKeys.stats(),
    queryFn: () => apiClient.getStats(),
    refetchInterval: 30000, // 30秒ごとに更新
  })

  // セッション一覧取得（最近の5件）
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = useQuery({
    queryKey: queryKeys.sessions({ limit: 5 }),
    queryFn: () => apiClient.getSessions({ limit: 5 }),
    refetchInterval: 30000,
  })

  // データ手動更新
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      // 強制的にデータを再取得
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['stats'] }),
        queryClient.refetchQueries({ queryKey: ['sessions'] }),
      ])
    } catch (error) {
      console.error('データ更新エラー:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // ページ遷移ハンドラー
  const handleNavigateToSessions = () => navigate('/sessions')
  const handleNavigateToSearch = () => navigate('/search')

  // エクスポート機能（仮実装）
  const handleExport = () => {
    alert('エクスポート機能は準備中です')
  }

  // 設定画面
  const handleSettings = () => {
    navigate('/settings')
  }

  // セッション詳細ページに遷移
  const handleSessionClick = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`)
  }

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

      if (diffHours < 1) return '1時間未満'
      if (diffHours < 24) return `${diffHours}時間前`
      return `${Math.floor(diffHours / 24)}日前`
    } catch {
      return '--'
    }
  }

  const formatSessionTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '--'
    }
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600">Chat History Manager - システム概要</p>
        </div>
        <button
          className="btn-primary flex items-center space-x-2"
          onClick={handleRefresh}
          disabled={statsLoading || sessionsLoading || isRefreshing}
        >
          <svg
            className={`w-4 h-4 ${statsLoading || sessionsLoading || isRefreshing ? 'animate-spin' : ''}`}
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
            {isRefreshing
              ? '更新中...'
              : statsLoading || sessionsLoading
                ? '読み込み中...'
                : 'データ更新'}
          </span>
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                総セッション数
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : (stats?.totalSessions ?? '--')}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                今月のメッセージ
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : (stats?.thisMonthMessages ?? '--')}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                アクティブプロジェクト
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : (stats?.activeProjects ?? '--')}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">最終更新</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading
                  ? '...'
                  : stats?.lastUpdated
                    ? formatLastUpdated(stats.lastUpdated)
                    : '--'}
              </p>
            </div>
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {(statsError || sessionsError) && (
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
                {statsError?.message ||
                  sessionsError?.message ||
                  'APIサーバーに接続できませんでした'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 最近のセッション */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            最近のセッション
          </h2>
          <button className="btn-secondary" onClick={handleNavigateToSessions}>
            すべて見る
          </button>
        </div>

        <div className="space-y-3">
          {sessionsLoading ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-gray-900">
                    セッション読み込み中...
                  </p>
                  <p className="text-sm text-gray-500">
                    データを取得しています
                  </p>
                </div>
              </div>
              <span className="text-sm text-gray-400">--</span>
            </div>
          ) : sessionsData?.sessions && sessionsData.sessions.length > 0 ? (
            sessionsData.sessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => handleSessionClick(session.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.title || `セッション ${session.id.slice(0, 8)}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {session.metadata.totalMessages}件のメッセージ
                      {session.metadata.tags &&
                        session.metadata.tags.length > 0 &&
                        ` • ${session.metadata.tags.slice(0, 2).join(', ')}`}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-400">
                  {formatSessionTime(session.startTime)}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900">
                    セッションが見つかりません
                  </p>
                  <p className="text-sm text-gray-500">データがありません</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* クイックアクション */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          クイックアクション
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-primary" onClick={handleNavigateToSearch}>
            <svg
              className="w-4 h-4 mr-2"
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
            検索開始
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            エクスポート
          </button>
          <button className="btn-secondary" onClick={handleSettings}>
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            設定
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
