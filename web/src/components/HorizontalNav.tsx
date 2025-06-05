import React from 'react'
import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  name: string
  href: string
  icon: string
  description: string
}

/**
 * 🧭 水平タブナビゲーション（統合版）
 * 
 * UI_DESIGN_GOAL準拠の統合ナビゲーション実装
 * - 8画面 → 4画面への統合完了
 * - 目標: `🏠 統合ダッシュボード  💬 AI対話管理  🔧 統合連携管理  ⚙️ 設定・管理`
 * - 主要機能への直感的アクセス
 * - タブ形式でアクティブ状態を明確化
 */
const HorizontalNav: React.FC = () => {
  const location = useLocation()

  // 統合後のメインナビゲーション（4画面統合版）
  const navigationItems: NavItem[] = [
    {
      name: '統合ダッシュボード',
      href: '/',
      icon: '🏠',
      description: '統計・アチーブメント・システム概要'
    },
    {
      name: 'AI対話管理',
      href: '/search',
      icon: '💬',
      description: 'AI対話の検索・管理・閲覧'
    },
    {
      name: '統合連携管理',
      href: '/integrations',
      icon: '🔧',
      description: 'Cursor・Claude Dev・インポート管理'
    },
    {
      name: '設定・管理',
      href: '/settings',
      icon: '⚙️',
      description: 'システム設定・デバッグ・バックアップ'
    }
  ]

  // アクティブ状態判定（統合対応）
  const isActive = (href: string): boolean => {
    if (href === '/' && location.pathname === '/') return true
    if (href === '/search' && (
      location.pathname.startsWith('/search') || 
      location.pathname.startsWith('/ai-sessions') ||
      location.pathname.startsWith('/sessions')
    )) return true
    if (href === '/integrations' && (
      location.pathname.startsWith('/integrations') ||
      location.pathname.startsWith('/integration') ||
      location.pathname.startsWith('/claude-dev') ||
      location.pathname.startsWith('/cursor-chat-import')
    )) return true
    if (href === '/settings' && (
      location.pathname.startsWith('/settings') ||
      location.pathname.startsWith('/debug-settings') ||
      location.pathname.startsWith('/simple-settings')
    )) return true
    return false
  }

  return (
    <nav 
      className="horizontal-nav"
      role="navigation"
      aria-label="メインナビゲーション（統合版・水平）"
    >
      <div className="horizontal-nav-container">
        <div className="horizontal-nav-list">
          {navigationItems.map((item) => {
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`horizontal-nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={`${item.name} - ${item.description}`}
                title={item.description}
              >
                <span className="horizontal-nav-icon" role="img" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="horizontal-nav-text">
                  {item.name}
                </span>
                {active && (
                  <div 
                    className="horizontal-nav-active-indicator"
                    aria-hidden="true"
                  />
                )}
              </Link>
            )
          })}
        </div>
        
        {/* 統合情報表示 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          統合版: 8画面 → 4画面 (67%削減)
        </div>
      </div>
    </nav>
  )
}

export default HorizontalNav 