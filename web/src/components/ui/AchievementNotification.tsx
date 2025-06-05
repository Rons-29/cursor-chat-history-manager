import React, { useEffect, useState } from 'react'
import { Badge } from './Badge'

interface AchievementNotificationProps {
  readonly show: boolean
  readonly badge: {
    readonly type: 'achievement' | 'milestone' | 'streak' | 'discovery' | 'level'
    readonly title: string
    readonly description?: string
    readonly icon?: string
    readonly rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  } | null
  readonly onClose?: () => void
  readonly autoClose?: boolean
  readonly duration?: number
  readonly celebrationLevel?: 'minimal' | 'normal' | 'epic'
}

/**
 * アチーブメント獲得通知コンポーネント
 * 
 * @example
 * ```tsx
 * <AchievementNotification
 *   show={showNotification}
 *   badge={{
 *     type: 'achievement',
 *     title: 'セッションマスター',
 *     description: '100セッションを達成',
 *     icon: '🏆',
 *     rarity: 'epic'
 *   }}
 *   celebrationLevel="epic"
 *   onClose={handleClose}
 * />
 * ```
 */
export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  show,
  badge,
  onClose,
  autoClose = true,
  duration = 5000,
  celebrationLevel = 'normal'
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'celebrate' | 'exit'>('enter')
  
  useEffect(() => {
    if (show && badge) {
      setIsVisible(true)
      setAnimationPhase('enter')
      
      // セレブレーションフェーズ
      const celebrateTimer = setTimeout(() => {
        setAnimationPhase('celebrate')
      }, 500)
      
      // 自動クローズ
      if (autoClose) {
        const closeTimer = setTimeout(() => {
          setAnimationPhase('exit')
          setTimeout(() => {
            setIsVisible(false)
            onClose?.()
          }, 500)
        }, duration)
        
        return () => {
          clearTimeout(celebrateTimer)
          clearTimeout(closeTimer)
        }
      }
      
      return () => clearTimeout(celebrateTimer)
    }
  }, [show, badge, autoClose, duration, onClose])
  
  const handleClose = () => {
    setAnimationPhase('exit')
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 500)
  }
  
  if (!show || !badge || !isVisible) return null
  
  const celebrationStyles = {
    minimal: {
      container: 'scale-100',
      particles: 'opacity-30',
      glow: '',
      bounce: ''
    },
    normal: {
      container: 'scale-105',
      particles: 'opacity-60',
      glow: 'shadow-2xl',
      bounce: 'animate-bounce'
    },
    epic: {
      container: 'scale-110',
      particles: 'opacity-90',
      glow: 'shadow-2xl ring-4 ring-yellow-400 ring-opacity-50',
      bounce: 'animate-bounce'
    }
  }
  
  const style = celebrationStyles[celebrationLevel]
  
  return (
    <>
      {/* オーバーレイ */}
      <div 
        className={`
          fixed inset-0 bg-black bg-opacity-50 z-50
          transition-opacity duration-500
          ${animationPhase === 'enter' ? 'opacity-0 animate-fade-in' : ''}
          ${animationPhase === 'celebrate' ? 'opacity-100' : ''}
          ${animationPhase === 'exit' ? 'opacity-0' : ''}
        `}
        onClick={handleClose}
      />
      
      {/* 通知本体 */}
      <div className={`
        fixed inset-0 flex items-center justify-center z-50
        pointer-events-none
      `}>
        <div className={`
          bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4
          ${style.glow}
          pointer-events-auto
          transition-all duration-500
          ${animationPhase === 'enter' ? 'scale-50 opacity-0' : ''}
          ${animationPhase === 'celebrate' ? `${style.container} opacity-100` : ''}
          ${animationPhase === 'exit' ? 'scale-75 opacity-0' : ''}
        `}>
          
          {/* パーティクルエフェクト */}
          {celebrationLevel !== 'minimal' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={`
                    absolute w-2 h-2 bg-yellow-400 rounded-full
                    ${style.particles}
                    animate-ping
                  `}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random()}s`
                  }}
                />
              ))}
            </div>
          )}
          
          {/* ヘッダー */}
          <div className="text-center mb-6">
            <div className={`
              text-4xl mb-3
              ${animationPhase === 'celebrate' ? style.bounce : ''}
            `}>
              🎉
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              アチーブメント獲得！
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              おめでとうございます！新しいバッジを獲得しました
            </p>
          </div>
          
          {/* バッジ表示 */}
          <div className="flex flex-col items-center space-y-4 mb-6">
            <div className={`
              transition-all duration-700
              ${animationPhase === 'celebrate' ? 'scale-110' : 'scale-100'}
            `}>
              <Badge
                type={badge.type}
                title={badge.title}
                description={badge.description}
                icon={badge.icon}
                earned={true}
                rarity={badge.rarity}
                size="lg"
                earnedDate={new Date()}
              />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {badge.title}
              </h3>
              {badge.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {badge.description}
                </p>
              )}
              {badge.rarity && badge.rarity !== 'common' && (
                <div className={`
                  inline-block px-2 py-1 rounded-full text-xs font-bold mt-2
                  ${badge.rarity === 'rare' ? 'bg-blue-100 text-blue-800' : ''}
                  ${badge.rarity === 'epic' ? 'bg-purple-100 text-purple-800' : ''}
                  ${badge.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-800' : ''}
                `}>
                  {badge.rarity.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          
          {/* アクションボタン */}
          <div className="flex justify-center space-x-3">
            <button
              onClick={handleClose}
              className="
                px-6 py-2 bg-primary-500 text-white rounded-lg font-medium
                hover:bg-primary-600 transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              "
            >
              素晴らしい！
            </button>
            
            <button
              onClick={handleClose}
              className="
                px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg
                hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
              "
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
      
      {/* 音声効果（祝福音） */}
      {celebrationLevel === 'epic' && animationPhase === 'celebrate' && (
        <audio autoPlay>
          <source src="/sounds/achievement.mp3" type="audio/mpeg" />
        </audio>
      )}
    </>
  )
}

export default AchievementNotification 