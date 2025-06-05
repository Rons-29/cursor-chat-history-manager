import React, { useState, useEffect } from 'react'
import { Button } from './Button'

interface EmotionalButtonProps {
  readonly variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  readonly size?: 'sm' | 'md' | 'lg' | 'xl'
  readonly children: React.ReactNode
  readonly onClick?: () => void | Promise<void>
  readonly successMessage?: string
  readonly errorMessage?: string
  readonly className?: string
  readonly disabled?: boolean
  readonly satisfactionLevel?: 'low' | 'medium' | 'high'
  readonly hapticEffect?: boolean
}

/**
 * エモーショナルフィードバック機能付きButtonコンポーネント
 * 
 * @example
 * ```tsx
 * <EmotionalButton
 *   variant="primary"
 *   onClick={handleSave}
 *   successMessage="保存完了！素晴らしい👏"
 *   satisfactionLevel="high"
 *   hapticEffect
 * >
 *   保存する
 * </EmotionalButton>
 * ```
 */
export const EmotionalButton: React.FC<EmotionalButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  successMessage = '完了しました！',
  errorMessage = '何か問題が発生しました',
  className = '',
  disabled = false,
  satisfactionLevel = 'medium',
  hapticEffect = false
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [showFeedback, setShowFeedback] = useState(false)
  
  const satisfactionEmojis = {
    low: '👍',
    medium: '✨',
    high: '🎉'
  }
  
  const satisfactionColors = {
    low: 'bg-green-500',
    medium: 'bg-blue-500',
    high: 'bg-purple-500'
  }
  
  const handleClick = async () => {
    if (!onClick || disabled || state === 'loading') return
    
    // ハプティックフィードバック（対応デバイスのみ）
    if (hapticEffect && 'vibrate' in navigator) {
      navigator.vibrate(50)
    }
    
    setState('loading')
    
    try {
      await onClick()
      setState('success')
      setShowFeedback(true)
      
      // 成功時のハプティック
      if (hapticEffect && 'vibrate' in navigator) {
        setTimeout(() => navigator.vibrate([50, 100, 50]), 200)
      }
      
    } catch (error) {
      setState('error')
      setShowFeedback(true)
      
      // エラー時のハプティック
      if (hapticEffect && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    }
  }
  
  // フィードバック自動非表示
  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => {
        setShowFeedback(false)
        if (state !== 'error') {
          setState('idle')
        }
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [showFeedback, state])
  
  // エラー状態のリセット
  useEffect(() => {
    if (state === 'error') {
      const timer = setTimeout(() => {
        setState('idle')
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [state])
  
  return (
    <div className="relative inline-block">
      <Button
        variant={state === 'error' ? 'danger' : variant}
        size={size}
        loading={state === 'loading'}
        disabled={disabled}
        onClick={handleClick}
        className={`
          transition-all duration-300
          ${state === 'success' ? 'scale-105 shadow-lg' : ''}
          ${className}
        `}
      >
        {state === 'success' && showFeedback ? (
          <span className="flex items-center gap-2">
            <span>{satisfactionEmojis[satisfactionLevel]}</span>
            成功！
          </span>
        ) : state === 'error' && showFeedback ? (
          <span className="flex items-center gap-2">
            <span>⚠️</span>
            エラー
          </span>
        ) : (
          children
        )}
      </Button>
      
      {/* フィードバックメッセージ */}
      {showFeedback && (
        <div className={`
          absolute top-full left-1/2 transform -translate-x-1/2 mt-2 
          px-3 py-2 rounded-lg text-sm font-medium text-white
          animate-bounce z-10 whitespace-nowrap
          ${state === 'success' ? satisfactionColors[satisfactionLevel] : 'bg-red-500'}
        `}>
          <div className="flex items-center gap-2">
            <span>
              {state === 'success' 
                ? satisfactionEmojis[satisfactionLevel] 
                : '😞'
              }
            </span>
            {state === 'success' ? successMessage : errorMessage}
          </div>
          
          {/* 吹き出しの矢印 */}
          <div className={`
            absolute bottom-full left-1/2 transform -translate-x-1/2
            border-l-4 border-r-4 border-b-4 border-transparent
            ${state === 'success' 
              ? `border-b-${satisfactionColors[satisfactionLevel].replace('bg-', '')}` 
              : 'border-b-red-500'
            }
          `} />
        </div>
      )}
    </div>
  )
}

export default EmotionalButton 