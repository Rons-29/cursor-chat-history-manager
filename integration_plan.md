# 真の横断検索実現 - 統合実装計画

## 🎯 目標: 全データソース統合表示

### **現状の課題**
- **Traditional**: 6,206セッション（JSONファイル）→ 非表示
- **Incremental**: 3セッション（増分処理）→ 非表示  
- **SQLite**: 4,017セッション（DB）→ ✅ 表示中
- **合計**: 10,226セッション → 現在4,017のみ（39%のみ表示）

### **ユーザーの期待**
> 「横断検索」= 全てのAI対話記録を横断的に検索・表示

## 📋 実装タスクリスト

### **Phase 1: バックエンド統合API実装 (1-2時間)**

#### 1.1 統合セッション取得API
- [ ] `GET /api/sessions/all` エンドポイント作成
- [ ] 3つのデータソース並列取得実装
- [ ] セッションデータ正規化・統合
- [ ] 重複除去ロジック実装

#### 1.2 統合検索API
- [ ] `POST /api/search/all` エンドポイント作成
- [ ] 全データソース横断検索実装
- [ ] 検索結果マージ・ランキング
- [ ] パフォーマンス最適化

#### 1.3 データソース選択API
- [ ] `GET /api/sessions?source=all|traditional|incremental|sqlite`
- [ ] ユーザー選択式データソース表示
- [ ] データソース別統計情報

### **Phase 2: フロントエンド改善 (1時間)**

#### 2.1 データソース選択UI
- [ ] データソース切り替えタブ実装
- [ ] 「全て」「Traditional」「Incremental」「SQLite」
- [ ] データソース別件数表示

#### 2.2 統合表示改善
- [ ] データソース情報をカードに表示
- [ ] パフォーマンス指標の可視化
- [ ] ローディング状態の改善

#### 2.3 検索機能強化
- [ ] 全データソース横断検索
- [ ] データソース別フィルター
- [ ] 検索結果の統合表示

### **Phase 3: UX最適化 (30分)**

#### 3.1 用語改善
- [ ] 「横断検索」→「AI対話管理」（実態に合わせる）
- [ ] データソース説明の追加
- [ ] パフォーマンス指標の説明

#### 3.2 設定保存
- [ ] ユーザーのデータソース選択を記憶
- [ ] デフォルト表示設定
- [ ] 統合/個別表示の選択

## 🚀 実装開始

### **まず確認: 現在の各データソースAPI状況**
```bash
# Traditional データソースAPI確認
curl http://localhost:3001/api/sessions?source=traditional

# Incremental データソースAPI確認  
curl http://localhost:3001/api/sessions?source=incremental

# SQLite データソースAPI確認
curl http://localhost:3001/api/sessions?source=sqlite
```

### **想定される技術実装**
```typescript
// 統合セッション取得サービス
class UnifiedSessionService {
  async getAllSessions(options: {
    page: number
    limit: number
    sources?: ('traditional' | 'incremental' | 'sqlite')[]
  }) {
    const { sources = ['traditional', 'incremental', 'sqlite'] } = options
    
    const results = await Promise.allSettled([
      sources.includes('traditional') ? this.getTraditionalSessions(options) : [],
      sources.includes('incremental') ? this.getIncrementalSessions(options) : [],
      sources.includes('sqlite') ? this.getSqliteSessions(options) : []
    ])
    
    return this.mergeAndPaginate(results, options)
  }
  
  private mergeAndPaginate(results: any[], options: any) {
    // データソース統合・重複除去・ページネーション
    // パフォーマンス指標付きで返却
  }
}
```

## 📊 期待される効果

### **ユーザー体験向上**
- **データ可視性**: 39% → 100%（全データ表示）
- **検索網羅性**: 4,017件 → 10,226件（2.5倍拡大）
- **選択自由度**: 固定 → ユーザー選択式

### **技術的価値**
- **真の横断性**: 名前と実態の一致
- **パフォーマンス比較**: データソース別性能の可視化
- **段階的移行**: SQLite移行の判断材料提供

## 🎯 実装優先度

1. **🔥 最優先**: 統合セッション取得API（バックエンド）
2. **⚡ 高優先**: データソース選択UI（フロントエンド）
3. **📊 中優先**: 統合検索API（検索強化）
4. **✨ 低優先**: UX最適化（用語・設定）

---

**次のステップ**: バックエンドの現在のデータソースAPI状況確認から開始しますか？ 