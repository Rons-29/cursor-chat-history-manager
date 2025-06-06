import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { apiClient, queryKeys } from '../api/client'
import { BadgeGrid, BadgePreviewCard, AnimatedNumber, EnhancedProgressBar } from '../components/ui'
import { useBadgeSystem } from '../hooks/useBadgeSystem'
import AchievementNotificationManager from '../components/AchievementNotificationManager'
import CrossDataSourceSearch from '../components/CrossDataSourceSearch'
import TaskCompletionReport from '../components/ui/TaskCompletionReport'
import BackupDataVisualization from '../components/BackupDataVisualization'


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

  // 手動更新機能（最適化版）
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refetchStats(),
        refetchSessions(),
        refetchHealth()
      ])
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['health'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] })
      ])
      
    } catch (error) {
      console.error('❌ 統合ダッシュボード更新エラー:', error)
    } finally {
      setIsRefreshing(false)
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

  // 最近獲得したバッジ（1週間以内）
  const recentBadges = badges.filter(badge => 
    badge.earned && 
    badge.earnedDate && 
    new Date().getTime() - new Date(badge.earnedDate).getTime() < 7 * 24 * 60 * 60 * 1000
  ).slice(0, 4)

  // 進行中のバッジ（プログレスがあるもの）
  const progressBadges = badges.filter(badge => 
    !badge.earned && 
    badge.progress && 
    badge.progress > 0
  ).sort((a, b) => {
    const aProgress = ((a.progress || 0) / (a.maxProgress || 1)) * 100
    const bProgress = ((b.progress || 0) / (b.maxProgress || 1)) * 100
    return bProgress - aProgress
  }).slice(0, 4)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* アチーブメント通知マネージャー */}
      <AchievementNotificationManager />
      
      <div className="max-w-full px-3 sm:px-4 lg:px-6 py-6">
        {/* 統合ヘッダー */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🏠 ChatFlow 連携ダッシュボード
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              AI開発支援プラットフォーム - 統計・アチーブメント・システム管理
            </p>
          </div>
          
          {/* 統合更新ボタン - デバッグ情報削除版 */}
          <div className="flex-shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-all duration-200 ${
                isRefreshing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
              }`}
              title={isRefreshing ? '更新中...' : 'データを手動で更新'}
            >
              <ArrowPathIcon 
                className={`w-4 h-4 mr-2 transition-transform duration-200 ${
                  isRefreshing ? 'animate-spin' : ''
                }`} 
              />
              {isRefreshing ? '更新中...' : '統合更新'}
            </button>
          </div>
        </div>

        {/* 🎉 タスク完了レポート */}
        <TaskCompletionReport />

        {/* 🔍 統合検索セクション */}
        <div className="mb-8">
          <CrossDataSourceSearch 
            onSessionSelect={(session: any) => {
              console.log('統合ダッシュボード: セッション選択', session)
              // TODO: セッション詳細画面への遷移実装
            }}
          />
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

        {/* Phase 2 バックアップ統合可視化 */}
        <div className="mb-8">
          <BackupDataVisualization />
        </div>

        {/* バッジプレビューセクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 最近の成果 */}
          {recentBadges.length > 0 && (
            <BadgePreviewCard
              badges={recentBadges}
              title="最近の成果"
              maxDisplay={4}
              showProgress={false}
              onViewAll={() => window.location.href = '/statistics'}
            />
          )}
          
          {/* 進行中の目標 */}
          {progressBadges.length > 0 && (
            <BadgePreviewCard
              badges={progressBadges}
              title="進行中の目標"
              maxDisplay={4}
              showProgress={true}
              onViewAll={() => window.location.href = '/statistics'}
            />
          )}
          
          {/* バッジがない場合の表示 */}
          {recentBadges.length === 0 && progressBadges.length === 0 && (
            <div className="lg:col-span-2">
              <BadgePreviewCard
                badges={badges.slice(0, 4)}
                title="アチーブメント"
                maxDisplay={4}
                showProgress={true}
                onViewAll={() => window.location.href = '/statistics'}
              />
            </div>
          )}
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
                          {badge.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                    <EnhancedProgressBar 
                      value={badge.progress || 0} 
                      max={badge.maxProgress || 100}
                      className="h-2"
                      showPercentage={true}
                      label={`${Math.round(((badge.progress || 0) / (badge.maxProgress || 100)) * 100)}%`}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              to="/sessions"
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
              to="/unified-sessions"
              className="block p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🌐</span>
                <div>
                  <h3 className="font-medium text-green-900 dark:text-green-100">全データ統合</h3>
                  <p className="text-sm text-green-600 dark:text-green-300">横断検索・統合表示</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/unified-integrations"
              className="block p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🔧</span>
                <div>
                  <h3 className="font-medium text-purple-900 dark:text-purple-100">統合連携管理</h3>
                  <p className="text-sm text-purple-600 dark:text-purple-300">Cursor・Claude Dev</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/unified-search"
              className="block p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🔍</span>
                <div>
                  <h3 className="font-medium text-orange-900 dark:text-orange-100">統合検索</h3>
                  <p className="text-sm text-orange-600 dark:text-orange-300">高度検索機能</p>
                </div>
              </div>
            </Link>
            
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🔄</span>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {isRefreshing ? '更新中...' : '統合更新'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">全データ再取得</p>
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
                      {session.title || 'AI対話'}
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