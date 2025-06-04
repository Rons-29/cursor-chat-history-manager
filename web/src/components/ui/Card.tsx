import React from 'react'

interface CardProps {
  readonly variant?: 'default' | 'elevated' | 'outlined' | 'stats' | 'interactive'
  readonly padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  readonly shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  readonly hover?: boolean
  readonly className?: string
  readonly children: React.ReactNode
  readonly onClick?: () => void
  readonly role?: string
  readonly tabIndex?: number
  readonly onKeyDown?: (e: React.KeyboardEvent) => void
}

/**
 * 統一されたCardコンポーネント
 * 
 * @example
 * ```tsx
 * <Card variant="elevated" padding="lg" hover>
 *   <h3>カードタイトル</h3>
 *   <p>カードの内容</p>
 * </Card>
 * 
 * <Card variant="stats" onClick={() => navigate('/stats')}>
 *   <StatContent />
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  shadow = 'auto',
  hover = false,
  className = '',
  children,
  onClick,
  role,
  tabIndex,
  onKeyDown
}) => {
  const baseClasses = [
    'bg-white dark:bg-gray-800',
    'rounded-lg',
    'transition-all duration-200 ease-in-out',
    'border border-gray-200 dark:border-gray-700'
  ].join(' ')
  
  const variantClasses = {
    default: [
      'border-gray-200 dark:border-gray-700'
    ].join(' '),
    
    elevated: [
      'border-none shadow-lg',
      'bg-gradient-to-br from-white to-gray-50',
      'dark:from-gray-800 dark:to-gray-900',
      'dark:shadow-2xl dark:shadow-black/30'
    ].join(' '),
    
    outlined: [
      'border-2 border-gray-300 dark:border-gray-600',
      'shadow-none',
      'bg-white dark:bg-gray-800'
    ].join(' '),
    
    stats: [
      'border border-gray-100 dark:border-gray-700',
      'bg-gradient-to-br from-white to-gray-50',
      'dark:from-gray-800 dark:to-gray-900',
      'shadow-md hover:shadow-lg',
      'dark:shadow-xl dark:shadow-black/25'
    ].join(' '),
    
    interactive: [
      'border-gray-200 dark:border-gray-700',
      'cursor-pointer',
      'hover:border-primary-300 dark:hover:border-primary-600',
      'hover:shadow-md dark:hover:shadow-xl',
      'active:scale-[0.99]'
    ].join(' ')
  }
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }
  
  const shadowClasses = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    auto: '' // variant依存
  }
  
  const hoverClasses = hover ? [
    'hover:shadow-lg hover:scale-[1.02]',
    'hover:-translate-y-1',
    'cursor-pointer',
    'dark:hover:shadow-2xl dark:hover:shadow-black/40'
  ].join(' ') : ''
  
  const interactiveClasses = (onClick || role === 'button') ? [
    'cursor-pointer',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    'dark:focus:ring-offset-gray-900'
  ].join(' ') : ''
  
  const handleClick = () => {
    onClick?.()
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onKeyDown) {
      onKeyDown(e)
    } else if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }
  
  const finalClasses = [
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    shadow !== 'auto' ? shadowClasses[shadow as keyof typeof shadowClasses] : '',
    hoverClasses,
    interactiveClasses,
    className
  ].filter(Boolean).join(' ')
  
  const cardProps = {
    className: finalClasses,
    onClick: onClick ? handleClick : undefined,
    role: role || (onClick ? 'button' : undefined),
    tabIndex: tabIndex ?? (onClick ? 0 : undefined),
    onKeyDown: (onClick || onKeyDown) ? handleKeyDown : undefined
  }
  
  return (
    <div {...cardProps}>
      {children}
    </div>
  )
}

/**
 * カードヘッダーコンポーネント
 */
interface CardHeaderProps {
  readonly children: React.ReactNode
  readonly className?: string
  readonly divider?: boolean
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  divider = false
}) => (
  <div className={`
    ${divider ? 'border-b border-gray-200 dark:border-gray-700 pb-4 mb-4' : ''}
    ${className}
  `}>
    {children}
  </div>
)

/**
 * カードコンテンツコンポーネント
 */
interface CardContentProps {
  readonly children: React.ReactNode
  readonly className?: string
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = ''
}) => (
  <div className={`text-gray-700 dark:text-gray-300 ${className}`}>
    {children}
  </div>
)

/**
 * カードフッターコンポーネント
 */
interface CardFooterProps {
  readonly children: React.ReactNode
  readonly className?: string
  readonly divider?: boolean
  readonly alignment?: 'left' | 'center' | 'right' | 'between'
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
  divider = false,
  alignment = 'left'
}) => {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  }
  
  return (
    <div className={`
      flex items-center ${alignmentClasses[alignment]}
      ${divider ? 'border-t border-gray-200 dark:border-gray-700 pt-4 mt-4' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}

export default Card 