#!/bin/bash

# Chat History Manager 停止スクリプト
# .mdcルール準拠: 安全なプロセス終了とクリーンアップ

set -e  # エラー時に停止

echo "🛑 Chat History Manager 停止スクリプト"
echo "====================================="

# プロセス停止関数
stop_process_on_port() {
    local port=$1
    local service_name=$2
    
    echo "🔍 ポート $port ($service_name) のプロセスを確認中..."
    
    # ポートを使用しているプロセスを検索
    pids=$(lsof -ti :$port 2>/dev/null || echo "")
    
    if [ -z "$pids" ]; then
        echo "✅ ポート $port に実行中のプロセスはありません"
        return 0
    fi
    
    echo "⚠️  ポート $port で実行中のプロセスを停止します: $pids"
    
    # 段階的にプロセスを停止
    echo "📝 SIGTERM送信..."
    echo "$pids" | xargs -r kill -TERM 2>/dev/null || true
    sleep 3
    
    # まだ実行中の場合は強制停止
    remaining_pids=$(lsof -ti :$port 2>/dev/null || echo "")
    if [ ! -z "$remaining_pids" ]; then
        echo "💀 SIGKILL送信（強制停止）..."
        echo "$remaining_pids" | xargs -r kill -KILL 2>/dev/null || true
        sleep 1
    fi
    
    # 最終確認
    final_check=$(lsof -ti :$port 2>/dev/null || echo "")
    if [ -z "$final_check" ]; then
        echo "✅ $service_name 停止完了"
    else
        echo "❌ $service_name の停止に失敗しました"
        return 1
    fi
}

# Node.js関連プロセス停止
echo "🔍 Chat History Manager関連のプロセスを検索中..."

# concurrently プロセス停止
concurrently_pids=$(pgrep -f "concurrently.*chat-history-manager" 2>/dev/null || echo "")
if [ ! -z "$concurrently_pids" ]; then
    echo "🛑 concurrently プロセスを停止: $concurrently_pids"
    echo "$concurrently_pids" | xargs -r kill -TERM 2>/dev/null || true
    sleep 2
fi

# vite プロセス停止
vite_pids=$(pgrep -f "vite.*chat-history-manager" 2>/dev/null || echo "")
if [ ! -z "$vite_pids" ]; then
    echo "🛑 Vite プロセスを停止: $vite_pids"
    echo "$vite_pids" | xargs -r kill -TERM 2>/dev/null || true
    sleep 2
fi

# API サーバープロセス停止
api_pids=$(pgrep -f "node.*server.*app.js" 2>/dev/null || echo "")
if [ ! -z "$api_pids" ]; then
    echo "🛑 API サーバープロセスを停止: $api_pids"
    echo "$api_pids" | xargs -r kill -TERM 2>/dev/null || true
    sleep 2
fi

# ポート別停止
stop_process_on_port 3000 "フロントエンド(Vite)"
stop_process_on_port 3001 "APIサーバー(Express)"

# TypeScript関連プロセス停止
tsc_pids=$(pgrep -f "tsc.*--watch" 2>/dev/null || echo "")
if [ ! -z "$tsc_pids" ]; then
    echo "🛑 TypeScript watch プロセスを停止: $tsc_pids"
    echo "$tsc_pids" | xargs -r kill -TERM 2>/dev/null || true
fi

# 一時ファイルクリーンアップ
echo "🧹 一時ファイルクリーンアップ..."

# Vite キャッシュクリア
if [ -d "node_modules/.vite" ]; then
    echo "🗑️  Vite キャッシュをクリア"
    rm -rf node_modules/.vite
fi

# TypeScript キャッシュクリア
if [ -f "tsconfig.tsbuildinfo" ]; then
    echo "🗑️  TypeScript ビルド情報をクリア"
    rm -f tsconfig.tsbuildinfo
fi

# ロックファイル確認
if [ -f ".chat-history-manager.lock" ]; then
    echo "🗑️  アプリケーションロックファイルを削除"
    rm -f .chat-history-manager.lock
fi

echo ""
echo "✅ Chat History Manager 停止・クリーンアップ完了"
echo "🔌 ポート 3000, 3001 が解放されました"
echo "🚀 再起動は scripts/auto-start.sh で実行できます"
echo "" 