import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, CommandLineIcon } from '@heroicons/react/24/outline'

interface GlobalSearchBarProps {
  placeholder?: string
  className?: string
}

/**
 * 🔍 ChatFlow グローバル検索バー
 * 
 * UI_DESIGN_GOAL準拠の検索体験を提供
 * - Cmd+K ショートカット対応
 * - リアルタイム検索候補
 * - 開発者向け最適化
 */
const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  placeholder = "🔍 AI対話を検索... (Cmd+K)",
  className = ""
}) => {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Cmd+K ショートカット処理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K または Ctrl+K でモーダル開く（モーダル閉じている時のみ）
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !isModalOpen) {
        e.preventDefault()
        e.stopPropagation()
        setIsModalOpen(true)
        setQuery('') // クリア
      }
      
      // Escape でモーダル閉じる（モーダル開いている時のみ）
      if (e.key === 'Escape' && isModalOpen) {
        e.preventDefault()
        e.stopPropagation()
        closeModal()
      }
    }

    // useCapture: true で早期にキャッチ
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isModalOpen])

  // モーダル開いた後のフォーカス処理
  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      // シンプルなフォーカス処理
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isModalOpen])

  // 検索実行
  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      closeModal()
    }
  }

  // モーダル閉じる処理
  const closeModal = () => {
    setIsModalOpen(false)
    setQuery('')
    // フォーカスをbodyに戻す
    document.body.focus()
  }

  // 削除：handleKeyPressは使用しない

  // インライン検索バー（ヘッダー用）
  const InlineSearchBar = () => (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              e.preventDefault()
              handleSearch()
            }
          }}
          className={`
            block w-full pl-10 pr-20 py-2.5 border border-gray-300 dark:border-gray-600 
            rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            placeholder-gray-500 dark:placeholder-gray-400
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-all duration-200 ease-in-out
            ${isFocused ? 'ring-2 ring-blue-500' : ''}
          `}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          lang="en"
          inputMode="search"
          style={{ imeMode: 'disabled' }}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
            ⌘K
          </kbd>
        </div>
      </div>
    </div>
  )

  // 検索モーダル（Cmd+K用）
  const SearchModal = () => (
    <>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* オーバーレイ */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeModal}
          />
          
          {/* モーダルコンテンツ */}
          <div className="flex min-h-full items-start justify-center p-4 pt-16">
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              {/* 検索ヘッダー */}
              <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && query.trim() && (e.preventDefault(), handleSearch())}
                    className="block w-full pl-12 pr-4 py-3 text-lg border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 focus:outline-none"
                    placeholder="AI対話を検索..."
                    autoComplete="off"
                    spellCheck={false}
                    lang="en"
                    style={{ imeMode: 'disabled' }}
                  />
                </div>
              </div>
              
              {/* 検索候補・ヘルプ */}
              <div className="p-4">
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    💡 <strong>検索のコツ:</strong>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-gray-700 dark:text-gray-300">&quot;React エラー&quot;</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-gray-700 dark:text-gray-300">&quot;TypeScript 型&quot;</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-gray-700 dark:text-gray-300">&quot;cursor-import&quot;</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-gray-700 dark:text-gray-300">&quot;API 最適化&quot;</span>
                    </div>
                  </div>
                </div>
                
                {/* キーボードショートカット */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd>
                        <span>検索実行</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
                        <span>閉じる</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CommandLineIcon className="h-4 w-4" />
                      <span>ChatFlow 検索</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      <InlineSearchBar />
      <SearchModal />
    </>
  )
}

export default GlobalSearchBar 