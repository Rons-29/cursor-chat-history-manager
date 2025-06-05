import React, { useState, useEffect } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import SimpleSearchModal from './SimpleSearchModal'

interface SimpleGlobalSearchBarProps {
  placeholder?: string
  className?: string
}

/**
 * 🔍 シンプルグローバル検索バー
 * 
 * 複雑なイベント処理を排除して連続入力問題を解決
 * - インライン検索バー（ヘッダー用）
 * - Cmd+K モーダル呼び出し
 */
const SimpleGlobalSearchBar: React.FC<SimpleGlobalSearchBarProps> = ({
  placeholder = "🔍 AI対話を検索... (Cmd+K)",
  className = ""
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Cmd+K ショートカット（シンプル版）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K または Ctrl+K でモーダル開く
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsModalOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {/* インライン検索バー */}
      <div className={`relative ${className}`}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div
            onClick={() => setIsModalOpen(true)}
            className="block w-full pl-10 pr-20 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {placeholder}
          </div>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* 検索モーダル */}
      <SimpleSearchModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

export default SimpleGlobalSearchBar 