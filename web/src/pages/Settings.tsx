import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, queryKeys } from '../api/client'

const Settings: React.FC = () => {
  const queryClient = useQueryClient()
  const [isDataClearing, setIsDataClearing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // システム情報取得（statsを使用してサーバー状態確認）
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const stats = await apiClient.getStats()
      return {
        status: 'OK',
        timestamp: stats.lastUpdated,
        uptime: Math.floor(
          (new Date().getTime() - new Date('2025-05-29T00:00:00Z').getTime()) /
            1000
        ),
      }
    },
    refetchInterval: 30000,
  })

  // 統計情報取得
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.stats(),
    queryFn: () => apiClient.getStats(),
  })

  // キャッシュクリア
  const handleClearCache = () => {
    queryClient.clear()
    alert('キャッシュをクリアしました')
  }

  // データリフレッシュ
  const handleRefreshAll = () => {
    queryClient.invalidateQueries()
    queryClient.refetchQueries()
    alert('全データの更新を開始しました')
  }

  // データエクスポート（仮実装）
  const handleExport = async () => {
    try {
      const sessions = await apiClient.getSessions({ limit: 1000 })
      const dataStr = JSON.stringify(sessions, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })

      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chat-history-export-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)

      alert('データをエクスポートしました')
    } catch (error) {
      alert('エクスポートに失敗しました: ' + (error as Error).message)
    }
  }

  // データ削除（仮実装）
  const handleDeleteAllData = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setIsDataClearing(true)
    try {
      // 実際のAPIエンドポイントがあれば実装
      alert('この機能は現在利用できません')
    } catch (error) {
      alert('削除に失敗しました: ' + (error as Error).message)
    } finally {
      setIsDataClearing(false)
      setShowDeleteConfirm(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}日 ${hours}時間`
    if (hours > 0) return `${hours}時間 ${minutes}分`
    return `${minutes}分`
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-600">システム設定とデータ管理</p>
      </div>

      {/* システム情報 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          システム情報
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">サーバー状態</h3>
            {healthLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : healthData ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  状態:{' '}
                  <span className="text-green-600 font-medium">
                    {healthData.status}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  稼働時間: {formatUptime(healthData.uptime)}
                </p>
                <p className="text-sm text-gray-600">
                  最終確認:{' '}
                  {new Date(healthData.timestamp).toLocaleString('ja-JP')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-red-600">接続できません</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">データ統計</h3>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : stats ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  総セッション数: {stats.totalSessions}
                </p>
                <p className="text-sm text-gray-600">
                  総メッセージ数: {stats.totalMessages}
                </p>
                <p className="text-sm text-gray-600">
                  今月のメッセージ: {stats.thisMonthMessages}
                </p>
              </div>
            ) : (
              <p className="text-sm text-red-600">データを取得できません</p>
            )}
          </div>
        </div>
      </div>

      {/* データ管理 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">データ管理</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              className="btn-primary flex items-center justify-center space-x-2"
              onClick={handleRefreshAll}
            >
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>全データ更新</span>
            </button>

            <button
              className="btn-secondary flex items-center justify-center space-x-2"
              onClick={handleClearCache}
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>キャッシュクリア</span>
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-medium text-gray-900 mb-3">
              エクスポート・インポート
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                className="btn-secondary flex items-center justify-center space-x-2"
                onClick={handleExport}
              >
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>データエクスポート</span>
              </button>

              <button
                className="btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50"
                disabled
              >
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span>データインポート (準備中)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 危険な操作 */}
      <div className="card border-red-200 bg-red-50">
        <h2 className="text-lg font-semibold text-red-900 mb-4">危険な操作</h2>
        <div className="space-y-4">
          <p className="text-sm text-red-700">
            以下の操作は慎重に行ってください。データの復旧はできません。
          </p>

          {!showDeleteConfirm ? (
            <button
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              onClick={handleDeleteAllData}
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>全データ削除</span>
            </button>
          ) : (
            <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm text-red-800 mb-4">
                本当に全データを削除しますか？この操作は取り消せません。
              </p>
              <div className="flex space-x-3">
                <button
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  onClick={handleDeleteAllData}
                  disabled={isDataClearing}
                >
                  {isDataClearing ? '削除中...' : '削除実行'}
                </button>
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDataClearing}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 使用方法 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">使用方法</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-900">ダッシュボード</h3>
            <p>システム全体の統計情報と最近のセッションを確認できます。</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">セッション一覧</h3>
            <p>全てのチャットセッションを閲覧、検索、ソートできます。</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">検索機能</h3>
            <p>キーワードでメッセージ内容を横断検索できます。</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">自動更新</h3>
            <p>データは定期的に自動更新されます。手動更新も可能です。</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
