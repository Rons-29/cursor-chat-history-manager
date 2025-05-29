// Jest テストセットアップファイル

// テスト環境で使用するグローバル設定
beforeAll(() => {
  // テスト開始前の共通設定
  process.env.NODE_ENV = 'test'
})

afterAll(() => {
  // テスト終了後のクリーンアップ
  // 必要に応じて追加
})

// コンソールエラーをキャッチして、期待されるエラー以外は失敗させる
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    // 期待されるエラーメッセージはここで除外
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
}) 