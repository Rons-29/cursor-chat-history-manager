# ChatFlow統一検索機能 - テスト仕様書

## 📋 目次
1. [テスト概要](#テスト概要)
2. [ユニットテスト](#ユニットテスト)
3. [統合テスト](#統合テスト)
4. [E2Eテスト](#e2eテスト)
5. [パフォーマンステスト](#パフォーマンステスト)
6. [テスト実行・監視](#テスト実行監視)

---

## 🎯 テスト概要

### テスト方針
- **品質保証**: 統一検索機能の信頼性と安定性確保
- **パフォーマンス**: 検索速度・レスポンス性能の保証
- **ユーザビリティ**: 直感的で使いやすい検索体験の検証
- **回帰防止**: 既存機能への影響排除

### テスト環境
```typescript
interface TestEnvironment {
  development: "ローカル開発環境でのユニット・統合テスト"
  staging: "ステージング環境でのE2E・パフォーマンステスト"
  production: "本番環境での監視・回帰テスト"
}
```

### カバレッジ目標
```typescript
interface CoverageTargets {
  unitTests: "コードカバレッジ85%以上"
  integrationTests: "APIエンドポイント100%"
  e2eTests: "主要ユーザーフロー100%"
  performanceTests: "SLA遵守100%"
}
```

---

## 🧪 ユニットテスト

### UnifiedSearchService テスト

#### 基本検索機能テスト
```typescript
// src/services/UnifiedSearchService.test.ts
describe('UnifiedSearchService', () => {
  let service: UnifiedSearchService
  let mockSqliteService: jest.Mocked<SqliteIndexService>
  let mockChatService: jest.Mocked<ChatHistoryService>

  beforeEach(() => {
    mockSqliteService = createMockSqliteService()
    mockChatService = createMockChatService()
    service = new UnifiedSearchService(mockSqliteService, mockChatService)
  })

  describe('searchAll', () => {
    it('should search sessions, messages, and tags simultaneously', async () => {
      // Arrange
      const query = 'React TypeScript'
      const filters = {
        includeSessionTitles: true,
        includeMessageContent: true,
        includeTags: true
      }
      
      mockSqliteService.searchSessions.mockResolvedValue([
        { id: 'session1', title: 'React Development', score: 0.9 }
      ])
      mockSqliteService.searchMessages.mockResolvedValue([
        { sessionId: 'session1', content: 'TypeScript error', score: 0.8 }
      ])
      mockSqliteService.searchTags.mockResolvedValue([
        { tag: 'React', sessionCount: 5 }
      ])

      // Act
      const result = await service.searchAll(query, filters)

      // Assert
      expect(result.query).toBe(query)
      expect(result.total.sessions).toBe(1)
      expect(result.total.messages).toBe(1)
      expect(result.total.tags).toBe(1)
      expect(result.performance.searchTime).toBeGreaterThan(0)
    })

    it('should handle empty query gracefully', async () => {
      // Act
      const result = await service.searchAll('', {})

      // Assert
      expect(result.total.sessions).toBe(0)
      expect(result.total.messages).toBe(0)
      expect(result.total.tags).toBe(0)
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockSqliteService.searchSessions.mockRejectedValue(new Error('DB Error'))

      // Act & Assert
      await expect(service.searchAll('test', {})).rejects.toThrow('DB Error')
    })
  })

  describe('calculateRelevanceScore', () => {
    it('should calculate higher scores for exact matches', () => {
      // Arrange
      const item = { title: 'React Tutorial', content: 'Learn React from scratch' }
      const query = 'React'

      // Act
      const score = service.calculateRelevanceScore(item, query)

      // Assert
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(1)
    })

    it('should calculate lower scores for partial matches', () => {
      // Arrange
      const item = { title: 'Web Development', content: 'Various topics' }
      const query = 'React'

      // Act
      const score = service.calculateRelevanceScore(item, query)

      // Assert
      expect(score).toBe(0)
    })
  })

  describe('highlightText', () => {
    it('should highlight single keyword', () => {
      // Arrange
      const text = 'React is a JavaScript library'
      const query = 'React'

      // Act
      const highlighted = service.highlightText(text, query)

      // Assert
      expect(highlighted).toBe('<mark>React</mark> is a JavaScript library')
    })

    it('should highlight multiple keywords', () => {
      // Arrange
      const text = 'React is a JavaScript library'
      const query = 'React JavaScript'

      // Act
      const highlighted = service.highlightText(text, query)

      // Assert
      expect(highlighted).toContain('<mark>React</mark>')
      expect(highlighted).toContain('<mark>JavaScript</mark>')
    })

    it('should be case insensitive', () => {
      // Arrange
      const text = 'React is a JavaScript library'
      const query = 'react javascript'

      // Act
      const highlighted = service.highlightText(text, query)

      // Assert
      expect(highlighted).toContain('<mark>React</mark>')
      expect(highlighted).toContain('<mark>JavaScript</mark>')
    })
  })
})
```

### React コンポーネントテスト

#### UnifiedSearch コンポーネントテスト
```typescript
// web/src/components/search/UnifiedSearch.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UnifiedSearch } from './UnifiedSearch'

// テストユーティリティ
const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } }
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('UnifiedSearch', () => {
  beforeEach(() => {
    // APIモック設定
    jest.spyOn(require('../api/client'), 'apiClient').mockReturnValue({
      searchUnified: jest.fn().mockResolvedValue({
        query: 'test',
        total: { sessions: 1, messages: 2, tags: 1 },
        results: { sessions: [], messages: [], tags: [] }
      })
    })
  })

  it('should render search input and placeholder', () => {
    // Act
    renderWithQueryClient(<UnifiedSearch />)

    // Assert
    expect(screen.getByPlaceholderText(/チャット履歴全体を検索/)).toBeInTheDocument()
  })

  it('should trigger search on input change', async () => {
    // Arrange
    const mockSearch = jest.fn()
    jest.spyOn(require('../hooks/useUnifiedSearch'), 'useUnifiedSearch')
      .mockReturnValue({ data: null, isLoading: false, error: null })

    // Act
    renderWithQueryClient(<UnifiedSearch />)
    const input = screen.getByPlaceholderText(/チャット履歴全体を検索/)
    fireEvent.change(input, { target: { value: 'React' } })

    // Assert
    expect(input).toHaveValue('React')
  })

  it('should display search results', async () => {
    // Arrange
    const mockResults = {
      query: 'React',
      total: { sessions: 1, messages: 1, tags: 0 },
      results: {
        sessions: [{
          id: 'session1',
          title: 'React Tutorial',
          matchInfo: { score: 0.9, highlightedTitle: '<mark>React</mark> Tutorial' }
        }],
        messages: [{
          sessionId: 'session1',
          content: 'Learn React',
          matchInfo: { score: 0.8, highlightedContent: 'Learn <mark>React</mark>' }
        }],
        tags: []
      }
    }

    jest.spyOn(require('../hooks/useUnifiedSearch'), 'useUnifiedSearch')
      .mockReturnValue({ data: mockResults, isLoading: false, error: null })

    // Act
    renderWithQueryClient(<UnifiedSearch />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/React Tutorial/)).toBeInTheDocument()
      expect(screen.getByText(/Learn React/)).toBeInTheDocument()
    })
  })

  it('should handle loading state', () => {
    // Arrange
    jest.spyOn(require('../hooks/useUnifiedSearch'), 'useUnifiedSearch')
      .mockReturnValue({ data: null, isLoading: true, error: null })

    // Act
    renderWithQueryClient(<UnifiedSearch />)

    // Assert
    expect(screen.getByText(/検索中/)).toBeInTheDocument()
  })

  it('should handle error state', () => {
    // Arrange
    const error = new Error('Search failed')
    jest.spyOn(require('../hooks/useUnifiedSearch'), 'useUnifiedSearch')
      .mockReturnValue({ data: null, isLoading: false, error })

    // Act
    renderWithQueryClient(<UnifiedSearch />)

    // Assert
    expect(screen.getByText(/検索エラー/)).toBeInTheDocument()
  })
})
```

#### SearchFilters コンポーネントテスト
```typescript
// web/src/components/search/SearchFilters.test.tsx
describe('SearchFilters', () => {
  const defaultFilters = {
    sessions: true,
    messages: true,
    tags: true,
    dateRange: null,
    sources: []
  }

  it('should render all filter options', () => {
    // Act
    render(<SearchFilters filters={defaultFilters} onFiltersChange={jest.fn()} />)

    // Assert
    expect(screen.getByText(/セッション/)).toBeInTheDocument()
    expect(screen.getByText(/メッセージ/)).toBeInTheDocument()
    expect(screen.getByText(/タグ/)).toBeInTheDocument()
  })

  it('should toggle session filter', () => {
    // Arrange
    const mockOnChange = jest.fn()

    // Act
    render(<SearchFilters filters={defaultFilters} onFiltersChange={mockOnChange} />)
    fireEvent.click(screen.getByText(/セッション/))

    // Assert
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultFilters,
      sessions: false
    })
  })

  it('should handle date range selection', () => {
    // Arrange
    const mockOnChange = jest.fn()

    // Act
    render(<SearchFilters filters={defaultFilters} onFiltersChange={mockOnChange} />)
    // 日付選択のシミュレーション（実装詳細による）

    // Assert
    // 日付範囲が正しく設定されることを検証
  })
})
```

---

## 🔗 統合テスト

### API統合テスト

#### 統一検索APIテスト
```typescript
// src/server/routes/search.integration.test.ts
import request from 'supertest'
import { app } from '../app'
import { testDatabase } from '../test-utils/database'

describe('Unified Search API Integration', () => {
  beforeAll(async () => {
    await testDatabase.setup()
    await testDatabase.seedTestData()
  })

  afterAll(async () => {
    await testDatabase.cleanup()
  })

  describe('POST /api/search/unified', () => {
    it('should return search results for valid query', async () => {
      // Act
      const response = await request(app)
        .post('/api/search/unified')
        .send({
          query: 'React TypeScript',
          filters: {
            includeSessionTitles: true,
            includeMessageContent: true,
            includeTags: true
          }
        })
        .expect(200)

      // Assert
      expect(response.body.success).toBe(true)
      expect(response.body.data.query).toBe('React TypeScript')
      expect(response.body.data.total).toEqual(
        expect.objectContaining({
          sessions: expect.any(Number),
          messages: expect.any(Number),
          tags: expect.any(Number)
        })
      )
      expect(response.body.data.results).toEqual(
        expect.objectContaining({
          sessions: expect.any(Array),
          messages: expect.any(Array),
          tags: expect.any(Array)
        })
      )
      expect(response.body.data.performance.searchTime).toBeGreaterThan(0)
    })

    it('should validate query parameter', async () => {
      // Act
      const response = await request(app)
        .post('/api/search/unified')
        .send({ query: '' })
        .expect(400)

      // Assert
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('クエリパラメータが必要')
    })

    it('should handle invalid filters gracefully', async () => {
      // Act
      const response = await request(app)
        .post('/api/search/unified')
        .send({
          query: 'test',
          filters: { invalidFilter: true }
        })
        .expect(200)

      // Assert
      expect(response.body.success).toBe(true)
      // 無効なフィルターは無視され、検索は正常実行される
    })

    it('should respect filter settings', async () => {
      // Act - セッションのみ検索
      const response = await request(app)
        .post('/api/search/unified')
        .send({
          query: 'React',
          filters: {
            includeSessionTitles: true,
            includeMessageContent: false,
            includeTags: false
          }
        })
        .expect(200)

      // Assert
      expect(response.body.data.results.sessions).toBeDefined()
      expect(response.body.data.total.messages).toBe(0)
      expect(response.body.data.total.tags).toBe(0)
    })
  })

  describe('GET /api/search/suggestions', () => {
    it('should return search suggestions', async () => {
      // Act
      const response = await request(app)
        .get('/api/search/suggestions?q=Rea')
        .expect(200)

      // Assert
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(
        expect.objectContaining({
          recent: expect.any(Array),
          popular: expect.any(Array)
        })
      )
    })

    it('should handle empty query', async () => {
      // Act
      const response = await request(app)
        .get('/api/search/suggestions')
        .expect(200)

      // Assert
      expect(response.body.success).toBe(true)
      expect(response.body.data.recent).toEqual([])
      expect(response.body.data.popular).toEqual([])
    })
  })
})
```

### データベース統合テスト

#### SQLite検索機能テスト
```typescript
// src/services/SqliteIndexService.integration.test.ts
describe('SqliteIndexService Integration', () => {
  let service: SqliteIndexService
  let testDb: Database

  beforeAll(async () => {
    testDb = await setupTestDatabase()
    service = new SqliteIndexService(testDb)
    await seedTestData(testDb)
  })

  afterAll(async () => {
    await testDb.close()
  })

  describe('searchSessions', () => {
    it('should find sessions by title', async () => {
      // Act
      const results = await service.searchSessions('React Tutorial')

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].title).toContain('React Tutorial')
    })

    it('should find sessions by content', async () => {
      // Act
      const results = await service.searchSessions('TypeScript error')

      // Assert
      expect(results.length).toBeGreaterThan(0)
      results.forEach(result => {
        expect(result.preview || result.title).toMatch(/TypeScript|error/i)
      })
    })

    it('should respect date range filter', async () => {
      // Arrange
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31')
      }

      // Act
      const results = await service.searchSessions('React', { dateRange })

      // Assert
      results.forEach(result => {
        const createdAt = new Date(result.createdAt)
        expect(createdAt).toBeGreaterThanOrEqual(dateRange.start)
        expect(createdAt).toBeLessThanOrEqual(dateRange.end)
      })
    })
  })

  describe('searchMessages', () => {
    it('should find messages by content', async () => {
      // Act
      const results = await service.searchMessages('error handling')

      // Assert
      expect(results.length).toBeGreaterThan(0)
      results.forEach(result => {
        expect(result.content.toLowerCase()).toMatch(/error|handling/)
      })
    })

    it('should return message context', async () => {
      // Act
      const results = await service.searchMessages('React', { includeContext: true })

      // Assert
      results.forEach(result => {
        expect(result.context).toBeDefined()
        expect(result.context.before).toBeDefined()
        expect(result.context.after).toBeDefined()
      })
    })
  })
})
```

---

## 🖥️ E2Eテスト

### ユーザーフローテスト

#### 基本検索フローテスト
```typescript
// tests/e2e/unified-search.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Unified Search E2E', () => {
  test.beforeEach(async ({ page }) => {
    // テストデータ準備
    await page.goto('/test-setup')
    await page.click('[data-testid="setup-test-data"]')
    await page.waitForSelector('[data-testid="setup-complete"]')
  })

  test('should perform complete search flow', async ({ page }) => {
    // 1. 検索ページに移動
    await page.goto('/search')
    await expect(page).toHaveTitle(/検索 - ChatFlow/)

    // 2. 検索入力
    const searchInput = page.locator('[data-testid="search-input"]')
    await searchInput.fill('React TypeScript')
    
    // 3. リアルタイム検索の動作確認
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })
    
    // 4. 結果表示確認
    const results = page.locator('[data-testid="result-item"]')
    await expect(results).toHaveCountGreaterThan(0)
    
    // 5. セッション結果をクリック
    const firstSessionResult = page.locator('[data-testid="session-result"]').first()
    await firstSessionResult.click()
    
    // 6. セッション詳細ページに遷移確認
    await expect(page).toHaveURL(/\/sessions\/.*/)
    await expect(page.locator('[data-testid="session-title"]')).toBeVisible()
  })

  test('should show search suggestions', async ({ page }) => {
    // 1. 検索ページに移動
    await page.goto('/search')
    
    // 2. 検索入力フォーカス
    const searchInput = page.locator('[data-testid="search-input"]')
    await searchInput.focus()
    
    // 3. 候補表示確認
    await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible()
    
    // 4. 部分的な入力での候補更新
    await searchInput.type('Rea')
    await page.waitForTimeout(500) // デバウンス待機
    
    const suggestions = page.locator('[data-testid="suggestion-item"]')
    await expect(suggestions).toHaveCountGreaterThan(0)
    
    // 5. 候補をクリックして検索実行
    await suggestions.first().click()
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
  })

  test('should filter search results', async ({ page }) => {
    // 1. 検索実行
    await page.goto('/search')
    await page.fill('[data-testid="search-input"]', 'React')
    await page.waitForSelector('[data-testid="search-results"]')
    
    // 2. 初期結果の確認
    const allResultsCount = await page.locator('[data-testid="result-item"]').count()
    expect(allResultsCount).toBeGreaterThan(0)
    
    // 3. セッションフィルターのみ有効化
    await page.click('[data-testid="filter-sessions"]')
    await page.click('[data-testid="filter-messages"]') // 無効化
    
    // 4. フィルター適用後の結果確認
    await page.waitForTimeout(1000) // フィルター適用待機
    const sessionResults = page.locator('[data-testid="session-result"]')
    const messageResults = page.locator('[data-testid="message-result"]')
    
    await expect(sessionResults).toHaveCountGreaterThan(0)
    await expect(messageResults).toHaveCount(0)
  })

  test('should handle empty search results', async ({ page }) => {
    // 1. 存在しないキーワードで検索
    await page.goto('/search')
    await page.fill('[data-testid="search-input"]', 'xyznonexistentkeyword123')
    await page.waitForTimeout(1000)
    
    // 2. 空状態メッセージの確認
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible()
    await expect(page.locator('[data-testid="empty-state-message"]'))
      .toContainText('検索結果が見つかりません')
    
    // 3. 検索クリア提案の確認
    await expect(page.locator('[data-testid="clear-search-button"]')).toBeVisible()
  })

  test('should navigate between result types', async ({ page }) => {
    // 1. 検索実行
    await page.goto('/search')
    await page.fill('[data-testid="search-input"]', 'React')
    await page.waitForSelector('[data-testid="search-results"]')
    
    // 2. 結果タブの確認
    const allTab = page.locator('[data-testid="tab-all"]')
    const sessionsTab = page.locator('[data-testid="tab-sessions"]')
    const messagesTab = page.locator('[data-testid="tab-messages"]')
    
    await expect(allTab).toBeVisible()
    await expect(sessionsTab).toBeVisible()
    await expect(messagesTab).toBeVisible()
    
    // 3. セッションタブクリック
    await sessionsTab.click()
    await expect(page.locator('[data-testid="session-result"]')).toBeVisible()
    await expect(page.locator('[data-testid="message-result"]')).not.toBeVisible()
    
    // 4. メッセージタブクリック
    await messagesTab.click()
    await expect(page.locator('[data-testid="message-result"]')).toBeVisible()
    await expect(page.locator('[data-testid="session-result"]')).not.toBeVisible()
  })
})
```

### アクセシビリティテスト
```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Search Accessibility', () => {
  test('should be accessible', async ({ page }) => {
    // 検索ページに移動
    await page.goto('/search')
    
    // axe-coreでアクセシビリティチェック
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/search')
    
    // Tab キーでナビゲーション
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused()
    
    // 検索候補でのキーボードナビゲーション
    await page.fill('[data-testid="search-input"]', 'Re')
    await page.waitForSelector('[data-testid="search-suggestions"]')
    
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('[data-testid="suggestion-item"]:first-child')).toBeFocused()
    
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
  })
})
```

---

## ⚡ パフォーマンステスト

### 検索速度テスト
```typescript
// tests/performance/search-performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Search Performance', () => {
  test('should meet search speed requirements', async ({ page }) => {
    await page.goto('/search')
    
    // 検索実行時間測定
    const startTime = Date.now()
    
    await page.fill('[data-testid="search-input"]', 'React TypeScript Component')
    await page.waitForSelector('[data-testid="search-results"]')
    
    const endTime = Date.now()
    const searchTime = endTime - startTime
    
    // 300ms以下の要件確認
    expect(searchTime).toBeLessThan(300)
  })

  test('should handle large result sets efficiently', async ({ page }) => {
    await page.goto('/search')
    
    // 大量結果を返すクエリ
    await page.fill('[data-testid="search-input"]', 'a') // 一般的な文字
    
    const startTime = Date.now()
    await page.waitForSelector('[data-testid="search-results"]')
    const endTime = Date.now()
    
    // レンダリング時間の確認
    expect(endTime - startTime).toBeLessThan(500)
    
    // 仮想スクロールの動作確認
    const resultItems = page.locator('[data-testid="result-item"]')
    const visibleCount = await resultItems.count()
    
    // 全結果をレンダリングせず、表示領域のみレンダリングしていることを確認
    expect(visibleCount).toBeLessThanOrEqual(20)
  })

  test('should cache search results effectively', async ({ page }) => {
    await page.goto('/search')
    
    // 初回検索
    const firstSearchStart = Date.now()
    await page.fill('[data-testid="search-input"]', 'React')
    await page.waitForSelector('[data-testid="search-results"]')
    const firstSearchTime = Date.now() - firstSearchStart
    
    // 検索クリア
    await page.fill('[data-testid="search-input"]', '')
    await page.waitForTimeout(500)
    
    // 同じクエリで再検索（キャッシュ使用）
    const secondSearchStart = Date.now()
    await page.fill('[data-testid="search-input"]', 'React')
    await page.waitForSelector('[data-testid="search-results"]')
    const secondSearchTime = Date.now() - secondSearchStart
    
    // キャッシュにより2回目の方が高速であることを確認
    expect(secondSearchTime).toBeLessThan(firstSearchTime * 0.5)
  })
})
```

### API パフォーマンステスト
```typescript
// tests/performance/api-performance.test.ts
import { performance } from 'perf_hooks'
import { apiClient } from '../src/api/client'

describe('API Performance Tests', () => {
  test('should respond within SLA for unified search', async () => {
    const queries = [
      'React',
      'TypeScript error',
      'JavaScript function',
      'Python tutorial',
      'data analysis'
    ]
    
    for (const query of queries) {
      const startTime = performance.now()
      
      const response = await apiClient.searchUnified(query, {
        includeSessionTitles: true,
        includeMessageContent: true,
        includeTags: true
      })
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      // 200ms以下のSLA確認
      expect(responseTime).toBeLessThan(200)
      expect(response.data.performance.searchTime).toBeLessThan(150)
    }
  })

  test('should handle concurrent searches efficiently', async () => {
    const concurrentQueries = Array(10).fill('React').map((q, i) => `${q} ${i}`)
    
    const startTime = performance.now()
    
    const promises = concurrentQueries.map(query => 
      apiClient.searchUnified(query, {})
    )
    
    const results = await Promise.all(promises)
    
    const endTime = performance.now()
    const totalTime = endTime - startTime
    
    // 並行処理により効率的に処理されることを確認
    expect(totalTime).toBeLessThan(1000) // 1秒以内
    expect(results).toHaveLength(10)
    results.forEach(result => {
      expect(result.data.performance.searchTime).toBeLessThan(200)
    })
  })
})
```

---

## 📊 テスト実行・監視

### テスト実行コマンド
```bash
# 全テスト実行
npm run test

# ユニットテストのみ
npm run test:unit

# 統合テストのみ
npm run test:integration

# E2Eテストのみ
npm run test:e2e

# パフォーマンステストのみ
npm run test:performance

# カバレッジ付きテスト
npm run test:coverage

# ウォッチモード
npm run test:watch
```

### テスト設定ファイル
```json
// jest.config.js
{
  "projects": [
    {
      "displayName": "unit",
      "testMatch": ["<rootDir>/src/**/*.test.ts", "<rootDir>/web/src/**/*.test.tsx"],
      "setupFilesAfterEnv": ["<rootDir>/src/test-utils/setup.ts"]
    },
    {
      "displayName": "integration", 
      "testMatch": ["<rootDir>/src/**/*.integration.test.ts"],
      "setupFilesAfterEnv": ["<rootDir>/src/test-utils/integration-setup.ts"]
    }
  ],
  "coverageThreshold": {
    "global": {
      "branches": 85,
      "functions": 85,
      "lines": 85,
      "statements": 85
    }
  }
}
```

### CI/CD統合
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx playwright install
      - run: npm run test:e2e
      
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:performance
```

### 継続的監視
```typescript
// src/monitoring/search-metrics.ts
export class SearchMetrics {
  private static instance: SearchMetrics
  
  async recordSearchPerformance(query: string, duration: number, resultCount: number) {
    // メトリクス記録
    await this.sendMetric({
      metric: 'search.duration',
      value: duration,
      tags: { query_length: query.length.toString() }
    })
    
    await this.sendMetric({
      metric: 'search.result_count',
      value: resultCount,
      tags: { query }
    })
    
    // SLA違反の検出
    if (duration > 300) {
      console.warn(`Search SLA violation: ${duration}ms for query "${query}"`)
    }
  }
  
  async generateDailyReport() {
    const metrics = await this.getMetrics({
      timeRange: '24h',
      metrics: ['search.duration', 'search.result_count', 'search.error_rate']
    })
    
    return {
      averageSearchTime: metrics.search.duration.avg,
      p95SearchTime: metrics.search.duration.p95,
      totalSearches: metrics.search.duration.count,
      errorRate: metrics.search.error_rate.avg,
      slaCompliance: (metrics.search.duration.count - metrics.search.sla_violations) / metrics.search.duration.count
    }
  }
}
```

---

## 📈 品質ゲート

### 品質基準
```typescript
interface QualityGates {
  unitTests: {
    coverage: "85%以上"
    passRate: "100%"
  }
  integrationTests: {
    apiEndpoints: "100%通過"
    databaseOperations: "100%通過"
  }
  e2eTests: {
    criticalUserFlows: "100%通過"
    accessibilityViolations: "0件"
  }
  performance: {
    searchResponseTime: "< 200ms"
    uiResponseTime: "< 300ms"
    errorRate: "< 1%"
  }
}
```

### リリース承認基準
```bash
# リリース前チェックリスト
✅ 全ユニットテスト通過
✅ 全統合テスト通過  
✅ 全E2Eテスト通過
✅ パフォーマンステスト通過
✅ アクセシビリティテスト通過
✅ セキュリティスキャン通過
✅ コードカバレッジ85%以上
✅ 手動QAテスト完了
```

---

**作成日**: 2025年6月04日  
**テスト期間**: 実装完了後1週間  
**品質責任者**: 開発チーム 