import React from 'react'
import { useTheme } from '../contexts/ThemeContext'
import ThemeColorPicker from './ThemeColorPicker'

const ThemeToggle: React.FC = () => {
  const { theme, actualTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        )
      case 'dark':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )
      default: // system
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        )
    }
  }

  const getTooltip = () => {
    switch (theme) {
      case 'light':
        return 'ライトモード → ダークモード'
      case 'dark':
        return 'ダークモード → システム'
      default:
        return 'システム → ライトモード'
    }
  }

  const getStatusBadge = () => {
    switch (theme) {
      case 'light':
        return (
          <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
            Light
          </span>
        )
      case 'dark':
        return (
          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
            Dark
          </span>
        )
      default:
        return (
          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
            Auto
          </span>
        )
    }
  }

  return (
    <div className="flex items-center space-x-3">
      {/* カスタムテーマカラー選択 */}
      <ThemeColorPicker />
      
      {/* 現在のテーマ表示 */}
      <div className="hidden sm:block">
        {getStatusBadge()}
      </div>
      
      {/* 切り替えボタン */}
      <button
        onClick={toggleTheme}
        className="group relative p-2.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 transition-all duration-300 hover:scale-105 active:scale-95"
        title={getTooltip()}
        aria-label={getTooltip()}
      >
        {/* アイコン */}
        <div className="text-gray-600 dark:text-slate-300 group-hover:text-gray-800 dark:group-hover:text-slate-100 transition-colors duration-200">
          {getIcon()}
        </div>
        
        {/* ホバー時のエフェクト */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* 実際のテーマ表示インジケーター */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
          actualTheme === 'dark' 
            ? 'bg-blue-500' 
            : 'bg-yellow-500'
        } transition-colors duration-300`} />
      </button>
    </div>
  )
}

export default ThemeToggle 