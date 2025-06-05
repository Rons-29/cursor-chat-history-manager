import React from 'react'

interface BadgeProps {
  readonly type: 'achievement' | 'milestone' | 'streak' | 'discovery' | 'level'
  readonly title: string
  readonly description?: string
  readonly icon?: string
  readonly earned?: boolean
  readonly progress?: number
  readonly maxProgress?: number
  readonly rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  readonly earnedDate?: Date
  readonly className?: string
  readonly size?: 'sm' | 'md' | 'lg'
  readonly onClick?: () => void
}

/**
 * バッジ・アチーブメントシステム
 * 
 * @example
 * ```tsx
 * <Badge
 *   type="achievement"
 *   title="セッションマスター"
 *   description="100セッションを達成"
 *   icon="🏆"
 *   earned={true}
 *   rarity="epic"
 *   earnedDate={new Date()}
 * />
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({
  type,
  title,
  description,
  icon,
  earned = false,
  progress = 0,
  maxProgress = 100,
  rarity = 'common',
  earnedDate,
  className = '',
  size = 'md',
  onClick
}) => {
  const progressPercentage = maxProgress > 0 ? (progress / maxProgress) * 100 : 0
  
  const typeStyles = {
    achievement: {
      bgEarned: 'emotional-achievement',
      bgUnearned: 'bg-gray-200 dark:bg-gray-700',
      borderColor: 'border-yellow-400',
      defaultIcon: '🏆'
    },
    milestone: {
      bgEarned: 'emotional-progress',
      bgUnearned: 'bg-gray-200 dark:bg-gray-700',
      borderColor: 'border-blue-400',
      defaultIcon: '🎯'
    },
    streak: {
      bgEarned: 'bg-gradient-to-r from-orange-500 to-red-500',
      bgUnearned: 'bg-gray-200 dark:bg-gray-700',
      borderColor: 'border-orange-400',
      defaultIcon: '🔥'
    },
    discovery: {
      bgEarned: 'emotional-discovery',
      bgUnearned: 'bg-gray-200 dark:bg-gray-700',
      borderColor: 'border-purple-400',
      defaultIcon: '💡'
    },
    level: {
      bgEarned: 'bg-gradient-to-r from-green-500 to-emerald-500',
      bgUnearned: 'bg-gray-200 dark:bg-gray-700',
      borderColor: 'border-green-400',
      defaultIcon: '⭐'
    }
  }
  
  const rarityStyles = {
    common: {
      borderWidth: 'border-2',
      shadowClass: '',
      rarityColor: 'text-gray-600'
    },
    rare: {
      borderWidth: 'border-3',
      shadowClass: 'shadow-md',
      rarityColor: 'text-blue-600'
    },
    epic: {
      borderWidth: 'border-4',
      shadowClass: 'shadow-lg',
      rarityColor: 'text-purple-600'
    },
    legendary: {
      borderWidth: 'border-4',
      shadowClass: 'shadow-xl',
      rarityColor: 'text-yellow-600'
    }
  }
  
  const sizeStyles = {
    sm: {
      containerSize: 'w-16 h-16',
      iconSize: 'text-lg',
      titleSize: 'text-xs',
      descriptionSize: 'text-xs'
    },
    md: {
      containerSize: 'w-20 h-20',
      iconSize: 'text-xl',
      titleSize: 'text-sm',
      descriptionSize: 'text-xs'
    },
    lg: {
      containerSize: 'w-24 h-24',
      iconSize: 'text-2xl',
      titleSize: 'text-base',
      descriptionSize: 'text-sm'
    }
  }
  
  const typeStyle = typeStyles[type]
  const rarityStyle = rarityStyles[rarity]
  const sizeStyle = sizeStyles[size]
  const displayIcon = icon || typeStyle.defaultIcon
  
  return (
    <div 
      className={`
        relative group cursor-pointer transition-all duration-300
        ${onClick ? 'hover:scale-105' : ''}
        ${className}
      `}
      onClick={onClick}
      title={description}
    >
      {/* バッジ本体 */}
      <div className={`
        ${sizeStyle.containerSize}
        ${earned ? typeStyle.bgEarned : typeStyle.bgUnearned}
        ${typeStyle.borderColor}
        ${rarityStyle.borderWidth}
        ${rarityStyle.shadowClass}
        rounded-full
        flex items-center justify-center
        relative overflow-hidden
        transition-all duration-300
        ${earned ? 'text-white' : 'text-gray-500 dark:text-gray-400'}
        ${!earned && progress > 0 ? 'ring-2 ring-primary-200 dark:ring-primary-800' : ''}
      `}>
        
        {/* プログレス背景（未獲得時） */}
        {!earned && progress > 0 && (
          <div 
            className="absolute inset-0 bg-primary-200 dark:bg-primary-800 rounded-full"
            style={{ 
              clipPath: `polygon(0 0, ${progressPercentage}% 0, ${progressPercentage}% 100%, 0 100%)` 
            }}
          />
        )}
        
        {/* シマーエフェクト（獲得時） */}
        {earned && rarity !== 'common' && (
          <div className="absolute inset-0 rounded-full animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-ping" />
          </div>
        )}
        
        {/* アイコン */}
        <span className={`${sizeStyle.iconSize} relative z-10`}>
          {displayIcon}
        </span>
        
        {/* 進捗表示（未獲得時） */}
        {!earned && progress > 0 && (
          <div className="absolute bottom-1 right-1 bg-white dark:bg-gray-800 rounded-full px-1">
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        )}
        
        {/* 獲得日付（獲得時） */}
        {earned && earnedDate && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      {/* ツールチップ（ホバー時表示） */}
      <div className={`
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
        bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
        px-3 py-2 rounded-lg text-center
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        pointer-events-none z-20
        whitespace-nowrap
      `}>
        <div className={`font-semibold ${sizeStyle.titleSize}`}>
          {title}
        </div>
        {description && (
          <div className={`${sizeStyle.descriptionSize} mt-1 opacity-75`}>
            {description}
          </div>
        )}
        {!earned && progress > 0 && (
          <div className={`${sizeStyle.descriptionSize} mt-1 ${rarityStyle.rarityColor}`}>
            進捗: {progress}/{maxProgress}
          </div>
        )}
        {earned && earnedDate && (
          <div className={`${sizeStyle.descriptionSize} mt-1 text-green-400`}>
            {earnedDate.toLocaleDateString()}獲得
          </div>
        )}
        
        {/* 吹き出し矢印 */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
      </div>
      
      {/* レアリティ表示 */}
      {rarity !== 'common' && (
        <div className={`
          absolute -top-1 -right-1 px-1 rounded-full text-xs font-bold
          ${rarityStyle.rarityColor}
          bg-white dark:bg-gray-800
          border border-current
        `}>
          {rarity.toUpperCase()}
        </div>
      )}
    </div>
  )
}

export default Badge 