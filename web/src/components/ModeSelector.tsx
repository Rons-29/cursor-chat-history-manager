import React from 'react'

export type SessionDisplayMode = 'standard' | 'crossData' | 'enhanced'

interface ModeSelectorProps {
  currentMode: SessionDisplayMode
  onModeChange: (mode: SessionDisplayMode) => void
  disabled?: boolean
  className?: string
}

/**
 * セッション表示モード切り替えコンポーネント
 * 標準・横断検索・AI分析の3つのモードを切り替え
 */
export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
  className = ''
}) => {
  const modes = [
    {
      id: 'standard' as const,
      icon: '📄',
      label: '標準表示',
      description: 'メインデータベースのみ'
    },
    {
      id: 'crossData' as const,
      icon: '🔍',
      label: '横断検索',
      description: '全データソース統合'
    },
    {
      id: 'enhanced' as const,
      icon: '🚀',
      label: 'AI分析',
      description: 'スマート分析版'
    }
  ]

  return (
    <div className={`inline-flex rounded-lg border border-gray-200 bg-white p-1 ${className}`}>
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          disabled={disabled}
          className={`
            relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
            ${currentMode === mode.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={mode.description}
        >
          <span className="mr-2 text-base" role="img" aria-label={mode.label}>
            {mode.icon}
          </span>
          <span className="hidden sm:inline">{mode.label}</span>
          <span className="sm:hidden">{mode.icon}</span>
          
          {/* アクティブインジケーター */}
          {currentMode === mode.id && (
            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * モードに応じた説明テキストを返すユーティリティ
 */
export const getModeDescription = (mode: SessionDisplayMode): string => {
  switch (mode) {
    case 'standard':
              return 'メインデータベースからのAI対話表示。基本的な検索・ソート機能を提供。'
    case 'crossData':
      return '全データソース（Traditional、Claude Dev、SQLite）を統合した横断検索。重複除去済み。'
    case 'enhanced':
              return 'AI分析による強化された詳細情報と一括操作機能。開発効率向上のためのスマート機能。'
    default:
      return ''
  }
}

/**
 * モードに応じた統計表示用の色を返すユーティリティ
 */
export const getModeColor = (mode: SessionDisplayMode): string => {
  switch (mode) {
    case 'standard':
      return 'blue'
    case 'crossData':
      return 'green'
    case 'enhanced':
      return 'purple'
    default:
      return 'gray'
  }
} 