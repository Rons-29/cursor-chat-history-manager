import React, { forwardRef } from 'react'

interface InputProps {
  readonly type?: 'text' | 'number' | 'email' | 'password' | 'search' | 'url' | 'tel'
  readonly value?: string | number
  readonly defaultValue?: string | number
  readonly onChange?: (value: string) => void
  readonly onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  readonly onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  readonly placeholder?: string
  readonly label?: string
  readonly helper?: string
  readonly error?: string
  readonly disabled?: boolean
  readonly required?: boolean
  readonly readOnly?: boolean
  readonly size?: 'sm' | 'md' | 'lg'
  readonly variant?: 'default' | 'filled' | 'outlined'
  readonly icon?: React.ReactNode
  readonly iconPosition?: 'left' | 'right'
  readonly className?: string
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly maxLength?: number
  readonly autoComplete?: string
  readonly autoFocus?: boolean
  readonly id?: string
  readonly name?: string
  readonly 'aria-label'?: string
  readonly 'aria-describedby'?: string
}

/**
 * 統一されたInputコンポーネント
 * 
 * @example
 * ```tsx
 * <Input
 *   label="メールアドレス"
 *   type="email"
 *   placeholder="example@domain.com"
 *   value={email}
 *   onChange={setEmail}
 *   icon={<MailIcon />}
 *   required
 * />
 * 
 * <Input
 *   variant="filled"
 *   error="この項目は必須です"
 *   helper="正しい形式で入力してください"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  label,
  helper,
  error,
  disabled = false,
  required = false,
  readOnly = false,
  size = 'md',
  variant = 'default',
  icon,
  iconPosition = 'left',
  className = '',
  min,
  max,
  step,
  maxLength,
  autoComplete,
  autoFocus = false,
  id,
  name,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  const helperId = helper ? `${inputId}-helper` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  
  const describedBy = [
    ariaDescribedby,
    helperId,
    errorId
  ].filter(Boolean).join(' ') || undefined
  
  const baseInputClasses = [
    'w-full font-medium rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'placeholder:text-gray-400 dark:placeholder:text-gray-500'
  ].join(' ')
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base'
  }
  
  const variantClasses = {
    default: [
      'border border-gray-300 dark:border-gray-600',
      'bg-white dark:bg-gray-700',
      'text-gray-900 dark:text-gray-100',
      'focus:border-primary-500 focus:ring-primary-500',
      'dark:focus:border-primary-400 dark:focus:ring-primary-400'
    ].join(' '),
    
    filled: [
      'border-0 bg-gray-100 dark:bg-gray-800',
      'text-gray-900 dark:text-gray-100',
      'focus:bg-white dark:focus:bg-gray-700',
      'focus:ring-primary-500 dark:focus:ring-primary-400',
      'focus:shadow-sm'
    ].join(' '),
    
    outlined: [
      'border-2 border-gray-300 dark:border-gray-600',
      'bg-transparent',
      'text-gray-900 dark:text-gray-100',
      'focus:border-primary-500 focus:ring-primary-500',
      'dark:focus:border-primary-400 dark:focus:ring-primary-400'
    ].join(' ')
  }
  
  const errorClasses = error ? [
    'border-red-300 dark:border-red-600',
    'focus:border-red-500 focus:ring-red-500',
    'dark:focus:border-red-400 dark:focus:ring-red-400'
  ].join(' ') : ''
  
  const iconClasses = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }
  
  const paddingWithIcon = icon ? {
    left: {
      sm: 'pl-9',
      md: 'pl-10',
      lg: 'pl-11'
    },
    right: {
      sm: 'pr-9',
      md: 'pr-10',
      lg: 'pr-11'
    }
  } : {}
  
  const inputClasses = [
    baseInputClasses,
    variantClasses[variant],
    sizeClasses[size],
    error ? errorClasses : '',
    icon ? paddingWithIcon[iconPosition]?.[size] : '',
    className
  ].filter(Boolean).join(' ')
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }
  
  const iconPositionClasses = {
    left: 'left-3',
    right: 'right-3'
  }
  
  const iconTopClasses = {
    sm: 'top-2',
    md: 'top-2.5',
    lg: 'top-3.5'
  }
  
  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className={`
            absolute ${iconPositionClasses[iconPosition]} ${iconTopClasses[size]}
            flex items-center pointer-events-none
            text-gray-400 dark:text-gray-500 ${iconClasses[size]}
          `}>
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          id={inputId}
          name={name}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          min={min}
          max={max}
          step={step}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : 'false'}
          className={inputClasses}
        />
      </div>
      
      {helper && !error && (
        <p 
          id={helperId}
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          {helper}
        </p>
      )}
      
      {error && (
        <p 
          id={errorId}
          className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
          role="alert"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

/**
 * テキストエリアコンポーネント
 */
interface TextareaProps {
  readonly value?: string
  readonly defaultValue?: string
  readonly onChange?: (value: string) => void
  readonly onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void
  readonly onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void
  readonly placeholder?: string
  readonly label?: string
  readonly helper?: string
  readonly error?: string
  readonly disabled?: boolean
  readonly required?: boolean
  readonly readOnly?: boolean
  readonly rows?: number
  readonly maxLength?: number
  readonly resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  readonly className?: string
  readonly id?: string
  readonly name?: string
  readonly 'aria-label'?: string
  readonly 'aria-describedby'?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  label,
  helper,
  error,
  disabled = false,
  required = false,
  readOnly = false,
  rows = 3,
  maxLength,
  resize = 'vertical',
  className = '',
  id,
  name,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
  const helperId = helper ? `${textareaId}-helper` : undefined
  const errorId = error ? `${textareaId}-error` : undefined
  
  const describedBy = [
    ariaDescribedby,
    helperId,
    errorId
  ].filter(Boolean).join(' ') || undefined
  
  const baseClasses = [
    'w-full px-3 py-2.5 text-sm font-medium rounded-lg',
    'border border-gray-300 dark:border-gray-600',
    'bg-white dark:bg-gray-700',
    'text-gray-900 dark:text-gray-100',
    'placeholder:text-gray-400 dark:placeholder:text-gray-500',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'focus:border-primary-500 focus:ring-primary-500',
    'dark:focus:border-primary-400 dark:focus:ring-primary-400',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ].join(' ')
  
  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
  }
  
  const errorClasses = error ? [
    'border-red-300 dark:border-red-600',
    'focus:border-red-500 focus:ring-red-500',
    'dark:focus:border-red-400 dark:focus:ring-red-400'
  ].join(' ') : ''
  
  const textareaClasses = [
    baseClasses,
    resizeClasses[resize],
    error ? errorClasses : '',
    className
  ].filter(Boolean).join(' ')
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }
  
  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        rows={rows}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        className={textareaClasses}
      />
      
      {helper && !error && (
        <p 
          id={helperId}
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          {helper}
        </p>
      )}
      
      {error && (
        <p 
          id={errorId}
          className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
          role="alert"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export default Input 