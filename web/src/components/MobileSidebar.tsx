import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface MobileSidebarProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly navigationItems: Array<{
    name: string
    href: string
    description: string
    category: string
    icon: React.ReactNode
  }>
}

/**
 * 🎯 モバイル専用スワイプ対応サイドバー
 * - スワイプジェスチャー対応
 * - タッチフレンドリーなUI
 * - アクセシビリティ完全対応
 * - パフォーマンス最適化
 */
export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  navigationItems
}) => {
  const location = useLocation()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // スワイプ検出の最小距離
  const minSwipeDistance = 50

  /**
   * アクティブ状態判定
   */
  const isActive = (path: string): boolean => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  /**
   * タッチイベントハンドラー
   */
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    // const isRightSwipe = distance < -minSwipeDistance // 将来のスワイプ機能用

    // 左スワイプでサイドバーを閉じる
    if (isLeftSwipe && isOpen) {
      onClose()
    }
  }

  /**
   * ESCキーでサイドバーを閉じる
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // フォーカストラップ
      const sidebar = sidebarRef.current
      if (sidebar) {
        const focusableElements = sidebar.querySelectorAll(
          'a, button, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        const handleTabKey = (e: KeyboardEvent) => {
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              if (document.activeElement === firstElement) {
                e.preventDefault()
                lastElement.focus()
              }
            } else {
              if (document.activeElement === lastElement) {
                e.preventDefault()
                firstElement.focus()
              }
            }
          }
        }

        document.addEventListener('keydown', handleTabKey)
        firstElement?.focus()

        return () => {
          document.removeEventListener('keydown', handleTabKey)
        }
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  /**
   * ボディスクロール制御
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* オーバーレイ */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* サイドバー */}
      <aside
        ref={sidebarRef}
        className={`sidebar fixed top-0 left-0 z-50 h-full w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="navigation"
        aria-label="メインナビゲーション"
        aria-modal="true"
      >
        {/* ヘッダー */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CF</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                ChatFlow
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                AI対話管理
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="サイドバーを閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* ナビゲーション */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={`
                  flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                  }
                `}
                aria-current={active ? 'page' : undefined}
                aria-describedby={`nav-desc-${item.href.replace('/', '')}`}
              >
                <span className="w-6 h-6 mr-3 flex-shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {item.name}
                  </div>
                  <div 
                    id={`nav-desc-${item.href.replace('/', '')}`}
                    className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2"
                  >
                    {item.description}
                  </div>
                </div>

                {active && (
                  <div className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" aria-hidden="true" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* フッター */}
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>ChatFlow v1.0.0</p>
            <p className="mt-1">
              左にスワイプして閉じる
            </p>
          </div>
        </footer>
      </aside>
    </>
  )
}

export default MobileSidebar 