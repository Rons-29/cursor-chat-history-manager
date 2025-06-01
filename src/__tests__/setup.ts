import fs from 'fs-extra'
import path from 'path'

// テスト用の一時ディレクトリを作成
const testDir = path.join(__dirname, 'test-storage')

beforeAll(async () => {
  await fs.ensureDir(testDir)
})

afterAll(async () => {
  await fs.remove(testDir)
})

// テストのタイムアウトを設定
jest.setTimeout(30000) 