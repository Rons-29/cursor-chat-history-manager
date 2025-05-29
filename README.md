# Chat History Manager 💬

Cursorエディタのチャット履歴を管理・検索・分析するための包括的なツール

## ⚠️ **重要なセキュリティ注意事項**

**このツールはチャット履歴を管理しますが、機密情報（APIキー、パスワード、企業秘密等）が含まれる可能性があります。**

- 📋 **共有前に必ず内容を確認してください**
- 🔒 **詳細なセキュリティガイドライン**: [SECURITY.md](./SECURITY.md)を参照
- 🛡️ **機密情報の検索**: `node dist/index.js search --keyword "password"`等で事前確認

## ✨ 主な機能

### 🗂️ セッション管理
- チャットセッションの作成・更新・削除
- メッセージの追加・編集
- セッション情報の管理（タイトル、開始時刻、メタデータ）

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

### 🔄 データ管理
- JSON形式でのデータ保存
- バックアップ・復元機能
- データインポート・エクスポート
- 自動クリーンアップ

## 🚀 クイックスタート

### インストール

```bash
git clone https://github.com/your-repo/chat-history-manager.git
cd chat-history-manager
npm install
```

### 開発環境の起動

```bash
# フロントエンド + バックエンドを同時起動
npm run dev:full

# または個別に起動
npm run server  # バックエンド (ポート3001)
npm run web     # フロントエンド (ポート5173)
```

### ビルド

```bash
npm run build      # TypeScriptビルド
npm run web:build  # Webアプリビルド
```

## 📝 スクリプト

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
src/
├── services/          # ビジネスロジック
├── types/             # 型定義
├── server/            # Express.js API
├── tests/             # テストファイル
└── index.ts           # メインエントリーポイント

web/src/               # フロントエンドソース
├── components/        # Reactコンポーネント
├── pages/             # ページコンポーネント
├── api/               # APIクライアント
└── hooks/             # カスタムフック
```

## 🛠️ 技術スタック

### バックエンド
- **Node.js** + **TypeScript**
- **Express.js** (APIサーバー)
- **fs-extra** (ファイルシステム)
- **date-fns** (日付処理)

### フロントエンド
- **React 19** + **TypeScript**
- **React Router** (ルーティング)
- **React Query** (データ取得)
- **TailwindCSS** (スタイリング)
- **Vite** (ビルドツール)

### 開発・品質管理
- **Jest** (テスト)
- **ESLint** + **Prettier** (コード品質)
- **Conventional Commits** (コミット規約)

## 📊 API エンドポイント

### セッション管理
- `GET /api/sessions` - セッション一覧取得
- `GET /api/sessions/:id` - セッション詳細取得
- `POST /api/sessions` - セッション作成
- `PUT /api/sessions/:id` - セッション更新
- `DELETE /api/sessions/:id` - セッション削除

### 統計情報
- `GET /api/stats` - 統計情報取得

### 検索
- `GET /api/search` - 全文検索

## 🧪 テスト

```bash
# 単体テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

## 📋 開発ルール

プロジェクトは[.mdc](./.mdc)ファイルで定義された開発ルールに従います：

- **TypeScript First** - any型の使用を最小限に抑制
- **関数型プログラミング** - 純粋関数とイミュータブルデータ構造
- **レイヤード構造** - プレゼンテーション・ビジネスロジック・データアクセス層の分離
- **品質管理** - ESLint + Prettier + テストによる継続的な品質維持

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
}
```

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 👨‍💻 作成者

**Rons-29**

---

⭐ このプロジェクトが役に立った場合は、スターをつけてください！ 