import React from 'react'

interface ButtonProps {
  readonly variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  readonly size?: 'sm' | 'md' | 'lg' | 'xl'
  readonly disabled?: boolean
  readonly loading?: boolean
  readonly icon?: React.ReactNode
  readonly iconPosition?: 'left' | 'right'
  readonly children: React.ReactNode
  readonly onClick?: () => void
  readonly type?: 'button' | 'submit' | 'reset'
  readonly className?: string
  readonly fullWidth?: boolean
}

/**
 * 統一されたButtonコンポーネント
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md" loading={isSubmitting}>
 *   送信
 * </Button>
 * 
 * <Button variant="secondary" icon={<UserIcon />}>
 *   ユーザー設定
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  onClick,
  type = 'button',
  className = '',
  fullWidth = false
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium rounded-lg',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-95'
  ].join(' ')
  
  const variantClasses = {
    primary: [
      'bg-primary-600 text-white shadow-sm',
      'hover:bg-primary-700 hover:shadow-md',
      'focus:ring-primary-500',
      'dark:bg-primary-500 dark:hover:bg-primary-600',
      'dark:focus:ring-primary-400'
    ].join(' '),
    
    secondary: [
      'bg-gray-100 text-gray-900 border border-gray-300',
      'hover:bg-gray-200 hover:border-gray-400',
      'focus:ring-gray-500',
      'dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600',
      'dark:hover:bg-gray-600 dark:hover:border-gray-500'
    ].join(' '),
    
    danger: [
      'bg-red-600 text-white shadow-sm',
      'hover:bg-red-700 hover:shadow-md',
      'focus:ring-red-500',
      'dark:bg-red-500 dark:hover:bg-red-600'
    ].join(' '),
    
    ghost: [
      'text-gray-700 hover:bg-gray-100',
      'focus:ring-gray-500',
      'dark:text-gray-300 dark:hover:bg-gray-700'
    ].join(' '),
    
    outline: [
      'border-2 border-primary-600 text-primary-600 bg-transparent',
      'hover:bg-primary-50 hover:border-primary-700',
      'focus:ring-primary-500',
      'dark:border-primary-400 dark:text-primary-400',
      'dark:hover:bg-primary-900/30'
    ].join(' ')
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
    xl: 'px-8 py-4 text-lg gap-3'
  }
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  }
  
  const LoadingSpinner: React.FC<{ size: string }> = ({ size }) => (
    <svg 
      className={`animate-spin ${size}`} 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4" 
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
      />
    </svg>
  )
  
  const renderIcon = () => {
    if (loading) {
      return <LoadingSpinner size={iconSizes[size]} />
    }
    
    if (icon) {
      return (
        <span className={iconSizes[size]}>
          {icon}
        </span>
      )
    }
    
    return null
  }
  
  const finalClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className
  ].filter(Boolean).join(' ')
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={finalClasses}
      aria-disabled={disabled || loading}
      aria-label={loading ? '読み込み中...' : undefined}
    >
      {iconPosition === 'left' && renderIcon()}
      
      <span className={loading ? 'opacity-75' : ''}>
        {children}
      </span>
      
      {iconPosition === 'right' && renderIcon()}
    </button>
  )
}

export default Button 