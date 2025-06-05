import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { SearchResultsDropdown } from './SearchResultsDropdown'
import { SearchNavigationType } from './useUnifiedSearch'

export interface UnifiedGlobalSearchBarProps {
  mode: 'header' | 'page-top' | 'inline'
  currentPage: 'dashboard' | 'sessions' | 'unified-search' | 'settings' | 'analysis'
  onSearch: (keyword: string, navigateTo?: SearchNavigationType) => void
  placeholder?: string
  autoFocus?: boolean
  showDropdown?: boolean
  className?: string
}

/**
 * 統一グローバル検索バー - ChatFlow全体で使用される統一検索インターフェース
 * 
 * 機能:
 * - 全ページで統一された検索体験
 * - ページに応じた最適化されたプレースホルダー
 * - リアルタイム検索結果ドロップダウン
 * - キーボードショートカット対応 (Ctrl+K, Cmd+K)
 * - 検索履歴・候補表示
 */
export const UnifiedGlobalSearchBar: React.FC<UnifiedGlobalSearchBarProps> = ({
  mode = 'header',
  currentPage,
  onSearch,
  placeholder: customPlaceholder,
  autoFocus = false,
  showDropdown = true,
  className = ''
}) => {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  
  // 状態管理
  const [keyword, setKeyword] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  // ページに応じた最適化されたプレースホルダー
  const getPageOptimizedPlaceholder = useCallback(() => {
    if (customPlaceholder) return customPlaceholder
    
    const placeholders = {
      dashboard: 'プロジェクト、AI対話、メッセージを検索...',
      sessions: 'AI対話を検索 (タイトル、内容、タグ)...',
      'unified-search': '全データから詳細検索...',
      settings: '設定項目を検索...',
      analysis: 'データ分析・統計を検索...'
    }
    
    const basePlaceholder = placeholders[currentPage] || 'ChatFlowデータを検索...'
    
    switch (mode) {
      case 'header':
        return `${basePlaceholder} (⌘K)`
      case 'page-top':
        return basePlaceholder
      case 'inline':
        return basePlaceholder
      default:
        return basePlaceholder
    }
  }, [customPlaceholder, currentPage, mode])

  // キーボードショートカット (Ctrl+K, Cmd+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
      
      if (event.key === 'Escape') {
        setIsDropdownOpen(false)
        inputRef.current?.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 自動フォーカス
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  // リアルタイム検索実行
  const performSearch = useCallback(async (searchKeyword: string) => {
    if (!searchKeyword.trim() || !showDropdown) return

    console.log('🔍 検索実行:', searchKeyword) // デバッグログ
    setIsLoading(true)
    
    try {
      // 簡易検索API呼び出し（ドロップダウン用）
      const response = await fetch(`http://localhost:3001/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keyword: searchKeyword,
          filters: { limit: 5 } // ドロップダウンは最大5件
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ 検索結果取得:', data) // デバッグログ
        
        // APIレスポンス形式に応じて結果を変換
        const results = data.results?.map((item: any) => ({
          id: item.id,
          title: item.title || 'タイトルなし',
          content: item.messages?.[0]?.content?.substring(0, 100) || '',
          type: 'session',
          metadata: {
            source: item.metadata?.source || 'unknown',
            timestamp: item.startTime || item.timestamp,
            tags: item.metadata?.tags || []
          }
        })) || []
        
        console.log('🎯 変換後結果:', results) // デバッグログ
        setSearchResults(results)
      } else {
        console.error('❌ API レスポンスエラー:', response.status)
        setSearchResults([])
      }
    } catch (error) {
      console.error('❌ 検索エラー:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [showDropdown])

  // 入力変更ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKeyword = e.target.value
    console.log('📝 入力変更:', newKeyword) // デバッグログ
    setKeyword(newKeyword)
    
    if (newKeyword.trim()) {
      setIsDropdownOpen(true)
      // デバウンス: 300ms後に検索実行
      setTimeout(() => {
        performSearch(newKeyword)
      }, 300)
    } else {
      setIsDropdownOpen(false)
      setSearchResults([])
    }
  }

  // 検索実行ハンドラー
  const handleSearch = (searchKeyword: string = keyword, navigateTo?: SearchNavigationType) => {
    if (!searchKeyword.trim()) return
    
    setIsDropdownOpen(false)
    onSearch(searchKeyword, navigateTo)
  }

  // Enter キー処理
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // フォーカス処理
  const handleFocus = () => {
    if (keyword.trim() && showDropdown) {
      setIsDropdownOpen(true)
    }
  }

  const handleBlur = () => {
    // 少し遅延させてクリックイベントを処理
    setTimeout(() => setIsDropdownOpen(false), 150)
  }

  // 結果選択ハンドラー
  const handleResultSelect = (result: any) => {
    setKeyword(result.title)
    setIsDropdownOpen(false)
    
    // 結果の種類に応じてナビゲーション
    if (result.type === 'session') {
      navigate(`/sessions/${result.id}`)
    } else {
      handleSearch(result.title, 'unified-search')
    }
  }

  // クリア処理
  const handleClear = () => {
    setKeyword('')
    setSearchResults([])
    setIsDropdownOpen(false)
    inputRef.current?.focus()
  }

  // モード別スタイリング
  const getModeClasses = () => {
    const baseClasses = 'unified-search-bar relative'
    
    switch (mode) {
      case 'header':
        return `${baseClasses} search-bar-header max-w-md`
      case 'page-top':
        return `${baseClasses} search-bar-page-top max-w-4xl`
      case 'inline':
        return `${baseClasses} search-bar-inline max-w-full`
      default:
        return baseClasses
    }
  }

  return (
    <div className={`${getModeClasses()} ${className}`} style={{ position: 'relative' }}>
      {/* 検索入力フィールド */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="unified-search-icon h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={keyword}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={getPageOptimizedPlaceholder()}
          className="unified-search-input w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        />
        
        {/* クリアボタン */}
        {keyword && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="検索をクリア"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* 検索結果ドロップダウン */}
      {isDropdownOpen && showDropdown && (
        <SearchResultsDropdown
          isLoading={isLoading}
          results={searchResults}
          keyword={keyword}
          onResultSelect={handleResultSelect}
          onViewAll={() => handleSearch(keyword, 'unified-search')}
          onViewInSessions={() => handleSearch(keyword, 'sessions-crossdata')}
        />
      )}
      
      {/* デバッグ情報表示 */}
      {process.env.NODE_ENV === 'development' && keyword && (
        <div style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          backgroundColor: '#f0f0f0', 
          padding: '8px', 
          fontSize: '12px',
          border: '1px solid #ccc',
          zIndex: 10001
        }}>
          <div>🔍 キーワード: "{keyword}"</div>
          <div>📂 ドロップダウン開閉: {isDropdownOpen ? '開' : '閉'}</div>
          <div>⏳ ローディング: {isLoading ? 'Yes' : 'No'}</div>
          <div>📊 結果数: {searchResults.length}</div>
          <div>🎯 表示条件: {isDropdownOpen && showDropdown ? 'OK' : 'NG'}</div>
        </div>
      )}
    </div>
  )
} 