import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Sessions from './pages/Sessions.tsx'
import SessionDetail from './pages/SessionDetail.tsx'
import Search from './pages/Search.tsx'
import Settings from './pages/Settings.tsx'
import Integration from './pages/Integration.tsx'
import ClaudeDevIntegration from './pages/ClaudeDevIntegration.tsx'
import ClaudeDevSessionDetail from './pages/ClaudeDevSessionDetail.tsx'
import TestIntegration from './pages/TestIntegration.tsx'
import ProgressDemoPage from './pages/ProgressDemoPage.tsx'
import DebugSettings from './pages/DebugSettings.tsx'
import SimpleSettings from './pages/SimpleSettings.tsx'
import TestPage from './pages/TestPage.tsx'
import NotFound from './pages/NotFound.tsx'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/sessions" element={<Sessions />} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default App
