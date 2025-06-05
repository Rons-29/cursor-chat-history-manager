import React, { useEffect, useState } from 'react'

interface EnhancedProgressBarProps {
  readonly value: number // 0-100
  readonly max?: number
  readonly label?: string
  readonly showPercentage?: boolean
  readonly animated?: boolean
  readonly variant?: 'default' | 'success' | 'warning' | 'error' | 'achievement'
  readonly size?: 'sm' | 'md' | 'lg'
  readonly milestones?: number[]
  readonly className?: string
}

/**
 * エンハンスドプログレスバー（キラキラ・マイルストーン機能付き）
 * 
 * @example
 * ```tsx
 * <EnhancedProgressBar
 *   value={75}
 *   label="セッション分析進捗"
 *   milestones={[25, 50, 75, 100]}
 *   variant="achievement"
 *   animated
 * />
 * ```
 */
export const EnhancedProgressBar: React.FC<EnhancedProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  animated = true,
  variant = 'default',
  size = 'md',
  milestones = [],
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  
  // プログレス値のアニメーション
  useEffect(() => {
    if (!animated || hasAnimated) {
      setDisplayValue(value)
      return
    }
    
    let startTime: number
    const startValue = displayValue
    const change = value - startValue
    const duration = 1500
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // イージング関数
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const current = startValue + change * easeOutQuart
      
      setDisplayValue(current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setHasAnimated(true)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value, animated, hasAnimated, displayValue])
  
  const percentage = Math.min((displayValue / max) * 100, 100)
  
  const variantStyles = {
    default: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    achievement: 'emotional-achievement'
  }
  
  const sizeStyles = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }
  
  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      {/* ラベルと数値 */}
      {(label || showPercentage) && (
        <div className="flex justify-between items-center">
          {label && (
            <span className={`font-medium text-gray-700 dark:text-gray-300 ${labelSizes[size]}`}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={`font-bold number-highlight ${labelSizes[size]}`}>
              {Math.round(displayValue)}/{max}
            </span>
          )}
        </div>
      )}
      
      {/* プログレスバー */}
      <div className="relative">
        {/* ベース */}
        <div className={`
          w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeStyles[size]}
          overflow-hidden
        `}>
          {/* プログレス */}
          <div
            className={`
              ${variantStyles[variant]} ${sizeStyles[size]} rounded-full
              transition-all duration-500 ease-out
              ${animated ? 'progress-shimmer' : ''}
              relative
            `}
            style={{ width: `${percentage}%` }}
          >
            {/* キラキラエフェクト */}
            {animated && percentage > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
            )}
          </div>
        </div>
        
        {/* マイルストーンマーカー */}
        {milestones.map((milestone) => {
          const position = (milestone / max) * 100
          const achieved = displayValue >= milestone
          
          return (
            <div
              key={milestone}
              className={`
                absolute top-0 w-3 h-3 rounded-full border-2 
                transform -translate-x-1/2 -translate-y-1/2
                transition-all duration-300
                ${achieved 
                  ? 'bg-green-500 border-green-600 scale-110' 
                  : 'bg-gray-300 border-gray-400 scale-90'
                }
                ${achieved && animated ? 'animate-pulse' : ''}
              `}
              style={{ 
                left: `${position}%`, 
                top: '50%'
              }}
              title={`マイルストーン: ${milestone}/${max}`}
            >
              {achieved && (
                <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
              )}
            </div>
          )
        })}
      </div>
      
      {/* パーセンテージ表示 */}
      {showPercentage && (
        <div className="text-center">
          <span className={`${labelSizes[size]} text-gray-600 dark:text-gray-400`}>
            {Math.round(percentage)}% 完了
          </span>
        </div>
      )}
    </div>
  )
}

export default EnhancedProgressBar 