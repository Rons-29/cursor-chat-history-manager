import React, { ReactNode, useState, useEffect } from 'react'
import Header from './Header.tsx'
import Sidebar from './Sidebar.tsx'
import '../styles/layout-integration.css'

interface LayoutProps {
  children: ReactNode
}

/**
 * 🎨 ChatFlow 統合レイアウトコンポーネント
 * 
 * ヘッダー・サイドバー競合問題の根本解決
 * - Z-Index階層統一
 * - レスポンシブ対応強化
 * - モバイルメニュー実装
 * 
 * @param children メインコンテンツ
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // ダークモード検出
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDarkMode(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // モバイルメニュー切り替え
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  // オーバーレイクリックでメニュー閉じる
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className={`layout-root ${isDarkMode ? 'dark' : ''}`}>
      {/* サイドバー */}
      <Sidebar 
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
      />
      
      {/* ヘッダー */}
      <Header 
        onMobileMenuToggle={toggleMobileMenu}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      
      {/* モバイルオーバーレイ */}
      <div 
        className={`layout-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />
      
      {/* メインコンテンツ */}
      <main 
        id="main-content"
        className="layout-main-container"
        role="main"
        aria-label="メインコンテンツ"
      >
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
