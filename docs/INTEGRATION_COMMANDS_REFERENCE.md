# 🎮 統合コマンドリファレンス

**更新日**: 2025年6月2日  
**対象**: Chat History Manager 開発者全員  
**目的**: 統合関連コマンドの完全ガイド

---

## 🚀 基本統合コマンド

### 📊 統合健全性チェック
```bash
# 統合ガード実行（推奨: 毎日実行）
npm run check:integration

# 統合状況ステータス確認
npm run integration:status

# 統計情報更新
npm run stats
```

**実行内容:**
- データベースパス統一検証
- API統合状況確認
- 独立サービス禁止チェック
- 設定ファイル重複検出
- ファイル命名規則確認

---

## 🔄 定期実行コマンド

### 📅 日次実行
```bash
# 基本統合チェック
npm run check:integration

# 詳細ステータス確認
npm run integration:status
```

### 📋 週次実行
```bash
# 包括的品質チェック
npm run quality && npm run check:integration

# コードフォーマット + 統合チェック
npm run format && npm run check:integration
```

### 📈 月次実行
```bash
# 月次統合レビュー（自動レポート生成）
npm run monthly:review

# 詳細分析レポート
./scripts/monthly-integration-review.sh
```

---

## 🛡️ 開発フロー統合コマンド

### 💻 開発開始時
```bash
# 開発環境起動（フルスタック）
npm run dev:full

# 統合状況確認
npm run integration:status
```

### 📝 コミット前
```bash
# プリコミットチェック（必須）
npm run precommit

# 内容: セキュリティ + 統合 + 品質チェック
# - ./scripts/security-check.sh
# - npm run check:integration
# - npm run quality
```

### 🚀 リリース前
```bash
# 完全チェック
npm run precommit && npm run build

# フロントエンドビルド確認
cd web && npm run build && cd ..
```

---

## 📊 監視・モニタリングコマンド

### 🔄 リアルタイム監視
```bash
# 1分ごとの統合状況監視
npm run integration:monitor

# 手動停止: Ctrl+C
```

### 📈 統計・レポート
```bash
# 統計情報取得
npm run stats

# 月次レポート生成
npm run monthly:review

# カスタムレポート生成
./scripts/monthly-integration-review.sh > reports/custom-$(date +%Y%m%d).md
```

---

## 🔧 問題修正コマンド

### 🚨 問題発生時
```bash
# 1. 問題詳細確認
npm run check:integration > logs/integration-issue.log 2>&1

# 2. ログ確認
cat logs/integration-issue.log | grep "❌\|💥"

# 3. 修正後再チェック
npm run check:integration
```

### 🔄 自動修正（将来実装予定）
```bash
# 自動修正スクリプト
./scripts/auto-fix-integration.sh

# 手動修正ガイド表示
./scripts/integration-guard.sh --help
```

---

## 🎯 特定用途コマンド

### 🔍 API統合確認
```bash
# 統合APIルート状況
grep -r "unified-api" src/server/

# API呼び出しパターン確認
grep -r "fetch.*api" web/src/ --include="*.ts" --include="*.tsx"
```

### 🗄️ データベース統合確認
```bash
# DBファイル一覧
find . -name "*.db" -not -path "./data/backup-*"

# DBパス統一確認
grep -r "\.db" src/ --include="*.ts" | grep -v "chat-history.db"
```

### 📁 ファイル構造確認
```bash
# 統合違反ファイル検索
find . -name "*claude-dev*" -not -path "./data/backup-*" -not -path "./node_modules/*"

# 設定重複確認
find . -name "*.config.*" -not -path "./node_modules/*" | sort
```

---

## 🤖 自動化設定コマンド

### ⏰ cron設定
```bash
# crontab編集
crontab -e

# 設定例:
# 毎日午前9時に統合チェック
# 0 9 * * * cd /path/to/chat-history-manager && npm run check:integration

# 毎週月曜午前8時に包括チェック
# 0 8 * * 1 cd /path/to/chat-history-manager && npm run quality && npm run check:integration

# 毎月1日午前7時に月次レビュー
# 0 7 1 * * cd /path/to/chat-history-manager && npm run monthly:review
```

### 🔔 通知設定
```bash
# Slack通知付き統合チェック
npm run check:integration && echo "✅ 統合チェック正常" || echo "🚨 統合問題検出"

# メール通知付き月次レビュー
npm run monthly:review && mail -s "月次統合レポート" admin@example.com < reports/monthly-$(date +%Y%m).md
```

---

## 📋 コマンド組み合わせパターン

### 🏃‍♂️ 高速開発チェック
```bash
# 最小限チェック（30秒以内）
npm run check:integration && echo "✅ OK"
```

### 🔬 詳細分析
```bash
# 包括的分析（5分程度）
npm run quality && npm run check:integration && npm run monthly:review
```

### 🚀 プロダクション準備
```bash
# 完全チェック（10分程度）
npm run precommit && \
npm run build && \
cd web && npm run build && cd .. && \
echo "🎉 プロダクション準備完了"
```

---

## 🎨 カスタマイズ可能コマンド

### 📊 カスタム統計
```bash
# 特定期間の統計
git log --since="7 days ago" --oneline | wc -l
git log --since="30 days ago" --name-only --pretty=format: | sort | uniq -c | sort -nr | head -10
```

### 🔍 カスタム検索
```bash
# API使用パターン分析
grep -r "fetch\|axios" web/src/ --include="*.ts" | wc -l

# 統合原則準拠チェック
grep -r "source.*=" web/src/ --include="*.ts" | grep -v node_modules
```

### 📄 カスタムレポート
```bash
# 簡易レポート生成
{
  echo "# 統合ステータス $(date)"
  echo ""
  npm run check:integration
  echo ""
  echo "## Git統計"
  git log --oneline --since="7 days ago" | wc -l
  echo "件のコミット（過去7日）"
} > reports/weekly-$(date +%Y%m%d).md
```

---

## 🆘 トラブルシューティング

### ❌ コマンド実行エラー
```bash
# 権限エラーの場合
chmod +x scripts/*.sh

# Node.jsバージョンエラーの場合
node --version  # 18+ 必須
npm --version   # 9+ 推奨

# 依存関係エラーの場合
npm ci
cd web && npm ci && cd ..
```

### 🔄 キャッシュクリア
```bash
# npmキャッシュクリア
npm cache clean --force

# TypeScriptキャッシュクリア
rm -rf dist/
rm -rf .tsbuildinfo

# 完全リセット
rm -rf node_modules/
rm -rf web/node_modules/
npm ci
cd web && npm ci && cd ..
```

### 📊 統合ガード問題
```bash
# スクリプト実行権限確認
ls -la scripts/integration-guard.sh

# スクリプト内容確認
cat scripts/integration-guard.sh | head -20

# 手動実行
bash scripts/integration-guard.sh
```

---

## 🎯 クイックリファレンス

| 目的 | コマンド | 頻度 |
|------|---------|------|
| **日次チェック** | `npm run check:integration` | 毎日 |
| **開発開始** | `npm run dev:full` | 必要時 |
| **コミット前** | `npm run precommit` | 毎回 |
| **週次レビュー** | `npm run quality && npm run check:integration` | 毎週 |
| **月次レポート** | `npm run monthly:review` | 毎月 |
| **リアルタイム監視** | `npm run integration:monitor` | オプション |
| **プロダクション準備** | `npm run precommit && npm run build` | リリース前 |

---

## 💡 ベストプラクティス

### ✅ 推奨する実行パターン
1. **開発開始時**: `npm run integration:status`
2. **機能開発中**: 定期的な `npm run check:integration`
3. **コミット前**: 必須の `npm run precommit`
4. **週次**: `npm run quality && npm run check:integration`
5. **月次**: `npm run monthly:review`

### ⚠️ 注意事項
- コマンド実行は必ずプロジェクトルート（`chat-history-manager/`）で行う
- 長時間実行コマンド（`integration:monitor`）は適切に停止する
- エラー発生時は即座に対応し、放置しない
- 月次レポートは必ず確認し、推奨事項を検討する

---

**🎮 このリファレンスに従って統合コマンドを活用することで、Chat History Managerの統合アーキテクチャを効率的に管理・監視できます。** 