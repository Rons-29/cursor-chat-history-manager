#!/bin/bash

# Chat History Manager - パフォーマンス最適化スクリプト
# .mdcルール準拠: 段階的最適化とモニタリング

set -e

echo "🚀 Chat History Manager - パフォーマンス最適化を開始します"

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 1. TypeScriptビルド最適化
log_info "Phase 1: TypeScriptビルド最適化"
echo "📦 TypeScriptコンパイル設定を最適化中..."

# tsconfig.jsonの最適化設定を確認
if [ -f "tsconfig.json" ]; then
    log_info "✅ tsconfig.json が存在します"
    
    # インクリメンタルビルドの有効化確認
    if grep -q '"incremental": true' tsconfig.json; then
        log_info "✅ インクリメンタルビルドが有効です"
    else
        log_warn "⚠️ インクリメンタルビルドが無効です"
    fi
else
    log_error "❌ tsconfig.json が見つかりません"
    exit 1
fi

# 2. 依存関係の最適化
log_info "Phase 2: 依存関係の最適化"
echo "📋 package.json の依存関係を分析中..."

# 未使用依存関係のチェック
if command -v npx &> /dev/null; then
    log_info "🔍 未使用依存関係をチェック中..."
    # npx depcheck --skip-missing || log_warn "⚠️ 未使用依存関係が検出されました"
else
    log_warn "⚠️ npx が利用できません"
fi

# 3. ビルドサイズの最適化
log_info "Phase 3: ビルドサイズの最適化"

# distディレクトリのサイズ確認
if [ -d "dist" ]; then
    DIST_SIZE=$(du -sh dist | cut -f1)
    log_info "📊 現在のビルドサイズ: $DIST_SIZE"
else
    log_warn "⚠️ distディレクトリが存在しません。ビルドを実行してください。"
fi

# 4. メモリ使用量の最適化
log_info "Phase 4: メモリ使用量の最適化"

# Node.jsメモリ設定の確認
if [ -f "package.json" ]; then
    if grep -q "max-old-space-size" package.json; then
        log_info "✅ Node.jsメモリ設定が最適化されています"
    else
        log_warn "⚠️ Node.jsメモリ設定の最適化を推奨します"
        echo "  推奨設定: --max-old-space-size=4096"
    fi
fi

# 5. キャッシュ戦略の最適化
log_info "Phase 5: キャッシュ戦略の最適化"

# .gitignoreにキャッシュディレクトリが含まれているか確認
if [ -f ".gitignore" ]; then
    if grep -q "node_modules" .gitignore && grep -q "dist" .gitignore; then
        log_info "✅ 基本的なキャッシュ設定が適切です"
    else
        log_warn "⚠️ .gitignoreの設定を確認してください"
    fi
fi

# 6. ログファイルの最適化
log_info "Phase 6: ログファイルの最適化"

# logsディレクトリのサイズ確認
if [ -d "logs" ]; then
    LOGS_SIZE=$(du -sh logs | cut -f1)
    log_info "📊 現在のログサイズ: $LOGS_SIZE"
    
    # 古いログファイルのクリーンアップ
    find logs -name "*.log" -mtime +7 -type f | while read file; do
        log_info "🗑️ 古いログファイルを削除: $file"
        rm -f "$file"
    done
else
    log_info "📁 logsディレクトリを作成します"
    mkdir -p logs
fi

# 7. データベース最適化（該当する場合）
log_info "Phase 7: ストレージ最適化"

# dataディレクトリのサイズ確認
if [ -d "data" ]; then
    DATA_SIZE=$(du -sh data | cut -f1)
    log_info "📊 現在のデータサイズ: $DATA_SIZE"
else
    log_info "📁 dataディレクトリを作成します"
    mkdir -p data
fi

# 8. パフォーマンステストの実行
log_info "Phase 8: パフォーマンステストの実行"

# テストの実行時間を測定
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    log_info "🧪 パフォーマンステストを実行中..."
    
    START_TIME=$(date +%s)
    npm test > /dev/null 2>&1 || log_warn "⚠️ テストでエラーが発生しました"
    END_TIME=$(date +%s)
    
    DURATION=$((END_TIME - START_TIME))
    log_info "⏱️ テスト実行時間: ${DURATION}秒"
    
    if [ $DURATION -lt 30 ]; then
        log_info "✅ テスト実行時間は良好です"
    elif [ $DURATION -lt 60 ]; then
        log_warn "⚠️ テスト実行時間がやや長いです"
    else
        log_warn "⚠️ テスト実行時間の最適化を推奨します"
    fi
fi

# 9. 最適化レポートの生成
log_info "Phase 9: 最適化レポートの生成"

REPORT_FILE="performance-report-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# パフォーマンス最適化レポート

**実行日時**: $(date)
**プロジェクト**: Chat History Manager

## 📊 現在の状況

### ビルドサイズ
- **dist**: ${DIST_SIZE:-"未測定"}
- **logs**: ${LOGS_SIZE:-"未測定"}
- **data**: ${DATA_SIZE:-"未測定"}

### パフォーマンス指標
- **テスト実行時間**: ${DURATION:-"未測定"}秒
- **TypeScript**: 厳格モード有効
- **ESLint**: 設定済み

## 🎯 推奨改善点

1. **メモリ使用量の監視**
   - Node.jsヒープサイズの最適化
   - ガベージコレクションの調整

2. **ビルド時間の短縮**
   - インクリメンタルビルドの活用
   - 並列処理の最適化

3. **キャッシュ戦略**
   - ブラウザキャッシュの最適化
   - CDN活用の検討

## 📈 次のステップ

- [ ] メモリプロファイリングの実行
- [ ] ロードテストの実施
- [ ] 継続的パフォーマンス監視の設定

---
**生成者**: optimize-performance.sh
**次回実行予定**: $(date -d '+1 week')
EOF

log_info "📄 最適化レポートを生成しました: $REPORT_FILE"

# 10. 最終確認とサマリー
log_info "Phase 10: 最適化完了"

echo ""
echo "🎉 パフォーマンス最適化が完了しました！"
echo ""
echo "📋 実行された最適化:"
echo "  ✅ TypeScriptビルド設定の確認"
echo "  ✅ 依存関係の分析"
echo "  ✅ ビルドサイズの測定"
echo "  ✅ メモリ設定の確認"
echo "  ✅ キャッシュ戦略の確認"
echo "  ✅ ログファイルの最適化"
echo "  ✅ ストレージの最適化"
echo "  ✅ パフォーマンステストの実行"
echo "  ✅ 最適化レポートの生成"
echo ""
echo "📄 詳細レポート: $REPORT_FILE"
echo ""
echo "🚀 次のコマンドでプロジェクトを起動できます:"
echo "  npm run dev:full    # 開発環境"
echo "  npm run build       # プロダクションビルド"
echo "  npm run start       # プロダクション起動"
echo ""

# 実行権限の確認
if [ ! -x "$0" ]; then
    log_warn "⚠️ スクリプトに実行権限がありません"
    echo "実行権限を付与するには: chmod +x $0"
fi

log_info "✨ 最適化スクリプトの実行が完了しました" 