# セキュリティガイドライン（統合完了版）

## 🚨 重要な注意事項

このツールはCursorエディタのチャット履歴を管理しますが、**機密情報を含む可能性があります**。統合アーキテクチャ完了後の最新のガイドラインに従って安全に使用してください。

## 🔒 データの機密性について

### 含まれる可能性のある機密情報
- **APIキー・トークン**: 開発中に使用したAPI認証情報（OpenAI、GitHub等）
- **パスワード**: データベースやサービスのパスワード
- **プロジェクト詳細**: 企業の内部プロジェクト情報
- **コード断片**: 著作権や特許に関わるコード
- **個人情報**: 名前、メールアドレス、その他の個人データ
- **企業秘密**: 戦略、計画、未公開の技術情報

### データ保存場所（統合完了後）
- **統一データベース**: `./data/chat-history.db`（SQLite統合）
- **バックアップ**: `./data/backup-*`（統合前の古いデータ）
- **エクスポートファイル**: `./exports/`
- **ログファイル**: `./logs/`

## 🛡️ セキュリティ対策

### 1. 統合APIによる安全な検索

#### ✅ **統合API経由の検索（推奨）**
```bash
# 統合APIサーバー起動
npm run server

# 統合検索（全ソース横断）
curl -X POST -H "Content-Type: application/json" \
  -d '{"keyword":"API_KEY","limit":10}' \
  http://localhost:3001/api/search

# ソース限定検索
curl -X GET "http://localhost:3001/api/sessions?source=chat&keyword=password"
curl -X GET "http://localhost:3001/api/sessions?source=cursor&keyword=secret"
curl -X GET "http://localhost:3001/api/sessions?source=claude-dev&keyword=token"
```

#### 🖥️ **WebUI活用による視覚的確認**
```bash
# 統合WebUI起動
npm run dev:full    # APIサーバー + WebUI
# ブラウザで http://localhost:5173 にアクセス
```

**WebUIでの安全確認手順**:
1. **統合検索**: 全ソース横断での機密情報検索
2. **ソース分岐**: Chat/Cursor/Claude DEV 個別確認
3. **セッション詳細**: 各セッションの内容を個別確認
4. **統計ダッシュボード**: データ分布の全体把握

### 2. 統合健全性チェック（セキュリティ含む）

#### 🔒 **定期セキュリティチェック**
```bash
# 統合セキュリティチェック実行
npm run precommit

# 内容:
# - ./scripts/security-check.sh（機密情報検出）
# - npm run check:integration（統合健全性）
# - npm run quality（コード品質）
```

#### 🛡️ **機密情報検出パターン**
```bash
# 検出対象パターン（security-check.sh）:
# - OpenAI APIキー: sk-proj-*, sk-*
# - GitHub Token: ghp_*, gho_*, ghu_*, ghs_*
# - Stripe キー: pk_*, sk_*
# - メールアドレス・パスワード・認証情報
# - 環境変数ファイル: .env系
```

### 3. 安全なデータアクセス・管理

#### ✅ **統合データベースアクセス**
```bash
# 統合SQLiteデータベース直接確認
sqlite3 ./data/chat-history.db

# 機密情報検索クエリ例
SELECT id, title, snippet FROM sessions WHERE content LIKE '%password%' LIMIT 10;
SELECT id, title, snippet FROM sessions WHERE content LIKE '%api_key%' LIMIT 10;
SELECT id, title, snippet FROM sessions WHERE content LIKE '%secret%' LIMIT 10;
```

#### ⚠️ **データ管理の注意事項**
- **統一データベース**: 全データが`chat-history.db`に統合済み
- **バックアップデータ**: `./data/backup-*`に古い分散データが保存
- **削除時の注意**: バックアップ含む全データの確認が必要

### 4. 統合後のデータクリーンアップ

#### 🧹 **定期的なセキュリティクリーンアップ**
```bash
# 月次セキュリティレビュー
npm run monthly:review

# ログローテーション
find ./logs -name "*.log" -mtime +30 -delete

# 古いエクスポートファイル削除
find ./exports -name "*.json" -mtime +7 -delete

# バックアップファイルの定期確認
ls -la ./data/backup-*/
```

## 🏢 企業・チーム利用時の統合対応

### 1. 統合サーバー設定
```bash
# 統合開発環境
npm run dev:full      # 統合API + WebUI（推奨）
npm run server        # 統合APIサーバーのみ
npm run web          # WebUIのみ

# プロダクション環境
npm run start:all     # 統合API + WebUI（本番）
```

### 2. 統合API アクセス制御
- **APIポート**: 3001（統合APIサーバー）
- **WebUIポート**: 5173（開発）/ 5000（本番）
- **CORS設定**: ローカルホストのみ許可
- **認証**: 現在未実装（企業用途では追加実装推奨）

### 3. 統合監視・ログ
```bash
# 統合健全性監視
npm run integration:monitor

# 統合ログ確認
tail -f ./logs/integration.log

# 統合統計情報
npm run stats
```

## 🔧 技術的セキュリティ対策（統合版）

### 1. 統合データベースセキュリティ
```sql
-- 統合SQLiteデータベーススキーマ確認
.schema sessions

-- FTS5全文検索インデックス確認
.schema sessions_fts

-- 機密情報検索（FTS5活用）
SELECT * FROM sessions_fts WHERE content MATCH 'password OR api_key OR secret' LIMIT 20;
```

### 2. 統合アーキテクチャ保護
```bash
# 統合原則チェック
npm run check:integration

# セキュリティ＋統合チェック
npm run precommit

# ファイルシステム保護確認
ls -la ./data/
cat .gitignore | grep -E "(data|\.db|\.log|backup)"
```

### 3. 統合API セキュリティ
- **統合エンドポイント**: `/api/sessions?source=X`形式
- **ローカル専用**: 外部ネットワーク通信なし
- **統合ルート**: `src/server/routes/unified-api.ts`

## 📋 統合後セキュリティチェックリスト

### 共有前チェック
- [ ] 統合検索で機密情報確認済み（全ソース横断）
- [ ] WebUIで対象セッション内容を目視確認済み
- [ ] ソース別フィルタで各データ源を個別確認済み
- [ ] 統合データベースで重複・分散データ確認済み
- [ ] 受信者の信頼性確認済み
- [ ] 安全な共有方法選択済み

### 定期統合メンテナンス
- [ ] 統合健全性チェック実行（`npm run check:integration`）
- [ ] セキュリティスキャン実行（`npm run precommit`）
- [ ] 月次統合レビュー実行（`npm run monthly:review`）
- [ ] バックアップデータの安全確認
- [ ] ログファイルの定期クリーンアップ

### 統合インシデント対応準備
- [ ] 統合データベースバックアップ手順理解済み
- [ ] 全ソース影響範囲特定方法把握済み
- [ ] 統合API緊急停止手順確認済み

## 🆘 統合環境でのインシデント対応

### 1. 即座に行うこと
```bash
# 1. 統合検索で影響範囲確認
curl -X POST -H "Content-Type: application/json" \
  -d '{"keyword":"漏洩した情報","limit":100}' \
  http://localhost:3001/api/search

# 2. 統合APIサーバー緊急停止
pkill -f "npm run server"
pkill -f "real-api-server"

# 3. 統合データベースバックアップ
cp ./data/chat-history.db ./data/incident-backup-$(date +%Y%m%d-%H%M%S).db
```

### 2. 影響範囲調査
```bash
# 統合データベース全体調査
sqlite3 ./data/chat-history.db "SELECT source, COUNT(*) FROM sessions GROUP BY source;"

# ソース別影響確認
curl -X GET "http://localhost:3001/api/sessions?source=chat" | jq '.sessions | length'
curl -X GET "http://localhost:3001/api/sessions?source=cursor" | jq '.sessions | length'
curl -X GET "http://localhost:3001/api/sessions?source=claude-dev" | jq '.sessions | length'
```

### 3. 復旧計画
```bash
# 統合健全性確認
npm run check:integration

# データ整合性確認
npm run quality

# 段階的復旧
# 1. 統合データベース確認
# 2. APIサーバー再起動
# 3. WebUI動作確認
# 4. 統合チェック実行
```

---

**最終更新**: 2025年6月2日（統合完了後）  
**適用範囲**: Chat History Manager統合アーキテクチャ  
**次回見直し**: 新機能追加時または重大インシデント後 