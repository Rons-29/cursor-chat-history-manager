import React, { useEffect, useState } from 'react'

interface FeedbackToastProps {
  readonly show: boolean
  readonly message: string
  readonly type: 'success' | 'error' | 'achievement' | 'progress' | 'discovery'
  readonly onClose?: () => void
  readonly autoClose?: boolean
  readonly duration?: number
}

/**
 * エモーショナルフィードバックトーストシステム
 * 
 * @example
 * ```tsx
 * <FeedbackToast
 *   show={showSuccess}
 *   message="保存完了！素晴らしい 🎉"
 *   type="achievement"
 *   onClose={() => setShowSuccess(false)}
 * />
 * ```
 */
export const FeedbackToast: React.FC<FeedbackToastProps> = ({
  show,
  message,
  type,
  onClose,
  autoClose = true,
  duration = 3000
}) => {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (show) {
      setIsVisible(true)
      
      if (autoClose) {
        const timer = setTimeout(() => {
          setIsVisible(false)
          setTimeout(() => onClose?.(), 300) // アニメーション時間を考慮
        }, duration)
        
        return () => clearTimeout(timer)
      }
    }
  }, [show, autoClose, duration, onClose])
  
  const typeStyles = {
    success: {
      icon: '✅',
      bgClass: 'bg-green-500',
      borderClass: 'border-green-400',
      textClass: 'text-white'
    },
    error: {
      icon: '❌',
      bgClass: 'bg-red-500',
      borderClass: 'border-red-400',
      textClass: 'text-white'
    },
    achievement: {
      icon: '🏆',
      bgClass: 'emotional-achievement',
      borderClass: 'border-green-300',
      textClass: 'text-white'
    },
    progress: {
      icon: '💪',
      bgClass: 'emotional-progress',
      borderClass: 'border-blue-300',
      textClass: 'text-white'
    },
    discovery: {
      icon: '💡',
      bgClass: 'emotional-discovery',
      borderClass: 'border-purple-300',
      textClass: 'text-white'
    }
  }
  
  const style = typeStyles[type]
  
  if (!show && !isVisible) return null
  
  return (
    <div className={`
      fixed top-4 right-4 z-50 
      ${isVisible && show ? 'animate-fade-in' : 'opacity-0 translate-y-2'}
      transition-all duration-300 ease-out
    `}>
      <div className={`
        ${style.bgClass} ${style.borderClass} ${style.textClass}
        px-4 py-3 rounded-lg shadow-lg border-2
        font-medium text-sm
        btn-success-feedback
        flex items-center gap-3
        max-w-sm
      `}>
        <span className="text-lg">{style.icon}</span>
        
        <div className="flex-1">
          {message}
        </div>
        
        {!autoClose && (
          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(() => onClose?.(), 300)
            }}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default FeedbackToast 