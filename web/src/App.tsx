import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.js'
import Dashboard from './pages/Dashboard.js'
import Sessions from './pages/Sessions.js'
import SessionDetail from './pages/SessionDetail.js'
import Search from './pages/Search.js'
import Settings from './pages/Settings.js'
import NotFound from './pages/NotFound.js'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default App
