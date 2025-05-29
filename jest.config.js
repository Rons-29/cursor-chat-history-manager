/** @type {import('jest').Config} */
export default {
  // 実行環境
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // ES Module対応
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  
  // モジュール解決
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // テストファイルパターン
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/tests/**/*.test.ts'
  ],
  
  // カバレッジ設定
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // カバレッジ対象
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
    '!src/cli.ts', // CLIエントリーポイントは除外
    '!src/index.ts', // メインインデックスは除外
  ],
  
  // カバレッジ閾値
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // セットアップ
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  
  // タイムアウト
  testTimeout: 30000,
  
  // 並列実行
  maxWorkers: '50%',
  
  // ファイル変更監視の除外
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/web/',
    '<rootDir>/data/',
    '<rootDir>/exports/',
    '<rootDir>/coverage/',
  ],
  
  // 詳細出力
  verbose: true,
  
  // モック設定
  clearMocks: true,
  restoreMocks: true,
  
  // エラー時の詳細出力
  errorOnDeprecated: true,
} 