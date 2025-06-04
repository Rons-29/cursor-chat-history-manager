#!/bin/bash

# ChatFlow ポート確認・管理スクリプト
# 統一ポート設定に基づく自動ポート管理

set -e

# 設定値読み込み（TypeScriptファイルから抽出）
API_PORT=3001
WEB_DEV_PORT=5173
WEB_PROD_PORT=5000
DEMO_PORT=5180

# カラー設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔌 ChatFlow ポート状況確認"
echo "============================"

# ポート使用状況確認関数
check_port() {
    local port=$1
    local service_name=$2
    
    local pid=$(lsof -ti :$port 2>/dev/null | head -1)
    if [ -n "$pid" ]; then
        local process_name=$(ps -p $pid -o comm= 2>/dev/null | tr -d ' ' || echo "unknown")
        echo -e "${RED}❌ $service_name (ポート $port): 使用中${NC}"
        echo "   プロセス: $process_name (PID: $pid)"
        return 1
    else
        echo -e "${GREEN}✅ $service_name (ポート $port): 利用可能${NC}"
        return 0
    fi
}

# 全ポート確認
echo "📊 統一ポート設定確認:"
echo "  - APIサーバー: $API_PORT"
echo "  - WebUI開発: $WEB_DEV_PORT"
echo "  - WebUI本番: $WEB_PROD_PORT"
echo "  - デモ用: $DEMO_PORT"
echo ""

check_port $API_PORT "APIサーバー"
api_available=$?

check_port $WEB_DEV_PORT "WebUI開発"
web_dev_available=$?

check_port $WEB_PROD_PORT "WebUI本番"
web_prod_available=$?

check_port $DEMO_PORT "デモ用"
demo_available=$?

echo ""

# 問題解決提案
if [ $api_available -ne 0 ] || [ $web_dev_available -ne 0 ]; then
    echo -e "${YELLOW}⚠️  ポート競合が検出されました${NC}"
    echo ""
    echo "🔧 解決方法:"
    echo "  1. 自動クリーンアップ実行:"
    echo "     ./scripts/port-check.sh --clean"
    echo ""
    echo "  2. 手動停止:"
    if [ $api_port_available -ne 0 ]; then
        echo "     lsof -ti :$API_PORT | xargs kill -9"
    fi
    if [ $web_dev_available -ne 0 ]; then
        echo "     lsof -ti :$WEB_DEV_PORT | xargs kill -9"
    fi
    echo ""
    echo "  3. ChatFlow専用停止スクリプト:"
    echo "     ./scripts/stop.sh"
else
    echo -e "${GREEN}🎉 全ポートが利用可能です！${NC}"
    echo ""
    echo "🚀 ChatFlow起動準備完了:"
    echo "  ./scripts/start-all.sh dev"
fi

# クリーンアップオプション
if [[ "$1" == "--clean" ]]; then
    echo ""
    echo -e "${BLUE}🧹 ポートクリーンアップ実行中...${NC}"
    
    cleanup_port() {
        local port=$1
        local service_name=$2
        
        local pid=$(lsof -ti :$port 2>/dev/null | head -1)
        if [ -n "$pid" ]; then
            echo "🔧 $service_name (ポート $port) のプロセスを停止中..."
            echo "   PID: $pid"
            kill -9 $pid 2>/dev/null || true
            sleep 2
            
            local new_pid=$(lsof -ti :$port 2>/dev/null | head -1)
            if [ -z "$new_pid" ]; then
                echo -e "${GREEN}✅ $service_name 停止完了${NC}"
            else
                echo -e "${RED}❌ $service_name 停止失敗${NC}"
            fi
        else
            echo -e "${BLUE}ℹ️  $service_name (ポート $port) は使用されていません${NC}"
        fi
    }
    
    cleanup_port $API_PORT "APIサーバー"
    cleanup_port $WEB_DEV_PORT "WebUI開発"
    cleanup_port $WEB_PROD_PORT "WebUI本番"
    cleanup_port $DEMO_PORT "デモ用"
    
    echo ""
    echo -e "${GREEN}🎉 ポートクリーンアップ完了！${NC}"
    echo "再度ポート確認を実行: ./scripts/port-check.sh"
fi

# 使用方法
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo ""
    echo "📋 使用方法:"
    echo "  ./scripts/port-check.sh           # ポート使用状況確認"
    echo "  ./scripts/port-check.sh --clean   # ポート自動クリーンアップ"
    echo "  ./scripts/port-check.sh --help    # このヘルプ表示"
fi 