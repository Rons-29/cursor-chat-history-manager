# 横断検索データソース分析レポート

## 🎯 ユーザーの疑問

> 「横断検索の一覧に表示されているものはセッション一覧とchat履歴とあともう一個も表示されている？」

## 📊 実際の調査結果

### **表示されているデータソース: 1つのみ**

**答え**: 横断検索には**SQLiteデータベースからのデータのみ**が表示されています。

### **詳細分析**

#### 1. **APIコール分析**
```typescript
// 横断検索で使用されるAPI（EnhancedSearchPage.tsx）
const response = await apiClient.getSessions({ page: 1, limit: 20 })
```

#### 2. **データソース確認**
```bash
# 実際のデータ確認
curl -s "http://localhost:3001/api/sessions?page=1&limit=10" | \
  jq '.sessions | group_by(.metadata.source) | map({source: .[0].metadata.source, count: length})'

# 結果
[
  {
    "source": "sqlite",
    "count": 10  # 全て sqlite からのデータ
  }
]
```

#### 3. **統合統計での確認**
```json
{
  "stats": {
    "traditional": {
      "totalSessions": 6206,
      "method": "json-file",
      "performance": "low"
    },
    "incremental": {
      "totalSessions": 3,
      "method": "incremental", 
      "performance": "high"
    },
    "sqlite": {
      "totalSessions": 4017,
      "totalMessages": 4000,
      "method": "sqlite",
      "performance": "very-high"
    }
  },
  "recommendation": "sqlite"
}
```

**重要**: 3つのデータソースが**存在**しているが、横断検索には**SQLiteのみ**表示

## 🔍 技術的説明

### **なぜSQLiteのみ表示されるのか**

1. **API設計の仕様**
   - `/api/sessions` エンドポイントは推奨データソース（sqlite）を優先使用
   - パフォーマンス重視でSQLiteを自動選択

2. **データ統合の状況**
   - **Traditional**: 6206セッション（JSONファイル形式）
   - **Incremental**: 3セッション（増分処理）
   - **SQLite**: 4017セッション（高速DB）
   - **表示対象**: SQLiteの4017セッションのみ

3. **統合されていない理由**
   - 各データソースは独立して存在
   - 横断検索APIは統一インターフェースを提供していない
   - パフォーマンス優先でSQLiteに一本化

## 🎯 ユーザーの期待と現実のギャップ

### **期待**: 「横断検索」→ 全データソース統合表示
- 6206 + 3 + 4017 = **10,226セッション**すべて表示
- Traditionalファイル + Incremental + SQLite の統合

### **現実**: SQLiteのみ表示
- **4017セッション**のみ表示
- 他の6209セッションは表示されていない

## 💡 改善提案

### **Phase 1: 即座対応**
```typescript
// 全データソース統合APIの実装
async getAllSessions() {
  const [traditional, incremental, sqlite] = await Promise.all([
    this.getTraditionalSessions(),
    this.getIncrementalSessions(), 
    this.getSqliteSessions()
  ])
  
  return this.mergeAndDeduplicate([...traditional, ...incremental, ...sqlite])
}
```

### **Phase 2: UI改善**
- データソース別表示切り替え
- 統合表示/個別表示の選択機能
- データソース情報の可視化

### **Phase 3: 完全統合**
- SQLiteへの完全移行
- データソース統一
- 重複データの整理

## 📋 アクションアイテム

1. ✅ **調査完了**: データソース状況確認
2. ⏳ **検討必要**: 全データソース統合表示
3. ⏳ **実装検討**: ユーザー選択式データソース表示
4. ⏳ **長期計画**: SQLiteへの完全移行

---

**結論**: 現在の横断検索は「横断」ではなく「SQLite検索」として機能している。真の横断検索には追加実装が必要。 