import { Logger } from '../../utils/Logger.js'
import path from 'path'
import fs from 'fs-extra'

describe('Logger', () => {
  let logger: Logger
  const testLogPath = path.join(__dirname, 'test-logs')

  beforeAll(async () => {
    await fs.ensureDir(testLogPath)
  })

  afterAll(async () => {
    await fs.remove(testLogPath)
  })

  beforeEach(async () => {
    logger = new Logger({ logPath: testLogPath, level: 'info' })
    await logger.initialize()
  })

  afterEach(async () => {
    await logger.cleanup()
  })

  describe('初期化', () => {
    it('正常に初期化できること', async () => {
      expect(logger).toBeDefined()
      expect(await fs.pathExists(testLogPath)).toBe(true)
    })

    it('無効なパスで初期化するとエラーになること', async () => {
      const invalidLogger = new Logger({ logPath: '/invalid/path', level: 'info' })
      await expect(invalidLogger.initialize()).rejects.toThrow()
    })
  })

  describe('ログ記録', () => {
    it('INFOレベルのログを記録できること', async () => {
      const message = 'テストメッセージ'
      await logger.info(message)

      const logFiles = await fs.readdir(testLogPath)
      expect(logFiles.length).toBeGreaterThan(0)

      const logContent = await fs.readFile(path.join(testLogPath, logFiles[0]), 'utf-8')
      expect(logContent).toContain('INFO')
      expect(logContent).toContain(message)
    })

    it('ERRORレベルのログを記録できること', async () => {
      const error = new Error('テストエラー')
      await logger.error('エラーが発生しました', error)

      const logFiles = await fs.readdir(testLogPath)
      expect(logFiles.length).toBeGreaterThan(0)

      const logContent = await fs.readFile(path.join(testLogPath, logFiles[0]), 'utf-8')
      expect(logContent).toContain('ERROR')
      expect(logContent).toContain('テストエラー')
      expect(logContent).toContain('Error: テストエラー')
    })

    it('WARNレベルのログを記録できること', async () => {
      const message = '警告メッセージ'
      await logger.warn(message)

      const logFiles = await fs.readdir(testLogPath)
      expect(logFiles.length).toBeGreaterThan(0)

      const logContent = await fs.readFile(path.join(testLogPath, logFiles[0]), 'utf-8')
      expect(logContent).toContain('WARN')
      expect(logContent).toContain(message)
    })

    it('DEBUGレベルのログを記録できること', async () => {
      const message = 'デバッグメッセージ'
      await logger.debug(message)

      const logFiles = await fs.readdir(testLogPath)
      expect(logFiles.length).toBeGreaterThan(0)

      const logContent = await fs.readFile(path.join(testLogPath, logFiles[0]), 'utf-8')
      expect(logContent).toContain('DEBUG')
      expect(logContent).toContain(message)
    })
  })

  describe('ログローテーション', () => {
    it('ログファイルが自動的にローテーションされること', async () => {
      // 大量のログを記録
      for (let i = 0; i < 1000; i++) {
        await logger.info(`テストメッセージ ${i}`)
      }

      const logFiles = await fs.readdir(testLogPath)
      expect(logFiles.length).toBeGreaterThan(1)
    })

    it('古いログファイルが自動的に削除されること', async () => {
      // 古いログファイルを作成
      const oldLogPath = path.join(testLogPath, 'old.log')
      await fs.writeFile(oldLogPath, '古いログ')

      // 新しいログを記録
      await logger.info('新しいログ')

      const logFiles = await fs.readdir(testLogPath)
      expect(logFiles).not.toContain('old.log')
    })
  })

  describe('エラーハンドリング', () => {
    it('無効なログレベルでエラーになること', async () => {
      await expect(
        logger.log('INVALID' as any, 'テストメッセージ')
      ).rejects.toThrow('無効なログレベル')
    })

    it('空のメッセージでエラーになること', async () => {
      await expect(
        logger.info('')
      ).rejects.toThrow('メッセージは空にできません')
    })

    it('ログファイルの書き込みエラーを適切に処理できること', async () => {
      // ログディレクトリを削除して書き込みエラーを発生させる
      await fs.remove(testLogPath)

      await expect(
        logger.info('テストメッセージ')
      ).rejects.toThrow('ログファイルの書き込みに失敗しました')
    })
  })

  describe('ログ検索', () => {
    beforeEach(async () => {
      await logger.info('検索テスト1')
      await logger.error('検索テスト2', new Error('テストエラー'))
      await logger.warn('検索テスト3')
    })

    it('キーワードでログを検索できること', async () => {
      const results = await logger.searchLogs('検索テスト')
      expect(results.length).toBe(3)
    })

    it('ログレベルでフィルタリングできること', async () => {
      const results = await logger.searchLogs('検索テスト', 'ERROR')
      expect(results.length).toBe(1)
      expect(results[0]).toContain('ERROR')
    })

    it('日付範囲でフィルタリングできること', async () => {
      const startDate = new Date(Date.now() - 3600000) // 1時間前
      const endDate = new Date()

      const results = await logger.searchLogs('検索テスト', undefined, startDate, endDate)
      expect(results.length).toBe(3)
    })
  })

  describe('ログ統計', () => {
    beforeEach(async () => {
      await logger.info('統計テスト1')
      await logger.error('統計テスト2', new Error('エラー1'))
      await logger.warn('統計テスト3')
      await logger.error('統計テスト4', new Error('エラー2'))
    })

    it('ログレベルの分布を取得できること', async () => {
      const stats = await logger.getLogStats()
      expect(stats.total).toBe(4)
      expect(stats.levels.INFO).toBe(1)
      expect(stats.levels.ERROR).toBe(2)
      expect(stats.levels.WARN).toBe(1)
    })

    it('エラー発生率を計算できること', async () => {
      const stats = await logger.getLogStats()
      expect(stats.errorRate).toBe(0.5) // 2/4 = 0.5
    })
  })
}) 