import React from 'react'
import { SessionDisplayMode } from './ModeSelector'

interface UnifiedSearchBarProps {
  mode: SessionDisplayMode
  keyword: string
  onKeywordChange: (keyword: string) => void
  onSearch?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * モード対応統一検索バーコンポーネント
 * 各モードに最適化されたプレースホルダーと機能を提供
 */
export const UnifiedSearchBar: React.FC<UnifiedSearchBarProps> = ({
  mode,
  keyword,
  onKeywordChange,
  onSearch,
  placeholder,
  disabled = false,
  className = ''
}) => {
  // モードに応じたプレースホルダーを自動設定
  const getPlaceholder = () => {
    if (placeholder) return placeholder
    
    switch (mode) {
      case 'standard':
        return 'タイトル・内容から検索...'
      case 'crossData':
        return '全データソースから横断検索...'
      case 'enhanced':
        return 'AI分析結果・タグ・詳細情報から検索...'
      default:
        return 'AI対話を検索...'
    }
  }

  // Enterキーでの検索実行
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch()
    }
  }

  // モードに応じたアイコンと色
  const getModeIcon = () => {
    switch (mode) {
      case 'standard':
        return { icon: '🔍', color: 'text-blue-600' }
      case 'crossData':
        return { icon: '🌐', color: 'text-green-600' }
      case 'enhanced':
        return { icon: '🚀', color: 'text-purple-600' }
      default:
        return { icon: '🔍', color: 'text-gray-600' }
    }
  }

  const { icon, color } = getModeIcon()

  return (
    <div className={`relative ${className}`}>
      {/* 検索入力フィールド */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className={`text-lg ${color}`} role="img" aria-label="search">
            {icon}
          </span>
        </div>
        <input
          type="text"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={getPlaceholder()}
          disabled={disabled}
          className={`
            block w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            placeholder-gray-500 text-gray-900
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            transition-all duration-200
          `}
        />
        
        {/* クリアボタン */}
        {keyword && !disabled && (
          <button
            onClick={() => onKeywordChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            title="検索をクリア"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* モード別の検索ヒント */}
      <div className="mt-2 text-xs text-gray-500">
        {mode === 'standard' && (
          <span>💡 基本検索: タイトル・内容・タグで検索</span>
        )}
        {mode === 'crossData' && (
          <span>💡 横断検索: Traditional、Claude Dev、SQLite を統合検索</span>
        )}
        {mode === 'enhanced' && (
                      <span>💡 AI分析検索: 自動生成タグ・詳細情報・複雑度で検索</span>
        )}
      </div>
    </div>
  )
}

/**
 * 検索統計表示コンポーネント
 */
interface SearchStatsProps {
  mode: SessionDisplayMode
  totalResults: number
  searchTime?: number
  isLoading?: boolean
}

export const SearchStats: React.FC<SearchStatsProps> = ({
  mode,
  totalResults,
  searchTime,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
        検索中...
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4 text-sm text-gray-600">
      <span className="flex items-center">
        <span className="text-lg mr-1" role="img">📊</span>
        {totalResults.toLocaleString()} 件見つかりました
      </span>
      
      {searchTime && (
        <span className="flex items-center">
          <span className="text-lg mr-1" role="img">⚡</span>
          {searchTime}ms
        </span>
      )}
      
      {mode === 'crossData' && (
        <span className="flex items-center">
          <span className="text-lg mr-1" role="img">🔗</span>
          統合検索
        </span>
      )}
      
      {mode === 'enhanced' && (
        <span className="flex items-center">
          <span className="text-lg mr-1" role="img">🤖</span>
          AI分析済み
        </span>
      )}
    </div>
  )
} 