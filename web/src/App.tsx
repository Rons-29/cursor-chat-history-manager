import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Sessions from './pages/Sessions.tsx'
import SessionDetail from './pages/SessionDetail.tsx'
import Search from './pages/Search.tsx'
import Settings from './pages/Settings.tsx'
import Integration from './pages/Integration.tsx'
import TestIntegration from './pages/TestIntegration.tsx'
import NotFound from './pages/NotFound.tsx'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/integration" element={<Integration />} />
        <Route path="/test-integration" element={<TestIntegration />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default App
