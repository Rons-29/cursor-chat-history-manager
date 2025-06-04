/**
 * 🎨 Phase 1B: Notion風ビジュアルフィルタデモ
 * 
 * Notionの「いいところ」をChatFlowに統合：
 * - ビジュアル検索ビルダー（直感的フィルタ作成）
 * - カレンダーUI（日付範囲選択）
 * - チップ選択（ソース・タグ別フィルタ）
 * - リアルタイムプレビュー（フィルタ効果の即座確認）
 * 
 * 🌟 統合された「いいところ」：
 * - Notion: ビジュアルフィルタビルダー・直感的UI
 * - Discord: リアルタイム反応・スムーズアニメーション
 * - GitHub: 高速検索・パフォーマンス表示
 * - VS Code: キーボードショートカット・開発者UX
 */

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Calendar, 
  Filter, 
  Tag, 
  Clock, 
  Zap, 
  X, 
  Plus,
  ChevronDown,
  Search,
  User,
  Bot,
  Code,
  MessageSquare
} from 'lucide-react'

// ChatFlow フィルタ型定義
interface FilterState {
  dateRange: {
    start: string | null
    end: string | null
  }
  sources: string[]
  messageRoles: string[]
  tags: string[]
  sessionTitleContains: string
  hasMinMessages: number | null
}

interface Session {
  id: string
  title: string
  created_at: number
  updated_at: number
  message_count: number
  metadata: {
    source?: string
    tags?: string[]
  }
}

interface FilterResult {
  sessions: Session[]
  total: number
  appliedFilters: number
  searchTime: number
}

// Notion風カレンダー選択コンポーネント
function NotionDatePicker({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string | null; 
  onChange: (date: string) => void 
}) {
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-all duration-200
            hover:border-gray-400
          "
        />
      </div>
    </div>
  )
}

// Notion風チップ選択コンポーネント
function NotionChipSelector({ 
  title, 
  options, 
  selected, 
  onChange,
  icon: Icon,
  colorScheme = 'blue'
}: {
  title: string
  options: Array<{ value: string; label: string; count?: number }>
  selected: string[]
  onChange: (values: string[]) => void
  icon: React.ComponentType<any>
  colorScheme?: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
  }

  const selectedClasses = {
    blue: 'bg-blue-500 text-white border-blue-500',
    green: 'bg-green-500 text-white border-green-500',
    purple: 'bg-purple-500 text-white border-purple-500',
    orange: 'bg-orange-500 text-white border-orange-500'
  }

  const toggleSelection = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Icon className="w-4 h-4 text-gray-600" />
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value)
          return (
            <button
              key={option.value}
              onClick={() => toggleSelection(option.value)}
              className={`
                px-3 py-1.5 text-sm border rounded-full transition-all duration-200
                flex items-center space-x-1 hover:shadow-sm
                ${isSelected 
                  ? selectedClasses[colorScheme]
                  : colorClasses[colorScheme]
                }
              `}
            >
              <span>{option.label}</span>
              {option.count && (
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${isSelected ? 'bg-white bg-opacity-20' : 'bg-gray-200 text-gray-600'}
                `}>
                  {option.count}
                </span>
              )}
              {isSelected && <X className="w-3 h-3 ml-1" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Notion風フィルタサマリー
function FilterSummary({ 
  filters, 
  onClearFilter,
  onClearAll 
}: { 
  filters: FilterState; 
  onClearFilter: (filterType: string, value?: string) => void;
  onClearAll: () => void;
}) {
  const getActiveFilters = () => {
    const active = []
    
    if (filters.dateRange.start) {
      active.push({
        type: 'dateStart',
        label: `開始: ${filters.dateRange.start}`,
        value: filters.dateRange.start
      })
    }
    
    if (filters.dateRange.end) {
      active.push({
        type: 'dateEnd',
        label: `終了: ${filters.dateRange.end}`,
        value: filters.dateRange.end
      })
    }
    
    filters.sources.forEach(source => {
      active.push({
        type: 'sources',
        label: `ソース: ${source}`,
        value: source
      })
    })
    
    filters.messageRoles.forEach(role => {
      active.push({
        type: 'messageRoles',
        label: `役割: ${role}`,
        value: role
      })
    })
    
    if (filters.sessionTitleContains) {
      active.push({
        type: 'sessionTitleContains',
        label: `タイトル: "${filters.sessionTitleContains}"`,
        value: filters.sessionTitleContains
      })
    }
    
    if (filters.hasMinMessages) {
      active.push({
        type: 'hasMinMessages',
        label: `最小メッセージ数: ${filters.hasMinMessages}`,
        value: filters.hasMinMessages.toString()
      })
    }
    
    return active
  }

  const activeFilters = getActiveFilters()

  if (activeFilters.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">
            適用中のフィルタ ({activeFilters.length})
          </span>
        </div>
        <button
          onClick={onClearAll}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          すべてクリア
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter, index) => (
          <div
            key={index}
            className="
              bg-white border border-gray-200 rounded-full px-3 py-1 text-sm
              flex items-center space-x-2 shadow-sm
            "
          >
            <span>{filter.label}</span>
            <button
              onClick={() => onClearFilter(filter.type, filter.value)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// メインのNotion風フィルタコンポーネント
export default function NotionFilterDemo() {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: null, end: null },
    sources: [],
    messageRoles: [],
    tags: [],
    sessionTitleContains: '',
    hasMinMessages: null
  })

  const [filterResults, setFilterResults] = useState<FilterResult>({
    sessions: [],
    total: 0,
    appliedFilters: 0,
    searchTime: 0
  })

  const [isLoading, setIsLoading] = useState(false)

  // サンプルデータ（実際のAPIに置き換え可能）
  const sampleSources = [
    { value: 'cursor', label: 'Cursor', count: 1205 },
    { value: 'claude-dev', label: 'Claude Dev', count: 892 },
    { value: 'chatgpt', label: 'ChatGPT', count: 634 },
    { value: 'github-copilot', label: 'GitHub Copilot', count: 423 }
  ]

  const sampleRoles = [
    { value: 'user', label: 'ユーザー', count: 2456 },
    { value: 'assistant', label: 'アシスタント', count: 2344 },
    { value: 'system', label: 'システム', count: 234 }
  ]

  // Notion風リアルタイムフィルタ実行
  const executeFilters = useCallback(async () => {
    setIsLoading(true)
    const startTime = performance.now()

    // シミュレートされたフィルタ処理
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))

    const appliedFilters = [
      filters.dateRange.start,
      filters.dateRange.end,
      ...filters.sources,
      ...filters.messageRoles,
      filters.sessionTitleContains,
      filters.hasMinMessages
    ].filter(Boolean).length

    // サンプル結果生成
    const mockSessions: Session[] = [
      {
        id: 'session-1',
        title: 'TypeScript エラー解決セッション',
        created_at: Date.now() - 86400000,
        updated_at: Date.now() - 3600000,
        message_count: 15,
        metadata: { source: 'cursor', tags: ['typescript', 'debugging'] }
      },
      {
        id: 'session-2',
        title: 'React Component設計について',
        created_at: Date.now() - 172800000,
        updated_at: Date.now() - 7200000,
        message_count: 23,
        metadata: { source: 'claude-dev', tags: ['react', 'architecture'] }
      },
      {
        id: 'session-3',
        title: 'API統合とパフォーマンス最適化',
        created_at: Date.now() - 259200000,
        updated_at: Date.now() - 10800000,
        message_count: 31,
        metadata: { source: 'chatgpt', tags: ['api', 'performance'] }
      }
    ]

    const filteredSessions = mockSessions.filter(session => {
      // ソースフィルタ
      if (filters.sources.length > 0 && !filters.sources.includes(session.metadata.source || '')) {
        return false
      }
      
      // タイトル検索
      if (filters.sessionTitleContains && 
          !session.title.toLowerCase().includes(filters.sessionTitleContains.toLowerCase())) {
        return false
      }
      
      // 最小メッセージ数
      if (filters.hasMinMessages && session.message_count < filters.hasMinMessages) {
        return false
      }
      
      return true
    })

    const endTime = performance.now()

    setFilterResults({
      sessions: filteredSessions,
      total: filteredSessions.length,
      appliedFilters,
      searchTime: endTime - startTime
    })

    setIsLoading(false)
  }, [filters])

  // フィルタ変更時のリアルタイム実行
  useEffect(() => {
    executeFilters()
  }, [executeFilters])

  // フィルタ更新ヘルパー
  const updateFilters = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }

  // フィルタクリア機能
  const clearFilter = (filterType: string, value?: string) => {
    switch (filterType) {
      case 'dateStart':
        updateFilters({ dateRange: { ...filters.dateRange, start: null } })
        break
      case 'dateEnd':
        updateFilters({ dateRange: { ...filters.dateRange, end: null } })
        break
      case 'sources':
        updateFilters({ sources: filters.sources.filter(s => s !== value) })
        break
      case 'messageRoles':
        updateFilters({ messageRoles: filters.messageRoles.filter(r => r !== value) })
        break
      case 'sessionTitleContains':
        updateFilters({ sessionTitleContains: '' })
        break
      case 'hasMinMessages':
        updateFilters({ hasMinMessages: null })
        break
    }
  }

  const clearAllFilters = () => {
    setFilters({
      dateRange: { start: null, end: null },
      sources: [],
      messageRoles: [],
      tags: [],
      sessionTitleContains: '',
      hasMinMessages: null
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Notion風ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🎨 Notion風ビジュアルフィルタデモ
        </h1>
        <p className="text-gray-600">
          各サービスの「いいところ」を統合した直感的フィルタシステム
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* フィルタパネル */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-50 rounded-lg p-6 space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">フィルタ</h2>
            </div>

            {/* 日付範囲選択 */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>期間</span>
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <NotionDatePicker
                  label="開始日"
                  value={filters.dateRange.start}
                  onChange={(date) => updateFilters({
                    dateRange: { ...filters.dateRange, start: date }
                  })}
                />
                <NotionDatePicker
                  label="終了日"
                  value={filters.dateRange.end}
                  onChange={(date) => updateFilters({
                    dateRange: { ...filters.dateRange, end: date }
                  })}
                />
              </div>
            </div>

            {/* ソース選択 */}
            <NotionChipSelector
              title="ソース"
              options={sampleSources}
              selected={filters.sources}
              onChange={(sources) => updateFilters({ sources })}
              icon={Code}
              colorScheme="blue"
            />

            {/* メッセージ役割選択 */}
            <NotionChipSelector
              title="メッセージ役割"
              options={sampleRoles}
              selected={filters.messageRoles}
              onChange={(messageRoles) => updateFilters({ messageRoles })}
              icon={MessageSquare}
              colorScheme="green"
            />

            {/* タイトル検索 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">タイトル検索</h3>
              </div>
              <input
                type="text"
                value={filters.sessionTitleContains}
                onChange={(e) => updateFilters({ sessionTitleContains: e.target.value })}
                placeholder="セッションタイトルを検索..."
                className="
                  w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  transition-all duration-200
                "
              />
            </div>

            {/* 最小メッセージ数 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">最小メッセージ数</h3>
              </div>
              <input
                type="number"
                value={filters.hasMinMessages || ''}
                onChange={(e) => updateFilters({ 
                  hasMinMessages: e.target.value ? parseInt(e.target.value) : null 
                })}
                placeholder="最小メッセージ数"
                min="1"
                className="
                  w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  transition-all duration-200
                "
              />
            </div>
          </div>
        </div>

        {/* 結果パネル */}
        <div className="lg:col-span-2 space-y-6">
          {/* フィルタサマリー */}
          <FilterSummary
            filters={filters}
            onClearFilter={clearFilter}
            onClearAll={clearAllFilters}
          />

          {/* 統計情報 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Search className="w-4 h-4 text-blue-500" />
                  <span>{filterResults.total}件の結果</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Filter className="w-4 h-4 text-purple-500" />
                  <span>{filterResults.appliedFilters}フィルタ適用</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span>{filterResults.searchTime.toFixed(1)}ms</span>
                </div>
              </div>
              
              {isLoading && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span>フィルタ中...</span>
                </div>
              )}
            </div>
          </div>

          {/* セッション結果 */}
          <div className="space-y-4">
            {filterResults.sessions.length > 0 ? (
              filterResults.sessions.map((session) => (
                <div
                  key={session.id}
                  className="
                    bg-white border border-gray-200 rounded-lg p-4 
                    hover:shadow-md transition-all duration-200
                    hover:border-blue-300
                  "
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {session.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                        {session.metadata.source}
                      </span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                        {session.message_count}件
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(session.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                    
                    {session.metadata.tags && (
                      <div className="flex items-center space-x-1">
                        {session.metadata.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="bg-gray-50 text-gray-600 px-2 py-1 rounded text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  条件に一致するセッションがありません
                </h3>
                <p className="text-gray-500">
                  フィルタ条件を調整してみてください
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* デモ情報パネル */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">
          🌟 統合された「いいところ」
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong className="text-purple-600">Notion風:</strong>
            <ul className="text-gray-600 mt-1 space-y-1">
              <li>• ビジュアル検索ビルダー</li>
              <li>• 直感的フィルタ作成</li>
              <li>• カレンダーUI</li>
              <li>• チップ選択インターフェース</li>
            </ul>
          </div>
          <div>
            <strong className="text-blue-600">Discord + GitHub風:</strong>
            <ul className="text-gray-600 mt-1 space-y-1">
              <li>• リアルタイムプレビュー</li>
              <li>• スムーズアニメーション</li>
              <li>• 高速フィルタ処理</li>
              <li>• パフォーマンス表示</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 