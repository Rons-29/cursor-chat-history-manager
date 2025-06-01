#!/bin/bash

# Chat History Manager - 全サービス起動スクリプト
# 使用方法: ./scripts/start-all.sh [mode]
# mode: dev (開発), prod (本番), quick (クイック開発)

set -e

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 使用方法表示
show_usage() {
    echo "Chat History Manager - 全サービス起動スクリプト"
    echo ""
    echo "使用方法:"
    echo "  ./scripts/start-all.sh [mode]"
    echo ""
    echo "モード:"
    echo "  dev     - 開発モード (Real API + Web + CLI監視)"
    echo "  prod    - 本番モード (Real API + Web本番ビルド)"
    echo "  quick   - クイック開発モード (Mock API + Web)"
    echo "  help    - このヘルプを表示"
    echo ""
    echo "例:"
    echo "  ./scripts/start-all.sh dev"
    echo "  ./scripts/start-all.sh quick"
}

# 前提条件チェック
check_prerequisites() {
    log_step "前提条件をチェック中..."
    
    # Node.js バージョンチェック
    if ! command -v node &> /dev/null; then
        log_error "Node.js がインストールされていません"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 16 ]; then
        log_error "Node.js 16以上が必要です (現在: $(node --version))"
        exit 1
    fi
    
    # npm パッケージチェック
    if [ ! -d "node_modules" ]; then
        log_warn "node_modules が見つかりません。npm install を実行します..."
        npm install
    fi
    
    # concurrently チェック
    if ! npm list concurrently &> /dev/null; then
        log_error "concurrently がインストールされていません"
        log_info "npm install を実行してください"
        exit 1
    fi
    
    log_info "前提条件チェック完了"
}

# ディレクトリ作成
create_directories() {
    log_step "必要なディレクトリを作成中..."
    
    mkdir -p data/chat-history
    mkdir -p data/cursor-logs
    mkdir -p logs
    mkdir -p dist
    
    log_info "ディレクトリ作成完了"
}

# TypeScript ビルド
build_typescript() {
    log_step "TypeScript をビルド中..."
    
    if ! npm run build; then
        log_error "TypeScript ビルドに失敗しました"
        exit 1
    fi
    
    log_info "TypeScript ビルド完了"
}

# 開発モード起動
start_dev_mode() {
    log_info "🚀 開発モードで起動します"
    log_info "サービス構成:"
    log_info "  - ${BLUE}API${NC}: Real API Server (http://localhost:3001)"
    log_info "  - ${GREEN}WEB${NC}: Vite Dev Server (http://localhost:5173)"
    log_info "  - ${YELLOW}CLI${NC}: Integration Watch Service"
    echo ""
    
    build_typescript
    
    # 開発モードで起動（直接concurrentlyを使用）
    npx concurrently \
        --names "API,WEB" \
        --prefix-colors "blue,green" \
        "npm run server:dev" \
        "npm run web:dev"
}

# 本番モード起動
start_prod_mode() {
    log_info "🏭 本番モードで起動します"
    log_info "サービス構成:"
    log_info "  - ${BLUE}API${NC}: Real API Server (http://localhost:3001)"
    log_info "  - ${GREEN}WEB${NC}: Vite Preview Server (http://localhost:4173)"
    echo ""
    
    build_typescript
    
    # Web ビルド
    log_step "Web アプリケーションをビルド中..."
    npm run web:build
    
    # 本番モードで起動（直接concurrentlyを使用）
    npx concurrently \
        --names "API,WEB" \
        --prefix-colors "blue,green" \
        "npm run server:prod" \
        "npm run web:preview"
}

# クイック開発モード起動
start_quick_mode() {
    log_info "⚡ クイック開発モードで起動します"
    log_info "サービス構成:"
    log_info "  - ${CYAN}MOCK${NC}: Simple Mock API Server (http://localhost:3001)"
    log_info "  - ${GREEN}WEB${NC}: Vite Dev Server (http://localhost:5173)"
    echo ""
    log_warn "注意: このモードはモックAPIを使用します（実際のデータ処理は行われません）"
    echo ""
    
    # クイック開発モードで起動（直接concurrentlyを使用）
    npx concurrently \
        --names "MOCK,WEB" \
        --prefix-colors "cyan,green" \
        "npm run simple-server" \
        "npm run web:dev"
}

# メイン処理
main() {
    local mode=${1:-"help"}
    
    echo "🎉 やるぞ！Chat History Manager！"
    echo "- セキュリティ → 🔒 バッチリ！"
    echo "- パフォーマンス → ⚡ 最速！"
    echo "- コード品質 → ✨ 完璧！"
    echo "今日も最高の履歴管理システムを作ります！"
    echo ""
    
    case "$mode" in
        "dev")
            check_prerequisites
            create_directories
            start_dev_mode
            ;;
        "prod")
            check_prerequisites
            create_directories
            start_prod_mode
            ;;
        "quick")
            check_prerequisites
            start_quick_mode
            ;;
        "help"|*)
            show_usage
            exit 0
            ;;
    esac
}

# Ctrl+C でのクリーンアップ
cleanup() {
    log_warn "終了シグナルを受信しました。サービスを停止中..."
    # concurrently が子プロセスを適切に終了させる
    exit 0
}

trap cleanup SIGINT SIGTERM

# スクリプト実行
main "$@" 