# ChatFlow統一検索機能 - 実装計画書

## 📋 目次
1. [実装概要](#実装概要)
2. [段階的実装計画](#段階的実装計画)
3. [技術実装詳細](#技術実装詳細)
4. [テスト戦略](#テスト戦略)
5. [マイグレーション計画](#マイグレーション計画)

---

## 🎯 実装概要

### 統合方針
**現状の問題**: Sessions.tsx（セッション一覧検索）とSearch.tsx（メッセージ内容検索）が分離
**統合後の解決**: 1つの検索画面で全ての検索機能を提供

### 実装アプローチ
1. **段階的統合**: 既存機能を壊さずに段階的に統合
2. **後方互換性**: 既存URLルートの維持
3. **パフォーマンス重視**: SQLite FTS5を最大活用
4. **UX改善**: 直感的で高速な検索体験

---

## 📋 段階的実装計画

### Phase 1: 基盤実装（1-2週間）

#### 1.1 API統合・拡張
```bash
# 実装ファイル
src/server/routes/search.ts          # 統一検索API
src/services/UnifiedSearchService.ts # 統一検索サービス
src/types/UnifiedSearch.ts           # 統一検索型定義
```

**実装内容**:
```typescript
// 新統一検索エンドポイント
POST /api/search/unified
GET  /api/search/suggestions
GET  /api/search/history

// 統一検索サービス
class UnifiedSearchService {
  async searchAll(query: string, filters: SearchFilters): Promise<UnifiedSearchResponse>
  async getSessionsByKeyword(keyword: string): Promise<SessionSearchResult[]>
  async getMessagesByContent(content: string): Promise<MessageSearchResult[]>
  async getTagsByName(tagName: string): Promise<TagSearchResult[]>
  async getSuggestions(partialQuery: string): Promise<SearchSuggestion[]>
}
```

#### 1.2 基本UI統合
```bash
# 新規コンポーネント
web/src/components/search/UnifiedSearch.tsx
web/src/components/search/SearchInput.tsx
web/src/components/search/SearchResults.tsx
web/src/hooks/useUnifiedSearch.ts
```

**UnifiedSearch.tsx実装例**:
```tsx
import React, { useState } from 'react'
import { useUnifiedSearch } from '../hooks/useUnifiedSearch'
import { SearchInput } from './SearchInput'
import { SearchResults } from './SearchResults'

export const UnifiedSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState({
    sessions: true,
    messages: true,
    tags: true
  })

  const { 
    data: searchResults, 
    isLoading, 
    error 
  } = useUnifiedSearch(query, activeFilters)

  return (
    <div className="space-y-6">
      <SearchInput 
        value={query}
        onChange={setQuery}
        placeholder="チャット履歴全体を検索..."
      />
      
      <SearchResults 
        results={searchResults}
        loading={isLoading}
        error={error}
        onSessionSelect={handleSessionSelect}
        onMessageSelect={handleMessageSelect}
      />
    </div>
  )
}
```

#### 1.3 ルーティング統合
```typescript
// web/src/App.tsx - ルーティング更新
<Routes>
  <Route path="/search" element={<UnifiedSearch />} />
  <Route path="/sessions" element={<UnifiedSearch defaultTab="sessions" />} />
  {/* 後方互換性のため既存ルートも維持 */}
  <Route path="/old-search" element={<Search />} />
  <Route path="/old-sessions" element={<Sessions />} />
</Routes>
```

### Phase 2: 機能拡張（2-3週間）

#### 2.1 リアルタイム検索実装
```typescript
// web/src/hooks/useUnifiedSearch.ts
export const useUnifiedSearch = (query: string, filters: SearchFilters) => {
  const debouncedQuery = useDebounce(query, 300)
  
  return useQuery({
    queryKey: ['unifiedSearch', debouncedQuery, filters],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) return null
      return apiClient.searchUnified(debouncedQuery, filters)
    },
    enabled: Boolean(debouncedQuery && debouncedQuery.length >= 3),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  })
}

// デバウンスフック
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}
```

#### 2.2 高度フィルター実装
```tsx
// SearchFilters.tsx
export const SearchFilters: React.FC<SearchFiltersProps> = ({ 
  filters, 
  onFiltersChange 
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <FilterChip 
        active={filters.sessions}
        onClick={() => onFiltersChange({ ...filters, sessions: !filters.sessions })}
      >
        📋 セッション ({sessionCount})
      </FilterChip>
      
      <FilterChip 
        active={filters.messages}
        onClick={() => onFiltersChange({ ...filters, messages: !filters.messages })}
      >
        💬 メッセージ ({messageCount})
      </FilterChip>
      
      <DateRangeFilter 
        value={filters.dateRange}
        onChange={(range) => onFiltersChange({ ...filters, dateRange: range })}
      />
      
      <SourceFilter 
        value={filters.sources}
        onChange={(sources) => onFiltersChange({ ...filters, sources })}
      />
    </div>
  )
}
```

#### 2.3 検索履歴・候補機能
```typescript
// SearchSuggestions.tsx
export const SearchSuggestions: React.FC = ({ query, onSelectSuggestion }) => {
  const { data: suggestions } = useQuery({
    queryKey: ['searchSuggestions', query],
    queryFn: () => apiClient.getSearchSuggestions(query),
    enabled: Boolean(query && query.length >= 1)
  })

  return (
    <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10">
      {suggestions?.recent.length > 0 && (
        <div className="p-3 border-b">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">最近の検索</h3>
          {suggestions.recent.map(item => (
            <SuggestionItem key={item} text={item} onSelect={onSelectSuggestion} />
          ))}
        </div>
      )}
      
      {suggestions?.popular.length > 0 && (
        <div className="p-3">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">人気のキーワード</h3>
          {suggestions.popular.map(item => (
            <SuggestionItem key={item} text={item} onSelect={onSelectSuggestion} />
          ))}
        </div>
      )}
    </div>
  )
}
```

### Phase 3: UX最適化・完成（1週間）

#### 3.1 結果表示の最適化
```tsx
// SearchResults.tsx - セクション別結果表示
export const SearchResults: React.FC<SearchResultsProps> = ({ results, query }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'sessions' | 'messages' | 'tags'>('all')
  
  if (!results) return <EmptyState />
  
  return (
    <div className="space-y-6">
      {/* 結果タブ */}
      <div className="flex space-x-4 border-b">
        <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
          すべて ({results.total.sessions + results.total.messages + results.total.tags})
        </TabButton>
        <TabButton active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')}>
          セッション ({results.total.sessions})
        </TabButton>
        <TabButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')}>
          メッセージ ({results.total.messages})
        </TabButton>
        <TabButton active={activeTab === 'tags'} onClick={() => setActiveTab('tags')}>
          タグ ({results.total.tags})
        </TabButton>
      </div>
      
      {/* 結果表示 */}
      {(activeTab === 'all' || activeTab === 'sessions') && (
        <ResultSection title="セッション" results={results.results.sessions}>
          {results.results.sessions.map(session => (
            <SessionResultCard key={session.id} session={session} query={query} />
          ))}
        </ResultSection>
      )}
      
      {(activeTab === 'all' || activeTab === 'messages') && (
        <ResultSection title="メッセージ" results={results.results.messages}>
          {results.results.messages.map(message => (
            <MessageResultCard key={`${message.sessionId}-${message.messageIndex}`} 
              message={message} query={query} />
          ))}
        </ResultSection>
      )}
    </div>
  )
}
```

#### 3.2 パフォーマンス最適化
```typescript
// 仮想スクロール実装
import { FixedSizeList as List } from 'react-window'

const VirtualizedResults: React.FC = ({ results }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ResultCard result={results[index]} />
    </div>
  )
  
  return (
    <List
      height={600}
      itemCount={results.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

---

## 🔧 技術実装詳細

### バックエンド実装

#### UnifiedSearchService.ts
```typescript
import { SqliteIndexService } from './SqliteIndexService'
import { ChatHistoryService } from './ChatHistoryService'

export class UnifiedSearchService {
  constructor(
    private sqliteService: SqliteIndexService,
    private chatService: ChatHistoryService
  ) {}

  async searchAll(query: string, filters: SearchFilters): Promise<UnifiedSearchResponse> {
    const startTime = Date.now()
    
    // 並行検索実行
    const [sessionResults, messageResults, tagResults] = await Promise.all([
      filters.includeSessionTitles ? this.searchSessions(query, filters) : [],
      filters.includeMessageContent ? this.searchMessages(query, filters) : [],
      filters.includeTags ? this.searchTags(query, filters) : []
    ])

    const searchTime = Date.now() - startTime
    
    return {
      query,
      total: {
        sessions: sessionResults.length,
        messages: messageResults.length,
        tags: tagResults.length
      },
      results: {
        sessions: sessionResults,
        messages: messageResults,
        tags: tagResults
      },
      suggestions: await this.generateSuggestions(query),
      performance: {
        searchTime,
        resultCount: sessionResults.length + messageResults.length + tagResults.length
      }
    }
  }

  private async searchSessions(query: string, filters: SearchFilters): Promise<SessionSearchResult[]> {
    // SQLite FTS5での高速セッション検索
    const sqliteResults = await this.sqliteService.searchSessions(query, {
      dateRange: filters.dateRange,
      sources: filters.sources,
      limit: 50
    })

    return sqliteResults.map(session => ({
      ...session,
      matchInfo: {
        field: this.determineMatchField(session, query),
        score: this.calculateRelevanceScore(session, query),
        highlightedTitle: this.highlightText(session.title, query)
      }
    }))
  }

  private async searchMessages(query: string, filters: SearchFilters): Promise<MessageSearchResult[]> {
    // SQLite FTS5での高速メッセージ検索
    const sqliteResults = await this.sqliteService.searchMessages(query, {
      dateRange: filters.dateRange,
      sources: filters.sources,
      limit: 100
    })

    return sqliteResults.map(message => ({
      ...message,
      matchInfo: {
        score: this.calculateRelevanceScore(message, query),
        highlightedContent: this.highlightText(message.content, query),
        context: this.getMessageContext(message)
      }
    }))
  }

  private calculateRelevanceScore(item: any, query: string): number {
    // TF-IDF風スコア計算
    const queryWords = query.toLowerCase().split(' ')
    let score = 0
    
    queryWords.forEach(word => {
      const content = (item.title + ' ' + item.content).toLowerCase()
      const matches = (content.match(new RegExp(word, 'g')) || []).length
      const tf = matches / content.split(' ').length
      score += tf
    })
    
    return Math.round(score * 1000) / 1000
  }

  private highlightText(text: string, query: string): string {
    const queryWords = query.toLowerCase().split(' ')
    let highlighted = text
    
    queryWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi')
      highlighted = highlighted.replace(regex, '<mark>$1</mark>')
    })
    
    return highlighted
  }
}
```

#### 統一検索API (routes/search.ts)
```typescript
import express from 'express'
import { UnifiedSearchService } from '../services/UnifiedSearchService'

const router = express.Router()

// 統一検索エンドポイント
router.post('/unified', async (req, res) => {
  try {
    const { query, filters = {}, pagination = {} } = req.body
    
    // バリデーション
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'クエリパラメータが必要です'
      })
    }

    const searchService = new UnifiedSearchService()
    const results = await searchService.searchAll(query.trim(), {
      includeSessionTitles: filters.includeSessionTitles ?? true,
      includeMessageContent: filters.includeMessageContent ?? true,
      includeTags: filters.includeTags ?? true,
      dateRange: filters.dateRange,
      sources: filters.sources,
      sortBy: filters.sortBy || 'relevance'
    })

    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('統一検索エラー:', error)
    res.status(500).json({
      success: false,
      error: '検索処理中にエラーが発生しました'
    })
  }
})

// 検索候補取得
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || typeof q !== 'string') {
      return res.json({ success: true, data: { recent: [], popular: [] } })
    }

    const suggestions = await searchService.getSuggestions(q)
    res.json({
      success: true,
      data: suggestions
    })
    
  } catch (error) {
    console.error('検索候補取得エラー:', error)
    res.status(500).json({
      success: false,
      error: '検索候補の取得に失敗しました'
    })
  }
})

export default router
```

---

## 🧪 テスト戦略

### ユニットテスト
```typescript
// UnifiedSearchService.test.ts
describe('UnifiedSearchService', () => {
  let service: UnifiedSearchService
  
  beforeEach(() => {
    service = new UnifiedSearchService(mockSqliteService, mockChatService)
  })

  describe('searchAll', () => {
    it('should return unified search results', async () => {
      const query = 'React TypeScript'
      const filters = { includeSessionTitles: true, includeMessageContent: true }
      
      const results = await service.searchAll(query, filters)
      
      expect(results.query).toBe(query)
      expect(results.total.sessions).toBeGreaterThanOrEqual(0)
      expect(results.total.messages).toBeGreaterThanOrEqual(0)
      expect(results.performance.searchTime).toBeGreaterThan(0)
    })

    it('should handle empty query gracefully', async () => {
      const results = await service.searchAll('', {})
      
      expect(results.total.sessions).toBe(0)
      expect(results.total.messages).toBe(0)
    })
  })

  describe('highlightText', () => {
    it('should highlight matching text', () => {
      const text = 'React is a JavaScript library'
      const query = 'React JavaScript'
      
      const highlighted = service.highlightText(text, query)
      
      expect(highlighted).toContain('<mark>React</mark>')
      expect(highlighted).toContain('<mark>JavaScript</mark>')
    })
  })
})
```

### 統合テスト
```typescript
// api.test.ts
describe('Unified Search API', () => {
  it('should return search results via /api/search/unified', async () => {
    const response = await request(app)
      .post('/api/search/unified')
      .send({
        query: 'test query',
        filters: { includeSessionTitles: true }
      })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.query).toBe('test query')
    expect(response.body.data.results).toBeDefined()
  })

  it('should handle invalid query gracefully', async () => {
    const response = await request(app)
      .post('/api/search/unified')
      .send({ query: '' })
      .expect(400)

    expect(response.body.success).toBe(false)
    expect(response.body.error).toContain('クエリパラメータが必要')
  })
})
```

### E2Eテスト
```typescript
// search.e2e.test.ts
describe('Unified Search E2E', () => {
  it('should perform end-to-end search', async () => {
    // ページに移動
    await page.goto('/search')
    
    // 検索入力
    await page.fill('[data-testid="search-input"]', 'React TypeScript')
    
    // 検索実行
    await page.click('[data-testid="search-button"]')
    
    // 結果確認
    await page.waitForSelector('[data-testid="search-results"]')
    const results = await page.$$('[data-testid="result-item"]')
    expect(results.length).toBeGreaterThan(0)
    
    // セッション結果クリック
    await page.click('[data-testid="session-result"]:first-child')
    
    // セッション詳細ページに遷移確認
    await page.waitForURL(/\/sessions\/.*/)
  })

  it('should show suggestions on focus', async () => {
    await page.goto('/search')
    
    // 検索入力フォーカス
    await page.focus('[data-testid="search-input"]')
    
    // 候補表示確認
    await page.waitForSelector('[data-testid="search-suggestions"]')
    const suggestions = await page.$$('[data-testid="suggestion-item"]')
    expect(suggestions.length).toBeGreaterThan(0)
  })
})
```

---

## 🔄 マイグレーション計画

### 段階的移行戦略

#### Stage 1: 新機能導入
```bash
# 1. 新しい統一検索機能をリリース
# 2. 既存機能は並行維持
# 3. ユーザーに新機能を試してもらう
```

#### Stage 2: ユーザーフィードバック収集
```typescript
// フィードバック収集コンポーネント
const SearchFeedback: React.FC = () => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
    <h3 className="font-medium text-blue-900">新しい統一検索はいかがですか？</h3>
    <div className="flex space-x-2 mt-2">
      <Button onClick={() => trackEvent('search_feedback_positive')}>👍 良い</Button>
      <Button onClick={() => trackEvent('search_feedback_negative')}>👎 改善が必要</Button>
    </div>
  </div>
)
```

#### Stage 3: デフォルト切り替え
```typescript
// 新検索をデフォルトに変更
<Routes>
  <Route path="/search" element={<UnifiedSearch />} />
  <Route path="/sessions" element={<UnifiedSearch defaultTab="sessions" />} />
  {/* 旧機能は /legacy/* に移動 */}
  <Route path="/legacy/search" element={<Search />} />
  <Route path="/legacy/sessions" element={<Sessions />} />
</Routes>
```

#### Stage 4: 旧機能廃止
```bash
# 1. 旧機能の使用率が5%以下になったら廃止予定をアナウンス
# 2. 1ヶ月後に旧機能を完全削除
# 3. コードクリーンアップ実行
```

### データ移行
```typescript
// 検索履歴の移行
class SearchHistoryMigration {
  async migrateFromOldFormat() {
    const oldHistory = await this.getOldSearchHistory()
    const unifiedHistory = oldHistory.map(item => ({
      query: item.keyword || item.query,
      timestamp: item.timestamp,
      type: 'unified' as const,
      filters: this.convertOldFilters(item.filters)
    }))
    
    await this.saveUnifiedHistory(unifiedHistory)
  }
}
```

---

## 📊 進捗管理・監視

### 開発マイルストーン
```typescript
interface DevelopmentMilestones {
  week1: "API統合完了・基本UI実装"
  week2: "リアルタイム検索・フィルター実装"
  week3: "UX最適化・パフォーマンス改善"
  week4: "テスト完成・ドキュメント整備"
  week5: "リリース・ユーザーフィードバック収集"
}
```

### パフォーマンス監視
```typescript
// 検索パフォーマンス監視
const searchMetrics = {
  searchTime: "< 300ms",
  apiResponseTime: "< 200ms",
  cacheHitRate: "> 70%",
  userSatisfaction: "> 80%"
}
```

---

**作成日**: 2025年6月04日  
**推定工数**: 4-5週間  
**優先度**: 高（ユーザビリティ大幅改善） 