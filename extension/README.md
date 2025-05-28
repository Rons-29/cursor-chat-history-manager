# Cursor Chat History Manager

Cursorエディタでのチャット履歴を自動保存・管理するVS Code拡張機能です。

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

1. VS Code Marketplaceからインストール（公開後）
2. または、手動インストール：
   ```bash
   # リポジトリをクローン
   git clone https://github.com/Rons-29/cursor-chat-history-manager.git
   cd cursor-chat-history-manager/extension
   
   # 依存関係をインストール
   npm install
   
   # コンパイル
   npm run compile
   
   # VS Codeで開く
   code .
   
   # F5キーで拡張機能をデバッグ実行
   ```

## 📋 使用方法

### コマンドパレット
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

VS Codeの設定（`settings.json`）で以下の項目を設定できます：

```json
{
  "cursorChatHistory.autoSave.enabled": false,
  "cursorChatHistory.autoSave.interval": 5,
  "cursorChatHistory.autoSave.idleTimeout": 30,
  "cursorChatHistory.storage.path": "",
  "cursorChatHistory.storage.maxSessions": 1000,
  "cursorChatHistory.export.defaultFormat": "markdown",
  "cursorChatHistory.notifications.enabled": true
}
```

### 設定項目の説明

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `autoSave.enabled` | 自動保存を有効にする | `false` |
| `autoSave.interval` | 自動保存間隔（分） | `5` |
| `autoSave.idleTimeout` | アイドルタイムアウト（分） | `30` |
| `storage.path` | 保存先パス（空の場合はデフォルト） | `""` |
| `storage.maxSessions` | 最大セッション数 | `1000` |
| `export.defaultFormat` | デフォルトエクスポート形式 | `"markdown"` |
| `notifications.enabled` | 通知を有効にする | `true` |

## 📁 データ保存場所

デフォルトでは以下の場所にデータが保存されます：
- **Windows**: `%USERPROFILE%\.cursor-chat-history\`
- **macOS**: `~/.cursor-chat-history/`
- **Linux**: `~/.cursor-chat-history/`

## 🔧 開発

### 必要な環境
- Node.js 16.x以上
- VS Code 1.74.0以上

### 開発手順
```bash
# 依存関係をインストール
npm install

# TypeScriptをコンパイル
npm run compile

# ウォッチモードでコンパイル
npm run watch

# VS Codeでデバッグ実行
# F5キーを押すか、「実行とデバッグ」から「Launch Extension」を選択
```

### ファイル構成
```
extension/
├── src/
│   ├── extension.ts          # メインの拡張機能ファイル
│   ├── types.ts             # 型定義
│   └── services/
│       ├── ChatHistoryService.ts  # チャット履歴管理
│       ├── AutoSaveService.ts     # 自動保存機能
│       └── ExportService.ts       # エクスポート機能
├── package.json             # 拡張機能の設定
├── tsconfig.json           # TypeScript設定
└── README.md               # このファイル
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