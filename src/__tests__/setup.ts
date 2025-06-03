// Jest テストセットアップファイル
require('@testing-library/jest-dom')
const fs = require('fs-extra')
const path = require('path')

// テスト用の一時ディレクトリを作成
const testDir = path.join(__dirname, 'test-storage')

beforeAll(async () => {
  await fs.ensureDir(testDir)
})

afterAll(async () => {
  await fs.remove(testDir)
})

// グローバルなモックの設定
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}

// テスト環境の設定
process.env.NODE_ENV = 'test'

// テスト後のクリーンアップ
afterEach(() => {
  jest.clearAllMocks()
})

// テストのタイムアウト設定
jest.setTimeout(30000)

// TextEncoder polyfill (Node.js環境でのみ)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder } = require('util')
  global.TextEncoder = TextEncoder
}

// ResizeObserverのモック (DOM APIが利用できない場合のみ)
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
