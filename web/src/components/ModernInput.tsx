import React from 'react'

interface ModernSelectProps {
  value: string | number
  onChange: (value: string) => void
  options: Array<{ value: string | number; label: string }>
  className?: string
  disabled?: boolean
}

/**
 * モダンなセレクトボックス
 */
export const ModernSelect: React.FC<ModernSelectProps> = ({
  value,
  onChange,
  options,
  className = '',
  disabled = false
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-500 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 hover:border-gray-400 dark:hover:border-slate-400 transition-all duration-200 shadow-sm dark:shadow-md ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
          {option.label}
        </option>
      ))}
    </select>
  )
}

interface ModernInputProps {
  type?: 'text' | 'number' | 'email' | 'password'
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
}

/**
 * モダンな入力フィールド
 */
export const ModernInput: React.FC<ModernInputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  className = '',
  disabled = false
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={`w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-500 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 hover:border-gray-400 dark:hover:border-slate-400 transition-all duration-200 shadow-sm dark:shadow-md ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    />
  )
}

interface ModernCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  className?: string
  disabled?: boolean
}

/**
 * モダンなチェックボックス
 */
export const ModernCheckbox: React.FC<ModernCheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  className = '',
  disabled = false
}) => {
  return (
    <label className={`flex items-start space-x-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 text-primary-600 border-2 border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 group-hover:border-primary-300 dark:group-hover:border-primary-500 transition-all duration-200 shadow-sm"
        />
        {checked && (
          <svg
            className="absolute w-3 h-3 text-white pointer-events-none left-0.5 top-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-800 dark:text-slate-200 group-hover:text-gray-900 dark:group-hover:text-slate-100 transition-colors duration-200">
          {label}
        </span>
        {description && (
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </label>
  )
}

interface ModernRangeProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label?: string
  showValue?: boolean
  className?: string
  disabled?: boolean
}

/**
 * モダンなレンジスライダー
 */
export const ModernRange: React.FC<ModernRangeProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  showValue = true,
  className = '',
  disabled = false
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-sm font-medium text-gray-800 dark:text-slate-200">
            {label}
          </span>
        )}
        {showValue && (
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded">
            {value}
          </span>
        )}
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={`w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer range-slider ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

export default ModernInput 