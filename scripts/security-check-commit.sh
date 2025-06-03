#!/bin/bash

# ⚡ 超高速コミット前セキュリティチェック
# Git ステージ領域のみを検査（最小限・最高速）

set -e

# 🚨 最重要パターンのみ
CRITICAL_ONLY=(
    "sk-[a-zA-Z0-9-_]{32,}"    # OpenAI APIキー
    "gh[pous]_[a-zA-Z0-9]{36}" # GitHub Token (統合正規表現)
)

echo "⚡ 超高速コミット前チェック..."

# Git ステージ検査のみ
if git diff --cached --quiet 2>/dev/null; then
    echo "✅ ステージなし - OK"
    exit 0
fi

# ステージ内容取得
staged_diff=$(git diff --cached 2>/dev/null)

# 重要パターンのみ検査
for pattern in "${CRITICAL_ONLY[@]}"; do
    if echo "$staged_diff" | grep -q -E "$pattern"; then
        echo "🚨 BLOCKED: 機密情報パターン検出"
        echo "   パターン: $pattern"
        echo "   コミットを中止してください"
        exit 1
    fi
done

echo "✅ コミット安全 - OK"
exit 0 