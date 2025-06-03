# 📝 ChatFlow テンプレート使用ガイド

**作成日**: 2025年6月3日  
**目的**: 探索重視型開発フローでの品質向上・効率化

---

## 🎯 **テンプレート概要**

このディレクトリには、ChatFlowプロジェクトでの**探索重視型開発フロー**を支援するテンプレートが含まれています。

### 📂 **利用可能なテンプレート**

```
docs/templates/
├── exploration-report-template.md  # 問題探索レポート
├── test-results-template.md        # テスト結果レポート
└── README.md                       # このファイル（使用ガイド）
```

---

## 🔍 **1. exploration-report-template.md**

### 🎯 **用途**
- バグ発見時の詳細調査
- 機能修正前の影響範囲分析
- データ不整合の根本原因調査
- セキュリティ問題の評価

### 🚀 **使用手順**

#### Step 1: テンプレートをコピー
```bash
# 問題発見時
cp docs/templates/exploration-report-template.md \
   docs/exploration/$(date +%Y%m%d)-[問題名]-exploration.md

# 例：セッション数不整合の場合
cp docs/templates/exploration-report-template.md \
   docs/exploration/20250603-session-count-discrepancy-exploration.md
```

#### Step 2: システム状況調査
```bash
# 自動システムチェック実行
npm run status:check
curl -s http://localhost:3001/api/health | jq .

# データ整合性確認
sqlite3 data/chat-history.db "SELECT COUNT(*) as total_sessions FROM sessions;"
sqlite3 data/chat-history.db "SELECT COUNT(*) as total_messages FROM messages;"

# エラーログ確認
tail -20 logs/error.log | grep -i "error\|warning"

# セキュリティチェック
./scripts/security-check.sh
```

#### Step 3: テンプレート記入
1. **基本情報**: 日時、探索者、問題概要
2. **問題詳細**: 現象、発生条件、影響範囲
3. **根本原因分析**: 仮説立案と検証
4. **影響範囲**: コード、データ、セキュリティ、パフォーマンス
5. **修正戦略**: 修正アプローチと手順
6. **リスク評価**: 高/中/低リスクの分類

#### Step 4: 探索完了確認
- [ ] 全チェックリスト項目を完了
- [ ] 根本原因を特定
- [ ] 修正戦略を決定
- [ ] リスクを評価

### 📊 **記入例**
```markdown
**日時**: 2025年6月3日 21:30  
**探索者**: 開発者名  
**問題**: API応答とSQLite実数の89件不整合  
**緊急度**: [x] ⚠️ 高

## 📊 発見した問題
### 🎯 問題の詳細
- **現象**: Webアプリ表示が4,105セッション、SQLite実数が4,016セッション
- **発生条件**: `/api/sessions`エンドポイント呼び出し時
- **発生頻度**: 常時
- **影響範囲**: 全ユーザーのセッション数表示
```

---

## 🧪 **2. test-results-template.md**

### 🎯 **用途**
- 修正完了後の品質確認
- マージ前の最終チェック
- パフォーマンス改善の検証
- リリース判定の材料

### 🚀 **使用手順**

#### Step 1: テンプレートをコピー
```bash
# 修正完了時
cp docs/templates/test-results-template.md \
   docs/test-results/$(date +%Y%m%d)-[ブランチ名]-test-results.md

# 例：
cp docs/templates/test-results-template.md \
   docs/test-results/20250603-fix-session-count-discrepancy-test-results.md
```

#### Step 2: 段階的テスト実行

##### Level 1: 基礎テスト
```bash
# TypeScript + ビルド
npm run build

# コード品質
npm run lint
npm run format:check

# ユニットテスト
npm test

# セキュリティ
./scripts/security-check.sh
```

##### Level 2: 統合テスト
```bash
# サーバー起動
npm run server &
SERVER_PID=$!

# API動作確認
curl -s http://localhost:3001/api/health | jq .
curl -s http://localhost:3001/api/sessions | jq '.pagination'
curl -s http://localhost:3001/api/stats

# フロントエンド
cd web && npm run build && npm run preview

# 後片付け
kill $SERVER_PID
```

##### Level 3: パフォーマンステスト
```bash
# SQLite性能
time sqlite3 data/chat-history.db "SELECT COUNT(*) FROM sessions;"

# API応答時間
time curl -s http://localhost:3001/api/sessions >/dev/null

# システムリソース
ps aux | grep node | grep -v grep
```

#### Step 3: 結果記録
1. **各テストの通過/失敗を記録**
2. **パフォーマンス数値を記録**
3. **修正効果を Before/After で比較**
4. **総合評価を判定**

#### Step 4: マージ判定
- **🟢 即座マージ可**: 総合通過率95%以上
- **🟡 条件付きマージ**: 80-94%、軽微な問題のみ
- **🔄 再作業必要**: 60-79%、重要な問題あり
- **🔴 マージ不可**: 60%未満、重大な問題あり

---

## 🔧 **実際の使用例**

### 📊 **ケース1: セッション数不整合修正**

#### 探索フェーズ
```bash
# 1. 探索レポート作成
cp docs/templates/exploration-report-template.md \
   docs/exploration/20250603-session-count-discrepancy-exploration.md

# 2. 調査実行
npm run status:check
curl -s http://localhost:3001/api/health | jq .
sqlite3 data/chat-history.db "SELECT COUNT(*) FROM sessions;"

# 3. レポート記入完了後、ブランチ作成
git checkout develop
git checkout -b fix/session-count-discrepancy
```

#### 修正・テストフェーズ
```bash
# 4. 修正実装
# ... コード修正 ...

# 5. テスト結果作成
cp docs/templates/test-results-template.md \
   docs/test-results/20250603-fix-session-count-discrepancy-test-results.md

# 6. 段階的テスト実行・記録
npm run build  # → テンプレートに記録
npm test       # → テンプレートに記録
# ... その他のテスト ...
```

#### マージフェーズ
```bash
# 7. 総合通過率95% → 即座マージ
git checkout main
git merge fix/session-count-discrepancy --no-ff
git tag v1.3.1
git push origin main --tags
```

---

## 📈 **期待される効果**

### ✅ **品質向上**
- **調査漏れ防止**: テンプレートで必須項目をガイド
- **一貫性確保**: 全員が同じ品質で作業
- **リスク軽減**: 事前の詳細分析で副作用防止

### ⚡ **効率向上**
- **作業時間短縮**: 毎回の構造考案が不要
- **レビュー効率化**: 標準化されたフォーマット
- **知見蓄積**: 組織としての学習促進

### 📊 **定量的効果**
```
❌ 従来の手動作業：
- 探索・調査: 60分
- レポート作成: 30分
- テスト実行・記録: 45分
合計: 135分

✅ テンプレート使用：
- 探索・調査: 20分（ガイド付き）
- レポート記入: 15分（フォーマット済み）
- テスト実行・記録: 20分（チェックリスト付き）
合計: 55分

→ 60%時間短縮！
```

---

## 🚀 **今すぐ始める**

### 📅 **次回の修正作業から適用**
1. **問題発見**: 探索レポートテンプレート使用
2. **修正完了**: テスト結果テンプレート使用
3. **効果測定**: 従来との比較記録

### 🔄 **テンプレート改善**
- 使用後のフィードバックで継続改善
- プロジェクト特性に合わせたカスタマイズ
- 成功パターンのベストプラクティス化

**ChatFlow探索重視型開発フローで、品質と効率を同時実現！**

---

**📝 テンプレート活用でChatFlow開発を次のレベルへ！** 