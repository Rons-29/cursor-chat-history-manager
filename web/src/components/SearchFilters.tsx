import React, { useState, useRef, useEffect } from 'react'

interface FilterOption {
  id: string
  label: string
  value: any
  count?: number
}

interface SearchFiltersProps {
  onFiltersChange: (filters: any) => void
  className?: string
}

interface DateRange {
  start?: string
  end?: string
}

interface FilterState {
  dateRange: DateRange
  sources: string[]
  tags: string[]
  messageTypes: string[]
  scorRange: [number, number]
}

/**
 * Notion風検索フィルターコンポーネント
 * - 複数フィルターの組み合わせ
 * - ドロップダウン式フィルター選択
 * - リアルタイムフィルター適用
 * - フィルター状態の可視化
 */
export const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFiltersChange,
  className = ""
}) => {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {},
    sources: [],
    tags: [],
    messageTypes: [],
    scorRange: [0, 100]
  })

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // サンプルフィルターオプション（実際のデータに応じて動的に生成）
  const filterOptions = {
    sources: [
      { id: 'cursor', label: 'Cursor', value: 'cursor', count: 156 },
      { id: 'claude-dev', label: 'Claude Dev', value: 'claude-dev', count: 89 },
      { id: 'chatgpt', label: 'ChatGPT', value: 'chatgpt', count: 234 },
      { id: 'github-copilot', label: 'GitHub Copilot', value: 'github-copilot', count: 45 },
    ],
    messageTypes: [
      { id: 'user', label: 'ユーザーメッセージ', value: 'user', count: 445 },
      { id: 'assistant', label: 'アシスタントメッセージ', value: 'assistant', count: 389 },
      { id: 'system', label: 'システムメッセージ', value: 'system', count: 23 },
      { id: 'error', label: 'エラーメッセージ', value: 'error', count: 12 },
    ],
    tags: [
      { id: 'typescript', label: 'TypeScript', value: 'typescript', count: 67 },
      { id: 'react', label: 'React', value: 'react', count: 89 },
      { id: 'error-solving', label: 'エラー解決', value: 'error-solving', count: 34 },
      { id: 'code-review', label: 'コードレビュー', value: 'code-review', count: 28 },
      { id: 'debugging', label: 'デバッグ', value: 'debugging', count: 45 },
      { id: 'optimization', label: '最適化', value: 'optimization', count: 19 },
    ]
  }

  // ドロップダウン外クリック検出
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // フィルター変更時のコールバック
  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleArrayFilter = (key: 'sources' | 'tags' | 'messageTypes', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      dateRange: {},
      sources: [],
      tags: [],
      messageTypes: [],
      scorRange: [0, 100]
    })
  }

  const hasActiveFilters = () => {
    return (
      filters.sources.length > 0 ||
      filters.tags.length > 0 ||
      filters.messageTypes.length > 0 ||
      filters.dateRange.start ||
      filters.dateRange.end ||
      filters.scorRange[0] > 0 ||
      filters.scorRange[1] < 100
    )
  }

  const getFilterLabel = (filterType: string) => {
    switch (filterType) {
      case 'sources':
        return filters.sources.length > 0 
          ? `ソース (${filters.sources.length})`
          : 'ソース'
      case 'messageTypes':
        return filters.messageTypes.length > 0
          ? `メッセージタイプ (${filters.messageTypes.length})`
          : 'メッセージタイプ'
      case 'tags':
        return filters.tags.length > 0
          ? `タグ (${filters.tags.length})`
          : 'タグ'
      case 'dateRange':
        return (filters.dateRange.start || filters.dateRange.end)
          ? '日付範囲 (設定済み)'
          : '日付範囲'
      case 'scoreRange':
        return (filters.scorRange[0] > 0 || filters.scorRange[1] < 100)
          ? `スコア (${filters.scorRange[0]}-${filters.scorRange[1]})`
          : 'スコア範囲'
      default:
        return filterType
    }
  }

  const FilterDropdown: React.FC<{
    type: string
    options?: FilterOption[]
    children?: React.ReactNode
  }> = ({ type, options, children }) => (
    <div className="relative">
      <button
        className={`inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 
                   rounded-lg text-sm font-medium transition-colors duration-200
                   ${activeDropdown === type
                     ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                     : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                   }
                   ${(type === 'sources' && filters.sources.length > 0) ||
                     (type === 'messageTypes' && filters.messageTypes.length > 0) ||
                     (type === 'tags' && filters.tags.length > 0) ||
                     (type === 'dateRange' && (filters.dateRange.start || filters.dateRange.end)) ||
                     (type === 'scoreRange' && (filters.scorRange[0] > 0 || filters.scorRange[1] < 100))
                     ? 'ring-2 ring-blue-500 ring-opacity-20'
                     : ''
                   }`}
        onClick={() => setActiveDropdown(activeDropdown === type ? null : type)}
      >
        {getFilterLabel(type)}
        <svg
          className={`ml-2 h-4 w-4 transition-transform duration-200 ${
            activeDropdown === type ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {activeDropdown === type && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                     border border-gray-200 dark:border-gray-600 max-h-80 overflow-y-auto"
        >
          {children || (
            <div className="py-2">
              {options?.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 
                             text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                    checked={
                      type === 'sources' ? filters.sources.includes(option.value) :
                      type === 'messageTypes' ? filters.messageTypes.includes(option.value) :
                      type === 'tags' ? filters.tags.includes(option.value) :
                      false
                    }
                    onChange={() => toggleArrayFilter(type as any, option.value)}
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100 flex-1">
                    {option.label}
                  </span>
                  {option.count && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      ({option.count})
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className={`space-y-4 ${className}`}>
      {/* フィルターボタン群 */}
      <div className="flex flex-wrap gap-2">
        <FilterDropdown type="sources" options={filterOptions.sources} />
        <FilterDropdown type="messageTypes" options={filterOptions.messageTypes} />
        <FilterDropdown type="tags" options={filterOptions.tags} />
        
        {/* 日付範囲フィルター */}
        <FilterDropdown type="dateRange">
          <div className="p-4 space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">日付範囲</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                           rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.dateRange.start || ''}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                           rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.dateRange.end || ''}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 
                           rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                  onClick={() => {
                    const lastWeek = new Date()
                    lastWeek.setDate(lastWeek.getDate() - 7)
                    updateFilter('dateRange', { 
                      start: lastWeek.toISOString().split('T')[0],
                      end: new Date().toISOString().split('T')[0]
                    })
                  }}
                >
                  過去1週間
                </button>
                <button
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 
                           rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                  onClick={() => {
                    const lastMonth = new Date()
                    lastMonth.setMonth(lastMonth.getMonth() - 1)
                    updateFilter('dateRange', { 
                      start: lastMonth.toISOString().split('T')[0],
                      end: new Date().toISOString().split('T')[0]
                    })
                  }}
                >
                  過去1ヶ月
                </button>
              </div>
            </div>
          </div>
        </FilterDropdown>

        {/* スコア範囲フィルター */}
        <FilterDropdown type="scoreRange">
          <div className="p-4 space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">スコア範囲</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.scorRange[0]}
                  className="flex-1"
                  onChange={(e) => updateFilter('scorRange', [parseInt(e.target.value), filters.scorRange[1]])}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 w-8">
                  {filters.scorRange[0]}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.scorRange[1]}
                  className="flex-1"
                  onChange={(e) => updateFilter('scorRange', [filters.scorRange[0], parseInt(e.target.value)])}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 w-8">
                  {filters.scorRange[1]}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {filters.scorRange[0]} - {filters.scorRange[1]}
              </div>
            </div>
          </div>
        </FilterDropdown>

        {/* フィルタークリアボタン */}
        {hasActiveFilters() && (
          <button
            className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 
                     rounded-lg text-sm font-medium text-red-700 dark:text-red-300 
                     bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30
                     transition-colors duration-200"
            onClick={clearAllFilters}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            フィルターをクリア
          </button>
        )}
      </div>

      {/* アクティブフィルターの表示 */}
      {hasActiveFilters() && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              適用中のフィルター
            </h4>
            <span className="text-xs text-blue-700 dark:text-blue-300">
              {[...filters.sources, ...filters.tags, ...filters.messageTypes].length} 個のフィルター
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.sources.map(source => (
              <span
                key={`source-${source}`}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium 
                         bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
              >
                ソース: {filterOptions.sources.find(s => s.value === source)?.label}
                <button
                  className="ml-1 hover:text-green-600 dark:hover:text-green-300"
                  onClick={() => toggleArrayFilter('sources', source)}
                >
                  ×
                </button>
              </span>
            ))}
            {filters.messageTypes.map(type => (
              <span
                key={`type-${type}`}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium 
                         bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200"
              >
                タイプ: {filterOptions.messageTypes.find(t => t.value === type)?.label}
                <button
                  className="ml-1 hover:text-purple-600 dark:hover:text-purple-300"
                  onClick={() => toggleArrayFilter('messageTypes', type)}
                >
                  ×
                </button>
              </span>
            ))}
            {filters.tags.map(tag => (
              <span
                key={`tag-${tag}`}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium 
                         bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
              >
                タグ: {filterOptions.tags.find(t => t.value === tag)?.label}
                <button
                  className="ml-1 hover:text-yellow-600 dark:hover:text-yellow-300"
                  onClick={() => toggleArrayFilter('tags', tag)}
                >
                  ×
                </button>
              </span>
            ))}
            {(filters.dateRange.start || filters.dateRange.end) && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium 
                             bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                日付: {filters.dateRange.start || '開始日未設定'} 〜 {filters.dateRange.end || '終了日未設定'}
                <button
                  className="ml-1 hover:text-blue-600 dark:hover:text-blue-300"
                  onClick={() => updateFilter('dateRange', {})}
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 