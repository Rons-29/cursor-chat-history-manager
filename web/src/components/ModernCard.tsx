import React from 'react'

interface ModernCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * モダンなカードコンポーネント
 * 設定ページや各種フォームで使用
 */
export const ModernCard: React.FC<ModernCardProps> = ({
  title,
  description,
  icon,
  children,
  className = ''
}) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-2xl border border-gray-200 dark:border-slate-600 transition-all duration-200 hover:shadow-xl dark:hover:shadow-2xl hover:scale-105 ${className}`}>
      {/* カードヘッダー */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-600">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="flex-shrink-0 w-6 h-6 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center border border-primary-100 dark:border-primary-700/50">
              <div className="text-primary-600 dark:text-primary-400">
                {icon}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-50">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* カードコンテンツ */}
      <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-slate-800/70 rounded-b-xl">
        {children}
      </div>
    </div>
  )
}

interface SettingSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

/**
 * 設定セクション用コンポーネント
 */
export const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  description,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

interface SettingFieldProps {
  label: string
  description?: string
  children: React.ReactNode
  required?: boolean
  className?: string
}

/**
 * 設定フィールド用コンポーネント
 */
export const SettingField: React.FC<SettingFieldProps> = ({
  label,
  description,
  children,
  required = false,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        {description && (
          <span className="block text-xs text-gray-500 dark:text-slate-400 mt-1">
            {description}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

export default ModernCard 