#!/bin/bash

# Claude DEV統合ガードスクリプト
# 冗長化・整合性問題を自動検出して予防

echo "🛡️ Claude DEV統合ガード実行中..."

# 設定
ERROR_COUNT=0
UNIFIED_DB="chat-history.db"

# カラー設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# エラー関数
error() {
    echo -e "${RED}❌ $1${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
}

# 警告関数
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 成功関数
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo ""
echo "📋 チェック項目:"
echo "1. データベースパス統一検証"
echo "2. 重複APIエンドポイント検出"
echo "3. 独立サービス禁止チェック"
echo "4. 設定ファイル重複検出"
echo "5. ファイル命名規則確認"
echo ""

# 1. データベースパス統一チェック
echo "🔍 1. データベースパス統一チェック..."
DB_PATHS=$(find src/ -name "*.ts" -exec grep -l "\.db'" {} \; 2>/dev/null | xargs grep -o "'[^']*\.db'" 2>/dev/null | sort | uniq)

if [ -z "$DB_PATHS" ]; then
    success "データベースパスが見つかりません（問題なし）"
else
    # chat-history.db以外のパスをチェック
    NON_UNIFIED_PATHS=$(echo "$DB_PATHS" | grep -v "$UNIFIED_DB" || true)
    
    if [ -z "$NON_UNIFIED_PATHS" ]; then
        success "データベースパスが統一されています (全て $UNIFIED_DB)"
    else
        error "統一されていないデータベースパスが検出されました:"
        echo "$NON_UNIFIED_PATHS" | while read path; do
            echo "  🚫 $path"
        done
        echo ""
        echo "✅ 統一済みパス:"
        echo "$DB_PATHS" | grep "$UNIFIED_DB" | while read path; do
            echo "  ✅ $path"
        done
    fi
fi

# 2. API統合状況確認
echo ""
echo "🔍 2. API統合状況確認..."
if [ -f "src/server/routes/unified-api.ts" ]; then
    success "統合APIルート (unified-api.ts) が作成されています"
    
    # 統合APIで処理されるエンドポイントをカウント
    UNIFIED_ENDPOINTS=$(grep -o "router\.[a-z]*(['\"][^'\"]*['\"]" src/server/routes/unified-api.ts 2>/dev/null | wc -l)
    
    if [ "$UNIFIED_ENDPOINTS" -gt 5 ]; then
        success "統合APIが $UNIFIED_ENDPOINTS 個のエンドポイントを処理しています"
    else
        warning "統合APIのエンドポイント数が少ない可能性があります: $UNIFIED_ENDPOINTS 個"
    fi
    
    # メインサーバーでの統合API使用確認
    if grep -q "unifiedApiRoutes" src/server/real-api-server.ts 2>/dev/null; then
        success "メインサーバーで統合APIルートが使用されています"
    else
        error "メインサーバーで統合APIルートが使用されていません"
    fi
else
    error "統合APIルート (unified-api.ts) が見つかりません"
fi

# 3. 独立サービス禁止チェック
echo ""
echo "🔍 3. 独立サービス禁止チェック..."
PROHIBITED_SERVICES=$(find src/services/ -name "*Service.ts" 2>/dev/null | \
                     xargs grep -l "class.*Service.*extends" 2>/dev/null | \
                     xargs basename -s .ts 2>/dev/null | \
                     grep -v -E "(ChatHistory|Integration|Config|Analytics|AutoSave|Export|CursorLog|CursorWatcher|CursorIntegration|Tag|SessionTitle|IncrementalIndex|SqliteIndex)")

if [ -z "$PROHIBITED_SERVICES" ]; then
    success "禁止された独立サービスは見つかりませんでした"
else
    error "禁止された独立サービスが検出されました:"
    echo "$PROHIBITED_SERVICES" | while read service; do
        echo "  🚫 ${service}Service.ts"
    done
fi

# 4. 設定ファイル重複検出
echo ""
echo "🔍 4. 設定ファイル重複検出..."
CONFIG_FILES=$(find . -name "*claude-dev*" -type f 2>/dev/null | grep -v node_modules | grep -v .git)

if [ -z "$CONFIG_FILES" ]; then
    success "Claude DEV専用ファイルは見つかりませんでした"
else
    warning "Claude DEV関連ファイルが検出されました（要確認）:"
    echo "$CONFIG_FILES" | while read file; do
        echo "  ⚠️  $file"
    done
fi

# 5. ファイル命名規則確認
echo ""
echo "🔍 5. ファイル命名規則確認..."
INVALID_NAMES=$(find src/ scripts/ -name "*.ts" -o -name "*.js" -o -name "*.cjs" 2>/dev/null | \
               grep -E "(debug-|test-.*-service|.*-claude-dev)" | \
               grep -v node_modules)

if [ -z "$INVALID_NAMES" ]; then
    success "ファイル命名規則に違反はありません"
else
    error "命名規則違反ファイルが検出されました:"
    echo "$INVALID_NAMES" | while read file; do
        echo "  🚫 $file"
    done
fi

# 結果サマリー
echo ""
echo "📊 チェック結果サマリー:"
if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 すべてのチェックに合格しました！${NC}"
    echo "Claude DEV統合の冗長化・整合性問題は検出されませんでした。"
    exit 0
else
    echo -e "${RED}💥 $ERROR_COUNT 個のエラーが検出されました${NC}"
    echo ""
    echo "🔧 修正が必要な項目："
    echo "- データベースパスを 'data/$UNIFIED_DB' に統一してください"
    echo "- 重複APIエンドポイントを統合してください"
    echo "- 独立サービスをアダプターパターンに変更してください"
    echo "- 分散設定ファイルを統合してください"
    echo "- ファイル命名規則に従ってリネームしてください"
    echo ""
    echo "詳細な修正方法は CLAUDE_DEV_REFACTORING_ISSUES.md を参照してください。"
    exit 1
fi 