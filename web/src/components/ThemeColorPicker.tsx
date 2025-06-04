import React, { useState } from 'react'
import { useTheme, ThemeColor } from '../contexts/ThemeContext'

const ThemeColorPicker: React.FC = () => {
  const { themeColor, setThemeColor } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const colorOptions: { name: ThemeColor; label: string; colors: { light: string; dark: string } }[] = [
    {
      name: 'blue',
      label: 'ブルー',
      colors: { light: '#3b82f6', dark: '#60a5fa' }
    },
    {
      name: 'purple',
      label: 'パープル',
      colors: { light: '#8b5cf6', dark: '#a78bfa' }
    },
    {
      name: 'green',
      label: 'グリーン',
      colors: { light: '#22c55e', dark: '#4ade80' }
    },
    {
      name: 'orange',
      label: 'オレンジ',
      colors: { light: '#f97316', dark: '#fb923c' }
    },
    {
      name: 'pink',
      label: 'ピンク',
      colors: { light: '#ec4899', dark: '#f472b6' }
    },
    {
      name: 'indigo',
      label: 'インディゴ',
      colors: { light: '#6366f1', dark: '#818cf8' }
    }
  ]

  const currentOption = colorOptions.find(option => option.name === themeColor)

  const handleColorSelect = (color: ThemeColor) => {
    setThemeColor(color)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* カラー選択ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center space-x-2 p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 transition-all duration-300"
        title={`テーマカラー: ${currentOption?.label}`}
      >
        {/* カラーサークル */}
        <div
          className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
          style={{
            backgroundColor: currentOption?.colors.light
          }}
        />
        
        {/* ラベル（スマホでは非表示） */}
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentOption?.label}
        </span>
        
        {/* ドロップダウンアイコン */}
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* カラーパレット */}
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* ドロップダウンメニュー */}
          <div className="absolute top-full left-0 mt-2 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 p-3 min-w-[200px]">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                テーマカラーを選択
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => handleColorSelect(option.name)}
                    className={`flex items-center space-x-2 p-2 rounded-lg text-left transition-all duration-200 ${
                      themeColor === option.name
                        ? 'bg-gray-100 dark:bg-slate-700 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                    style={
                      themeColor === option.name 
                        ? { '--ring-color': option.colors.light } as React.CSSProperties
                        : undefined
                    }
                  >
                    {/* カラーサークル */}
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200 dark:border-slate-600 shadow-sm"
                      style={{
                        backgroundColor: option.colors.light
                      }}
                    />
                    
                    {/* ラベル */}
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {option.label}
                    </span>
                    
                    {/* 選択インジケーター */}
                    {themeColor === option.name && (
                      <svg
                        className="w-4 h-4 text-green-500 ml-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ThemeColorPicker 