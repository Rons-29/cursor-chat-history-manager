import React, { useState } from 'react'
import { Card } from './Card'

interface ExpandableCardProps {
  readonly title: string
  readonly preview: string | React.ReactNode
  readonly fullContent: React.ReactNode
  readonly engagementHook?: string
  readonly className?: string
  readonly initialExpanded?: boolean
  readonly onToggle?: (expanded: boolean) => void
  readonly curiosityLevel?: 'low' | 'medium' | 'high'
}

/**
 * プログレッシブ開示機能付きExpandableCardコンポーネント
 * 
 * @example
 * ```tsx
 * <ExpandableCard
 *   title="セッション詳細"
 *   preview="クリックして詳細を表示..."
 *   fullContent={<DetailedContent />}
 *   engagementHook="新しい機能を発見！"
 *   curiosityLevel="high"
 * />
 * ```
 */
export const ExpandableCard: React.FC<ExpandableCardProps> = ({
  title,
  preview,
  fullContent,
  engagementHook,
  className = '',
  initialExpanded = false,
  onToggle,
  curiosityLevel = 'medium'
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)
  
  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    onToggle?.(newState)
  }
  
  const curiosityStyles = {
    low: 'hover:shadow-md',
    medium: 'hover:shadow-lg hover:-translate-y-1',
    high: 'hover:shadow-xl hover:-translate-y-2 hover:border-primary-300 dark:hover:border-primary-600'
  }
  
  return (
    <Card 
      className={`
        cursor-pointer transition-all duration-300 
        ${curiosityStyles[curiosityLevel]}
        ${isExpanded ? 'ring-2 ring-primary-200 dark:ring-primary-800' : ''}
        ${className}
      `}
      onClick={handleToggle}
      variant={isExpanded ? 'elevated' : 'default'}
      hover={!isExpanded}
    >
      {/* エンゲージメントフック */}
      {engagementHook && !isExpanded && (
        <div className="mb-3 text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1">
          <span className="animate-pulse">💡</span>
          {engagementHook}
        </div>
      )}
      
      {/* タイトル */}
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center justify-between">
        {title}
        
        {/* 展開インジケータ */}
        <div className={`
          transform transition-transform duration-200 text-gray-500 dark:text-gray-400
          ${isExpanded ? 'rotate-180' : ''}
        `}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </h3>
      
      {/* コンテンツ */}
      <div className={`transition-all duration-300 ${isExpanded ? 'space-y-4' : ''}`}>
        {!isExpanded ? (
          <div>
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              {typeof preview === 'string' ? (
                <p>{preview}</p>
              ) : (
                preview
              )}
            </div>
            
            <div className="flex items-center text-xs text-primary-600 dark:text-primary-400 font-medium">
              <span>もっと詳しく</span>
              <svg className="w-3 h-3 ml-1 transform transition-transform group-hover:translate-x-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {fullContent}
            
            <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                閉じる
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default ExpandableCard 