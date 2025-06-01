# セキュリティガイドライン（更新版）

## 🚨 重要な注意事項

このツールはCursorエディタのチャット履歴を管理しますが、**機密情報を含む可能性があります**。以下のガイドラインに従って安全に使用してください。

## 🔒 データの機密性について

### 含まれる可能性のある機密情報
- **APIキー・トークン**: 開発中に使用したAPI認証情報（OpenAI、GitHub等）
- **パスワード**: データベースやサービスのパスワード
- **プロジェクト詳細**: 企業の内部プロジェクト情報
- **コード断片**: 著作権や特許に関わるコード
- **個人情報**: 名前、メールアドレス、その他の個人データ
- **企業秘密**: 戦略、計画、未公開の技術情報

### データ保存場所（現在の実装）
- **アプリケーションデータ**: `./data/`（プロジェクトディレクトリ内）
- **SQLiteデータベース**: `./data/sessions.db`
- **エクスポートファイル**: `./exports/`
- **ログファイル**: `./logs/`
- **個人設定**: プロジェクト内設定ファイル

## 🛡️ セキュリティ対策

### 1. 機密情報検索（推奨手順）

#### ✅ **現在利用可能なCLIコマンド**
```bash
# 機密情報を含む可能性のあるセッションを検索
chat-history-manager search --keyword "password"
chat-history-manager search --keyword "api_key" 
chat-history-manager search --keyword "secret"
chat-history-manager search --keyword "token"
chat-history-manager search --keyword "confidential"

# 特定のプロジェクトに関連するセッションを確認
chat-history-manager search --keyword "プロジェクト名" --limit 20

# 日付範囲を指定した検索
chat-history-manager search --keyword "sensitive" --start 2024-01-01 --end 2024-06-01
```

#### 🔍 **セッション詳細の確認**
```bash
# 特定のセッション内容を詳細確認
chat-history-manager show-session SESSION_ID

# 複数セッションの一覧表示
chat-history-manager search --tags "重要" --limit 10
```

### 2. WebUI活用による安全確認

#### 🖥️ **WebUIダッシュボード利用**
```bash
# WebUIを起動して視覚的に確認
npm run dev:real    # APIサーバー + WebUI起動
# ブラウザで http://localhost:3000 にアクセス
```

**WebUIでの確認手順**:
1. **検索画面**: キーワード「password」「secret」等で全体検索
2. **フィルタリング**: 日付範囲・タグでの絞り込み
3. **セッション詳細**: 各セッションの内容を個別確認
4. **統計画面**: 全体的なデータ傾向の把握

### 3. 安全なエクスポート方法

#### ✅ **推奨エクスポート手順**
```bash
# 1. 事前確認: 対象セッションの内容確認
chat-history-manager show-session SESSION_ID

# 2. 安全なセッションのみタグ付け（手動）
# WebUIまたはAPIで「public」タグを追加

# 3. タグ指定エクスポート（実装予定）
# chat-history-manager export --tags "public" --format json

# 4. 現在の代替手順: APIサーバー経由
curl -X GET "http://localhost:3001/api/sessions" | jq .
```

#### ❌ **避けるべき方法**
- ✗ 全セッションの一括取得
- ✗ 内容確認なしでの共有
- ✗ 公開リポジトリへのデータファイル追加
- ✗ 暗号化なしでのクラウド保存
- ✗ セッション削除の安易な実行

### 4. データ管理・クリーンアップ

#### ⚠️ **セッション削除について**
**重要**: `delete-session`コマンドは安全性の観点から現在無効化されています。

**データ削除が必要な場合の手順**:
1. **バックアップ作成**
   ```bash
   # 現在のデータをバックアップ
   cp -r ./data ./data-backup-$(date +%Y%m%d)
   ```

2. **WebUI経由での選択的削除**（推奨）
   - WebUIダッシュボードで対象セッションを特定
   - 必要に応じて開発チームに削除を依頼

3. **データベース直接操作**（上級者のみ）
   ```bash
   # SQLiteデータベースへの直接アクセス
   sqlite3 ./data/sessions.db
   ```

#### 🧹 **定期的なクリーンアップ**
```bash
# ログファイルのローテーション
find ./logs -name "*.log" -mtime +30 -delete

# 古いエクスポートファイルの削除
find ./exports -name "*.json" -mtime +7 -delete
```

## 🏢 企業・チーム利用時の注意

### 1. 設定管理
```bash
# 現在の設定確認
cat package.json | grep -A 10 "scripts"

# 開発環境設定
npm run dev:real      # 本番相当のAPI + WebUI
npm run server        # APIサーバーのみ
npm run web:dev       # WebUIのみ
```

### 2. アクセス制御
- **ポート設定**: デフォルト3001（API）、3000（WebUI）
- **CORS設定**: ローカルホストのみ許可
- **認証**: 現在未実装（ローカル用途想定）

### 3. 監査とログ
```bash
# アプリケーションログの確認
tail -f ./logs/app.log

# パフォーマンスログの確認  
tail -f ./logs/performance.log

# エラーログの確認
grep "ERROR" ./logs/*.log
```

## 🔧 技術的セキュリティ対策

### 1. データベースセキュリティ
```sql
-- SQLiteデータベースの現在のスキーマ確認
.schema sessions

-- FTS5全文検索インデックスの確認
.schema sessions_fts
```

### 2. ファイルシステム保護
```bash
# データディレクトリの権限確認
ls -la ./data/

# .gitignoreの確認（機密情報除外）
cat .gitignore | grep -E "(data|\.db|\.log)"
```

### 3. ネットワークセキュリティ
- **ローカル専用**: 外部ネットワーク通信なし
- **APIアクセス**: localhost:3001のみ
- **WebUI**: localhost:3000のみ

## 📋 セキュリティチェックリスト

### 共有前チェック
- [ ] `chat-history-manager search --keyword "password"` で機密情報検索済み
- [ ] `chat-history-manager search --keyword "api_key"` で認証情報検索済み
- [ ] `chat-history-manager search --keyword "secret"` で秘密情報検索済み
- [ ] WebUIで対象セッションの内容を目視確認済み
- [ ] 必要最小限のデータのみ選択済み
- [ ] 受信者の信頼性確認済み
- [ ] 安全な共有方法選択済み

### 定期メンテナンス
- [ ] 古いログファイルのクリーンアップ（月次）
- [ ] エクスポートファイルの整理（週次）
- [ ] データベースサイズの監視
- [ ] バックアップファイルの確認

### インシデント対応
- [ ] 機密情報漏洩時の緊急連絡先確認済み
- [ ] データベースバックアップ手順理解済み
- [ ] 影響範囲特定方法把握済み

## 🆘 インシデント発生時の対応

### 1. 即座に行うこと
```bash
# 1. 現在の状況確認
chat-history-manager search --keyword "漏洩した情報"

# 2. バックアップ作成
cp -r ./data ./emergency-backup-$(date +%Y%m%d-%H%M%S)

# 3. APIサーバー停止（必要に応じて）
pkill -f "node.*real-api-server"
```

### 2. 調査・分析
```bash
# 関連セッションの特定
chat-history-manager search --keyword "機密キーワード" --start 2024-01-01

# WebUIでの詳細確認
npm run dev:real
# ブラウザで詳細分析
```

### 3. 対応措置
- **開発チームへの報告**
- **影響範囲の詳細調査**
- **データ削除の検討**（専門家と相談）
- **再発防止策の策定**

## 💡 推奨ベストプラクティス

### 日常的な使用
1. **定期的な機密情報チェック**（週次）
2. **タグ活用による分類管理**
3. **WebUIでの視覚的確認の習慣化**
4. **バックアップの定期作成**

### チーム運用
1. **セキュリティガイドラインの共有**
2. **定期的な教育・訓練**
3. **インシデント対応手順の策定**
4. **アクセス権限の適切な管理**

## 📞 サポート・問い合わせ

### 技術的な問題
- **GitHub Issues**: 機能要望・バグ報告
- **ドキュメント**: `docs/`内の各種ガイド

### セキュリティ関連
- **緊急時**: 開発チームへの直接連絡
- **一般的な質問**: GitHubディスカッション

---

**⚠️ 重要**: このツールを使用することで、ユーザーは自身のデータのセキュリティに責任を持つことに同意したものとみなされます。機密情報の取り扱いには十分注意してください。

**更新日**: 2024年6月1日  
**次回見直し**: 機能追加時または緊急時 