import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import { BadgeGrid, AnimatedNumber, EnhancedProgressBar } from '../components/ui'
import { useBadgeSystem } from '../hooks/useBadgeSystem'

/**
 * 統計・アチーブメント統合ページ
 * - 包括的な利用統計
 * - バッジシステム表示
 * - エンゲージメント向上機能
 */
const Statistics: React.FC = () => {
  // データ取得
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiClient.getStats(),
    refetchInterval: 60000, // 1分ごとに更新
  })

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', { page: 1, limit: 100 }],
    queryFn: () => apiClient.getSessions({ page: 1, limit: 100 }),
    refetchInterval: 60000,
  })

  // バッジシステム
  const { 
    badges, 
    updateUserStats, 
    badgeStats, 
    nextBadges
  } = useBadgeSystem()

  // 統計データからバッジ統計更新
  useEffect(() => {
    if (statsData && sessionsData?.sessions) {
      const sessions = sessionsData.sessions
      const totalMessages = sessions.reduce((sum, session) => 
        sum + (session.metadata?.totalMessages || 0), 0
      )
      
      updateUserStats({
        totalSessions: statsData.totalSessions || 0,
        totalMessages,
        searchCount: Math.floor((statsData.totalSessions || 0) * 0.4), // 推定検索回数
        exportCount: Math.floor((statsData.totalSessions || 0) * 0.15), // 推定エクスポート回数
        uniqueProjects: new Set(sessions.map(s => (s.metadata as any)?.project).filter(Boolean)).size || 1,
        averageSessionLength: 20 + Math.floor((statsData.totalSessions || 0) / 8), // 推定平均時間
        consecutiveDays: Math.min(45, Math.floor((statsData.totalSessions || 0) / 3)), // 推定連続日数
        lastActiveDate: new Date()
      })
    }
  }, [statsData, sessionsData, updateUserStats])

  // ローディング状態
  if (statsLoading || sessionsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const totalSessions = statsData?.totalSessions || 0
  const sessions = sessionsData?.sessions || []
  const totalMessages = sessions.reduce((sum, session) => 
    sum + (session.metadata?.totalMessages || 0), 0
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ヘッダー */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          📊 統計・アチーブメント
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          あなたのChatFlow利用統計と獲得した成果を確認できます
        </p>
      </header>

      {/* 主要統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 総セッション数 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">💬</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  総AI対話数
                </dt>
                <dd className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  <AnimatedNumber 
                    value={totalSessions} 
                    duration={2000}
                    className="tabular-nums"
                  />
                </dd>
              </dl>
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
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  総メッセージ数
                </dt>
                <dd className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  <AnimatedNumber 
                    value={totalMessages} 
                    duration={2500}
                    className="tabular-nums"
                  />
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* 獲得バッジ数 */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg shadow p-6 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🏆</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  獲得バッジ
                </dt>
                <dd className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  <AnimatedNumber 
                    value={badgeStats.earned} 
                    duration={1500}
                    className="tabular-nums"
                  />
                  <span className="text-lg text-gray-500">/{badgeStats.total}</span>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* 達成率 */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg shadow p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">📈</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  達成率
                </dt>
                <dd className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  <AnimatedNumber 
                    value={Math.round((badgeStats.earned / badgeStats.total) * 100)} 
                    duration={2000}
                    className="tabular-nums"
                  />
                  <span className="text-lg">%</span>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* 次の目標セクション */}
      {nextBadges.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <span className="mr-2">🎯</span>
              次の目標
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              もうすぐ獲得できるバッジをチェックしましょう
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nextBadges.slice(0, 3).map(badge => (
                <div 
                  key={badge.id}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-3">{badge.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {badge.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                                     <EnhancedProgressBar
                     value={(badge.progress || 0) / (badge.maxProgress || 1) * 100}
                     size="lg"
                     milestones={[25, 50, 75, 100]}
                     animated={true}
                     className="mb-2"
                   />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {badge.progress}/{badge.maxProgress}
                    </span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {Math.round(((badge.progress || 0) / (badge.maxProgress || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* レアリティ別統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* バッジレアリティ分布 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              バッジレアリティ分布
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(badgeStats.byRarity).map(([rarity, count]) => {
                const colors = {
                  common: 'bg-gray-500',
                  rare: 'bg-blue-500',
                  epic: 'bg-purple-500',
                  legendary: 'bg-yellow-500'
                }
                const labels = {
                  common: 'コモン',
                  rare: 'レア',
                  epic: 'エピック',
                  legendary: 'レジェンダリー'
                }
                
                return (
                  <div key={rarity} className="flex items-center">
                    <div className="flex items-center w-24">
                      <div className={`w-3 h-3 rounded-full ${colors[rarity as keyof typeof colors]} mr-2`}></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {labels[rarity as keyof typeof labels]}
                      </span>
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[rarity as keyof typeof colors]}`}
                          style={{ width: `${(count / badgeStats.earned) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* タイプ別統計 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              バッジタイプ別獲得数
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(badgeStats.byType).map(([type, count]) => {
                const icons = {
                  achievement: '🏆',
                  milestone: '🎯',
                  streak: '🔥',
                  discovery: '💡',
                  level: '⭐'
                }
                const labels = {
                  achievement: 'アチーブメント',
                  milestone: 'マイルストーン',
                  streak: 'ストリーク',
                  discovery: '発見',
                  level: 'レベル'
                }
                
                return (
                  <div key={type} className="flex items-center">
                    <div className="flex items-center w-32">
                      <span className="text-lg mr-2">{icons[type as keyof typeof icons]}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {labels[type as keyof typeof labels]}
                      </span>
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(count / badgeStats.earned) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 全バッジ一覧 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            🏆 全アチーブメント
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            すべてのバッジの獲得状況を確認できます
          </p>
        </div>
        <div className="p-6">
          <BadgeGrid 
            badges={badges}
            showFilters={true}
            showProgress={true}
            size="md"
            columns={5}
          />
        </div>
      </div>
    </div>
  )
}

export default Statistics 