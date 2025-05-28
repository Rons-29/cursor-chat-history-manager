# Cursor Chat History Manager

Cursorエディタでのチャット履歴を自動保存・管理するVS Code拡張機能です。

**🎯 VS Code & Cursor 両対応**: この拡張機能はVS CodeとCursorの両方で動作します！

## 🚀 機能

### 📝 自動保存
- ファイル編集時の自動チャット履歴保存
- 設定可能な保存間隔（1-60分）
- ファイルパターンによるフィルタリング
- アイドルタイムアウト設定

### 🔍 履歴管理
- チャット履歴の検索・閲覧
- セッション単位での管理
- タグ付けによる分類
- プロジェクト別の整理

### 📤 エクスポート
- JSON、Markdown、テキスト形式でのエクスポート
- 全履歴または選択した履歴のエクスポート
- 日時・メタデータ付きの詳細出力

### 📊 統計情報
- 総セッション数・メッセージ数の表示
- ストレージサイズの監視
- 保存回数の追跡

## 🛠️ インストール

### VS Code / Cursor 共通インストール

#### 方法1: 手動インストール（推奨）
```bash
# リポジトリをクローン
git clone https://github.com/Rons-29/cursor-chat-history-manager.git
cd cursor-chat-history-manager/extension

# 依存関係をインストール
npm install

# コンパイル
npm run compile

# VS Code または Cursor で開く
code .  # VS Code の場合
cursor .  # Cursor の場合

# F5キーで拡張機能をデバッグ実行
```

#### 方法2: VSIXパッケージ作成・インストール
```bash
# vsce をインストール（初回のみ）
npm install -g vsce

# VSIXパッケージを作成
vsce package

# VS Code にインストール
code --install-extension cursor-chat-history-manager-1.0.0.vsix

# Cursor にインストール
cursor --install-extension cursor-chat-history-manager-1.0.0.vsix
```

### 🎯 Cursor特有の利点

#### 1. ネイティブなCursorチャット履歴管理
- Cursorの実際のチャット履歴ファイルを直接監視
- リアルタイムでの履歴保存・管理
- Cursorのワークフロー内での自然な統合

#### 2. AI開発ワークフローとの統合
- AI支援開発セッションの完全な記録
- コード生成履歴の追跡
- 学習・改善のための履歴分析

#### 3. Cursorエディタ内での直接操作
- コマンドパレットからの直接アクセス
- ステータスバーでのリアルタイム状態表示
- エディタ内での履歴検索・閲覧

## 📋 使用方法

### Cursorでのコマンド実行
`Ctrl+Shift+P` (Windows/Linux) または `Cmd+Shift+P` (Mac) でコマンドパレットを開き、以下のコマンドを実行：

- `Chat History: 自動保存を開始` - 自動保存機能を開始
- `Chat History: 自動保存を停止` - 自動保存機能を停止
- `Chat History: 保存状態を表示` - 現在の状態と統計を表示
- `Chat History: 現在のチャットを保存` - 現在のエディタ内容を手動保存
- `Chat History: 履歴を検索` - 保存された履歴を検索・閲覧
- `Chat History: 履歴をエクスポート` - 履歴をファイルにエクスポート
- `Chat History: 設定を開く` - 拡張機能の設定を開く

### ステータスバー
画面下部のステータスバーに表示される「Chat History」アイコンをクリックして状態を確認できます。

## ⚙️ 設定

VS Code/Cursorの設定（`settings.json`）で以下の項目を設定できます：

```json
{
  "cursorChatHistory.autoSave.enabled": true,
  "cursorChatHistory.autoSave.interval": 3,
  "cursorChatHistory.autoSave.idleTimeout": 30,
  "cursorChatHistory.storage.path": "~/cursor-chat-history",
  "cursorChatHistory.storage.maxSessions": 1000,
  "cursorChatHistory.export.defaultFormat": "markdown",
  "cursorChatHistory.notifications.enabled": true
}
```

### 設定項目の説明

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `autoSave.enabled` | 自動保存を有効にする | `true` |
| `autoSave.interval` | 自動保存間隔（分） | `3` |
| `autoSave.idleTimeout` | アイドルタイムアウト（分） | `30` |
| `storage.path` | 保存先パス（空の場合はデフォルト） | `~/cursor-chat-history` |
| `storage.maxSessions` | 最大セッション数 | `1000` |
| `export.defaultFormat` | デフォルトエクスポート形式 | `"markdown"` |
| `notifications.enabled` | 通知を有効にする | `true` |

## 📁 データ保存場所

デフォルトでは以下の場所にデータが保存されます：
- **Windows**: `%USERPROFILE%\.cursor-chat-history\`
- **macOS**: `~/.cursor-chat-history/`
- **Linux**: `~/.cursor-chat-history/`

**💡 ヒント**: Cursorユーザーの場合、メインのCLIツールと同じデータを共有するため、両方のツールで同じ履歴にアクセスできます。

## 🔄 VS Code vs Cursor の違い

| 機能 | VS Code | Cursor | 備考 |
|------|---------|--------|------|
| 基本機能 | ✅ | ✅ | 完全互換 |
| 自動保存 | ✅ | ✅ | 同じ動作 |
| 履歴検索 | ✅ | ✅ | 同じ動作 |
| エクスポート | ✅ | ✅ | 同じ動作 |
| Cursorチャット統合 | ⚠️ | ✅ | Cursorでより自然 |
| AI開発ワークフロー | ⚠️ | ✅ | Cursorに最適化 |

## 🚀 Cursorでの推奨ワークフロー

### 1. 初期設定
```bash
# 1. 拡張機能をインストール
# 2. 自動保存を有効化
Ctrl+Shift+P → "Chat History: 設定を開く"
```

### 2. 日常的な使用
```bash
# AI開発セッション開始時
Ctrl+Shift+P → "Chat History: 自動保存を開始"

# 特定の会話を手動保存
Ctrl+Shift+P → "Chat History: 現在のチャットを保存"

# 過去の解決策を検索
Ctrl+Shift+P → "Chat History: 履歴を検索"
```

### 3. 定期的なメンテナンス
```bash
# 週次レビュー
Ctrl+Shift+P → "Chat History: 保存状態を表示"

# 月次エクスポート
Ctrl+Shift+P → "Chat History: 履歴をエクスポート"
```

## 🔧 開発

### Cursorでの開発環境
```bash
# 依存関係をインストール
npm install

# TypeScriptをコンパイル
npm run compile

# ウォッチモードでコンパイル
npm run watch

# Cursorでデバッグ実行
# F5キーを押すか、「実行とデバッグ」から「Launch Extension」を選択
```

### Cursor特有のテスト
```bash
# Cursorのチャット履歴ファイルを使用したテスト
# ~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/tasks/
```

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](../LICENSE)ファイルを参照してください。

## 🔗 関連リンク

- [メインプロジェクト](https://github.com/Rons-29/cursor-chat-history-manager)
- [Issues](https://github.com/Rons-29/cursor-chat-history-manager/issues)
- [VS Code Extension API](https://code.visualstudio.com/api)

## 📞 サポート

問題や質問がある場合は、[GitHub Issues](https://github.com/Rons-29/cursor-chat-history-manager/issues)で報告してください。 