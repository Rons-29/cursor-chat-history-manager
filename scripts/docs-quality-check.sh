#!/bin/bash

# 📚 Chat History Manager - ドキュメント品質チェックスクリプト
# ドキュメント整合性・最新性・統合原則準拠をチェック

set -e

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# 設定
DOCS_DIR="docs"
NOTES_DIR="notes"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_ROOT"

log_info "📚 ドキュメント品質チェック開始..."

# 1. 統合原則整合性チェック
log_info "🔍 統合原則整合性チェック中..."

check_integration_consistency() {
    local issues=0
    
    # 旧CLI残存チェック
    if grep -r "chat-history-manager search" "$DOCS_DIR/" 2>/dev/null; then
        log_error "旧CLIコマンド残存検出"
        ((issues++))
    fi
    
    # 旧ポート番号チェック
    if grep -r "localhost:3000" "$DOCS_DIR/" 2>/dev/null; then
        log_error "旧ポート番号（3000）残存検出"
        ((issues++))
    fi
    
    # 旧API残存チェック
    if grep -r "/api/chat" "$DOCS_DIR/" 2>/dev/null; then
        log_error "旧API形式残存検出"
        ((issues++))
    fi
    
    # 分散DB参照チェック
    if grep -r "data/chat\.db" "$DOCS_DIR/" 2>/dev/null; then
        log_error "分散データベース参照残存検出"
        ((issues++))
    fi
    
    if [ $issues -eq 0 ]; then
        log_success "統合原則整合性チェック: 問題なし"
    else
        log_error "統合原則整合性チェック: $issues 件の問題検出"
    fi
    
    return $issues
}

# 2. リンク整合性チェック
log_info "🔗 リンク整合性チェック中..."

check_link_integrity() {
    local broken_links=0
    
    find "$DOCS_DIR/" -name "*.md" -exec grep -l "](.*\.md)" {} \; | while read -r file; do
        log_info "リンクチェック: $file"
        
        # Markdownリンクを抽出してチェック
        grep -o '](.*\.md)' "$file" | sed 's/](\(.*\))/\1/' | while read -r link; do
            # 相対パスを絶対パスに変換
            if [[ "$link" != /* ]]; then
                link="$(dirname "$file")/$link"
            fi
            
            if [ ! -f "$link" ]; then
                log_warning "リンク切れ: $file -> $link"
                ((broken_links++))
            fi
        done
    done
    
    if [ $broken_links -eq 0 ]; then
        log_success "リンク整合性チェック: 問題なし"
    else
        log_warning "リンク整合性チェック: $broken_links 件の問題検出"
    fi
}

# 3. 最新性確認
log_info "📅 最新性確認中..."

check_freshness() {
    local outdated=0
    
    # 2024年以前の日付検出
    if grep -r "2024" "$DOCS_DIR/" 2>/dev/null; then
        log_warning "古い日付（2024年）を検出:"
        grep -rn "2024" "$DOCS_DIR/" 2>/dev/null
        ((outdated++))
    fi
    
    # 2023年以前の日付検出
    if grep -r "2023" "$DOCS_DIR/" 2>/dev/null; then
        log_error "非常に古い日付（2023年以前）を検出:"
        grep -rn "2023" "$DOCS_DIR/" 2>/dev/null
        ((outdated++))
    fi
    
    if [ $outdated -eq 0 ]; then
        log_success "最新性確認: 問題なし"
    else
        log_warning "最新性確認: $outdated 件の古い日付検出"
    fi
}

# 4. 必須ドキュメント存在確認
log_info "📋 必須ドキュメント存在確認中..."

check_required_docs() {
    local missing=0
    local required_docs=(
        "API_SPEC.md"
        "USAGE.md"
        "SECURITY.md"
        "FINAL_INTEGRATION_SUMMARY.md"
        "FRONTEND_INTEGRATION_GUIDE.md"
        "INTEGRATION_MONITORING_GUIDE.md"
        "INTEGRATION_COMMANDS_REFERENCE.md"
    )
    
    for doc in "${required_docs[@]}"; do
        if [ ! -f "$DOCS_DIR/$doc" ]; then
            log_error "必須ドキュメント不在: $doc"
            ((missing++))
        fi
    done
    
    if [ $missing -eq 0 ]; then
        log_success "必須ドキュメント存在確認: 全て存在"
    else
        log_error "必須ドキュメント存在確認: $missing 件不足"
    fi
    
    return $missing
}

# 5. 統合API整合性チェック
log_info "🔌 統合API整合性チェック中..."

check_api_consistency() {
    local api_issues=0
    
    # unified-api.ts実装と一致確認
    if [ -f "src/server/routes/unified-api.ts" ]; then
        log_info "unified-api.ts実装と照合中..."
        
        # API_SPEC.mdでの統合エンドポイント記載確認
        if ! grep -q "/api/sessions" "$DOCS_DIR/API_SPEC.md" 2>/dev/null; then
            log_error "API_SPEC.mdに統合エンドポイント記載なし"
            ((api_issues++))
        fi
        
        # USAGE.mdでの統合API使用例確認
        if ! grep -q "apiClient.getSessions" "$DOCS_DIR/USAGE.md" 2>/dev/null; then
            log_error "USAGE.mdに統合API使用例なし"
            ((api_issues++))
        fi
    else
        log_warning "unified-api.ts が見つかりません"
        ((api_issues++))
    fi
    
    if [ $api_issues -eq 0 ]; then
        log_success "統合API整合性チェック: 問題なし"
    else
        log_error "統合API整合性チェック: $api_issues 件の問題検出"
    fi
    
    return $api_issues
}

# 6. ドキュメント品質スコア算出
calculate_quality_score() {
    local total_checks=5
    local passed_checks=0
    
    check_integration_consistency && ((passed_checks++))
    check_required_docs && ((passed_checks++))
    check_api_consistency && ((passed_checks++))
    check_link_integrity && ((passed_checks++))
    check_freshness && ((passed_checks++))
    
    local score=$((passed_checks * 100 / total_checks))
    
    echo ""
    log_info "📊 ドキュメント品質スコア: $score% ($passed_checks/$total_checks)"
    
    if [ $score -ge 90 ]; then
        log_success "ドキュメント品質: 優秀"
    elif [ $score -ge 70 ]; then
        log_warning "ドキュメント品質: 良好（改善推奨）"
    else
        log_error "ドキュメント品質: 要改善"
    fi
    
    return $((100 - score))
}

# 7. 改善推奨事項の提示
show_recommendations() {
    echo ""
    log_info "🔧 改善推奨事項:"
    echo "1. 統合原則準拠: npm run check:integration で定期確認"
    echo "2. API整合性: 統合API変更時は API_SPEC.md + USAGE.md 同時更新"
    echo "3. リンク確認: ドキュメント編集時は相互リンクをチェック"
    echo "4. 最新性維持: 日付・バージョン情報を最新に保つ"
    echo "5. 定期レビュー: npm run monthly:review で月次チェック"
}

# メイン実行
main() {
    echo "=================================================="
    echo "📚 Chat History Manager - ドキュメント品質チェック"
    echo "=================================================="
    echo ""
    
    calculate_quality_score
    show_recommendations
    
    echo ""
    log_info "ドキュメント品質チェック完了"
    echo "詳細は上記の各チェック結果を参照してください"
}

main "$@" 