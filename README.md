# 🌊 ChatFlow - AI開発支援プラットフォーム

**AIとの対話を、開発の資産に変える次世代プラットフォーム**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## 🎯 **概要**

**ChatFlow**は、AI開発者のための包括的なチャット履歴管理・分析プラットフォームです。Cursor、Claude Dev、その他のAIツールとの会話を統合管理し、開発プロセスを可視化・最適化します。

### 🌟 **ビジョン**
> **"AIとの対話を、開発の資産に変える"**

開発者とAIの会話を単なる履歴ではなく、学習可能な知識ベース・再利用可能な開発パターン・チーム共有の資産として活用できるプラットフォームを提供します。

## ⚠️ **重要なセキュリティ注意事項**

**このツールはチャット履歴を管理しますが、機密情報が含まれる可能性があります。**

- 📋 **共有前に必ず内容を確認してください**
- 🔒 **詳細なセキュリティガイドライン**: [SECURITY.md](./SECURITY.md)を参照
- 🛡️ **機密情報の検索**: 検索機能を使用して事前確認を行ってください

## 🚀 **クイックスタート**

### 1つのコマンドで全サービス起動

```bash
# 開発モード（推奨）
npm run dev:all

# または、シェルスクリプト使用
./scripts/start-all.sh dev
```

これで以下のサービスが同時に起動します：
- 🔵 **APIサーバー**: http://localhost:3001
- 🟢 **Webダッシュボード**: http://localhost:5173
- 🟡 **CLI統合サービス**: Cursor監視・データ処理

### 📋 起動方法一覧

| コマンド | 説明 | サービス構成 |
|---------|------|-------------|
| `npm run dev:all` | 開発モード（フル機能） | Real API + Web Dev + CLI監視 |
| `npm run dev:quick` | クイック開発モード | Mock API + Web Dev |
| `npm run start:all` | 本番モード | Real API + Web Preview |

詳細な起動方法は [起動ガイド](./docs/STARTUP_GUIDE.md) をご覧ください。

## ✨ **主な機能**

### 🔄 **統合チャット管理**
- **マルチプラットフォーム対応**: Cursor、Claude Dev、ChatGPT、GitHub Copilot
- **リアルタイム同期**: 自動監視・インポート・バックアップ
- **統一データベース**: SQLite高性能統合（10-100倍高速化）
- **増分同期**: 90%パフォーマンス向上の効率的更新

### 🔍 **インテリジェント検索**
- **セマンティック検索**: AI駆動の意味理解検索
- **コンテキスト検索**: プロジェクト・ファイル・時期での絞り込み
- **パターン検索**: 類似問題・解決策の自動発見
- **全文検索**: 高速SQLite FTS5エンジン

### 📊 **開発分析ダッシュボード**
- **生産性メトリクス**: 開発効率・AI活用度の可視化
- **パターン分析**: 頻出質問・効果的プロンプトの特定
- **時系列分析**: 開発進捗・学習曲線の追跡
- **チーム分析**: 知識共有・コラボレーション状況

### 🤖 **AI支援機能**
- **プロンプト最適化**: 効果的なプロンプトパターンの提案
- **コンテキスト生成**: 過去の会話から関連情報を自動抽出
- **ナレッジベース**: FAQ・ベストプラクティスの自動構築
- **学習推奨**: スキルギャップ・学習リソースの提案

### 🔒 **エンタープライズセキュリティ**
- **データ暗号化**: AES-256/ChaCha20による強固な暗号化
- **アクセス制御**: ロールベース・IP制限・多要素認証
- **監査ログ**: 完全な操作履歴・コンプライアンス対応
- **プライバシー保護**: 機密情報自動マスキング・データ保持ポリシー

## 🛠️ **インストール**

```bash
git clone https://github.com/Rons-29/chatflow.git
cd chatflow
npm install
npm run build
```

## 🖥️ **CLI ツール使用方法**

```bash
# CLIヘルプ表示
chatflow --help

# 基本統計情報
chatflow stats

# セッション作成
chatflow create-session --title "新しいプロジェクト"

# チャット履歴検索
chatflow search --keyword "React" --limit 10

# 履歴エクスポート
chatflow export --format json --output my-chats.json

# Cursor統合（自動監視開始）
chatflow cursor-start

# 自動保存開始
chatflow autosave-start
```

## 📊 **WebUI 使用方法**

```bash
# フロントエンド + バックエンドを同時起動
npm run dev:all

# または個別に起動
npm run server  # バックエンド (ポート3001)
npm run web     # フロントエンド (ポート5173)

# ブラウザで http://localhost:5173 にアクセス
```

## 🏗️ **技術アーキテクチャ**

### 🔧 **バックエンド**
```typescript
// 高性能サービス層
ChatHistoryService     // セッション・メッセージ管理
AnalyticsService      // 統計・分析エンジン
IntegrationService    // マルチプラットフォーム統合
SqliteIndexService    // 高速検索エンジン
SecurityService       // セキュリティ・暗号化
AutoSaveService       // リアルタイム自動保存
ExportService         // データエクスポート・バックアップ
```

### 🎨 **フロントエンド**
```typescript
// モダンReactアプリケーション
React 18.2+           // 最新UI フレームワーク
TypeScript 5.3+       // 型安全開発
TailwindCSS 4.1+      // ユーティリティファーストCSS
React Query 5.79+     // 状態管理・キャッシュ
Vite 6.3+             // 高速ビルドツール
```

### 🗄️ **データ層**
```sql
-- 高性能SQLiteデータベース
Sessions              -- チャットセッション
Messages              -- 個別メッセージ
Projects              -- プロジェクト情報
Users                 -- ユーザー・チーム管理
Analytics             -- 分析データ
Security_Logs         -- セキュリティ監査
```

## 🏗️ **プロジェクト構造**

```
chatflow/
├── src/                     # CLI + バックエンド
│   ├── cli.ts              # CLIエントリーポイント
│   ├── index.ts            # メインインデックス
│   ├── services/           # ビジネスロジック
│   │   ├── ChatHistoryService.ts    # セッション・メッセージ管理
│   │   ├── AnalyticsService.ts      # 統計・分析機能
│   │   ├── AutoSaveService.ts       # 自動保存機能
│   │   ├── ExportService.ts         # エクスポート機能
│   │   ├── IntegrationService.ts    # 統合管理
│   │   └── SqliteIndexService.ts    # 高速検索エンジン
│   ├── server/             # Express サーバー
│   │   ├── real-api-server.ts       # メインAPIサーバー
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
├── extension/              # VS Code拡張機能
├── scripts/                # 運用・セキュリティスクリプト
├── docs/                   # ドキュメント
└── data/                   # 個人データ（gitignore済み）
```

## 📝 **使用可能なコマンド**

### CLI コマンド一覧
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
| `autosave-start` | 自動保存を開始 |
| `autosave-stop` | 実行中の自動保存セッションを停止 |
| `config` | 設定を表示・変更 |

### NPM スクリプト
| コマンド | 説明 |
|----------|------|
| `npm run dev:all` | フロントエンド + バックエンド同時起動 |
| `npm run server` | APIサーバー起動 |
| `npm run web` | WebUI開発サーバー起動 |
| `npm run build` | TypeScriptビルド |
| `npm run test` | テスト実行 |
| `npm run quality` | 総合品質チェック |

## 🎯 **ターゲットユーザー**

### 👨‍💻 **個人開発者**
- **AI活用開発者**: Cursor、Claude Dev等を日常的に使用
- **学習志向**: 効率的な学習・スキル向上を求める
- **生産性重視**: 開発効率・品質向上を目指す

### 👥 **開発チーム**
- **スタートアップ**: 高速開発・知識共有が重要
- **エンタープライズ**: セキュリティ・コンプライアンス要求
- **教育機関**: 学習支援・進捗管理が必要

### 🏢 **組織・企業**
- **AI導入企業**: AI活用の効果測定・最適化
- **コンサルティング**: クライアント向けAI活用支援
- **研究機関**: AI開発パターン・効果の研究


## 🛣️ **ロードマップ**

### 📅 **Phase 1: Foundation (Q1 2025)**
- ✅ 基本チャット履歴管理
- ✅ Cursor統合
- ✅ WebUI ダッシュボード
- ✅ CLI ツール
- 🔄 VS Code拡張機能

### 📅 **Phase 2: Intelligence (Q2 2025)**
- 🔄 AI駆動検索・分析
- 🔄 プロンプト最適化
- 🔄 パターン認識
- 🔄 ナレッジベース構築

### 📅 **Phase 3: Collaboration (Q3 2025)**
- 🔄 チーム機能
- 🔄 知識共有
- 🔄 リアルタイムコラボレーション
- 🔄 統合API

### 📅 **Phase 4: Enterprise (Q4 2025)**
- 🔄 エンタープライズセキュリティ
- 🔄 カスタム統合
- 🔄 高度分析・レポート
- 🔄 マルチテナント対応

## 🔧 **VS Code拡張機能**

### 📦 **インストール**
```bash
cd extension
npm install
npm run compile
# F5キーで拡張機能をデバッグ実行
```

### 🎯 **主な機能**
- **シームレス統合**: エディタ内での直接操作
- **リアルタイム保存**: 自動チャット履歴記録
- **コンテキスト連携**: 現在のファイル・プロジェクト情報
- **インライン検索**: エディタ内での過去会話検索

詳細は [拡張機能ガイド](./extension/README.md) をご覧ください。

## 🤝 **コントリビューション**

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

詳細は[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## 📄 **ライセンス**

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 👨‍💻 **作成者**

**Rons-29**

- GitHub: [@Rons-29](https://github.com/Rons-29)
- Repository: [ChatFlow](https://github.com/Rons-29/chatflow)

---

⭐ このプロジェクトが役に立った場合は、スターをつけてください！ 

## 📚 **関連ドキュメント**

- [📋 プロダクト定義](./docs/CHATFLOW_PRODUCT_DEFINITION.md) - 包括的なプロダクト概要
- [🔧 機能仕様書](./docs/CHATFLOW_FEATURE_SPECIFICATION.md) - 詳細機能仕様
- [🔒 セキュリティガイド](./docs/SECURITY.md) - セキュリティガイドライン
- [🤝 コントリビューションガイド](./docs/CONTRIBUTING.md) - 開発参加方法
- [📖 使用ガイド](./docs/USAGE.md) - 詳細使用方法
- [🔍 API仕様書](./docs/API_SPEC.md) - API リファレンス

---

**🚀 ChatFlow - AIとの対話を、開発の資産に変える次世代プラットフォーム**
