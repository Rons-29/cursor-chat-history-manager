import React from 'react'
import { Badge } from './Badge'

interface BadgePreviewCardProps {
  readonly badges: Array<{
    readonly id: string
    readonly type: 'achievement' | 'milestone' | 'streak' | 'discovery' | 'level'
    readonly title: string
    readonly description?: string
    readonly icon?: string
    readonly earned?: boolean
    readonly progress?: number
    readonly maxProgress?: number
    readonly rarity?: 'common' | 'rare' | 'epic' | 'legendary'
    readonly earnedDate?: Date
  }>
  readonly title?: string
  readonly showProgress?: boolean
  readonly maxDisplay?: number
  readonly onViewAll?: () => void
  readonly className?: string
}

/**
 * バッジプレビューカード
 * 
 * ダッシュボードで最近獲得したバッジや進行中のバッジを
 * コンパクトに表示するためのカード
 * 
 * @example
 * ```tsx
 * <BadgePreviewCard
 *   badges={recentBadges}
 *   title="最近の成果"
 *   maxDisplay={3}
 *   showProgress={true}
 *   onViewAll={() => navigate('/statistics')}
 * />
 * ```
 */
export const BadgePreviewCard: React.FC<BadgePreviewCardProps> = ({
  badges,
  title = "バッジ",
  showProgress = true,
  maxDisplay = 4,
  onViewAll,
  className = ''
}) => {
  const displayBadges = badges.slice(0, maxDisplay)
  const earnedBadges = badges.filter(b => b.earned)
  const totalBadges = badges.length

  // 空状態の処理
  if (badges.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            まだバッジがありません
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            ChatFlowを使用してバッジを獲得しましょう！
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            🏆 {title}
            {earnedBadges.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                {earnedBadges.length}個獲得
              </span>
            )}
          </h3>
          {onViewAll && totalBadges > maxDisplay && (
            <button
              onClick={onViewAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
            >
              すべて表示 →
            </button>
          )}
        </div>
      </div>

      {/* バッジ表示 */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {displayBadges.map((badge) => (
            <div 
              key={badge.id}
              className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <Badge
                {...badge}
                size="sm"
                className="mb-2"
              />
              
              {/* プログレス表示 */}
              {showProgress && !badge.earned && badge.progress !== undefined && badge.maxProgress && (
                <div className="w-full mt-2">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>{badge.progress}</span>
                    <span>{badge.maxProgress}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((badge.progress / badge.maxProgress) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* 獲得日表示 */}
              {badge.earned && badge.earnedDate && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(badge.earnedDate).toLocaleDateString('ja-JP', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* もっと見るボタン（モバイル用） */}
        {onViewAll && totalBadges > maxDisplay && (
          <div className="mt-4 text-center sm:hidden">
            <button
              onClick={onViewAll}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              すべてのバッジを表示
            </button>
          </div>
        )}
      </div>

      {/* 統計サマリー */}
      {showProgress && earnedBadges.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              進捗率
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.round((earnedBadges.length / totalBadges) * 100)}%
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(earnedBadges.length / totalBadges) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default BadgePreviewCard 