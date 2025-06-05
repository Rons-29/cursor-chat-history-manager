import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import UnifiedDashboard from './pages/UnifiedDashboard.tsx'
import UnifiedSearch from './pages/UnifiedSearch.tsx'
import UnifiedIntegrations from './pages/UnifiedIntegrations.tsx'
// import EnhancedSessions from './pages/EnhancedSessions'
// import UnifiedSessions from './pages/UnifiedSessions.tsx'
import UnifiedSessionsPage from './pages/UnifiedSessionsPage.tsx'
import SessionDetail from './pages/SessionDetail'
import ManualImport from './pages/ManualImport.tsx'
import ClaudeDevSessionDetail from './pages/ClaudeDevSessionDetail.tsx'
import NotFound from './pages/NotFound.tsx'

// 統一検索システムのCSS読み込み
import './components/UnifiedSearchSystem/unified-search.css'

function App() {
  return (
    <Layout>
      <Routes>
        {/* === 4つの主要機能（UI_DESIGN_GOAL準拠） === */}
        <Route path="/" element={<UnifiedDashboard />} />
        <Route path="/unified-search" element={<UnifiedSearch />} />
        
        {/* === 統一セッションページ（新規・統合版） === */}
        <Route path="/sessions" element={<UnifiedSessionsPage defaultMode="standard" />} />
        <Route path="/unified-sessions" element={<UnifiedSessionsPage defaultMode="crossData" />} />
        <Route path="/enhanced-sessions" element={<UnifiedSessionsPage defaultMode="enhanced" />} />
        
        {/* === 旧ページ（互換性維持・段階的廃止予定） === */}
        {/* 
        将来的に以下のページは統一ページに完全移行予定:
        - EnhancedSessions → UnifiedSessionsPage (enhanced mode)
        - UnifiedSessions → UnifiedSessionsPage (crossData mode)
        */}
        
        <Route path="/unified-integrations" element={<UnifiedIntegrations />} />
        
        {/* === 詳細表示・サブページ === */}
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/claude-dev/session/:id" element={<ClaudeDevSessionDetail />} />
        <Route path="/manual-import" element={<ManualImport />} />
        
        {/* === 404エラー === */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default App
