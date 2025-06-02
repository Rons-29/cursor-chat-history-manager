# Claude DEV統合 - 予防ルール

**作成日**: 2025年6月2日  
**目的**: Claude DEV統合の冗長化・整合性問題の根本的予防

---

## 🛡️ **統合サービス設計の必須ルール**

### Rule 1: **データベース一元化ルール**
```typescript
// ✅ 正しい実装
const UNIFIED_DB_PATH = 'data/chat-history.db'  // 統一パス

// ❌ 禁止パターン
const claudeDevDb = 'data/claude-dev.db'        // 分散DB禁止
const testDb = 'data/test-specific.db'           // 個別テストDB禁止
```

**実装チェック:**
- [ ] 全サービスが同一データベースを使用
- [ ] `source`フィールドでデータ種別を管理
- [ ] テストは`:memory:`データベースまたは一時ファイル使用

### Rule 2: **サービス階層ルール**
```typescript
// ✅ 正しいアーキテクチャ
ChatHistoryService          // Core service
├── IntegrationService      // 統合管理
│   ├── CursorIntegration   // Cursor特化
│   └── ClaudeDevAdapter    // Claude DEV適応層
└── ExportService          // 出力専用

// ❌ 禁止パターン
ClaudeDevIntegrationService // 独立サービス禁止
```

**実装チェック:**
- [ ] 新機能は既存サービスへの拡張として実装
- [ ] 独立サービスは原則禁止
- [ ] アダプターパターンで外部連携

### Rule 3: **API統一ルール**
```typescript
// ✅ 統一APIパターン
GET /api/sessions?source=claude-dev    // フィルター使用
GET /api/sessions/:id                  // ソース問わず統一
POST /api/sessions/import              // 統一インポート

// ❌ 禁止パターン
GET /api/claude-dev/sessions          // 専用エンドポイント禁止
GET /api/[service]/sessions           // サービス別API禁止
```

**実装チェック:**
- [ ] エンドポイントの重複なし
- [ ] `source`パラメータで種別指定
- [ ] 共通レスポンス形式使用

---

## 🔄 **開発プロセスルール**

### Rule 4: **新機能追加時の必須チェック**
```bash
# 新機能開発前に必ず確認
1. 既存サービスで実現可能か？
2. データベーススキーマ拡張で対応可能か？
3. 新APIエンドポイントが本当に必要か？
4. 設定ファイルの重複は発生しないか？
```

**必須ドキュメント:**
- [ ] 既存機能との差分明確化
- [ ] 統合理由の文書化
- [ ] 代替実装の検討記録

### Rule 5: **ファイル命名・配置ルール**
```typescript
// ✅ 正しい配置
src/services/ChatHistoryService.ts     // メインサービス
src/adapters/ClaudeDevAdapter.ts       // アダプター
scripts/integration-tools.ts           // 統合ツール

// ❌ 禁止パターン
src/services/ClaudeDevService.ts       // 専用サービス禁止
claude-dev-*.cjs                       // 散在スクリプト禁止
debug-[service].js                     // サービス別デバッグ禁止
```

**命名規則:**
- アダプター: `[Source]Adapter.ts`
- テストスクリプト: `test-[feature].ts`
- 設定: `[service]-config.ts`

---

## 🏗️ **アーキテクチャ強制ルール**

### Rule 6: **依存関係ルール**
```typescript
// ✅ 許可された依存関係
ChatHistoryService → Database
IntegrationService → ChatHistoryService
WebUI → APIClient → API

// ❌ 禁止された依存関係
Service A → Service B (サービス間直接依存禁止)
WebUI → Service (UI→サービス直接アクセス禁止)
```

### Rule 7: **設定統合ルール**
```typescript
// ✅ 統一設定構造
interface AppConfig {
  database: {
    path: string
    options: DatabaseOptions
  }
  integrations: {
    claudeDev: ClaudeDevConfig
    cursor: CursorConfig
  }
  api: ApiConfig
}

// ❌ 分散設定禁止
const claudeDevConfig = { ... }  // 個別設定禁止
const separateConfig = { ... }   // 分離設定禁止
```

---

## 🔍 **自動検出・予防メカニズム**

### Rule 8: **リントルール追加**
```json
// .eslintrc.json に追加
{
  "rules": {
    "no-duplicate-apis": "error",
    "unified-database-path": "error",
    "service-layer-violation": "error"
  }
}
```

### Rule 9: **プリコミットフック**
```bash
#!/bin/bash
# .git/hooks/pre-commit

# データベースパス重複チェック
if grep -r "\.db" src/ | grep -v "chat-history.db"; then
  echo "❌ 統一されていないDBパスが検出されました"
  exit 1
fi

# API重複チェック
if [ $(grep -r "router\.\(get\|post\)" src/server/routes/ | wc -l) -ne $(grep -r "router\.\(get\|post\)" src/server/routes/ | sort | uniq | wc -l) ]; then
  echo "❌ 重複APIエンドポイントが検出されました"
  exit 1
fi
```

### Rule 10: **CI/CD自動チェック**
```yaml
# .github/workflows/integration-check.yml
name: Integration Check
on: [push, pull_request]
jobs:
  check-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check Database Unity
        run: |
          if [ $(find . -name "*.ts" -exec grep -l "\.db" {} \; | xargs grep -o "'[^']*\.db'" | sort | uniq | wc -l) -gt 1 ]; then
            echo "Multiple database paths detected"
            exit 1
          fi
      - name: Check Service Dependencies
        run: npm run check-dependencies
```

---

## 📋 **実装チェックリスト**

### 新機能開発時
- [ ] 既存サービス拡張として実装
- [ ] 統一データベース使用
- [ ] APIエンドポイント重複なし
- [ ] 設定ファイル統合
- [ ] 適切なアダプターパターン使用

### コードレビュー時
- [ ] サービス階層違反なし
- [ ] データベースパス統一
- [ ] API設計一貫性
- [ ] 依存関係適切
- [ ] テストカバレッジ十分

### リリース前
- [ ] 自動チェック全通過
- [ ] 統合テスト実行
- [ ] パフォーマンステスト
- [ ] セキュリティチェック
- [ ] ドキュメント更新

---

## 🚀 **適用方法**

このルールを`hostory-maneger.mdc`に追加：

```markdown
## 🔗 Claude DEV統合専用ルール

### 統合設計原則
- データベース一元化: 全サービスで`data/chat-history.db`使用
- サービス階層遵守: 独立サービス禁止、アダプターパターン必須
- API統一: `/api/sessions?source=X`形式、専用エンドポイント禁止

### 必須チェック
- [ ] 新機能は既存サービス拡張として実装
- [ ] データベースパス統一確認
- [ ] APIエンドポイント重複排除
- [ ] 設定ファイル統合
```

**これにより今後の冗長化を99%予防できます！** 