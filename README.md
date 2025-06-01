# Chat History Manager［改修中］ 💬
※今動かない可能性あり
Cursorエディタのチャット履歴を管理・検索・分析するための包括的なツール

## ⚠️ **重要なセキュリティ注意事項**

**このツールはチャット履歴を管理しますが、機密情報（APIキー、パスワード、企業秘密等）が含まれる可能性があります。**

- 📋 **共有前に必ず内容を確認してください**
- 🔒 **詳細なセキュリティガイドライン**: [SECURITY.md](./SECURITY.md)を参照
- 🛡️ **機密情報の検索**: `node dist/cli.js search --keyword "password"`等で事前確認

## ✨ 主な機能

### 🖥️ CLIツール（コマンドライン）
- 包括的なチャット履歴管理コマンド
- セッション作成・検索・分析・エクスポート機能
- Cursor統合（自動監視・インポート）
- 自動保存機能（リアルタイムチャット記録）
- 詳細統計・分析レポート機能

### 🗂️ セッション管理
- チャットセッションの作成・更新・削除
- メッセージの追加・編集
- セッション情報の管理（タイトル、開始時刻、メタデータ）
- タグ管理とカテゴリ分類

### 🔍 高度な検索機能
- キーワード検索（全文検索対応）
- フィルタリング（日付範囲、プロジェクト、ユーザー、タグ）
- ページネーション対応
- 検索結果のソート

### 📊 WebUI ダッシュボード
- リアルタイムデータ表示
- セッション一覧・詳細表示
- 統計情報の可視化
- レスポンシブデザイン

### 🔄 自動化機能
- **Cursor統合**: チャット履歴の自動監視・インポート
- **自動保存**: リアルタイムでのチャット記録
- **自動バックアップ**: 定期的なデータバックアップ
- **自動クリーンアップ**: 古いデータの自動削除

### 📤 データ管理
- JSON/Markdown/TXT形式でのエクスポート
- バックアップ・復元機能
- データインポート・エクスポート
- Gitベースの履歴管理

## 🚀 クイックスタート

### インストール

```bash
git clone https://github.com/your-repo/chat-history-manager.git
cd chat-history-manager
npm install
npm run build
```

### 🖥️ CLIツール使用方法

```bash
# CLIヘルプ表示
node dist/cli.js --help

# 基本統計情報
node dist/cli.js stats

# セッション作成
node dist/cli.js create-session --title "新しいプロジェクト"

# チャット履歴検索
node dist/cli.js search --keyword "React" --limit 10

# 履歴エクスポート
node dist/cli.js export --format json --output my-chats.json

# Cursor統合（自動監視開始）
node dist/cli.js cursor-start

# 自動保存開始
node dist/cli.js autosave-start
```

### �� WebUI使用方法

```bash
# フロントエンド + バックエンドを同時起動
npm run dev:full

# または個別に起動
npm run server  # バックエンド (ポート3001)
npm run web     # フロントエンド (ポート5173)

# ブラウザで http://localhost:5173 にアクセス
```

### 🚀 自動起動スクリプト

```bash
# 自動セットアップ＆起動
chmod +x scripts/auto-start.sh
./scripts/auto-start.sh

# 安全停止
chmod +x scripts/stop.sh
./scripts/stop.sh
```

### ビルド

```bash
npm run build      # TypeScriptビルド
npm run web:build  # Webアプリビルド
```

## 📝 使用可能なコマンド

### CLIコマンド一覧
| コマンド | 説明 |
|----------|------|
| `create-session` | 新しいセッションを作成 |
| `add-message` | セッションにメッセージを追加 |
| `show-session` | セッション詳細を表示 |
| `delete-session` | セッションを削除 |
| `search` | チャット履歴を検索 |
| `stats` | 基本統計情報を表示 |
| `analyze` | 詳細分析レポートを表示 |
| `export` | 履歴をエクスポート |
| `import` | 履歴ファイルからインポート |
| `cursor-scan` | Cursorチャット履歴を手動スキャン・インポート |
| `cursor-start` | Cursorチャット履歴のリアルタイム監視を開始 |
| `cursor-status` | Cursor統合状態を表示 |
| `cursor-config` | Cursor統合設定を管理 |
| `autosave-start` | 自動保存を開始 |
| `autosave-stop` | 実行中の自動保存セッションを停止 |
| `autosave-status` | 自動保存の状態を確認 |
| `autosave-config` | 自動保存の設定を変更 |
| `config` | 設定を表示・変更 |

### NPMスクリプト
| コマンド | 説明 |
|----------|------|
| `npm run dev:full` | フロントエンド + バックエンド同時起動 |
| `npm run server` | APIサーバー起動 |
| `npm run web` | WebUI開発サーバー起動 |
| `npm run build` | TypeScriptビルド |
| `npm run test` | テスト実行 |
| `npm run test:coverage` | カバレッジ付きテスト |
| `npm run lint` | ESLintチェック |
| `npm run format` | Prettierフォーマット |
| `npm run quality` | 総合品質チェック |

## 🏗️ プロジェクト構造

```
chat-history-manager/
├── src/                     # CLI + バックエンド
│   ├── cli.ts              # CLIエントリーポイント
│   ├── index.ts            # メインインデックス
│   ├── services/           # ビジネスロジック
│   │   ├── ChatHistoryService.ts    # セッション・メッセージ管理
│   │   ├── AnalyticsService.ts      # 統計・分析機能
│   │   ├── AutoSaveService.ts       # 自動保存機能
│   │   ├── ExportService.ts         # エクスポート機能
│   │   ├── CursorWatcherService.ts  # Cursor統合
│   │   ├── ConfigService.ts         # 設定管理
│   │   └── git-service.ts           # Git統合
│   ├── server/             # Express サーバー
│   │   ├── app.ts          # Express アプリ
│   │   ├── api-router.ts   # データサービス
│   │   ├── routes/         # API ルート
│   │   └── middleware/     # ミドルウェア
│   ├── types/              # 型定義
│   └── utils/              # ユーティリティ
├── web/                    # React フロントエンド
│   ├── src/
│   │   ├── components/     # UIコンポーネント
│   │   ├── pages/          # ページコンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   └── api/            # API クライアント
│   └── index.html
├── scripts/                # 運用スクリプト
│   ├── auto-start.sh       # 自動起動
│   ├── stop.sh             # 安全停止
│   └── test-real-data.ts   # 実データテスト
└── docs/                   # ドキュメント
```

## 🛠️ 技術スタック

### バックエンド
- **Node.js 18+** + **TypeScript 5.3+**
- **Express.js 5.1+** (APIサーバー)
- **Commander.js 14.0+** (CLIフレームワーク)
- **fs-extra** (ファイルシステム)
- **chokidar** (ファイル監視)
- **date-fns** (日付処理)

### フロントエンド
- **React 19.1+** + **TypeScript**
- **React Router 7.6+** (ルーティング)
- **React Query 5.79+** (データ取得)
- **TailwindCSS 4.1+** (スタイリング)
- **Vite 6.3+** (ビルドツール)

### 開発・品質管理
- **Jest 29.7+** (テスト)
- **ESLint 8.56+** + **Prettier 3.5+** (コード品質)
- **Concurrently 9.1+** (並行実行)
- **.mdc ルール準拠** (段階的品質向上)

## 📊 API エンドポイント

### セッション管理
- `GET /api/sessions` - セッション一覧取得
- `GET /api/sessions/:id` - セッション詳細取得
- `POST /api/sessions` - セッション作成
- `PUT /api/sessions/:id` - セッション更新
- `DELETE /api/sessions/:id` - セッション削除

### 統計情報
- `GET /api/stats` - 統計情報取得
- `GET /api/analytics` - 詳細分析データ

### 検索
- `POST /api/search` - 全文検索

### 設定管理
- `GET /api/config` - 設定取得
- `PUT /api/config` - 設定更新

## 🔧 設定

設定はTypeScriptインターフェースで型安全に管理されています：

```typescript
interface ChatHistoryConfig {
  storageType: 'file' | 'database'
  storagePath: string
  maxSessions?: number
  maxMessagesPerSession?: number
  autoCleanup?: boolean
  cleanupDays?: number
  enableSearch?: boolean
  enableBackup?: boolean
  backupInterval?: number
  autoSave?: AutoSaveConfig
  cursor?: CursorConfig
}

interface AutoSaveConfig {
  enabled: boolean
  interval: number
  idleTimeout: number
  maxSessionDuration: number
  watchDirectories: string[]
  filePatterns: string[]
}

interface CursorConfig {
  enabled: boolean
  watchPath?: string
  autoImport: boolean
  watchInterval?: number
}
```

## 🧪 テスト

```bash
# 単体テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジレポート
npm run test:coverage

# 実データテスト
npm run test:real-data
```

## 📋 開発ルール

プロジェクトは[.mdc](./.mdc)と[.cursorrules](./.cursorrules)で定義された開発ルールに従います：

- **TypeScript First** - any型の使用を最小限に抑制
- **関数型プログラミング** - 純粋関数とイミュータブルデータ構造
- **レイヤード構造** - プレゼンテーション・ビジネスロジック・データアクセス層の分離
- **品質管理** - ESLint + Prettier + テストによる継続的な品質維持
- **段階的実装** - .mdcルール準拠の堅牢性重視開発

## 🚀 運用・デプロイ

### 自動起動
```bash
# 依存関係チェック、ビルド、起動まで自動実行
./scripts/auto-start.sh
```

### 安全停止
```bash
# プロセス停止、一時ファイルクリーンアップ
./scripts/stop.sh
```

### 品質チェック
```bash
# 総合品質チェック（リント、フォーマット、ビルド、テスト）
npm run quality
```

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

詳細は[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 👨‍💻 作成者

**Rons-29**

- GitHub: [@Rons-29](https://github.com/Rons-29)
- Repository: [cursor-chat-history-manager](https://github.com/Rons-29/cursor-chat-history-manager)

---

⭐ このプロジェクトが役に立った場合は、スターをつけてください！ 

## 📚 関連ドキュメント

- [SECURITY.md](SECURITY.md) - セキュリティガイドライン
- [CONTRIBUTING.md](CONTRIBUTING.md) - コントリビューションガイド
- [PROJECT_RULES.md](PROJECT_RULES.md) - プロジェクト開発ルール
- [TODO.md](TODO.md) - 開発タスク・改善項目 
