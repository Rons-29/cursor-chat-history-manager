import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import '../styles/sidebar.css'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

/**
 * 🎨 ChatFlow Sidebar Component
 * 
 * 統合レイアウトシステム対応サイドバー
 * - モバイル対応
 * - アクセシビリティ強化
 * - 統一ナビゲーション
 */
const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation()

  // UI_DESIGN_GOAL準拠：4つの主要機能に統合
  const navigationItems = [
    {
      name: '🏠 ダッシュボード',
      href: '/',
      description: '統合コマンドセンター・クイックアクセス',
      icon: (
        <svg
          className="sidebar-nav-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: '🔍 統合検索',
      href: '/unified-search',
      description: 'AI開発者特化の高度検索体験',
      icon: (
        <svg
          className="sidebar-nav-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
    },
    {
      name: '💬 対話管理',
      href: '/sessions',
              description: '基本+AI強化表示の連携管理',
      icon: (
        <svg
          className="sidebar-nav-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
    {
      name: '🌐 全データ連携',
      href: '/unified-sessions',
      description: '横断検索統合・全データソース表示',
      icon: (
        <svg
          className="sidebar-nav-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      name: '🔧 プラットフォーム連携',
      href: '/unified-integrations',
      description: '全統合機能の管理ハブ',
      icon: (
        <svg
          className="sidebar-nav-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
    },
    {
      name: '📂 手動インポート',
      href: '/manual-import',
      description: 'AI対話ファイルの手動アップロード',
      icon: (
        <svg
          className="sidebar-nav-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      ),
    },
  ]

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  // キーボードナビゲーション処理
  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if ((e.key === 'Escape') && onClose) {
      onClose()
    }
  }

  return (
    <aside 
      className={`sidebar-container ${isOpen ? 'mobile-open' : ''}`}
      id="sidebar-navigation"
      role="navigation"
      aria-label="メインナビゲーション"
      onKeyDown={handleKeyNavigation}
    >
      {/* スキップリンク */}
      <a href="#main-content" className="skip-to-main">
        メインコンテンツにスキップ
      </a>

      {/* サイドバーヘッダー */}
      <div className="sidebar-header">
        <h2 className="sidebar-header-title">🌊 ChatFlow</h2>
        
        {/* モバイル閉じるボタン */}
        {onClose && (
          <button
            className="mobile-close-button lg:hidden"
            onClick={onClose}
            aria-label="サイドバーを閉じる"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* ナビゲーションメニュー */}
      <nav className="sidebar-nav" role="navigation" aria-label="メインナビゲーション">
        <ul className="sidebar-nav-list">
          {navigationItems.map(item => (
            <li key={item.name} className="sidebar-nav-item">
              <Link
                to={item.href}
                className={`sidebar-nav-link ${isActive(item.href) ? 'active' : ''}`}
                aria-current={isActive(item.href) ? 'page' : undefined}
                title={item.description}
                onClick={() => {
                  // モバイル時はリンククリックでサイドバーを閉じる
                  if (onClose && window.innerWidth < 1024) {
                    onClose()
                  }
                }}
              >
                <span aria-hidden="true">
                  {item.icon}
                </span>
                <div className="sidebar-nav-text">
                  <span className="sidebar-nav-name">{item.name}</span>
                  <span className="sidebar-nav-description">{item.description}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* サイドバーフッター */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-content">
          <div className="sidebar-app-icon">🌊</div>
          <div className="sidebar-app-info">
            <p className="sidebar-app-name">ChatFlow</p>
            <p className="sidebar-app-version">AI対話プラットフォーム v1.0</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
