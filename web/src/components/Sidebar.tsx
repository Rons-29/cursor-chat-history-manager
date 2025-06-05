import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NavLink } from 'react-router-dom'

const Sidebar: React.FC = () => {
  const location = useLocation()

  const navigationItems = [
    {
      name: '🏠 ホーム',
      href: '/',
      icon: (
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
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: 'AI対話一覧',
      href: '/sessions',
      icon: (
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
    {
      name: '🚀 詳細AI対話',
      href: '/enhanced-sessions',
      icon: (
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      name: '🔍 横断検索',
      href: '/unified-search',
      icon: (
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
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 16l4-4 4 4"
          />
        </svg>
      ),
    },
    {
      name: '🔗 統合連携',
      href: '/unified-integrations',
      icon: (
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
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
    },
    {
      name: 'Cursor連携',
      href: '/integration',
      icon: (
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
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
      ),
    },
    {
      name: 'Claude Dev連携',
      href: '/claude-dev',
      icon: (
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
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
    {
      name: '📁 手動インポート',
      href: '/manual-import',
      icon: (
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
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      ),
    },
    {
      name: '進捗UI デモ',
      href: '/progress-demo',
      icon: (
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      name: '設定',
      href: '/settings',
      icon: (
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
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
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

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 shadow-lg border-r border-gray-200 dark:border-slate-600 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0">
      {/* サイドバーヘッダー */}
      <div className="flex items-center justify-center h-16 px-4 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
        <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100">ナビゲーション</h2>
      </div>

      {/* ナビゲーションメニュー */}
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigationItems.map(item => (
            <li key={item.name}>
              <Link
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-r-2 border-primary-600'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-100'
                }`}
              >
                <span
                  className={
                    isActive(item.href) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                  }
                >
                  {item.icon}
                </span>
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
          <li>
            <NavLink to="/enhanced-sessions" className={({ isActive }) => 
              `block px-4 py-2 text-sm rounded-md transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }>
              🚀 強化版セッション
            </NavLink>
          </li>
          <li>
            <NavLink to="/cursor-chat-import" className={({ isActive }) => 
              `block px-4 py-2 text-sm rounded-md transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }>
              📤 Cursor Chat インポート
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* サイドバーフッター */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 dark:bg-primary-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">CH</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
              Chat History
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">v1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
