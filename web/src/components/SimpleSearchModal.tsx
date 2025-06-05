import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface SimpleSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 🔍 シンプル検索モーダル
 * 
 * 複雑なイベント処理を避けて、基本的なReactパターンのみ使用
 * 連続入力問題を解決するための最小実装
 */
const SimpleSearchModal: React.FC<SimpleSearchModalProps> = ({
  isOpen,
  onClose
}) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // フォーカス処理（モーダル表示時）
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // 確実にフォーカス
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // 検索実行
  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
      onClose()
    }
  }

  // キーボードイベント（シンプル）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setQuery('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* モーダル */}
      <div className="flex min-h-full items-start justify-center p-4 pt-16">
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* 検索入力 */}
          <div className="p-6">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-3 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="AI対話を検索..."
              />
            </div>
            
            {/* 検索ボタン */}
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleSearch}
                disabled={!query.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                検索
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleSearchModal 