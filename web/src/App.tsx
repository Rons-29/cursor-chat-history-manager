import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import EnhancedSessions from './pages/EnhancedSessions'
import SessionDetail from './pages/SessionDetail'
import Search from './pages/Search.tsx'
import Settings from './pages/Settings.tsx'
import Integration from './pages/Integration'
import ClaudeDevIntegration from './pages/ClaudeDevIntegration.tsx'
import ClaudeDevSessionDetail from './pages/ClaudeDevSessionDetail.tsx'
import TestIntegration from './pages/TestIntegration.tsx'
import ProgressDemoPage from './pages/ProgressDemoPage.tsx'
import DebugSettings from './pages/DebugSettings.tsx'
import SimpleSettings from './pages/SimpleSettings.tsx'
import TestPage from './pages/TestPage.tsx'
import NotFound from './pages/NotFound.tsx'
import CursorChatImport from './pages/CursorChatImport'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/enhanced-sessions" element={<EnhancedSessions />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/integration" element={<Integration />} />
        <Route path="/claude-dev" element={<ClaudeDevIntegration />} />
        <Route path="/claude-dev/session/:id" element={<ClaudeDevSessionDetail />} />
        <Route path="/test-integration" element={<TestIntegration />} />
        <Route path="/progress-demo" element={<ProgressDemoPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/debug-settings" element={<DebugSettings />} />
        <Route path="/simple-settings" element={<SimpleSettings />} />
        <Route path="/cursor-chat-import" element={<CursorChatImport />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default App
