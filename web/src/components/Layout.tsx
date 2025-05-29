import React, { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <Header />
      
      {/* メインコンテンツエリア */}
      <div className="flex">
        {/* サイドバー */}
        <Sidebar />
        
        {/* メインコンテンツ */}
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout 