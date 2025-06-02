#!/bin/bash

# Chat History Manager - 設定API自動テストスクリプト
# 実行方法: ./scripts/test-settings-api.sh

set -e

API_BASE="http://localhost:3001/api"
SETTINGS_API="${API_BASE}/settings"

echo "🧪 Chat History Manager - 設定API自動テスト"
echo "================================================"

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# テスト結果カウンター
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# テスト関数
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}テスト ${TOTAL_TESTS}: ${test_name}${NC}"
    echo "実行: $command"
    
    if result=$(eval "$command" 2>&1); then
        if echo "$result" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✅ 成功${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            echo "結果: $(echo "$result" | jq -r '.message // .status // "OK"' 2>/dev/null || echo "OK")"
        else
            echo -e "${RED}❌ 失敗 - 期待されたパターンが見つかりません${NC}"
            echo "期待: $expected_pattern"
            echo "実際: $result"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}❌ 失敗 - コマンド実行エラー${NC}"
        echo "エラー: $result"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 1. ヘルスチェック
echo -e "\n${YELLOW}=== 基本動作テスト ===${NC}"
run_test "APIサーバーヘルスチェック" \
    "curl -s ${API_BASE}/health" \
    '"status":"ok"'

run_test "設定サービスヘルスチェック" \
    "curl -s ${SETTINGS_API}/health" \
    '"status":"healthy"'

# 2. 設定取得テスト
echo -e "\n${YELLOW}=== 設定取得テスト ===${NC}"
run_test "Cursor設定取得" \
    "curl -s ${SETTINGS_API}/cursor" \
    '"success":true'

# 3. 設定保存テスト
echo -e "\n${YELLOW}=== 設定保存テスト ===${NC}"
TEST_SETTINGS='{
  "enabled": false,
  "monitorPath": "/test/path/for/testing",
  "scanInterval": 120,
  "maxSessions": 2000,
  "autoImport": false,
  "includeMetadata": true
}'

run_test "Cursor設定保存" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '$TEST_SETTINGS' ${SETTINGS_API}/cursor" \
    '"success":true'

run_test "保存された設定の確認" \
    "curl -s ${SETTINGS_API}/cursor" \
    '"scanInterval":120'

# 4. 設定リセットテスト
echo -e "\n${YELLOW}=== 設定リセットテスト ===${NC}"
run_test "Cursor設定リセット" \
    "curl -s -X POST ${SETTINGS_API}/cursor/reset" \
    '"success":true'

run_test "リセット後の設定確認" \
    "curl -s ${SETTINGS_API}/cursor" \
    '"scanInterval":30'

# 5. バリデーションテスト
echo -e "\n${YELLOW}=== バリデーションテスト ===${NC}"
INVALID_SETTINGS='{"enabled": "invalid", "scanInterval": -1}'

run_test "無効な設定データのテスト" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '$INVALID_SETTINGS' ${SETTINGS_API}/cursor" \
    '"success":false'

# 6. エクスポートテスト
echo -e "\n${YELLOW}=== エクスポートテスト ===${NC}"
run_test "設定エクスポート" \
    "curl -s ${SETTINGS_API}/export" \
    '"cursor"'

# 7. バックアップ一覧テスト
echo -e "\n${YELLOW}=== バックアップテスト ===${NC}"
run_test "バックアップ一覧取得" \
    "curl -s ${SETTINGS_API}/backups" \
    '"success":true'

# テスト結果サマリー
echo -e "\n${YELLOW}================================================${NC}"
echo -e "${BLUE}テスト結果サマリー${NC}"
echo -e "総テスト数: ${TOTAL_TESTS}"
echo -e "${GREEN}成功: ${PASSED_TESTS}${NC}"
echo -e "${RED}失敗: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 すべてのテストが成功しました！${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  ${FAILED_TESTS}個のテストが失敗しました${NC}"
    exit 1
fi 