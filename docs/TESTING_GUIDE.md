# Chat History Manager - テストガイド

## 🧪 **テスト概要**

このガイドでは、Chat History Managerの設定機能（バックエンドAPI + フロントエンドUI）の包括的なテストを実行します。

## 🚀 **事前準備**

### 1. サーバー起動確認
```bash
# APIサーバーが起動していることを確認
curl -s http://localhost:3001/api/health | jq .

# WebUIサーバーが起動していることを確認
curl -s http://localhost:5173 | head -5
```

### 2. 必要なツール
- ✅ curl (APIテスト用)
- ✅ jq (JSON整形用)
- ✅ ブラウザ (Chrome/Firefox/Safari)

## 🔧 **バックエンドAPIテスト**

### 自動テスト実行
```bash
# 設定API自動テストスクリプト実行
./scripts/test-settings-api.sh
```

### 手動テスト

#### 1. ヘルスチェック
```bash
# APIサーバー
curl -s http://localhost:3001/api/health | jq .

# 設定サービス
curl -s http://localhost:3001/api/settings/health | jq .
```

#### 2. 設定取得
```bash
curl -s http://localhost:3001/api/settings/cursor | jq .
```

#### 3. 設定保存
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "monitorPath": "/test/path",
    "scanInterval": 60,
    "maxSessions": 2000,
    "autoImport": true,
    "includeMetadata": false
  }' \
  http://localhost:3001/api/settings/cursor | jq .
```

#### 4. 設定リセット
```bash
curl -s -X POST http://localhost:3001/api/settings/cursor/reset | jq .
```

#### 5. エクスポート
```bash
curl -s http://localhost:3001/api/settings/export | jq .
```

## 🌐 **フロントエンドUIテスト**

### 1. WebUIアクセス
1. ブラウザで http://localhost:5173 を開く
2. 設定ページ（Settings）に移動
3. 「統合管理」セクションを確認

### 2. 基本UI確認

#### ✅ チェック項目
- [ ] ページヘッダー「統合管理」が表示される
- [ ] API接続状態が「接続中」（緑色）で表示される
- [ ] タブナビゲーション（Cursor設定、一般設定、セキュリティ、バックアップ）が表示される
- [ ] 「統合設定」セクションが表示される

### 3. Cursor設定タブテスト

#### ✅ 設定項目確認
- [ ] 「Cursor履歴を有効にする」チェックボックス
- [ ] 「監視パス」テキスト入力フィールド
- [ ] 「参照」ボタン
- [ ] 「スキャン間隔」数値入力（10-3600秒）
- [ ] 「最大セッション数」数値入力（100-10000）
- [ ] 「自動インポートを有効にする」チェックボックス
- [ ] 「メタデータを含める」チェックボックス

#### ✅ デフォルト値確認
- [ ] enabled: true (チェック済み)
- [ ] monitorPath: `/Users/shirokki22/Library/Application Support/Cursor/User/workspaceStorage`
- [ ] scanInterval: 30
- [ ] maxSessions: 1000
- [ ] autoImport: true (チェック済み)
- [ ] includeMetadata: false (未チェック)

### 4. 設定保存テスト

#### 自動保存テスト
1. 設定値を変更（例：スキャン間隔を60秒に変更）
2. 1秒待機
3. 「保存済み」インジケーターが表示されることを確認
4. ページをリロード（F5）
5. 変更した設定が保持されていることを確認

#### 手動保存テスト
1. 設定を変更
2. 「保存」ボタンをクリック
3. 成功メッセージが表示されることを確認

### 5. 設定管理機能テスト

#### リセット機能
1. 設定を変更
2. 「リセット」ボタンをクリック
3. 確認ダイアログで「OK」をクリック
4. デフォルト値に戻ることを確認

#### エクスポート機能
1. 「エクスポート」ボタンをクリック
2. JSONファイルがダウンロードされることを確認
3. ファイル内容が正しい設定データであることを確認

#### インポート機能
1. 設定を変更
2. 「インポート」ボタンをクリック
3. 先ほどエクスポートしたJSONファイルを選択
4. 元の設定に戻ることを確認

### 6. ブラウザコンソールテスト

#### 自動テスト実行
1. ブラウザの開発者ツールを開く（F12）
2. コンソールタブを選択
3. 以下のスクリプトを貼り付けて実行：

```javascript
// フロントエンド統合テストスクリプトを読み込み
fetch('/scripts/test-frontend-integration.js')
  .then(response => response.text())
  .then(script => eval(script))
  .then(() => runAllTests())
  .then(results => console.log('テスト完了:', results));
```

## 🔍 **エラーパターンテスト**

### 1. バリデーションエラー
```bash
# 無効な設定データを送信
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"enabled": "invalid", "scanInterval": -1}' \
  http://localhost:3001/api/settings/cursor | jq .
```

### 2. ネットワークエラー
1. APIサーバーを停止
2. WebUIで設定変更を試行
3. エラーメッセージが適切に表示されることを確認
4. LocalStorageのみでの動作を確認

### 3. CORS エラー
```bash
# 異なるオリジンからのリクエストをテスト
curl -s -H "Origin: http://example.com" \
  http://localhost:3001/api/settings/cursor
```

## 📊 **パフォーマンステスト**

### 1. 応答時間測定
```bash
# 設定取得の応答時間
time curl -s http://localhost:3001/api/settings/cursor > /dev/null

# 設定保存の応答時間
time curl -s -X POST -H "Content-Type: application/json" \
  -d '{"enabled":true,"monitorPath":"/test","scanInterval":30,"maxSessions":1000,"autoImport":true,"includeMetadata":false}' \
  http://localhost:3001/api/settings/cursor > /dev/null
```

### 2. メモリ使用量確認
```bash
# プロセス監視
ps aux | grep node
```

## ✅ **テスト完了チェックリスト**

### バックエンドAPI
- [ ] ヘルスチェック成功
- [ ] 設定取得成功
- [ ] 設定保存成功
- [ ] 設定リセット成功
- [ ] バリデーション動作
- [ ] エクスポート成功
- [ ] バックアップ一覧取得成功

### フロントエンドUI
- [ ] ページ表示成功
- [ ] 設定項目表示
- [ ] デフォルト値正常
- [ ] 自動保存動作
- [ ] 手動保存動作
- [ ] リセット機能動作
- [ ] エクスポート機能動作
- [ ] インポート機能動作
- [ ] LocalStorage永続化

### 統合機能
- [ ] API-UI連携正常
- [ ] エラーハンドリング適切
- [ ] CORS設定正常
- [ ] パフォーマンス良好

## 🚨 **トラブルシューティング**

### よくある問題

#### 1. APIサーバーに接続できない
```bash
# サーバー状態確認
ps aux | grep node
netstat -an | grep 3001

# サーバー再起動
npm run server:dev
```

#### 2. WebUIが表示されない
```bash
# WebUIサーバー確認
ps aux | grep vite
netstat -an | grep 5173

# WebUIサーバー再起動
npm run web:dev
```

#### 3. 設定が保存されない
- ブラウザのLocalStorageを確認
- APIサーバーのログを確認
- ネットワークタブでリクエストを確認

#### 4. CORS エラー
- APIサーバーのCORS設定を確認
- ブラウザのコンソールでエラー詳細を確認

## 📝 **テスト結果記録**

### テスト実行日時
- 実行日: ___________
- 実行者: ___________
- 環境: ___________

### 結果サマリー
- 総テスト数: _____ / _____
- 成功: _____ 
- 失敗: _____
- 成功率: _____%

### 備考
```
（テスト中に発見した問題や改善点を記録）
```

---

**最終更新**: 2025年6月1日  
**対象バージョン**: v1.0.0  
**次回テスト予定**: 機能追加時 