import React, { useState } from 'react'
import { Badge } from './Badge'

interface BadgeData {
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
  readonly category?: string
}

interface BadgeGridProps {
  readonly badges: BadgeData[]
  readonly title?: string
  readonly showFilters?: boolean
  readonly showProgress?: boolean
  readonly size?: 'sm' | 'md' | 'lg'
  readonly columns?: 'auto' | 3 | 4 | 5 | 6
  readonly onBadgeClick?: (badge: BadgeData) => void
  readonly className?: string
}

/**
 * バッジグリッド表示コンポーネント
 * 
 * @example
 * ```tsx
 * <BadgeGrid
 *   badges={userBadges}
 *   title="アチーブメント"
 *   showFilters={true}
 *   showProgress={true}
 *   columns={4}
 *   onBadgeClick={handleBadgeClick}
 * />
 * ```
 */
export const BadgeGrid: React.FC<BadgeGridProps> = ({
  badges,
  title = 'バッジ',
  showFilters = true,
  showProgress = true,
  size = 'md',
  columns = 'auto',
  onBadgeClick,
  className = ''
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  
  // フィルタリング
  const filteredBadges = badges.filter(badge => {
    const typeMatch = selectedType === 'all' || badge.type === selectedType
    const statusMatch = 
      selectedFilter === 'all' ||
      (selectedFilter === 'earned' && badge.earned) ||
      (selectedFilter === 'progress' && !badge.earned && (badge.progress || 0) > 0) ||
      (selectedFilter === 'locked' && !badge.earned && (badge.progress || 0) === 0)
    
    return typeMatch && statusMatch
  })
  
  // 統計計算
  const stats = {
    total: badges.length,
    earned: badges.filter(b => b.earned).length,
    inProgress: badges.filter(b => !b.earned && (b.progress || 0) > 0).length,
    locked: badges.filter(b => !b.earned && (b.progress || 0) === 0).length
  }
  
  const filters = [
    { key: 'all', label: 'すべて', count: stats.total },
    { key: 'earned', label: '獲得済み', count: stats.earned },
    { key: 'progress', label: '進行中', count: stats.inProgress },
    { key: 'locked', label: '未解放', count: stats.locked }
  ]
  
  const types = [
    { key: 'all', label: 'すべて' },
    { key: 'achievement', label: 'アチーブメント' },
    { key: 'milestone', label: 'マイルストーン' },
    { key: 'streak', label: 'ストリーク' },
    { key: 'discovery', label: '発見' },
    { key: 'level', label: 'レベル' }
  ]
  
  const gridColumns = {
    'auto': 'grid-cols-auto-fit',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  }
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          {showProgress && (
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span>獲得: {stats.earned}/{stats.total}</span>
              <div className="flex-1 max-w-xs">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.earned / stats.total) * 100}%` }}
                  />
                </div>
              </div>
              <span>{Math.round((stats.earned / stats.total) * 100)}%</span>
            </div>
          )}
        </div>
      </div>
      
      {/* フィルター */}
      {showFilters && (
        <div className="space-y-3">
          {/* ステータスフィルター */}
          <div className="flex flex-wrap gap-2">
            {filters.map(filter => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                  ${selectedFilter === filter.key
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
          
          {/* タイプフィルター */}
          <div className="flex flex-wrap gap-2">
            {types.map(type => (
              <button
                key={type.key}
                onClick={() => setSelectedType(type.key)}
                className={`
                  px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200
                  ${selectedType === type.key
                    ? 'bg-secondary-500 text-white'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* バッジグリッド */}
      <div className={`
        grid gap-4
        ${typeof columns === 'string' ? gridColumns[columns] : gridColumns[columns]}
        ${size === 'sm' ? 'gap-3' : size === 'lg' ? 'gap-6' : 'gap-4'}
      `}>
        {filteredBadges.map(badge => (
          <div
            key={badge.id}
            className="flex flex-col items-center space-y-2"
          >
            <Badge
              type={badge.type}
              title={badge.title}
              description={badge.description}
              icon={badge.icon}
              earned={badge.earned}
              progress={badge.progress}
              maxProgress={badge.maxProgress}
              rarity={badge.rarity}
              earnedDate={badge.earnedDate}
              size={size}
              onClick={() => onBadgeClick?.(badge)}
            />
            
            {/* バッジ名（グリッド表示時） */}
            <div className="text-center">
              <div className={`
                font-medium text-gray-900 dark:text-gray-100
                ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'}
              `}>
                {badge.title}
              </div>
              
              {/* 進捗表示（未獲得時） */}
              {!badge.earned && (badge.progress || 0) > 0 && (
                <div className={`
                  text-primary-600 dark:text-primary-400 font-medium
                  ${size === 'sm' ? 'text-xs' : 'text-xs'}
                `}>
                  {badge.progress}/{badge.maxProgress}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* 空の状態 */}
      {filteredBadges.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-600 text-6xl mb-4">
            🏆
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            バッジが見つかりません
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            別のフィルターを試してみてください
          </p>
        </div>
      )}
    </div>
  )
}

export default BadgeGrid 