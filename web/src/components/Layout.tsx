import React, { ReactNode } from 'react'
import Header from './Header.tsx'
import Sidebar from './Sidebar.tsx'

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Sidebar />
    <div className="lg:pl-64">
      <Header />
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  </div>
)

export default Layout
