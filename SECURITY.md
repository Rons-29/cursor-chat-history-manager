# セキュリティガイドライン

## 🚨 重要な注意事項

このツールはCursorエディタのチャット履歴を管理しますが、**機密情報を含む可能性があります**。以下のガイドラインに従って安全に使用してください。

## 🔒 データの機密性について

### 含まれる可能性のある機密情報
- **APIキー・トークン**: 開発中に使用したAPI認証情報
- **パスワード**: データベースやサービスのパスワード
- **プロジェクト詳細**: 企業の内部プロジェクト情報
- **コード断片**: 著作権や特許に関わるコード
- **個人情報**: 名前、メールアドレス、その他の個人データ
- **企業秘密**: 戦略、計画、未公開の技術情報

### データ保存場所
- **デフォルト**: `~/.cursor-chat-history/`
- **バックアップ**: `~/.cursor-chat-history/backups/`
- **エクスポート**: `./exports/`（プロジェクトディレクトリ内）

## 🛡️ セキュリティ対策

### 1. 共有前の確認事項

#### ✅ **必須チェック**
```bash
# 機密情報を含むセッションを検索
node dist/index.js search --keyword "password"
node dist/index.js search --keyword "api_key"
node dist/index.js search --keyword "secret"
node dist/index.js search --keyword "token"

# 特定のプロジェクトのセッションを確認
node dist/index.js search --keyword "プロジェクト名"
```

#### 🔍 **エクスポート前の検証**
```bash
# エクスポート前にセッション内容を確認
node dist/index.js show-session SESSION_ID

# 安全なセッションのみをエクスポート
node dist/index.js export --tags "public" --format json
```

### 2. 除外設定の活用

#### 機密キーワードの設定
```bash
# 機密キーワードを設定（これらを含むセッションは検索結果から除外）
node dist/index.js config --set excludeKeywords='["password","api_key","secret","token","private","confidential"]'
```

#### 設定例
```json
{
  "excludeKeywords": [
    "password", "passwd", "pwd",
    "api_key", "apikey", "api-key",
    "secret", "token", "auth",
    "private", "confidential", "internal",
    "企業名", "プロジェクト名"
  ]
}
```

### 3. 安全な共有方法

#### ✅ **推奨方法**
1. **選択的エクスポート**: 必要なセッションのみを選択
2. **内容確認**: エクスポート前に必ず内容を確認
3. **タグ活用**: 公開可能なセッションに`public`タグを付与
4. **期間限定**: 特定期間のセッションのみをエクスポート

```bash
# 安全な共有例
node dist/index.js export --tags "public,tutorial" --format markdown --output safe-export.md
```

#### ❌ **避けるべき方法**
- 全セッションの一括エクスポート
- 内容確認なしでの共有
- 公開リポジトリへのデータファイル追加
- 暗号化なしでのクラウド保存

### 4. データ削除・クリーンアップ

#### 機密セッションの削除
```bash
# 特定のセッションを削除
node dist/index.js delete-session SESSION_ID

# 古いセッションをクリーンアップ
node dist/index.js cleanup --days 30

# 機密キーワードを含むセッションを特定して手動削除
node dist/index.js search --keyword "機密キーワード"
```

#### 完全なデータ削除
```bash
# 全データの削除（注意：復元不可）
rm -rf ~/.cursor-chat-history/
```

## 🏢 企業・チーム利用時の注意

### 1. ポリシー策定
- **データ保持期間**の設定
- **共有可能な情報**の明確化
- **アクセス権限**の管理
- **定期的な監査**の実施

### 2. 技術的対策
```bash
# 企業向け設定例
node dist/index.js config --set maxSessions=100
node dist/index.js config --set cleanupDays=7
node dist/index.js config --set autoCleanup=true
```

### 3. 教育・トレーニング
- 開発者への**セキュリティ教育**
- **定期的な注意喚起**
- **インシデント対応手順**の策定

## 🔧 技術的セキュリティ対策

### 1. 暗号化の検討
現在のバージョンでは平文保存のため、機密性の高い環境では：
- **ディスク暗号化**の使用
- **専用の暗号化ツール**との組み合わせ
- **アクセス権限**の適切な設定

### 2. ネットワークセキュリティ
- このツールは**ローカル専用**（外部通信なし）
- **ファイアウォール設定**は不要
- **VPN環境**での使用を推奨

### 3. バックアップセキュリティ
```bash
# バックアップファイルの暗号化例（手動）
gpg --symmetric --cipher-algo AES256 backup.json
```

## 📋 セキュリティチェックリスト

### 共有前チェック
- [ ] 機密キーワードで検索済み
- [ ] エクスポート内容を確認済み
- [ ] 必要最小限のデータのみ選択
- [ ] 受信者の信頼性を確認済み
- [ ] 共有方法のセキュリティを確認済み

### 定期メンテナンス
- [ ] 古いセッションのクリーンアップ
- [ ] 除外キーワードの更新
- [ ] バックアップファイルの整理
- [ ] アクセスログの確認

### インシデント対応
- [ ] 機密情報漏洩時の連絡先を確認
- [ ] データ削除手順を理解
- [ ] 影響範囲の特定方法を把握

## 🆘 インシデント発生時の対応

### 1. 即座に行うこと
```bash
# 該当セッションの即座削除
node dist/index.js delete-session SESSION_ID

# 関連バックアップの削除
rm ~/.cursor-chat-history/backups/backup_YYYYMMDD_*.json
```

### 2. 影響範囲の調査
```bash
# 機密情報を含む可能性のあるセッションを特定
node dist/index.js search --keyword "漏洩した情報"
node dist/index.js analyze --keywords --days 30
```

### 3. 報告・対応
- **関係者への即座の報告**
- **影響範囲の詳細調査**
- **再発防止策の策定**

## 📞 サポート・問い合わせ

セキュリティに関する質問や懸念がある場合は、以下を参照してください：

- **GitHub Issues**: セキュリティ以外の技術的な問題
- **Security Policy**: 脆弱性の報告（別途策定予定）
- **Documentation**: 詳細な使用方法

---

**⚠️ 重要**: このツールを使用することで、ユーザーは自身のデータのセキュリティに責任を持つことに同意したものとみなされます。機密情報の取り扱いには十分注意してください。 