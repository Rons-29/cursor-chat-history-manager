import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { apiClient, queryKeys } from '../api/client'
import { BadgeGrid, AnimatedNumber, EnhancedProgressBar } from '../components/ui'
import { useBadgeSystem } from '../hooks/useBadgeSystem'

/**
 * 🏠 統合ダッシュボード
 * 
 * Dashboard.tsx + Statistics.tsx の統合版
 * - 基本統計カード
 * - アチーブメント・バッジシステム
 * - システム状態監視
 * - クイックアクション
 * - 使用傾向・分析
 */
const UnifiedDashboard: React.FC = () => {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasError, setHasError] = useState(false)

  // データ取得（統合）
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: queryKeys.sessions({ page: 1, limit: 5 }),
    queryFn: () => apiClient.getSessions({ page: 1, limit: 5 }),
    refetchInterval: 60000,
  })

  const {
    data: healthData,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch('http://localhost:3001/api/health').then(res => res.json()),
    refetchInterval: 30000,
  })

  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiClient.getStats(),
    refetchInterval: 60000,
  })

  // 詳細セッションデータ（アチーブメント用）
  const { data: allSessionsData } = useQuery({
    queryKey: ['sessions', { page: 1, limit: 100 }],
    queryFn: () => apiClient.getSessions({ page: 1, limit: 100 }),
    refetchInterval: 120000, // 2分ごと
  })

  // バッジシステム
  const { 
    badges, 
    updateUserStats, 
    badgeStats, 
    nextBadges
  } = useBadgeSystem()

  // 手動更新機能（強化版）
  const handleManualRefresh = async () => {
    console.log('🔄 統合ダッシュボード更新開始:', new Date().toLocaleTimeString())
    setIsRefreshing(true)
    try {
      console.log('📊 統計データ更新開始')
      const statsResult = await refetchStats()
      console.log('📊 統計データ更新完了:', statsResult.data)
      
      console.log('💾 セッションデータ更新開始')
      const sessionsResult = await refetchSessions()
      console.log('💾 セッションデータ更新完了:', sessionsResult.data?.pagination?.total)
      
      console.log('🏥 ヘルスチェック更新開始')
      const healthResult = await refetchHealth()
      console.log('🏥 ヘルスチェック更新完了:', healthResult.data?.status)
      
      console.log('🗑️ React Queryキャッシュ無効化実行')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['health'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] })
      ])
      
      console.log('✅ 統合ダッシュボード更新完了:', new Date().toLocaleTimeString())
      
    } catch (error) {
      console.error('❌ 統合ダッシュボード更新エラー:', error)
      if (error instanceof Error) {
        console.error('❌ エラー詳細:', {
          message: error.message,
          stack: error.stack
        })
      }
    } finally {
      setIsRefreshing(false)
      console.log('🏁 統合ダッシュボード更新処理終了:', new Date().toLocaleTimeString())
    }
  }

  // バッジシステム統計更新
  useEffect(() => {
    if (statsData && allSessionsData?.sessions) {
      const sessions = allSessionsData.sessions
      const totalMessages = sessions.reduce((sum, session) => 
        sum + (session.metadata?.totalMessages || 0), 0
      )
      
      updateUserStats({
        totalSessions: statsData.totalSessions || 0,
        totalMessages,
        searchCount: Math.floor((statsData.totalSessions || 0) * 0.4),
        exportCount: Math.floor((statsData.totalSessions || 0) * 0.15),
        uniqueProjects: new Set(sessions.map(s => (s.metadata as any)?.project).filter(Boolean)).size || 1,
        averageSessionLength: 20 + Math.floor((statsData.totalSessions || 0) / 8),
        consecutiveDays: Math.min(45, Math.floor((statsData.totalSessions || 0) / 3)),
        lastActiveDate: new Date()
      })
    }
  }, [statsData, allSessionsData, updateUserStats])

  // エラーハンドリング
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('⚠️ 統合ダッシュボード エラー:', error)
      setHasError(true)
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  // エラー時のフォールバック表示
  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            統合ダッシュボード読み込みエラー
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
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

  // データ計算
  const totalSessions = (() => {
    if (statsData?.totalSessions && !statsLoading) {
      return statsData.totalSessions
    }
    if (sessionsData?.pagination?.total && !sessionsLoading) {
      return sessionsData.pagination.total
    }
    return 0
  })()

  const totalMessages = statsData?.totalMessages || 0
  const thisMonthMessages = statsData?.thisMonthMessages || 0
  const lastUpdated = statsData?.lastUpdated || null
  const recentSessions = sessionsData?.sessions?.slice(0, 3) || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* レンダリングテスト */}
      <div className="fixed top-0 right-0 z-50 bg-green-500 text-white p-2 text-xs">
        ✅ 統合ダッシュボード: {new Date().toLocaleTimeString()}
      </div>
      
      {/* テーマ切り替えボタン */}
      <div className="fixed top-0 left-0 z-50 p-4">
        <button
          onClick={() => window.toggleTheme?.()}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 shadow-sm hover:shadow-md transition-all"
          title="テーマ切り替え"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
      
      <div className="max-w-full px-3 sm:px-4 lg:px-6 py-2">
        {/* 統合ヘッダー */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🏠 ChatFlow 統合ダッシュボード
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              AI開発支援プラットフォーム - 統計・アチーブメント・システム管理
            </p>
          </div>
          
          {/* 統合更新ボタン */}
          <div className="flex flex-col items-end">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-all duration-200 ${
                isRefreshing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
              }`}
              title={isRefreshing ? '更新中... (コンソールで進行状況確認)' : 'データを手動で更新'}
            >
              <ArrowPathIcon 
                className={`w-4 h-4 mr-2 transition-transform duration-200 ${
                  isRefreshing ? 'animate-spin' : ''
                }`} 
              />
              {isRefreshing ? '更新中...' : '統合更新'}
            </button>
            
            {/* デバッグ情報表示 */}
            {(process.env.NODE_ENV === 'development' || true) && (
              <div className="text-xs text-gray-500 mt-1 text-right">
                最終更新: {new Date().toLocaleTimeString()}
                {isRefreshing && (
                  <div className="text-blue-600 font-medium">
                    📊 統合更新中... コンソールで詳細確認
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 基本統計カード（6つ統合） */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* 総AI対話記録数 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">💬</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  総AI対話記録数
                </dt>
                <dd className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  <AnimatedNumber 
                    value={totalSessions} 
                    duration={2000}
                    className="tabular-nums"
                  />
                </dd>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  AI開発支援記録
                </p>
                {sessionsError && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    エラー: {sessionsError.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 総メッセージ数 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg shadow p-6 border border-green-200 dark:border-green-800">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">✉️</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  総メッセージ数
                </dt>
                <dd className="text-3xl font-bold text-green-600 dark:text-green-400">
                  <AnimatedNumber 
                    value={totalMessages} 
                    duration={2500}
                    className="tabular-nums"
                  />
                </dd>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  チャット履歴メッセージ
                </p>
              </div>
            </div>
          </div>
          
          {/* システム状態 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🏥</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  システム状態
                </dt>
                <dd className="text-lg font-medium text-green-600 dark:text-green-400">
                  {healthLoading ? '確認中...' : healthData?.status === 'ok' ? '✅ 正常動作中' : '⚠️ 要確認'}
                </dd>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  API & データベース
                </p>
              </div>
            </div>
          </div>

          {/* アチーブメント・バッジ統計 */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg shadow p-6 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center mb-2">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🏆</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  アチーブメント
                </dt>
                <dd className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  <AnimatedNumber 
                    value={badgeStats.earned} 
                    duration={1500}
                    className="tabular-nums"
                  />
                  <span className="text-lg text-gray-500">/{badgeStats.total}</span>
                </dd>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(badgeStats.earned / badgeStats.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {Math.round((badgeStats.earned / badgeStats.total) * 100)}% 達成
              </p>
            </div>
          </div>

          {/* 今月のメッセージ */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg shadow p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">📈</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  今月のメッセージ
                </dt>
                <dd className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  <AnimatedNumber 
                    value={thisMonthMessages} 
                    duration={2000}
                    className="tabular-nums"
                  />
                </dd>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
          </div>

          {/* 最終更新 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🕒</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  最終更新
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {lastUpdated 
                    ? new Date(lastUpdated).toLocaleTimeString('ja-JP', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : '--:--'
                  }
                </dd>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {lastUpdated 
                    ? new Date(lastUpdated).toLocaleDateString('ja-JP')
                    : 'データなし'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 次の目標セクション（アチーブメント） */}
        {nextBadges.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                🎯 次の目標
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({nextBadges.length}個の目標が近づいています)
                </span>
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nextBadges.slice(0, 6).map((badge) => (
                  <div key={badge.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">{badge.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                          {badge.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                    <EnhancedProgressBar 
                      progress={badge.progress} 
                      className="h-2"
                      showLabel={true}
                      label={`${Math.round(badge.progress)}%`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* バッジグリッド（Statistics.tsx統合） */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              🏆 獲得済みアチーブメント
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({badgeStats.earned}個獲得済み)
              </span>
            </h2>
          </div>
          <div className="p-6">
            <BadgeGrid badges={badges} />
          </div>
        </div>

        {/* クイックアクション（統合） */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ⚡ クイックアクション
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/search"
              className="block p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">💬</span>
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">AI対話管理</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-300">検索・閲覧・管理</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/integrations"
              className="block p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🔧</span>
                <div>
                  <h3 className="font-medium text-green-900 dark:text-green-100">統合連携管理</h3>
                  <p className="text-sm text-green-600 dark:text-green-300">Cursor・Claude Dev</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/settings"
              className="block p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">⚙️</span>
                <div>
                  <h3 className="font-medium text-purple-900 dark:text-purple-100">設定・管理</h3>
                  <p className="text-sm text-purple-600 dark:text-purple-300">システム設定</p>
                </div>
              </div>
            </Link>
            
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="block p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🔄</span>
                <div className="text-left">
                  <h3 className="font-medium text-orange-900 dark:text-orange-100">
                    {isRefreshing ? '更新中...' : '統合更新'}
                  </h3>
                  <p className="text-sm text-orange-600 dark:text-orange-300">全データ再取得</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 最新活動（簡易版） */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              📱 最新活動
            </h2>
            <Link
              to="/search"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              すべて表示 →
            </Link>
          </div>
          <div className="space-y-3">
            {recentSessions.length > 0 ? (
              recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {session.title || 'AI対話セッション'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(session.startTime).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {session.metadata?.totalMessages || 0}メッセージ
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                最新の活動はありません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnifiedDashboard 