// Jest テストセットアップファイル

import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import { TextEncoder } from 'util'

// グローバルなモックの設定
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}

// テスト環境の設定
process.env.NODE_ENV = 'test'

// テスト後のクリーンアップ
afterEach(() => {
  jest.clearAllMocks()
})

// テストのタイムアウト設定
jest.setTimeout(10000)

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

global.ResizeObserver = ResizeObserver; 