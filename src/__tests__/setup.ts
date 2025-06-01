// Jest テストセットアップファイル
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import { TextEncoder } from 'util'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

// ESM環境での__dirnameの代替
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
  debug: jest.fn()
}

// グローバル変数の設定
global.__dirname = __dirname
global.__filename = __filename

// テスト環境の設定
process.env.NODE_ENV = 'test'

// テスト後のクリーンアップ
afterEach(() => {
  jest.clearAllMocks()
})

// テストのタイムアウト設定
jest.setTimeout(30000)

// TextEncoder polyfill
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}

// ResizeObserverのモック
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver 