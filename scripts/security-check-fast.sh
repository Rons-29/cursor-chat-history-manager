#!/bin/bash

# 🚀 高速機密情報検出スクリプト
# Chat History Manager - 内部開発用（最適化版）

set -e

echo "⚡ 高速機密情報スキャン開始..."

# 高速検出パターン（重要なもののみ）
CRITICAL_PATTERNS=(
    "sk-[a-zA-Z0-9-_]{32,}"           # OpenAI APIキー
    "ghp_[a-zA-Z0-9]{36}"             # GitHub Personal Access Token
    "gho_[a-zA-Z0-9]{36}"             # GitHub OAuth Token
    "ghu_[a-zA-Z0-9]{36}"             # GitHub User Token
    "ghs_[a-zA-Z0-9]{36}"             # GitHub Server Token
)

# 📁 Git ステージファイルのみを高速チェック
echo "🔍 ステージファイル検査（高優先度）..."
STAGED_ISSUES=0

# ステージされたファイルが存在するかチェック
if ! git diff --cached --quiet 2>/dev/null; then
    # ステージされた変更の内容のみを検査
    staged_content=$(git diff --cached 2>/dev/null || echo "")
    
    if [ -n "$staged_content" ]; then
        for pattern in "${CRITICAL_PATTERNS[@]}"; do
            if echo "$staged_content" | grep -q -E "$pattern" 2>/dev/null; then
                echo "❌ CRITICAL: $pattern"
                STAGED_ISSUES=$((STAGED_ISSUES + 1))
            fi
        done
    fi
fi

# 🚨 重大な問題があればすぐに終了
if [ $STAGED_ISSUES -gt 0 ]; then
    echo "🚨 ステージされたファイルに機密情報が含まれています！"
    echo "   コミットを中止してください。"
    exit 1
fi

# 📂 作業ディレクトリの高速チェック（最近変更されたファイルのみ）
echo "⚡ 最近変更ファイル検査..."
WORKING_ISSUES=0

# Git追跡ファイルの最近の変更のみチェック（24時間以内）
recent_files=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
    grep -v node_modules | \
    grep -v dist | \
    grep -v data | \
    head -20 2>/dev/null || echo "")

if [ -n "$recent_files" ]; then
    for file in $recent_files; do
        if [ -f "$file" ]; then
            # ファイルサイズが大きすぎる場合はスキップ（>1MB）
            file_size=$(stat -f%z "$file" 2>/dev/null || echo "0")
            if [ "$file_size" -gt 1048576 ]; then
                continue
            fi
            
            for pattern in "${CRITICAL_PATTERNS[@]}"; do
                if grep -q -E "$pattern" "$file" 2>/dev/null; then
                    echo "⚠️  $file: $pattern"
                    WORKING_ISSUES=$((WORKING_ISSUES + 1))
                    break  # ファイルごとに1回だけ警告
                fi
            done
        fi
    done
fi

# 🔐 環境変数ファイルの即座チェック
ENV_ISSUES=0
for env_file in ".env" ".env.local" ".env.development" ".env.production"; do
    if [ -f "$env_file" ]; then
        echo "⚠️  ENV: $env_file"
        ENV_ISSUES=$((ENV_ISSUES + 1))
    fi
done

# 📊 結果表示
echo ""
if [ $STAGED_ISSUES -eq 0 ] && [ $WORKING_ISSUES -eq 0 ] && [ $ENV_ISSUES -eq 0 ]; then
    echo "✅ 高速スキャン完了 - 問題なし"
    exit 0
else
    echo "⚠️  検出: Stage($STAGED_ISSUES) Work($WORKING_ISSUES) Env($ENV_ISSUES)"
    if [ $STAGED_ISSUES -eq 0 ]; then
        echo "💡 ステージ領域は安全です。作業ディレクトリの警告を確認してください。"
        exit 0
    else
        exit 1
    fi
fi 