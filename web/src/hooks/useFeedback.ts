import { useState, useCallback } from 'react'

interface FeedbackState {
  readonly show: boolean
  readonly message: string
  readonly type: 'success' | 'error' | 'achievement' | 'progress' | 'discovery'
}

/**
 * フィードバックトースト管理フック
 * 
 * @example
 * ```tsx
 * const { feedback, showSuccess, showError, showAchievement, closeFeedback } = useFeedback()
 * 
 * // 使用例
 * const handleSave = async () => {
 *   try {
 *     await saveData()
 *     showAchievement('保存完了！素晴らしい作業です 🎉')
 *   } catch (error) {
 *     showError('保存に失敗しました。もう一度お試しください。')
 *   }
 * }
 * ```
 */
export const useFeedback = () => {
  const [feedback, setFeedback] = useState<FeedbackState>({
    show: false,
    message: '',
    type: 'success'
  })
  
  const showFeedback = useCallback((
    message: string,
    type: FeedbackState['type']
  ) => {
    setFeedback({
      show: true,
      message,
      type
    })
  }, [])
  
  const showSuccess = useCallback((message: string) => {
    showFeedback(message, 'success')
  }, [showFeedback])
  
  const showError = useCallback((message: string) => {
    showFeedback(message, 'error')
  }, [showFeedback])
  
  const showAchievement = useCallback((message: string) => {
    showFeedback(message, 'achievement')
  }, [showFeedback])
  
  const showProgress = useCallback((message: string) => {
    showFeedback(message, 'progress')
  }, [showFeedback])
  
  const showDiscovery = useCallback((message: string) => {
    showFeedback(message, 'discovery')
  }, [showFeedback])
  
  const closeFeedback = useCallback(() => {
    setFeedback(prev => ({ ...prev, show: false }))
  }, [])
  
  return {
    feedback,
    showSuccess,
    showError,
    showAchievement,
    showProgress,
    showDiscovery,
    showFeedback,
    closeFeedback
  }
}

export default useFeedback

// Re-export badge system hook
export { useBadgeSystem } from './useBadgeSystem' 