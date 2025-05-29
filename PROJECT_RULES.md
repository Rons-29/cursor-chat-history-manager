# プロジェクトルール集
**Chat History Manager - 開発・運用・コラボレーション規約**

---

## 📋 目次
1. [開発ルール](#開発ルール)
2. [Git・バージョン管理ルール](#gitバージョン管理ルール)
3. [コードスタイル・品質ルール](#コードスタイル品質ルール)
4. [セキュリティルール](#セキュリティルール)
5. [ドキュメント管理ルール](#ドキュメント管理ルール)
6. [プロジェクト構造ルール](#プロジェクト構造ルール)
7. [テスト・デプロイメントルール](#テストデプロイメントルール)
8. [コラボレーションルール](#コラボレーションルール)

---

## 🛠️ 開発ルール

### ✅ 基本原則
- **TypeScript First**: すべてのJavaScriptコードはTypeScriptで記述
- **型安全性**: `any`型の使用は最小限に抑制
- **エラーハンドリング**: すべての非同期処理にtry-catch実装必須
- **関数型プログラミング**: 可能な限り純粋関数とイミュータブルデータ構造を使用

### 🏗️ アーキテクチャ
- **レイヤード構造**: プレゼンテーション、ビジネスロジック、データアクセス層を明確に分離
- **依存性注入**: サービス間の結合度を最小化
- **インターフェース重視**: 実装ではなくインターフェースに依存

### 📝 命名規則
```typescript
// ファイル・ディレクトリ
kebab-case (例: chat-history-service.ts)

// クラス・インターフェース・型
PascalCase (例: ChatHistoryService, ApiResponse)

// 変数・関数・メソッド
camelCase (例: getUserSessions, totalMessages)

// 定数
SCREAMING_SNAKE_CASE (例: MAX_SESSIONS, API_BASE_URL)

// プライベートメンバー
_prefix (例: _handleError, _validateInput)
```

---

## 🔄 Git・バージョン管理ルール

### 🌿 ブランチ戦略
```
main
├── develop
├── feature/機能名
├── bugfix/修正内容
├── hotfix/緊急修正
└── release/v1.0.0
```

### 📝 コミットメッセージ規約
```
type(scope): subject

body

footer
```

**Types:**
- `feat`: 新機能
- `fix`: バグ修正  
- `docs`: ドキュメント
- `style`: コードスタイル
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: その他

**例:**
```
feat(webui): ダッシュボード統計表示機能追加

- リアルタイム統計データ取得
- チャート表示コンポーネント実装
- レスポンシブデザイン対応

Closes #123
```

### 🔒 プルリクエストルール
1. **レビュー必須**: 最低1名のコードレビュー
2. **CI/CD通過**: すべてのテスト・Lintが通過
3. **競合解決**: マージ前にconflict解決
4. **Squash Merge**: 履歴を整理してマージ

---

## 💅 コードスタイル・品質ルール

### 🎨 フォーマット設定
```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

### 🔍 ESLint設定
- **TypeScript ESLint**: 必須設定
- **React ESLint**: WebUI用設定
- **Import/Export**: モジュール整理ルール
- **Accessibility**: a11y準拠

### 📊 品質指標
- **Test Coverage**: 80%以上
- **TypeScript Strict**: 有効化必須
- **ESLint Errors**: 0件
- **Security Vulnerabilities**: 0件

---

## 🔐 セキュリティルール

### 🛡️ データ保護
```typescript
// 機密データの取り扱い
const SENSITIVE_PATTERNS = [
  /password/i,
  /api[_-]?key/i,
  /secret/i,
  /token/i
]

// ログ出力時の自動マスキング
function safelog(data: any) {
  // 機密情報を自動検出・マスキング
}
```

### 🔑 認証・認可
- **API Key管理**: 環境変数での管理必須
- **CORS設定**: 明示的なオリジン指定
- **入力検証**: すべてのユーザー入力をサニタイズ
- **SQLインジェクション対策**: パラメータ化クエリ使用

### 📋 セキュリティチェックリスト
- [ ] 機密情報のハードコード禁止
- [ ] HTTPS通信の強制
- [ ] セキュリティヘッダーの設定
- [ ] 依存関係の脆弱性スキャン
- [ ] ファイルアクセス権限の適切な設定

---

## 📚 ドキュメント管理ルール

### 📖 必須ドキュメント
1. **README.md**: プロジェクト概要・セットアップ手順
2. **API.md**: API仕様書
3. **ARCHITECTURE.md**: システム設計書
4. **CHANGELOG.md**: 変更履歴
5. **CONTRIBUTING.md**: コントリビューションガイド

### ✍️ コードドキュメント
```typescript
/**
 * チャットセッションを作成します
 * @param title セッションタイトル
 * @param metadata セッションメタデータ
 * @returns 作成されたセッションオブジェクト
 * @throws {ValidationError} 入力値が不正な場合
 * @example
 * ```typescript
 * const session = await createSession('新規チャット', { tags: ['開発'] })
 * ```
 */
async function createSession(title: string, metadata: SessionMetadata): Promise<ChatSession>
```

### 📝 日本語ドキュメント
- **ユーザー向け**: 日本語で記述
- **開発者向け**: 英語併記可
- **コメント**: 日本語推奨（複雑なロジックの説明）

---

## 🏗️ プロジェクト構造ルール

### 📁 ディレクトリ構造
```
chat-history-manager/
├── src/                    # バックエンドソース
│   ├── services/          # ビジネスロジック
│   ├── types/             # 型定義
│   ├── utils/             # ユーティリティ
│   ├── server/            # Express.js API
│   └── tests/             # テストファイル
├── web/                   # フロントエンドソース
│   ├── src/
│   │   ├── components/    # Reactコンポーネント
│   │   ├── pages/         # ページコンポーネント
│   │   ├── api/           # APIクライアント
│   │   ├── hooks/         # カスタムフック
│   │   ├── utils/         # ユーティリティ
│   │   └── types/         # フロントエンド型定義
│   └── public/            # 静的ファイル
├── docs/                  # ドキュメント
├── scripts/               # ビルド・デプロイスクリプト
└── tests/                 # E2Eテスト
```

### 🎯 ファイル配置ルール
- **単一責任原則**: 1ファイル1クラス/機能
- **関連性重視**: 関連するファイルは同じディレクトリに配置
- **階層制限**: ディレクトリ階層は5層以下
- **ファイルサイズ**: 1ファイル500行以下を目安

---

## 🧪 テスト・デプロイメントルール

### ✅ テスト戦略
```typescript
// テストファイルの命名
ComponentName.test.tsx  // 単体テスト
ComponentName.spec.tsx  // 統合テスト
e2e/feature.test.ts     // E2Eテスト
```

### 🎯 テストカバレッジ
- **単体テスト**: 全公開メソッド
- **統合テスト**: API エンドポイント
- **E2Eテスト**: 主要ユーザーフロー
- **Performance Test**: レスポンス時間測定

### 🚀 デプロイメント
1. **Staging環境**: develop ブランチ
2. **Production環境**: main ブランチ
3. **自動デプロイ**: CI/CD パイプライン
4. **ロールバック**: 前バージョンへの迅速復旧

---

## 🤝 コラボレーションルール

### 👥 チーム連携
- **Daily Standup**: 進捗・課題共有
- **Code Review**: 建設的なフィードバック
- **Knowledge Sharing**: 技術情報の積極的共有
- **Pair Programming**: 複雑な機能実装時

### 📢 コミュニケーション
- **Issue管理**: GitHub Issues で課題管理
- **技術議論**: Discussion またはSlack
- **緊急事項**: 迅速な報告・対応
- **ドキュメント更新**: 変更時の即座更新

### 🎯 品質保証
- **Definition of Done**: 明確な完了基準
- **Testing**: 機能実装と同時進行
- **Performance**: 定期的なパフォーマンス測定
- **Security**: セキュリティレビューの実施

---

## 📊 モニタリング・改善ルール

### 📈 継続的改善
- **Retrospective**: 定期的な振り返り
- **Metrics収集**: 開発効率の測定
- **技術負債**: 定期的な解消タスク
- **ルール見直し**: プロジェクト進化に合わせた更新

### 🔄 フィードバックループ
1. **実装** → **レビュー** → **テスト** → **デプロイ**
2. **監視** → **分析** → **改善** → **実装**
3. **ユーザーフィードバック** → **要件見直し** → **実装**

---

## 📝 ルール遵守チェックリスト

### ✅ 開発前チェック
- [ ] Issue作成・アサイン
- [ ] ブランチ作成（命名規則準拠）
- [ ] 設計レビュー（必要に応じて）

### ✅ 開発中チェック
- [ ] TypeScript型定義
- [ ] エラーハンドリング実装
- [ ] テストコード作成
- [ ] ドキュメント更新

### ✅ 開発完了チェック
- [ ] コードレビュー依頼
- [ ] CI/CD通過確認
- [ ] マージ・デプロイ
- [ ] 動作確認・監視

---

**最終更新**: 2024/01/15  
**次回見直し予定**: 2024/02/15

このルール集は、プロジェクトの進化に合わせて定期的に更新されます。 