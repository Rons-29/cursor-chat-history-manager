# 🏗️ ChatFlow検索機能 - 詳細設計仕様書

## 📋 設計概要
- **作成日**: 2025年6月4日
- **基準**: GitHub Code Search・Notion・Discord・VS Code検索機能分析
- **実装期間**: Phase 1-3（4-6週間）
- **アーキテクチャ**: 段階的統合・後方互換性維持

## 🎯 設計目標

### **業界最高水準の検索体験実現**
1. **GitHub Code Search**レベルの高度演算子システム
2. **Discord**風リアルタイム検索とグルーピング
3. **VS Code**風開発者向けUX（Cmd+K、サイドバー検索）
4. **Notion**風ビジュアル検索ビルダー

## 🏗️ 全体アーキテクチャ設計

### **3層構造アーキテクチャ**
```typescript
interface ChatFlowSearchArchitecture {
  Presentation層: {
    統合検索バー: 'UnifiedSearchBar（Command Palette）'
    高度検索モーダル: 'AdvancedSearchModal（Visual Builder）'  
    検索結果表示: 'SearchResults（Discord風グルーピング）'
    フィルタサイドバー: 'SearchFiltersSidebar（VS Code風）'
  }

  Business層: {
    検索エンジン: 'ChatFlowSearchEngine（演算子パーサー）'
    演算子プロセッサ: 'SearchOperatorProcessor（GitHub風）'
    結果ランキング: 'SearchRankingEngine（スコアリング）'
    キャッシュ管理: 'SearchCacheManager（高速化）'
  }

  Data層: {
    SQLite_FTS5: '全文検索エンジン（メイン）'
    メタデータDB: '構造化データ検索'
    インデックス: '複合インデックス最適化'
    キャッシュストア: 'メモリ＋永続化'
  }
}
```

## 🔍 検索演算子システム設計

### **GitHub風高度検索演算子**
```typescript
interface ChatFlowSearchOperators {
  // 基本演算子（GitHub準拠）
  基本検索: {
    exact_phrase: '"特定のフレーズ"'           // 完全一致
    boolean_and: 'React AND TypeScript'       // AND演算  
    boolean_or: 'React OR Vue'                // OR演算
    boolean_not: 'React NOT Redux'            // 除外
    wildcard: 'React* | *Script'              // ワイルドカード
    regex: '/^function\s+\w+/'                // 正規表現
  }

  // ChatFlow専用修飾子  
  コンテンツ修飾子: {
    source: 'source:cursor-chat | source:claude-dev | source:manual'
    role: 'role:user | role:assistant | role:system'
    content_type: 'type:question | type:explanation | type:code | type:error'
    has_content: 'has:code | has:image | has:file | has:link'
    language: 'lang:typescript | lang:python | lang:javascript'
  }

  // 時間・数値修飾子
  時間範囲: {
    absolute_date: 'after:2024-01-01 before:2024-12-31'
    relative_date: 'since:yesterday | since:last-week | since:last-month'
    created: 'created:>2024-01-01'
    updated: 'updated:last-week'
  }

  数値範囲: {
    message_count: 'messages:>10 | messages:5..20'
    session_length: 'length:short | length:medium | length:long'
    token_count: 'tokens:>1000'
    words: 'words:100..500'
  }

  // メタデータ修飾子
  メタデータ: {
    tag: 'tag:react | tag:debugging'
    project: 'project:chatflow | project:personal'
    importance: 'importance:high | importance:low'
    ai_model: 'model:gpt-4 | model:claude-3 | model:gemini'
  }

  // 高度機能
  高度機能: {
    similarity: 'similar:session-id'           // 類似セッション
    references: 'references:session-id'       // 参照関係
    thread: 'thread:conversation-id'          // スレッド検索
    export_ready: 'is:exportable'             // エクスポート可能
  }
}
```

### **演算子パーサー設計**
```typescript
/**
 * GitHub風検索演算子パーサー
 */
export class SearchOperatorParser {
  private readonly operators = new Map<string, OperatorHandler>()

  constructor() {
    this.registerOperators()
  }

  /**
   * 検索クエリを解析してSQLクエリに変換
   */
  async parseQuery(query: string): Promise<ParsedSearchQuery> {
    const tokens = this.tokenizeQuery(query)
    const parsedTerms = await this.parseTokens(tokens)
    
    return {
      fullTextTerms: parsedTerms.filter(t => t.type === 'text'),
      operators: parsedTerms.filter(t => t.type === 'operator'),
      sqlQuery: this.buildSQLQuery(parsedTerms),
      cacheKey: this.generateCacheKey(parsedTerms)
    }
  }

  /**
   * 正規表現サポート
   */
  private parseRegexOperator(pattern: string): RegexQuery {
    const regexMatch = pattern.match(/^\/(.+)\/([gimuy]*)$/)
    if (!regexMatch) {
      throw new SearchSyntaxError('Invalid regex pattern')
    }

    return {
      pattern: regexMatch[1],
      flags: regexMatch[2] || '',
      compiled: new RegExp(regexMatch[1], regexMatch[2])
    }
  }

  /**
   * 日付範囲処理
   */
  private parseDateRange(dateStr: string): DateRange {
    const relativeDates = {
      'yesterday': () => moment().subtract(1, 'day'),
      'last-week': () => moment().subtract(1, 'week'),
      'last-month': () => moment().subtract(1, 'month')
    }

    if (relativeDates[dateStr]) {
      return relativeDates[dateStr]().toISOString()
    }

    return moment(dateStr).toISOString()
  }
}
```

## 🎨 UI/UXコンポーネント設計

### **1. 統合検索バー（Command Palette風）**
```typescript
/**
 * GitHub/VS Code風統合検索バー
 */
interface UnifiedSearchBarProps {
  placeholder: string
  shortcut: 'Cmd+K' | 'Ctrl+K'
  suggestions: SearchSuggestion[]
  recentSearches: RecentSearch[]
  savedSearches: SavedSearch[]
}

export const UnifiedSearchBar: React.FC<UnifiedSearchBarProps> = ({
  placeholder,
  shortcut,
  suggestions,
  recentSearches,
  savedSearches
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Cmd+K/Ctrl+Kショートカット
  useKeyboardShortcut([['Meta', 'k'], ['Control', 'k']], () => {
    setIsOpen(true)
  })

  return (
    <Command.Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Command.Input
        placeholder={`${placeholder} (${shortcut})`}
        value={query}
        onValueChange={setQuery}
      />
      
      <Command.List>
        {/* リアルタイム検索候補 */}
        <Command.Group heading="候補">
          {suggestions.map(suggestion => (
            <SearchSuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              onSelect={() => executeSearch(suggestion.query)}
            />
          ))}
        </Command.Group>

        {/* 演算子サジェスト */}
        <Command.Group heading="検索演算子">
          {getOperatorSuggestions(query).map(operator => (
            <OperatorSuggestionItem
              key={operator.name}
              operator={operator}
              onSelect={() => insertOperator(operator)}
            />
          ))}
        </Command.Group>

        {/* 保存済み検索 */}
        <Command.Group heading="保存済み検索">
          {savedSearches.map(saved => (
            <SavedSearchItem
              key={saved.id}
              search={saved}
              onSelect={() => executeSearch(saved.query)}
            />
          ))}
        </Command.Group>

        {/* 検索履歴 */}
        <Command.Group heading="最近の検索">
          {recentSearches.map(recent => (
            <RecentSearchItem
              key={recent.id}
              search={recent}
              onSelect={() => executeSearch(recent.query)}
            />
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
```

### **2. 高度検索モーダル（Notion風ビジュアルビルダー）**
```typescript
/**
 * Notion風ビジュアル検索ビルダー
 */
interface AdvancedSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onExecuteSearch: (query: AdvancedSearchQuery) => void
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  onClose,
  onExecuteSearch
}) => {
  const [queryBuilder, setQueryBuilder] = useState<QueryBuilder>({
    textTerms: [],
    filters: [],
    operators: [],
    dateRange: null,
    sorting: 'relevance'
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>高度検索</DialogTitle>
          <DialogDescription>
            詳細な条件を指定してセッションを検索できます
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          {/* 左側: 検索条件入力 */}
          <div className="col-span-2 space-y-6">
            {/* テキスト検索 */}
            <SearchTextSection
              value={queryBuilder.textTerms}
              onChange={(terms) => updateQueryBuilder('textTerms', terms)}
            />

            {/* コンテンツフィルター */}
            <ContentFiltersSection
              value={queryBuilder.filters}
              onChange={(filters) => updateQueryBuilder('filters', filters)}
            />

            {/* 日付範囲 */}
            <DateRangeSection
              value={queryBuilder.dateRange}
              onChange={(range) => updateQueryBuilder('dateRange', range)}
            />

            {/* 高度オプション */}
            <AdvancedOptionsSection
              value={queryBuilder.operators}
              onChange={(operators) => updateQueryBuilder('operators', operators)}
            />
          </div>

          {/* 右側: プレビューとテンプレート */}
          <div className="space-y-6">
            {/* クエリプレビュー */}
            <QueryPreviewSection
              queryBuilder={queryBuilder}
              generatedQuery={generateQueryString(queryBuilder)}
            />

            {/* 検索テンプレート */}
            <SearchTemplatesSection
              onSelectTemplate={(template) => setQueryBuilder(template)}
            />

            {/* 保存・実行ボタン */}
            <div className="space-y-2">
              <Button
                onClick={() => onExecuteSearch(queryBuilder)}
                className="w-full"
              >
                検索実行
              </Button>
              <Button
                variant="outline"
                onClick={() => saveCurrentSearch(queryBuilder)}
                className="w-full"
              >
                この検索を保存
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### **3. 検索結果表示（Discord風グルーピング）**
```typescript
/**
 * Discord風グループ化検索結果
 */
interface SearchResultsProps {
  results: SearchResult[]
  query: string
  totalCount: number
  isLoading: boolean
  groupBy: 'session' | 'date' | 'source' | 'relevance'
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  totalCount,
  isLoading,
  groupBy
}) => {
  const groupedResults = useMemo(() => {
    return groupSearchResults(results, groupBy)
  }, [results, groupBy])

  if (isLoading) {
    return <SearchResultsSkeleton />
  }

  return (
    <div className="search-results">
      {/* 検索結果ヘッダー */}
      <SearchResultsHeader
        totalCount={totalCount}
        query={query}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />

      {/* グループ化された結果 */}
      <div className="space-y-6">
        {groupedResults.map(group => (
          <SearchResultGroup
            key={group.id}
            group={group}
            query={query}
          />
        ))}
      </div>

      {/* 無限スクロール */}
      <InfiniteScrollTrigger
        onLoadMore={loadMoreResults}
        hasMore={hasMoreResults}
      />
    </div>
  )
}

/**
 * 検索結果グループ（Discord風）
 */
const SearchResultGroup: React.FC<{
  group: SearchResultGroup
  query: string
}> = ({ group, query }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="search-result-group">
      {/* グループヘッダー */}
      <div 
        className="group-header cursor-pointer flex items-center justify-between p-3 bg-gray-50 rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <ChevronIcon 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
          />
          <span className="font-medium">{group.title}</span>
          <Badge variant="secondary">{group.results.length}件</Badge>
        </div>
        <span className="text-sm text-gray-500">{group.subtitle}</span>
      </div>

      {/* グループ内容 */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="space-y-2 p-3 border-x border-b rounded-b-lg">
            {group.results.map(result => (
              <SearchResultCard
                key={result.id}
                result={result}
                query={query}
                highlightMatches={true}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
```

## ⚡ パフォーマンス最適化設計

### **多層キャッシュ戦略**
```typescript
/**
 * 検索パフォーマンス最適化
 */
export class SearchPerformanceOptimizer {
  private memoryCache = new LRUCache<string, SearchResult[]>({ max: 1000 })
  private persistentCache = new SQLiteCache('search_cache.db')
  private searchIndex = new BloomFilter(10000, 4) // 高速存在チェック

  /**
   * 段階的検索結果ロード
   */
  async searchWithPagination(
    query: ParsedSearchQuery,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedSearchResults> {
    const cacheKey = this.generateCacheKey(query, page, pageSize)
    
    // L1: メモリキャッシュ
    const cached = this.memoryCache.get(cacheKey)
    if (cached) {
      return { results: cached, cached: true, source: 'memory' }
    }

    // L2: 永続キャッシュ  
    const persistentCached = await this.persistentCache.get(cacheKey)
    if (persistentCached && !this.isCacheExpired(persistentCached)) {
      this.memoryCache.set(cacheKey, persistentCached.results)
      return { results: persistentCached.results, cached: true, source: 'persistent' }
    }

    // L3: データベース検索
    const results = await this.executeSearch(query, page, pageSize)
    
    // キャッシュ更新
    this.memoryCache.set(cacheKey, results)
    await this.persistentCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5分
    })

    return { results, cached: false, source: 'database' }
  }

  /**
   * リアルタイム検索サジェスト
   */
  async getSearchSuggestions(
    partialQuery: string,
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    // Trie構造での高速prefix検索
    const suggestions = await this.searchTrieIndex.search(partialQuery, limit)
    
    // 検索履歴からの候補
    const historySuggestions = await this.getHistorySuggestions(partialQuery, 5)
    
    // 人気検索からの候補
    const popularSuggestions = await this.getPopularSuggestions(partialQuery, 5)

    return this.mergeSuggestions([
      ...suggestions,
      ...historySuggestions,
      ...popularSuggestions
    ]).slice(0, limit)
  }

  /**
   * インクリメンタル検索
   */
  async incrementalSearch(
    query: string,
    options: { debounce?: number; minChars?: number } = {}
  ): Promise<Observable<SearchResult[]>> {
    const { debounce = 300, minChars = 2 } = options

    return new Observable(subscriber => {
      const debouncedSearch = debounce(async (q: string) => {
        if (q.length < minChars) {
          subscriber.next([])
          return
        }

        try {
          const results = await this.searchWithPagination(
            await this.parser.parseQuery(q),
            1,
            10 // 初期表示は少なめ
          )
          subscriber.next(results.results)
        } catch (error) {
          subscriber.error(error)
        }
      }, debounce)

      debouncedSearch(query)
    })
  }
}
```

### **SQLite最適化**
```typescript
/**
 * SQLite検索最適化
 */
export class OptimizedSQLiteSearchEngine {
  private db: Database
  private preparedStatements = new Map<string, Statement>()

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.initializeOptimizations()
  }

  /**
   * SQLite最適化設定
   */
  private initializeOptimizations(): void {
    // WALモード（Write-Ahead Logging）
    this.db.exec('PRAGMA journal_mode = WAL')
    
    // メモリ設定最適化
    this.db.exec('PRAGMA cache_size = -64000') // 64MB
    this.db.exec('PRAGMA temp_store = MEMORY')
    
    // 同期設定（パフォーマンス優先）
    this.db.exec('PRAGMA synchronous = NORMAL')
    
    // 分析の自動化
    this.db.exec('PRAGMA analysis_limit = 1000')
    this.db.exec('PRAGMA optimize')
  }

  /**
   * 複合インデックス作成
   */
  private createOptimizedIndexes(): void {
    const indexes = [
      // 全文検索インデックス
      'CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(title, content, tokenize="porter unicode61")',
      
      // 複合インデックス
      'CREATE INDEX IF NOT EXISTS idx_sessions_composite ON sessions(source, created_at, message_count)',
      'CREATE INDEX IF NOT EXISTS idx_messages_composite ON messages(session_id, role, timestamp)',
      
      // 部分インデックス（条件付き）  
      'CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(id) WHERE archived = 0',
      'CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(session_id) WHERE role = "user"'
    ]

    indexes.forEach(sql => this.db.exec(sql))
  }

  /**
   * プリペアドステートメント活用
   */
  async executeOptimizedSearch(
    query: ParsedSearchQuery,
    pagination: PaginationOptions
  ): Promise<SearchResult[]> {
    const statementKey = this.generateStatementKey(query)
    
    let statement = this.preparedStatements.get(statementKey)
    if (!statement) {
      const sql = this.buildOptimizedSQL(query)
      statement = this.db.prepare(sql)
      this.preparedStatements.set(statementKey, statement)
    }

    const params = this.buildParameters(query, pagination)
    return statement.all(params) as SearchResult[]
  }

  /**
   * バッチ処理最適化
   */
  async batchUpdateSearchIndex(
    updates: IndexUpdateOperation[]
  ): Promise<void> {
    const transaction = this.db.transaction((updates: IndexUpdateOperation[]) => {
      const insertStmt = this.db.prepare(`
        INSERT OR REPLACE INTO search_index 
        (session_id, title, content, metadata, last_updated)
        VALUES (?, ?, ?, ?, ?)
      `)

      for (const update of updates) {
        insertStmt.run(
          update.sessionId,
          update.title,
          update.content,
          JSON.stringify(update.metadata),
          Date.now()
        )
      }
    })

    transaction(updates)
  }
}
```

## 🔧 実装フェーズ計画

### **Phase 1: 基盤構築（2週間）**
```typescript
interface Phase1Implementation {
  週1: {
    検索演算子パーサー: 'SearchOperatorParser完成'
    基本UI刷新: 'UnifiedSearchBar実装'
    SQLite最適化: 'インデックス作成・クエリ最適化'
  }
  
  週2: {
    高度フィルタリング: 'AdvancedSearchModal実装'
    キャッシュシステム: 'SearchCacheManager実装'
    パフォーマンステスト: 'ベンチマーク・最適化'
  }
}
```

### **Phase 2: 機能拡張（2週間）**
```typescript
interface Phase2Implementation {
  週3: {
    検索結果UI: 'Discord風グルーピング実装'
    リアルタイム検索: 'インクリメンタル検索・サジェスト'
    検索履歴: '履歴管理・保存機能'
  }
  
  週4: {
    モバイル対応: 'レスポンシブ検索UI'
    アクセシビリティ: 'キーボード操作・スクリーンリーダー対応'
    統合テスト: '全機能結合テスト'
  }
}
```

### **Phase 3: 高度機能（2週間）**
```typescript
interface Phase3Implementation {
  週5: {
    AI検索候補: 'セマンティック検索・インテリジェント候補'
    エクスポート機能: '検索結果のCSV・JSON出力'
    検索分析: '検索パターン分析・改善提案'
  }
  
  週6: {
    最終最適化: 'パフォーマンス調整・バグ修正'
    ドキュメント: 'ユーザーガイド・開発者ドキュメント'
    本番デプロイ: '段階的ロールアウト'
  }
}
```

## 📊 品質保証・テスト戦略

### **テスト分類**
```typescript
interface TestingStrategy {
  ユニットテスト: {
    SearchOperatorParser: '演算子解析精度テスト'
    SearchEngine: '検索ロジック正確性テスト'
    CacheManager: 'キャッシュ一貫性テスト'
  }

  統合テスト: {
    検索フロー: 'UI→API→DB全体フローテスト'
    パフォーマンス: '大量データでの応答時間テスト'
    並行処理: '同時検索リクエスト処理テスト'
  }

  E2Eテスト: {
    ユーザーシナリオ: '実際の使用パターンテスト'
    ブラウザ互換性: 'Chrome・Safari・Firefox対応確認'
    アクセシビリティ: 'WCAG 2.1準拠テスト'
  }
}
```

## 🎊 期待される成果・KPI

### **定量的改善目標**
```typescript
interface PerformanceTargets {
  検索速度: {
    現在: '2.3秒（平均）'
    目標: '0.8秒以下'
    改善率: '65%向上'
  }

  検索精度: {
    現在: '60%（推定）'
    目標: '85%以上'
    改善率: '42%向上'
  }

  ユーザー体験: {
    学習コスト: '60%削減（直感的UI）'
    高度検索利用率: '5% → 40%（8倍向上）'
    検索頻度: '週3回 → 週8回（167%向上）'
  }
}
```

### **定性的価値向上**
```typescript
interface QualitativeValue {
  開発者体験: {
    効率性: 'GitHub Code Search級の高度検索'
    発見性: 'Discord風グルーピングで関連情報発見'
    学習性: 'VS Code風UIで操作習得容易'
    生産性: '検索時間短縮でコーディング時間増加'
  }

  システム価値: {
    スケーラビリティ: '大規模データ対応可能'
    拡張性: '新機能追加容易なアーキテクチャ'
    保守性: 'モジュール化による保守性向上'
    セキュリティ: '入力検証・レート制限完備'
  }
}
```

## 🔒 セキュリティ・プライバシー実装

### **セキュリティ対策**
```typescript
export class SearchSecurityManager {
  /**
   * 入力サニタイゼーション
   */
  sanitizeSearchQuery(query: string): string {
    // SQLインジェクション防止
    const sanitized = query
      .replace(/['";\\]/g, '') // 危険文字除去
      .replace(/--.*$/gm, '')   // SQLコメント除去
      .trim()

    // 長さ制限
    if (sanitized.length > 1000) {
      throw new Error('検索クエリが長すぎます')
    }

    return sanitized
  }

  /**
   * レート制限
   */
  async checkRateLimit(
    userId: string,
    action: 'search' | 'suggestion'
  ): Promise<boolean> {
    const limits = {
      search: { requests: 100, window: 60 * 1000 },      // 1分100回
      suggestion: { requests: 1000, window: 60 * 1000 }   // 1分1000回
    }

    const key = `ratelimit:${action}:${userId}`
    const current = await this.redis.incr(key)
    
    if (current === 1) {
      await this.redis.expire(key, limits[action].window / 1000)
    }

    return current <= limits[action].requests
  }

  /**
   * 検索ログ（プライバシー保護）
   */
  async logSearch(
    query: string,
    userId: string,
    results: number
  ): Promise<void> {
    // 個人情報除去
    const anonymizedQuery = this.anonymizeQuery(query)
    
    await this.db.run(`
      INSERT INTO search_logs 
      (query_hash, user_hash, result_count, timestamp)
      VALUES (?, ?, ?, ?)
    `, [
      this.hashQuery(anonymizedQuery),
      this.hashUserId(userId),
      results,
      Date.now()
    ])
  }
}
```

## 🎯 まとめ：次世代ChatFlow検索の実現

この詳細設計により、**GitHub・Notion・Discord・VS Code**の優れた検索体験を統合した**業界最高水準のAI開発者向け検索システム**を実現します。

### **コア価値**
1. **開発者ファースト**: VS Code風のキーボード中心操作
2. **高度な検索能力**: GitHub Code Search級の演算子システム  
3. **直感的発見**: Discord風グルーピングとNotion風ビルダー
4. **超高速体験**: 最適化されたSQLite + 多層キャッシュ

### **次のアクション**
✅ **詳細設計完了** → 実装タスクリスト作成へ

---

**📅 設計完了日**: 2025年6月4日  
**🚀 実装開始予定**: Phase 1（2週間以内）  
**📋 ステータス**: ✅ 設計完了 → 実装準備完了 