# Contributing to Cursor Chat History Manager

このプロジェクトへの貢献を歓迎します！以下のガイドラインに従ってください。

## 🚀 開発環境のセットアップ

### 前提条件
- Node.js 16.0.0以上
- npm 7.0.0以上
- TypeScript 4.5.0以上

### セットアップ手順
```bash
# リポジトリをクローン
git clone <repository-url>
cd chat-history-manager

# 依存関係をインストール
npm install

# ビルド
npm run build

# 動作確認
node dist/index.js --help
```

## 📋 開発ワークフロー

### 1. ブランチ戦略
- `main`: 安定版ブランチ
- `develop`: 開発ブランチ
- `feature/*`: 新機能開発
- `bugfix/*`: バグ修正
- `hotfix/*`: 緊急修正

### 2. コミットメッセージ規約
```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コードスタイル修正
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: その他の変更

#### 例
```
feat(cursor): Add real-time monitoring for chat history

- Implement file watcher for api_conversation_history.json
- Add automatic import when new conversations are detected
- Update CursorIntegrationService with monitoring capabilities

Closes #123
```

### 3. プルリクエスト

#### 作成前のチェックリスト
- [ ] コードがビルドできる
- [ ] 既存のテストが通る
- [ ] 新機能にはテストを追加
- [ ] ドキュメントを更新
- [ ] セキュリティ影響を確認

#### プルリクエストテンプレート
```markdown
## 概要
<!-- 変更内容の簡潔な説明 -->

## 変更内容
- [ ] 新機能追加
- [ ] バグ修正
- [ ] ドキュメント更新
- [ ] リファクタリング

## テスト
<!-- テスト方法と結果 -->

## セキュリティ影響
<!-- セキュリティへの影響があるかどうか -->

## 関連Issue
<!-- 関連するIssue番号 -->
```

## 🧪 テスト

### テスト実行
```bash
# 全テスト実行
npm test

# 特定のテストファイル
npm test -- --grep "CursorIntegrationService"

# カバレッジ確認
npm run test:coverage
```

### テスト作成ガイドライン
- 各サービスクラスにはユニットテストを作成
- 統合テストは`tests/integration/`に配置
- モックは`tests/mocks/`に配置

## 📝 コーディング規約

### TypeScript
- 厳密な型定義を使用
- `any`型の使用は避ける
- インターフェースを適切に定義

### ファイル構成
```
src/
├── services/          # ビジネスロジック
├── types/            # 型定義
├── utils/            # ユーティリティ
└── index.ts          # エントリーポイント
```

### 命名規約
- クラス: PascalCase (`ChatHistoryService`)
- メソッド・変数: camelCase (`getUserConfig`)
- 定数: UPPER_SNAKE_CASE (`DEFAULT_CONFIG_PATH`)
- ファイル: PascalCase (`ChatHistoryService.ts`)

## 🔒 セキュリティ

### 機密情報の取り扱い
- チャット履歴には機密情報が含まれる可能性があります
- テストデータには実際の機密情報を含めない
- `.gitignore`で適切にデータファイルを除外

### セキュリティレビュー
- 新機能は必ずセキュリティ影響を評価
- 外部ライブラリの脆弱性チェック
- データの暗号化・匿名化を検討

## 📚 ドキュメント

### 更新が必要なドキュメント
- `README.md`: 新機能の使用方法
- `SECURITY.md`: セキュリティ関連の変更
- `TODO.md`: 実装状況の更新
- コード内のJSDoc

## 🐛 バグレポート

### Issue作成時の情報
- OS・Node.jsバージョン
- 実行したコマンド
- エラーメッセージ
- 期待する動作
- 実際の動作

### テンプレート
```markdown
## 環境
- OS: 
- Node.js: 
- npm: 

## 再現手順
1. 
2. 
3. 

## 期待する動作

## 実際の動作

## エラーメッセージ
```

## 💡 機能リクエスト

新機能の提案は以下の形式でIssueを作成してください：

```markdown
## 概要
<!-- 機能の簡潔な説明 -->

## 動機・背景
<!-- なぜこの機能が必要か -->

## 提案する解決策
<!-- 具体的な実装案 -->

## 代替案
<!-- 他に考えられる解決策 -->

## 追加情報
<!-- その他の関連情報 -->
```

## 📞 サポート

質問や相談がある場合は、以下の方法でお気軽にお問い合わせください：

- GitHub Issues: バグレポート・機能リクエスト
- GitHub Discussions: 一般的な質問・議論

## 🙏 謝辞

このプロジェクトに貢献していただき、ありがとうございます！
あなたの貢献により、より良いツールを作ることができます。 