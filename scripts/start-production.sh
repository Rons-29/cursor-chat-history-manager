#!/bin/bash
# ChatFlow プロダクションサーバー起動スクリプト

cd "$(dirname "$0")/.."
source .env.production 2>/dev/null || true

echo "🚀 ChatFlow プロダクションサーバー起動中..."
echo "📅 起動日時: $(date)"
echo "🔧 Node.js: $(node -v)"
echo "🌐 ポート: ${PORT:-3001}"

# ログディレクトリ作成
mkdir -p logs

# プロダクションサーバー起動
exec node dist/server/real-api-server.js 2>&1 | tee logs/production.log
