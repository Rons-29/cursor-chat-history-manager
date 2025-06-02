#!/bin/bash

# 月次統合レビュー自動化スクリプト
# Chat History Manager - 統合健全性の包括的月次レビュー

echo "🔍 Chat History Manager 月次統合レビュー開始"
echo "実行日時: $(date)"
echo "=============================================="
echo ""

# ログディレクトリ作成
mkdir -p logs reports

# 月次レポートファイル名
REPORT_FILE="reports/monthly-$(date +%Y%m).md"

# レポートヘッダー作成
{
  echo "# Chat History Manager 月次統合レポート"
  echo ""
  echo "**生成日**: $(date)"
  echo "**レビュー期間**: $(date -d '1 month ago' +%Y年%m月) - $(date +%Y年%m月)"
  echo "**実行者**: 自動化システム"
  echo ""
  echo "---"
  echo ""
} > "$REPORT_FILE"

# 1. 統合健全性スコア
echo "📊 統合健全性スコア測定中..."
{
  echo "## 🎯 統合健全性スコア"
  echo ""
  echo "\`\`\`bash"
  npm run check:integration 2>&1
  echo "\`\`\`"
  echo ""
} >> "$REPORT_FILE"

# 2. コード品質チェック
echo "✨ コード品質チェック実行中..."
{
  echo "## ✨ コード品質メトリクス"
  echo ""
  echo "### TypeScript Build"
  echo "\`\`\`bash"
  npm run build 2>&1 | head -20
  echo "\`\`\`"
  echo ""
  echo "### ESLint Analysis"
  echo "\`\`\`bash"
  npm run lint 2>&1 | head -30
  echo "\`\`\`"
  echo ""
  echo "### Frontend Build"
  echo "\`\`\`bash"
  cd web && npm run build 2>&1 | head -20
  cd ..
  echo "\`\`\`"
  echo ""
} >> "$REPORT_FILE"

# 3. 依存関係解析
echo "📦 依存関係解析中..."
{
  echo "## 📦 依存関係・セキュリティ解析"
  echo ""
  echo "### NPM Audit"
  echo "\`\`\`bash"
  npm audit --audit-level=moderate 2>&1 | head -50
  echo "\`\`\`"
  echo ""
} >> "$REPORT_FILE"

# 4. セキュリティスキャン
echo "🔒 セキュリティスキャン実行中..."
if [ -f "./scripts/security-check.sh" ]; then
  {
    echo "### Security Check"
    echo "\`\`\`bash"
    ./scripts/security-check.sh 2>&1 | head -30
    echo "\`\`\`"
    echo ""
  } >> "$REPORT_FILE"
fi

# 5. パフォーマンス分析
echo "⚡ パフォーマンス分析中..."
{
  echo "## ⚡ パフォーマンス分析"
  echo ""
  echo "### Database Files"
  echo "\`\`\`bash"
  echo "データベースファイル一覧:"
  find . -name "*.db" -exec ls -lh {} \; 2>/dev/null || echo "データベースファイルが見つかりません"
  echo ""
  echo "プロジェクト全体サイズ:"
  du -sh . 2>/dev/null || echo "サイズ計算できませんでした"
  echo "\`\`\`"
  echo ""
} >> "$REPORT_FILE"

# 6. Git統計
echo "📈 Git統計分析中..."
{
  echo "## 📈 開発統計 (過去30日)"
  echo ""
  echo "### Commit Analysis"
  echo "\`\`\`bash"
  echo "コミット数 (過去30日):"
  git log --since="30 days ago" --oneline | wc -l
  echo ""
  echo "主要な変更ファイル (過去30日):"
  git log --since="30 days ago" --name-only --pretty=format: | sort | uniq -c | sort -nr | head -10
  echo ""
  echo "貢献者 (過去30日):"
  git log --since="30 days ago" --pretty=format:"%an" | sort | uniq -c | sort -nr
  echo "\`\`\`"
  echo ""
} >> "$REPORT_FILE"

# 7. ファイル統計
echo "📄 ファイル統計分析中..."
{
  echo "## 📄 プロジェクト構造統計"
  echo ""
  echo "### Files Count"
  echo "\`\`\`bash"
  echo "TypeScript ファイル:"
  find . -name "*.ts" -not -path "./node_modules/*" -not -path "./web/node_modules/*" | wc -l
  echo "JavaScript ファイル:"
  find . -name "*.js" -not -path "./node_modules/*" -not -path "./web/node_modules/*" | wc -l
  echo "React ファイル:"
  find . -name "*.tsx" -not -path "./node_modules/*" -not -path "./web/node_modules/*" | wc -l
  echo "設定ファイル:"
  find . -name "*.json" -not -path "./node_modules/*" -not -path "./web/node_modules/*" | wc -l
  echo ""
  echo "LOC (Lines of Code):"
  find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | xargs wc -l | tail -1
  echo "\`\`\`"
  echo ""
} >> "$REPORT_FILE"

# 8. 統合状況詳細
echo "🔄 統合状況詳細分析中..."
{
  echo "## 🔄 統合状況詳細分析"
  echo ""
  echo "### API Endpoints Analysis"
  echo "\`\`\`bash"
  echo "統合APIルート (unified-api.ts):"
  if [ -f "src/server/routes/unified-api.ts" ]; then
    grep -c "router\." src/server/routes/unified-api.ts
    echo "エンドポイント実装済み"
  else
    echo "統合APIルートが見つかりません"
  fi
  echo ""
  echo "API使用状況:"
  grep -r "fetch.*api" web/src/ --include="*.ts" --include="*.tsx" | wc -l
  echo "件のAPI呼び出し検出"
  echo "\`\`\`"
  echo ""
} >> "$REPORT_FILE"

# 9. 推奨事項
echo "💡 推奨事項生成中..."
{
  echo "## 💡 今月の推奨事項"
  echo ""
  
  # 統合健全性スコアに基づく推奨事項
  HEALTH_SCORE=$(npm run check:integration 2>/dev/null | grep -o '[0-9]*%' | tail -1 | sed 's/%//')
  
  if [ -n "$HEALTH_SCORE" ]; then
    if [ "$HEALTH_SCORE" -ge 98 ]; then
      echo "✅ **優秀**: 統合健全性が非常に高い状態です（${HEALTH_SCORE}%）"
      echo "- 現在の高い品質を維持してください"
      echo "- 新機能開発時も統合原則を継続遵守"
    elif [ "$HEALTH_SCORE" -ge 95 ]; then
      echo "🟡 **良好**: 統合健全性は良好です（${HEALTH_SCORE}%）"
      echo "- 軽微な改善により98%以上を目指してください"
      echo "- 定期的な統合ガード実行を継続"
    else
      echo "🔴 **要改善**: 統合健全性に改善が必要です（${HEALTH_SCORE}%）"
      echo "- 統合問題の早急な修正が必要"
      echo "- データベース統一・API統合の確認"
    fi
  else
    echo "⚠️ 統合健全性スコアを取得できませんでした"
    echo "- 統合ガードスクリプトの確認が必要"
  fi
  
  echo ""
  echo "### 継続的改善点"
  echo "- 🔄 統合ガードの定期実行（日次）"
  echo "- 📊 新機能開発時のsourceパラメータ使用"
  echo "- 🛡️ API呼び出しパターンの統一"
  echo "- 📈 パフォーマンス最適化の継続"
  echo ""
} >> "$REPORT_FILE"

# 10. 次月の目標
{
  echo "## 🎯 次月の目標"
  echo ""
  echo "### 技術目標"
  echo "- [ ] 統合健全性スコア 99% 達成"
  echo "- [ ] API統合率 100% 維持"
  echo "- [ ] 新機能の統合原則準拠 100%"
  echo "- [ ] セキュリティ問題 0 件"
  echo ""
  echo "### プロセス目標"
  echo "- [ ] 日次統合ガード実行率 95% 以上"
  echo "- [ ] コミット前チェック 100% 実施"
  echo "- [ ] 月次レビュー自動化の改善"
  echo ""
  echo "---"
  echo ""
  echo "**📄 レポート生成完了**: $(date)"
  echo "**🔄 次回レビュー予定**: $(date -d '+1 month' +%Y年%m月%d日)"
} >> "$REPORT_FILE"

# 完了通知
echo ""
echo "✅ 月次統合レビュー完了"
echo "📄 レポート: $REPORT_FILE"
echo "📊 ファイルサイズ: $(du -h "$REPORT_FILE" | cut -f1)"
echo ""

# サマリー表示
echo "🎯 今月のサマリー:"
if [ -n "$HEALTH_SCORE" ]; then
  echo "  統合健全性スコア: ${HEALTH_SCORE}%"
  if [ "$HEALTH_SCORE" -ge 98 ]; then
    echo "  評価: 🎉 優秀"
  elif [ "$HEALTH_SCORE" -ge 95 ]; then
    echo "  評価: ✅ 良好"
  else
    echo "  評価: ⚠️ 要改善"
  fi
else
  echo "  統合健全性スコア: 測定不可"
  echo "  評価: ❓ 不明"
fi

echo ""
echo "📋 次回のアクション:"
echo "  1. レポート内容の確認"
echo "  2. 推奨事項の実施検討"
echo "  3. 次月目標の設定"
echo ""

# ログファイルにも記録
echo "$(date): 月次統合レビュー完了 - レポート: $REPORT_FILE" >> logs/monthly-reviews.log

exit 0 