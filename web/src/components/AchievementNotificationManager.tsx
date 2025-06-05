import React, { useEffect, useState } from 'react'
import { AchievementNotification } from './ui'
import { useBadgeSystem } from '../hooks/useBadgeSystem'

/**
 * アチーブメント通知マネージャー
 * 
 * 自動的にバッジ獲得を監視し、適切なタイミングで通知を表示
 * ダッシュボードの任意の場所に配置可能
 * 
 * @example
 * ```tsx
 * // ダッシュボードに追加
 * <AchievementNotificationManager />
 * ```
 */
export const AchievementNotificationManager: React.FC = () => {
  const { notification, dismissNotification } = useBadgeSystem()
  const [isVisible, setIsVisible] = useState(false)

  // 通知の表示制御
  useEffect(() => {
    if (notification.show && notification.badge) {
      setIsVisible(true)
    }
  }, [notification])

  // 通知を閉じる処理
  const handleClose = () => {
    setIsVisible(false)
    // 少し遅延をつけてからシステムレベルで閉じる
    setTimeout(() => {
      dismissNotification()
    }, 300)
  }

  // 自動閉じ機能（epic レベルのバッジは長く表示）
  useEffect(() => {
    if (isVisible && notification.badge) {
      const autoCloseDelay = 
        notification.celebrationLevel === 'epic' ? 8000 :
        notification.celebrationLevel === 'normal' ? 5000 : 3000

      const timer = setTimeout(handleClose, autoCloseDelay)
      return () => clearTimeout(timer)
    }
  }, [isVisible, notification])

  return (
    <AchievementNotification
      show={isVisible}
      badge={notification.badge}
      onClose={handleClose}
      celebrationLevel={notification.celebrationLevel}
      autoClose={false} // 手動制御
    />
  )
}

export default AchievementNotificationManager 