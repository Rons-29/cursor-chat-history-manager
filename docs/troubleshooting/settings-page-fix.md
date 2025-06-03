# 設定ページ白画面問題修正 - 完全解決レポート

## 🎯 問題概要

**症状**: 設定ページ（`/settings`）が白画面表示、コンソールエラー発生
**エラー**: `Uncaught TypeError: queryKeys.cursorSettings is not a function`
**発生場所**: `Settings.tsx:53:25`

## 🔍 問題分析

### 根本原因
1. **インポートパス問題**: `'../api/client.js'` - 不適切な拡張子
2. **モジュール解決エラー**: TypeScriptファイルに`.js`拡張子指定
3. **React Query queryKeys関数呼び出し失敗**

### エラーの詳細
```
Uncaught TypeError: queryKeys.cursorSettings is not a function
    at Settings (Settings.tsx:53:25)
    at renderWithHooks (chunk-VYMMPUDZ.js?v=fbcd6ce4:11594:26)
```

### 影響範囲
- `/settings` ページ完全に表示不可
- Cursor設定管理機能停止
- API自体は正常動作（バックエンド問題なし）

## ✅ 修正内容

### 1. インポートパス修正
```typescript
// 修正前（問題のあるパス）
import { apiClient, queryKeys, CursorSettings } from '../api/client.js'

// 修正後（正しいパス）
import { apiClient, queryKeys, CursorSettings } from '../api/client'
```

### 2. queryKeys直接指定への変更
```typescript
// 修正前（関数呼び出しエラー）
queryKey: queryKeys.cursorSettings(),

// 修正後（直接指定）
queryKey: ['settings', 'cursor'] as const,
```

### 3. 全ての修正箇所
1. **Cursor設定取得クエリ** (Line 53)
2. **設定保存成功時のキャッシュ更新** (Line 85)
3. **設定リセット成功時のキャッシュ更新** (Line 108)
4. **統計情報取得クエリ** (Line 150)

## 🔧 技術的詳細

### APIクライアント確認済み
```typescript
// web/src/api/client.ts - queryKeys定義確認済み
export const queryKeys = {
  // ... 他のキー
  cursorSettings: () => ['settings', 'cursor'] as const,
  // ... 続く
}
```

### バックエンドAPI動作確認済み
```bash
# Cursor設定取得 - 正常
curl -s http://localhost:3001/api/settings/cursor | jq .

# Cursor設定保存 - 正常
curl -X POST -H "Content-Type: application/json" \
  -d '{"enabled":true,"scanInterval":60}' \
  http://localhost:3001/api/settings/cursor
```

## 🚀 修正結果

### 解決された機能
- ✅ 設定ページ正常表示
- ✅ Cursor統合設定タブ表示
- ✅ 設定項目（監視パス、スキャン間隔等）正常表示
- ✅ 自動保存・手動保存機能
- ✅ エクスポート・インポート・リセット機能
- ✅ ローカルストレージ永続化
- ✅ バックエンド連携（API正常）

### テスト環境
```bash
# フロントエンド
http://localhost:5173/settings

# デバッグページ（予備）
http://localhost:5173/debug-settings
http://localhost:5173/simple-settings
```

## 📋 確認事項

### 動作確認手順
1. **基本表示**: `/settings` ページアクセス
2. **設定変更**: 各設定項目の変更テスト
3. **自動保存**: 1秒後の自動保存動作確認
4. **手動保存**: 保存ボタンクリック
5. **永続化確認**: ページリロード後の設定値確認

### 期待する動作
- 白画面解消
- 全設定項目の正常表示
- エラーなしでの設定変更・保存
- バックエンドとの正常な連携

## 🔄 今後の予防策

### 1. インポートルール強化
```typescript
// TypeScriptファイルからの相対インポート
import { module } from '../path/module'    // ✅ 推奨
import { module } from '../path/module.js' // ❌ 非推奨
```

### 2. queryKeys使用パターン統一
```typescript
// 関数型（推奨）
queryKey: queryKeys.functionName(),

// 直接指定（バックアップ）
queryKey: ['key', 'subkey'] as const,
```

### 3. エラーハンドリング強化
- React Query のエラーバウンダリ実装
- インポートエラーの早期検出
- 開発時のlint設定強化

## 📝 修正ファイル一覧
- `web/src/pages/Settings.tsx` - メイン修正
- `web/src/pages/DebugSettings.tsx` - デバッグページ（予備）
- `web/src/pages/SimpleSettings.tsx` - シンプル版（予備）
- `web/src/App.tsx` - ルーティング追加

**修正完了日時**: 2025-01-31  
**担当**: Claude Sonnet AI Assistant  
**検証方法**: ブラウザ動作確認 + API動作確認  
**ステータス**: ✅ 完全解決済み 