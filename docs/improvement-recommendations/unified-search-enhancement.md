# ChatFlow統一検索機能 - 改善提案書

## 📋 目次
1. [現状分析](#現状分析)
2. [統合の必要性](#統合の必要性)
3. [統一検索仕様](#統一検索仕様)
4. [実装計画](#実装計画)
5. [技術設計](#技術設計)

---

## 🔍 現状分析

### 現在の2つの検索機能

#### 1. セッション検索（Sessions.tsx）
**目的**: セッション一覧のフィルタリング・表示
**機能**:
- キーワードによるセッションタイトル・タグ検索
- ソート機能（最新順、古い順、メッセージ数順）
- ページネーション（50件ずつ表示）
- セッション詳細への遷移

**API**: `/api/sessions?keyword={keyword}&page={page}&limit={limit}`

#### 2. メッセージ検索（Search.tsx）
**目的**: メッセージ内容の全文検索
**機能**:
- キーワードによるメッセージ内容検索
- 検索結果ハイライト
- 関連度スコア計算
- 特定メッセージへの直接リンク

**API**: `/api/search?q={query}` + フォールバック処理

### ❌ 現在の問題点

#### ユーザビリティの課題
1. **分離された検索体験**: ユーザーが「セッションを探したい」か「メッセージを探したい」かを事前に決める必要
2. **機能重複**: どちらもキーワード検索だが異なるUI・機能
3. **認知負荷**: 2つの異なる検索ページを覚える必要

#### 技術的課題
1. **API分散**: 異なるエンドポイント・レスポンス形式
2. **コード重複**: 検索ロジック・UI要素の重複
3. **一貫性不足**: 検索動作・表示形式の不統一

#### 機能的制約
1. **混合検索不可**: セッション名とメッセージ内容を同時検索できない
2. **コンテキスト分断**: セッション情報とメッセージ内容の関連性が見えにくい
3. **発見性低下**: ユーザーが求める情報に到達するのに複数の画面を移動

---

## 🎯 統合の必要性

### 🔄 ユーザーの実際の検索パターン

```typescript
// ユーザーの検索意図と現在のフロー問題
interface UserSearchIntents {
  探しているもの: "特定の話題について話したセッション"
  現在の問題: "セッション名がわからないとSessions検索では見つからない"
  理想の体験: "話題の内容で検索して、関連セッションを発見"
  
  探しているもの: "特定のエラーメッセージへの対処法"
  現在の問題: "Search画面でメッセージは見つかるが、セッション全体の文脈がわからない"
  理想の体験: "エラーメッセージで検索して、解決プロセス全体を確認"
  
  探しているもの: "最近作ったプロジェクトの設定方法"
  現在の問題: "どの画面で検索すべきかわからず、2つの画面を行き来"
  理想の体験: "プロジェクト名で検索して、関連する全ての情報を一度に表示"
}
```

### 💡 統合による利点

#### ユーザーエクスペリエンス向上
1. **シングルエントリーポイント**: 1つの検索で全てのデータにアクセス
2. **コンテキスト保持**: セッション情報とメッセージ内容を統合表示
3. **発見性向上**: 思いがけない関連情報の発見

#### 機能強化
1. **包括的検索**: セッション・メッセージ・タグを同時検索
2. **スマートフィルタリング**: 検索結果の種類別表示
3. **関連情報表示**: 検索語に関連する全ての情報を統合表示

---

## 🎨 統一検索仕様

### 検索インターフェース設計

#### 統合検索バー
```tsx
<UnifiedSearchBar>
  <SearchInput 
    placeholder="チャット履歴全体を検索... (セッション名、メッセージ内容、タグ)"
    onChange={handleRealtimeSearch}
    value={query}
    className="text-lg"
  />
  <SearchFilters>
    <FilterChip active={filter.sessions}>📋 セッション</FilterChip>
    <FilterChip active={filter.messages}>💬 メッセージ</FilterChip>
    <FilterChip active={filter.tags}>🏷️ タグ</FilterChip>
    <DateRangeFilter />
    <SourceFilter />
  </SearchFilters>
</UnifiedSearchBar>
```

#### 統合結果表示
```tsx
<SearchResults>
  {/* セッション結果セクション */}
  <ResultSection title="関連セッション" count={sessionResults.length}>
    {sessionResults.map(session => (
      <SessionResult 
        session={session}
        query={query}
        showPreview={true}
        onSelect={handleSessionSelect}
      />
    ))}
  </ResultSection>
  
  {/* メッセージ結果セクション */}
  <ResultSection title="関連メッセージ" count={messageResults.length}>
    {messageResults.map(message => (
      <MessageResult 
        message={message}
        session={message.session}
        query={query}
        onSelect={handleMessageSelect}
      />
    ))}
  </ResultSection>
  
  {/* 関連タグセクション */}
  <ResultSection title="関連タグ" count={tagResults.length}>
    {tagResults.map(tag => (
      <TagResult tag={tag} onSelect={handleTagSelect} />
    ))}
  </ResultSection>
</SearchResults>
```

### 検索動作仕様

#### リアルタイム検索
```typescript
interface RealtimeSearchBehavior {
  trigger: "3文字以上入力で自動実行"
  debounce: "300ms"
  parallel: "セッション・メッセージ・タグを並行検索"
  incremental: "段階的結果表示（高速な結果から順次表示）"
}
```

#### 結果優先度
```typescript
interface SearchResultPriority {
  完全一致: {
    sessionTitle: "完全一致セッションを最上位表示"
    messageContent: "完全一致メッセージを優先表示"
  }
  部分一致: {
    関連度スコア: "キーワード出現頻度・位置による重み付け"
    最新性重視: "新しいセッション・メッセージを優先"
  }
  関連情報: {
    同一タグ: "同じタグのセッション・メッセージを関連表示"
    同一時期: "同じ時期の関連セッションを提案"
  }
}
```

---

## 🔧 技術設計

### API統合設計

#### 新統一検索エンドポイント
```typescript
POST /api/search/unified

interface UnifiedSearchRequest {
  query: string
  filters: {
    includeSessionTitles: boolean // デフォルト: true
    includeMessageContent: boolean // デフォルト: true
    includeTags: boolean // デフォルト: true
    dateRange?: { start: Date; end: Date }
    sources?: string[] // ['cursor', 'claude-dev', 'chat']
    sortBy?: 'relevance' | 'date' | 'title'
  }
  pagination: {
    page: number
    pageSize: number
    maxResults: number // デフォルト: 100
  }
}

interface UnifiedSearchResponse {
  query: string
  total: {
    sessions: number
    messages: number
    tags: number
  }
  results: {
    sessions: SessionSearchResult[]
    messages: MessageSearchResult[]
    tags: TagSearchResult[]
  }
  suggestions: {
    relatedQueries: string[]
    alternativeQueries: string[]
    popularTags: string[]
  }
  performance: {
    searchTime: number
    resultCount: number
  }
}
```

#### 検索結果データ型
```typescript
interface SessionSearchResult {
  id: string
  title: string
  tags: string[]
  messageCount: number
  createdAt: string
  updatedAt: string
  preview: string // メッセージプレビュー
  matchInfo: {
    field: 'title' | 'tag' | 'content'
    score: number
    highlightedTitle?: string
  }
}

interface MessageSearchResult {
  sessionId: string
  sessionTitle: string
  messageIndex: number
  content: string
  timestamp: string
  role: 'user' | 'assistant'
  matchInfo: {
    score: number
    highlightedContent: string
    context: {
      before: string // 前後のメッセージコンテキスト
      after: string
    }
  }
}

interface TagSearchResult {
  tag: string
  sessionCount: number
  messageCount: number
  lastUsed: string
  relatedTags: string[]
}
```

### フロントエンド統合設計

#### コンポーネント構造
```typescript
// 統合検索コンポーネント構造
web/src/components/search/
├── UnifiedSearch.tsx         // メインコンポーネント
├── SearchInput.tsx           // 検索入力
├── SearchFilters.tsx         // フィルター
├── SearchResults.tsx         // 結果表示
├── SessionResult.tsx         // セッション結果カード
├── MessageResult.tsx         // メッセージ結果カード
├── TagResult.tsx             // タグ結果カード
├── SearchSuggestions.tsx     // 候補・提案
└── useUnifiedSearch.ts       // 検索ロジック
```

#### 状態管理
```typescript
interface UnifiedSearchState {
  query: string
  filters: SearchFilters
  results: UnifiedSearchResponse | null
  loading: {
    search: boolean
    suggestions: boolean
  }
  error: string | null
  history: SearchHistory[]
  selectedTab: 'all' | 'sessions' | 'messages' | 'tags'
}
```

---

## 📋 実装計画

### Phase 1: 基盤実装（1-2週間）
1. **API統合**
   - 統一検索エンドポイント実装
   - 既存API統合・性能最適化
   - SQLite FTS5最適化

2. **基本UI実装**
   - 統合検索コンポーネント作成
   - 基本的な結果表示
   - ルーティング統合

### Phase 2: 機能拡張（2-3週間）
1. **高度機能**
   - リアルタイム検索
   - フィルター機能
   - 検索履歴・保存

2. **UX改善**
   - ハイライト表示
   - コンテキスト表示
   - 関連情報表示

### Phase 3: 最適化・完成（1週間）
1. **性能最適化**
   - 検索速度改善
   - キャッシュ最適化
   - レスポンシブ対応

2. **テスト・ドキュメント**
   - 統合テスト
   - ユーザビリティテスト
   - ドキュメント更新

---

## 🎯 期待効果

### 定量的改善
```typescript
interface ExpectedImprovements {
  searchEfficiency: "検索時間50%短縮（1画面で完結）"
  userSatisfaction: "タスク完了率80%向上"
  codeReduction: "検索関連コード30%削減"
  apiOptimization: "API呼び出し40%削減"
}
```

### 定性的改善
- **統一体験**: 一貫した検索体験の提供
- **発見性向上**: 思いがけない情報の発見
- **学習効果**: 1つの検索方法を覚えるだけで全機能活用
- **効率向上**: 複数画面移動の不要化

---

**作成日**: 2025年6月04日  
**対象**: ChatFlow検索機能統合  
**優先度**: 高（ユーザビリティ大幅改善） 