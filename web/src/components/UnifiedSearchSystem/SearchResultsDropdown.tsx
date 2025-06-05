import React from 'react'
import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon, 
  ArrowRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

interface SearchResult {
  id: string
  title: string
  content?: string
  type: 'session' | 'message' | 'file'
  metadata?: {
    source?: string
    timestamp?: string
    tags?: string[]
  }
}

interface SearchResultsDropdownProps {
  isLoading: boolean
  results: SearchResult[]
  keyword: string
  onResultSelect: (result: SearchResult) => void
  onViewAll: () => void
  onViewInSessions: () => void
}

/**
 * 検索結果ドロップダウン - 統一検索バーのリアルタイム結果表示
 * 
 * 機能:
 * - 検索結果のプレビュー表示
 * - 結果タイプ別のアイコン表示
 * - キーワードハイライト
 * - アクションボタン（全て見る・セッション一覧で見る）
 */
export const SearchResultsDropdown: React.FC<SearchResultsDropdownProps> = ({
  isLoading,
  results,
  keyword,
  onResultSelect,
  onViewAll,
  onViewInSessions
}) => {
  // 結果タイプ別アイコン取得
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'session':
        return <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-500" />
      case 'message':
        return <DocumentTextIcon className="h-4 w-4 text-green-500" />
      case 'file':
        return <DocumentTextIcon className="h-4 w-4 text-purple-500" />
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-500" />
    }
  }

  // キーワードハイライト
  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword.trim()) return text
    
    const regex = new RegExp(`(${keyword})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-800 rounded px-1">
          {part}
        </mark>
      ) : part
    )
  }

  // テキスト短縮
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (!isLoading && results.length === 0 && keyword.trim()) {
    return (
      <div className="unified-search-results-dropdown" style={{ position: 'absolute', top: '100%', zIndex: 9999 }}>
        <div className="p-4 text-center text-gray-500">
          <MagnifyingGlassIcon className="h-6 w-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">「{keyword}」の検索結果が見つかりませんでした</p>
          <p className="text-xs text-gray-400 mt-1">
            キーワードを変更するか、詳細検索をお試しください
          </p>
        </div>
        
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={onViewAll}
            className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded-md flex items-center justify-between"
          >
            詳細検索で「{keyword}」を検索
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="unified-search-results-dropdown" style={{ position: 'absolute', top: '100%', zIndex: 9999 }}>
      {/* ローディング状態 */}
      {isLoading && (
        <div className="p-4 text-center">
          <div className="animate-pulse flex items-center justify-center">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-500">検索中...</span>
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {!isLoading && results.length > 0 && (
        <>
          <div className="py-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              検索結果 (上位{results.length}件)
            </div>
            
            {results.map((result, index) => (
              <button
                key={result.id || index}
                onClick={() => onResultSelect(result)}
                className="w-full px-3 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150"
              >
                <div className="flex items-start space-x-3">
                  {/* アイコン */}
                  <div className="mt-1">
                    {getResultIcon(result.type)}
                  </div>
                  
                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {highlightKeyword(result.title, keyword)}
                      </h4>
                      
                      {/* ソース表示 */}
                      {result.metadata?.source && (
                        <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          {result.metadata.source}
                        </span>
                      )}
                    </div>
                    
                    {/* コンテンツプレビュー */}
                    {result.content && (
                      <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                        {highlightKeyword(truncateText(result.content), keyword)}
                      </p>
                    )}
                    
                    {/* メタデータ */}
                    <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                      {result.metadata?.timestamp && (
                        <span>{new Date(result.metadata.timestamp).toLocaleDateString('ja-JP')}</span>
                      )}
                      
                      {result.metadata?.tags && result.metadata.tags.length > 0 && (
                        <div className="flex space-x-1">
                          {result.metadata.tags.slice(0, 2).map((tag, tagIndex) => (
                            <span key={tagIndex} className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                          {result.metadata.tags.length > 2 && (
                            <span className="text-gray-400">+{result.metadata.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* アクションボタン */}
          <div className="border-t border-gray-200 p-2 space-y-1">
            <button
              onClick={onViewAll}
              className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded-md flex items-center justify-between"
            >
              すべての結果を見る (詳細検索)
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={onViewInSessions}
              className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 rounded-md flex items-center justify-between"
            >
              AI対話一覧で表示
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
} 