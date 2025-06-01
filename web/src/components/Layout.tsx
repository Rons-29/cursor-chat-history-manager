import React, { ReactNode } from 'react'
import Header from './Header.js'
import Sidebar from './Sidebar.js'

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => (
  <div className="flex h-screen">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {children}
      </main>
    </div>
  </div>
)

export default Layout
