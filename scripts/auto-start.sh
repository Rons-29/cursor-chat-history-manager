#!/bin/bash

# Chat History Manager 自動起動スクリプト
# .mdcルール準拠: プロダクション対応の開発環境自動化

set -e  # エラー時に停止

echo "🚀 Chat History Manager 自動起動スクリプト"
echo "====================================="

# プロジェクトディレクトリに移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "📂 プロジェクトディレクトリ: $PROJECT_DIR"

# Node.js バージョンチェック
echo "🔍 Node.js バージョンチェック..."
node_version=$(node -v | grep -o '[0-9]\+' | head -1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Node.js 18以上が必要です (現在: $(node -v))"
    exit 1
fi
echo "✅ Node.js バージョン: $(node -v)"

# 依存関係インストール
echo "📦 依存関係確認・インストール..."
if [ ! -d "node_modules" ]; then
    echo "📥 初回セットアップ: 依存関係をインストール中..."
    npm install
else
    echo "✅ node_modules存在確認"
fi

# TypeScript ビルド
echo "🔨 TypeScript ビルド..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ TypeScript ビルド失敗"
    exit 1
fi
echo "✅ ビルド完了"

# 設定ディレクトリ作成
echo "📁 設定ディレクトリ準備..."
mkdir -p ~/.chat-history-manager
mkdir -p data/sessions
mkdir -p data/exports
mkdir -p data/backups
echo "✅ ディレクトリ準備完了"

# ポート確認・解放
echo "🔌 ポート確認..."
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  ポート $port は使用中です。プロセスを停止しています..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    echo "✅ ポート $port 利用可能"
}

check_port 3000
check_port 3001

# デーモンプロセス起動
echo "🌐 WebUIサーバー起動..."
echo "💻 APIサーバー: http://localhost:3001"
echo "🎨 フロントエンド: http://localhost:3000"
echo ""
echo "🛑 停止方法: Ctrl+C または scripts/stop.sh"
echo ""

# フルスタック起動
npm run dev:full

echo ""
echo "✅ Chat History Manager 起動完了！"
echo "🌐 ブラウザで http://localhost:3000 を開いてください"
echo "" 