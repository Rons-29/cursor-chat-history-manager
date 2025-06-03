# コントリビューションガイド
**ChatFlow プロジェクトへの貢献方法**

---

## 🎯 貢献の方針

このプロジェクトへのコントリビューションを歓迎します！バグ報告、機能提案、コード貢献、ドキュメント改善など、あらゆる形の貢献を大切にしています。

---

## 🚀 開発環境のセットアップ

### 前提条件
- Node.js 16.0.0 以上
- npm 7.0.0 以上
- Git
- TypeScript の基本知識
- React の基本知識（WebUI開発の場合）

### セットアップ手順

1. **リポジトリのフォーク・クローン**
```bash
# フォーク後、クローン
git clone https://github.com/YOUR_USERNAME/cursor-chat-history-manager.git
cd cursor-chat-history-manager

# 元リポジトリを upstream として追加
git remote add upstream https://github.com/Rons-29/cursor-chat-history-manager.git
```

2. **依存関係のインストール**
```bash
# バックエンド依存関係
npm install

# フロントエンド依存関係
cd web
npm install
cd ..
```

3. **開発サーバーの起動**
```bash
# フロントエンド・バックエンド同時起動
npm run dev:full

# または個別起動
npm run server  # バックエンド
npm run web     # フロントエンド
```

4. **動作確認**
- バックエンド: http://localhost:3001/health
- フロントエンド: http://localhost:3000

---

## 📝 コントリビューションプロセス

### 1. Issue の確認・作成

**既存Issue確認**
- [GitHub Issues](https://github.com/Rons-29/cursor-chat-history-manager/issues) を確認
- 重複する課題がないか検索

**新規Issue作成**
```markdown
## 概要
簡潔な問題・提案の説明

## 詳細
具体的な内容・再現手順

## 期待される動作
どのような結果を期待するか

## 環境情報
- OS: 
- Node.js: 
- Browser: 
```

### 2. ブランチ戦略

```bash
# 最新のmainブランチを取得
git checkout main
git pull upstream main

# 機能ブランチ作成
git checkout -b feature/機能名
# または
git checkout -b bugfix/修正内容
```

**ブランチ命名規則**
- `feature/機能名` - 新機能追加
- `bugfix/修正内容` - バグ修正
- `docs/ドキュメント名` - ドキュメント更新
- `refactor/対象` - リファクタリング

### 3. 開発・テスト

**コード品質チェック**
```bash
# TypeScript コンパイル
npm run build

# ESLint チェック
npm run lint

# テスト実行
npm test
```

**コミット前チェックリスト**
- [ ] TypeScript エラーなし
- [ ] ESLint エラーなし
- [ ] テストが通る
- [ ] 適切なコメント・ドキュメント
- [ ] セキュリティ考慮

### 4. コミット・プッシュ

**コミットメッセージ規約**
```
type(scope): subject

body

footer
```

**例:**
```bash
git add .
git commit -m "feat(webui): セッション詳細ページ追加

- メッセージ一覧表示
- メタデータ表示
- レスポンシブデザイン対応

Closes #45"

git push origin feature/session-detail-page
```

### 5. プルリクエスト作成

**PRテンプレート**
```markdown
## 変更内容
- 変更点1
- 変更点2

## 関連Issue
Closes #123

## テスト
- [ ] 手動テスト実施
- [ ] 自動テスト追加/更新

## チェックリスト
- [ ] コードレビュー準備完了
- [ ] ドキュメント更新
- [ ] 破壊的変更なし（または適切に文書化）
```

---

## 🛠️ 開発ガイドライン

### TypeScript 開発

**型定義**
```typescript
// 良い例: 明確な型定義
interface SessionMetadata {
  readonly totalMessages: number
  readonly tags: string[]
  readonly createdAt: Date
}

// 悪い例: any使用
function processData(data: any): any {
  return data
}
```

**エラーハンドリング**
```typescript
// 良い例: 適切なエラーハンドリング
async function fetchSessions(): Promise<Session[]> {
  try {
    const response = await apiClient.getSessions()
    return response.sessions
  } catch (error) {
    logger.error('セッション取得エラー:', error)
    throw new SessionFetchError('セッションの取得に失敗しました')
  }
}
```

### React 開発

**コンポーネント設計**
```typescript
// 良い例: Props型定義と関数コンポーネント
interface SessionCardProps {
  readonly session: Session
  readonly onSelect: (id: string) => void
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onSelect }) => {
  return (
    <div onClick={() => onSelect(session.id)}>
      {/* コンポーネント内容 */}
    </div>
  )
}
```

**Hooks使用**
```typescript
// カスタムフック例
function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .finally(() => setLoading(false))
  }, [])
  
  return { sessions, loading }
}
```

### テスト作成

**単体テスト**
```typescript
// service.test.ts
describe('ChatHistoryService', () => {
  it('セッションを正常に作成できる', async () => {
    const service = new ChatHistoryService(mockConfig)
    const session = await service.createSession('テストセッション')
    
    expect(session.title).toBe('テストセッション')
    expect(session.id).toBeDefined()
  })
})
```

**React コンポーネントテスト**
```typescript
// Dashboard.test.tsx
import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'

test('ダッシュボードが正常に表示される', () => {
  render(<Dashboard />)
  expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
})
```

---

## 📊 コードレビューガイドライン

### レビューワー向け

**確認ポイント**
- [ ] 機能要件を満たしているか
- [ ] コードの可読性・保守性
- [ ] セキュリティ上の問題はないか
- [ ] パフォーマンスへの影響
- [ ] テストの妥当性

**フィードバック方法**
```markdown
# 建設的なフィードバック例

## 良い点
- エラーハンドリングが適切に実装されています
- TypeScript型定義が明確です

## 改善提案
- L23: `any`型ではなく具体的な型定義を推奨
- L45: この処理は別関数に分離した方が可読性が向上します

## 質問
- この実装でメモリリークの可能性はありませんか？
```

### 貢献者向け

**レビュー対応**
- すべてのコメントに返信
- 修正が必要な場合は新しいコミットで対応
- 議論が必要な場合は丁寧に説明

---

## 🔒 セキュリティ報告

セキュリティ上の脆弱性を発見した場合：

1. **公開Issue作成は避ける**
2. **メール報告**: security@example.com (仮)
3. **内容**:
   - 脆弱性の詳細
   - 再現手順
   - 影響範囲
   - 修正提案（あれば）

---

## 🎉 貢献者の認識

すべての貢献者は以下で認識されます：
- README.md の Contributors セクション
- リリースノートでの言及
- プロジェクトの成功への感謝

---

## 📞 質問・サポート

**質問方法**
- GitHub Discussions（推奨）
- GitHub Issues（バグ・機能要求）
- プロジェクトSlack（招待制）

**回答時間**
- 通常: 48時間以内
- 緊急: 24時間以内
- セキュリティ: 12時間以内

---

## 📚 参考資料

### 技術ドキュメント
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)

### プロジェクト固有
- [PROJECT_RULES.md](./PROJECT_RULES.md) - プロジェクトルール
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - アーキテクチャ設計
- [API.md](./docs/API.md) - API仕様

---

**ありがとうございます！**  
あなたの貢献がこのプロジェクトをより良いものにします。 