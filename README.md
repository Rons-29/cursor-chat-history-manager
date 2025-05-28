# Cursor Chat History Manager

Cursorエディタのチャット履歴を管理・検索・分析するための包括的なツールです。

## ⚠️ **重要なセキュリティ注意事項**

**このツールはチャット履歴を管理しますが、機密情報（APIキー、パスワード、企業秘密等）が含まれる可能性があります。**

- 📋 **共有前に必ず内容を確認してください**
- 🔒 **詳細なセキュリティガイドライン**: [SECURITY.md](./SECURITY.md)を参照
- 🛡️ **機密情報の検索**: `node dist/index.js search --keyword "password"`等で事前確認

## ✨ 主な機能

- 🔍 **Cursor統合**: Cursorのチャット履歴を自動監視・インポート
- 💾 **自動保存**: 開発中の会話を自動的に保存・管理
- 🔎 **高度な検索**: キーワード、タグ、日付範囲での柔軟な検索
- 📊 **分析機能**: 使用統計、トレンド分析、キーワード分析
- 📤 **エクスポート**: JSON、Markdown、テキスト形式での出力
- ⚙️ **設定管理**: 詳細な設定とカスタマイズ

## 🚀 インストール

### 前提条件
- Node.js 16.0.0以上
- npm 7.0.0以上

### GitHubからクローン
```bash
# リポジトリをクローン
git clone https://github.com/shirokki22/cursor-chat-history-manager.git
cd cursor-chat-history-manager

# 依存関係をインストール
npm install

# ビルド
npm run build
```

### または、ローカルでの開発
```bash
# 開発モードで実行
npm run dev

# テスト実行
npm test

# カバレッジ確認
npm run test:coverage
```

## 🚀 クイックスタート

### 1. Cursorチャット履歴をインポート
```bash
# 一度だけ実行してCursorの履歴をインポート
node dist/index.js cursor-scan
```

### 2. 基本的な使用方法
```bash
# Cursorセッションを検索
node dist/index.js search --tags cursor

# キーワードで検索
node dist/index.js search --keyword "エラー"

# 統計情報を表示
node dist/index.js stats

# Cursor統合状態を確認
node dist/index.js cursor-status
```

## 📋 コマンド一覧

### 🔗 Cursor統合
| コマンド | 説明 |
|---------|------|
| `cursor-scan` | 手動でCursorチャット履歴をスキャン・インポート |
| `cursor-start` | リアルタイム監視を開始（バックグラウンド実行） |
| `cursor-status` | 統合状態と統計情報を表示 |
| `cursor-config` | Cursor統合設定の表示・変更 |

### 💾 セッション管理
| コマンド | 説明 |
|---------|------|
| `create-session` | 新しいチャットセッションを作成 |
| `add-message` | セッションにメッセージを追加 |
| `show-session` | セッションの詳細を表示 |
| `delete-session` | セッションを削除 |

### 🔍 検索・分析
| コマンド | 説明 |
|---------|------|
| `search` | セッション検索（キーワード、タグ、日付等） |
| `stats` | 基本統計情報を表示 |
| `analyze` | 詳細な使用統計と分析 |

### 📤 データ管理
| コマンド | 説明 |
|---------|------|
| `export` | セッションをエクスポート |
| `import` | セッションをインポート |
| `backup` | データのバックアップを作成 |
| `restore` | バックアップから復元 |
| `list-backups` | バックアップ一覧を表示 |
| `cleanup` | 古いセッションをクリーンアップ |

### 🤖 自動保存
| コマンド | 説明 |
|---------|------|
| `auto-save-start` | 自動保存を開始 |
| `auto-save-stop` | 自動保存を停止 |
| `auto-save-status` | 自動保存状態を確認 |
| `auto-save-message` | 自動保存セッションにメッセージを追加 |
| `auto-save-config` | 自動保存設定を管理 |

### ⚙️ 設定
| コマンド | 説明 |
|---------|------|
| `config` | 全般設定の表示・変更 |

## 🔧 詳細な使用方法

### Cursor統合の設定

```bash
# Cursor統合を有効化
node dist/index.js cursor-config --enable

# 自動インポートを有効化
node dist/index.js cursor-config --auto-import true

# 起動時インポートを有効化
node dist/index.js cursor-config --startup-import true

# カスタムデータパスを設定
node dist/index.js cursor-config --path "/custom/path/to/cursor/data"

# 監視間隔を設定（秒）
node dist/index.js cursor-config --watch-interval 30
```

### 高度な検索

```bash
# 複数キーワードで検索
node dist/index.js search --keyword "エラー" --keyword "バグ" --keyword "修正"

# 特定の期間で検索
node dist/index.js search --start-date 2025-01-01 --end-date 2025-01-31

# タグとキーワードを組み合わせ
node dist/index.js search --tags cursor,typescript --keyword "型エラー"

# プロジェクト別検索
node dist/index.js search --project 123 --limit 20

# 結果を多く表示
node dist/index.js search --keyword "React" --limit 50
```

### 分析機能

```bash
# 使用統計（過去30日）
node dist/index.js analyze --usage

# 過去7日間の統計
node dist/index.js analyze --usage --days 7

# 日別活動レポート
node dist/index.js analyze --report daily --days 14

# 週別活動レポート
node dist/index.js analyze --report weekly --days 30

# 月別活動レポート
node dist/index.js analyze --report monthly --days 90

# キーワード分析
node dist/index.js analyze --keywords --days 30

# 特定期間の分析
node dist/index.js analyze --usage --start-date 2025-01-01 --end-date 2025-01-31
```

### エクスポート機能

```bash
# 全セッションをJSONでエクスポート
node dist/index.js export --format json --output all-sessions.json

# 特定のセッションをMarkdownでエクスポート
node dist/index.js export --format markdown --output session.md --session SESSION_ID

# Cursorセッションのみをエクスポート
node dist/index.js export --format json --output cursor-sessions.json --tags cursor

# 期間を指定してエクスポート
node dist/index.js export --format txt --output recent.txt --start-date 2025-01-01

# メタデータを含めてエクスポート
node dist/index.js export --format json --output detailed.json --include-metadata
```

### 自動保存の設定

```bash
# 自動保存を有効化
node dist/index.js auto-save-config --enable

# 保存間隔を設定（分）
node dist/index.js auto-save-config --interval 10

# アイドルタイムアウトを設定（分）
node dist/index.js auto-save-config --idle-timeout 60

# 最大セッション時間を設定（分）
node dist/index.js auto-save-config --max-duration 180

# 監視ディレクトリを追加
node dist/index.js auto-save-config --add-directory "/path/to/project"

# ファイルパターンを追加
node dist/index.js auto-save-config --add-pattern "*.vue"
```

### バックアップ・復元

```bash
# バックアップを作成
node dist/index.js backup --output backup-$(date +%Y%m%d).json

# バックアップ一覧を表示
node dist/index.js list-backups

# バックアップから復元（注意：既存データは削除されます）
node dist/index.js restore --file backup-20250101.json --force
```

## 💡 実践的な使用例

### 日常的なワークフロー

```bash
# 1. 朝の作業開始時
node dist/index.js cursor-scan  # 新しいCursorセッションをインポート
node dist/index.js auto-save-start  # 自動保存を開始

# 2. 特定の問題を調査
node dist/index.js search --keyword "認証エラー" --days 7

# 3. 週次レビュー
node dist/index.js analyze --report weekly --days 7
node dist/index.js stats

# 4. 月次バックアップ
node dist/index.js backup --output monthly-backup-$(date +%Y%m).json
```

### トラブルシューティング

```bash
# エラー関連の会話を検索
node dist/index.js search --keyword "エラー" --keyword "例外" --limit 20

# 最近のCursorセッションを確認
node dist/index.js search --tags cursor --days 3

# 特定のプロジェクトの履歴を確認
node dist/index.js search --keyword "プロジェクト名" --start-date 2025-01-01
```

## ⚙️ 設定ファイル

設定ファイルは `~/.cursor-chat-history/config.json` に保存されます。

### 主要な設定項目

```json
{
  "storageType": "file",
  "storagePath": "~/.cursor-chat-history",
  "maxSessions": 1000,
  "maxMessagesPerSession": 500,
  "autoCleanup": true,
  "cleanupDays": 30,
  "cursor": {
    "enabled": true,
    "autoImport": true,
    "importOnStartup": false,
    "cursorDataPath": "~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/tasks/",
    "watchInterval": 30
  },
  "autoSave": {
    "enabled": false,
    "interval": 5,
    "idleTimeout": 30,
    "maxSessionDuration": 120,
    "watchDirectories": [],
    "filePatterns": ["*.ts", "*.js", "*.tsx", "*.jsx", "*.py", "*.md"]
  }
}
```

### 設定の変更

```bash
# 設定を表示
node dist/index.js config --show

# 設定値を変更
node dist/index.js config --set maxSessions=2000
node dist/index.js config --set autoCleanup=false

# 設定をリセット
node dist/index.js config --reset

# 設定をエクスポート
node dist/index.js config --export my-config.json

# 設定をインポート
node dist/index.js config --import my-config.json
```

## 🔍 検索のコツ

### 効果的な検索方法

1. **複数キーワード**: 関連する用語を組み合わせる
2. **タグ活用**: `cursor`, `auto-save` などのタグでフィルタリング
3. **日付範囲**: 特定の期間に絞り込む
4. **段階的絞り込み**: 広い検索から徐々に条件を追加

### よく使う検索パターン

```bash
# 最近のエラー関連
node dist/index.js search --keyword "エラー" --days 7

# TypeScript関連の会話
node dist/index.js search --keyword "TypeScript" --keyword "型" --tags cursor

# 特定の機能の実装履歴
node dist/index.js search --keyword "認証" --keyword "実装" --start-date 2025-01-01
```

## 📊 分析レポートの活用

### 生産性の把握
- 日別/週別の活動量を確認
- よく使用するキーワードを分析
- セッションの長さや頻度を把握

### 学習の振り返り
- 過去の質問や解決方法を検索
- 技術的なトピックの変遷を追跡
- 成長の記録として活用

## 🚨 注意事項

1. **データの場所**: デフォルトでは `~/.cursor-chat-history` にデータが保存されます
2. **バックアップ**: 重要なデータは定期的にバックアップを作成してください
3. **プライバシー**: チャット履歴には機密情報が含まれる可能性があります
4. **ディスク容量**: 大量のセッションがある場合、ストレージ容量に注意してください

## 🤝 トラブルシューティング

### よくある問題

**Q: Cursorの履歴が見つからない**
```bash
# Cursorデータパスを確認
node dist/index.js cursor-config

# カスタムパスを設定
node dist/index.js cursor-config --path "/path/to/cursor/data"
```

**Q: 検索結果が表示されない**
```bash
# まずは統計を確認
node dist/index.js stats

# 条件を緩くして検索
node dist/index.js search --limit 50
```

**Q: 自動保存が動作しない**
```bash
# 設定を確認
node dist/index.js auto-save-config

# 有効化
node dist/index.js auto-save-config --enable
```

## �� ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) ファイルを参照してください。

## 🤝 コントリビューション

このプロジェクトへの貢献を歓迎します！

### 貢献方法
1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 開発ガイドライン
- 詳細な開発ガイドライン: [CONTRIBUTING.md](./CONTRIBUTING.md)
- セキュリティガイドライン: [SECURITY.md](./SECURITY.md)
- 実装状況: [TODO.md](./TODO.md)

### バグレポート・機能リクエスト
- [Issues](https://github.com/shirokki22/cursor-chat-history-manager/issues)でバグレポートや機能リクエストを作成してください
- テンプレートに従って詳細な情報を提供してください

## 📞 サポート

### ヘルプが必要な場合
- 📋 **GitHub Issues**: [バグレポート・機能リクエスト](https://github.com/shirokki22/cursor-chat-history-manager/issues)
- 💬 **GitHub Discussions**: [一般的な質問・議論](https://github.com/shirokki22/cursor-chat-history-manager/discussions)

### よくある質問
1. **Q: Cursorの履歴が見つからない**
   - A: `node dist/index.js cursor-config`でパスを確認してください

2. **Q: 機密情報が含まれているか心配**
   - A: `node dist/index.js search --keyword "password"`等で事前確認してください

3. **Q: 自動保存が動作しない**
   - A: `node dist/index.js auto-save-config --enable`で有効化してください

## 🔗 関連リンク

- 📦 **GitHub Repository**: https://github.com/shirokki22/cursor-chat-history-manager
- 📋 **Issues**: https://github.com/shirokki22/cursor-chat-history-manager/issues
- 💬 **Discussions**: https://github.com/shirokki22/cursor-chat-history-manager/discussions
- 📚 **Documentation**: このREADMEファイル
- 🔒 **Security Policy**: [SECURITY.md](./SECURITY.md)

## 🔄 更新履歴

### v1.0.0 (2025-01-XX)
- 🎉 **初回リリース**
- ✨ **Cursor統合機能**: 自動監視・インポート
- 💾 **自動保存機能**: 開発セッションの自動管理
- 🔎 **検索・分析機能**: 高度な検索とレポート
- 📤 **エクスポート機能**: 複数形式での出力
- 🛡️ **セキュリティ**: 機密情報保護ガイドライン
- 📚 **包括的ドキュメント**: 使用方法からコントリビューションまで

---

**⭐ このプロジェクトが役に立った場合は、GitHubでスターを付けていただけると嬉しいです！** 