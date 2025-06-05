import React, { useEffect, useState } from 'react'

interface AnimatedNumberProps {
  readonly value: number
  readonly duration?: number
  readonly suffix?: string
  readonly prefix?: string
  readonly formatter?: (n: number) => string
  readonly className?: string
  readonly triggerAnimation?: boolean
}

/**
 * 数値カウントアップアニメーションコンポーネント
 * 
 * @example
 * ```tsx
 * <AnimatedNumber value={1234} suffix="件" duration={1500} />
 * <AnimatedNumber value={95.6} suffix="%" formatter={(n) => n.toFixed(1)} />
 * ```
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1000,
  suffix = '',
  prefix = '',
  formatter = (n) => Math.round(n).toLocaleString(),
  className = '',
  triggerAnimation = true
}) => {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  
  useEffect(() => {
    if (!triggerAnimation || hasAnimated) return
    
    let startTime: number
    const startValue = displayValue
    const change = value - startValue
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // イージング関数: より快感のある加速度（easeOutQuart）
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
  }, [value, duration, triggerAnimation, hasAnimated, displayValue])
  
  // 値が変更された場合、再アニメーションを許可
  useEffect(() => {
    setHasAnimated(false)
  }, [value])
  
  return (
    <span className={`
      tabular-nums font-bold text-primary-600 dark:text-primary-400 
      transition-all duration-200
      ${className}
    `}>
      {prefix}{formatter(displayValue)}{suffix}
    </span>
  )
}

export default AnimatedNumber 