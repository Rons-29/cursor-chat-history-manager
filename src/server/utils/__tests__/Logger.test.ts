/**
 * Loggerのテスト
 */

import { Logger } from '../Logger'
import fs from 'fs-extra'
import path from 'path'
import { jest } from '@jest/globals'

describe('Logger', () => {
  let logger: Logger
  let testLogPath: string
  let consoleSpy: jest.SpyInstance

  beforeEach(async () => {
    // テスト用のログディレクトリを作成
    testLogPath = path.join(process.cwd(), 'test-logs')
    await fs.ensureDir(testLogPath)
    
    // Loggerインスタンスをリセット
    Logger.reset()
    logger = Logger.getInstance(testLogPath)
    
    // コンソール出力をモック
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(async () => {
    consoleSpy.mockRestore()
    await fs.remove(testLogPath)
    Logger.reset()
  })

  describe('getInstance', () => {
    it('シングルトンインスタンスを返すこと', () => {
      const instance1 = Logger.getInstance(testLogPath)
      const instance2 = Logger.getInstance(testLogPath)
      expect(instance1).toBe(instance2)
    })
  })

  describe('info', () => {
    let errorSpy: jest.SpyInstance
    let warnSpy: jest.SpyInstance
    let debugSpy: jest.SpyInstance

    beforeEach(() => {
      errorSpy = jest.spyOn(console, 'error').mockImplementation()
      warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      debugSpy = jest.spyOn(console, 'debug').mockImplementation()
    })

    afterEach(() => {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
      debugSpy.mockRestore()
    })

    it('情報ログを出力すること', async () => {
      const message = 'テストメッセージ'
      await logger.info(message)
      
      expect(consoleSpy).toHaveBeenCalledWith(`[INFO] ${message}`)
    })

    it('追加の引数を出力すること', async () => {
      const message = 'テストメッセージ'
      const arg1 = 'arg1'
      const arg2 = { key: 'value' }
      
      await logger.info(message, arg1, arg2)
      
      expect(consoleSpy).toHaveBeenCalledWith(`[INFO] ${message}`, arg1, arg2)
    })
  })

  describe('error', () => {
    let errorSpy: jest.SpyInstance

    beforeEach(() => {
      errorSpy = jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
      errorSpy.mockRestore()
    })

    it('エラーログを出力すること', async () => {
      const message = 'エラーが発生しました'
      await logger.error(message)
      
      expect(errorSpy).toHaveBeenCalledWith(`[ERROR] ${message}`, undefined)
    })

    it('エラーオブジェクトを出力すること', async () => {
      const message = 'エラーが発生しました'
      const error = new Error('テストエラー')
      
      await logger.error(message, error)
      
      expect(errorSpy).toHaveBeenCalledWith(`[ERROR] ${message}`, error)
    })
  })

  describe('warn', () => {
    let warnSpy: jest.SpyInstance

    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation()
    })

    afterEach(() => {
      warnSpy.mockRestore()
    })

    it('警告ログを出力すること', async () => {
      const message = '警告メッセージ'
      await logger.warn(message)
      
      expect(warnSpy).toHaveBeenCalledWith(`[WARN] ${message}`)
    })
  })

  describe('debug', () => {
    let debugSpy: jest.SpyInstance

    beforeEach(() => {
      debugSpy = jest.spyOn(console, 'debug').mockImplementation()
    })

    afterEach(() => {
      debugSpy.mockRestore()
    })

    it('デバッグログを出力すること', async () => {
      const message = 'デバッグメッセージ'
      await logger.debug(message)
      
      expect(debugSpy).toHaveBeenCalledWith(`[DEBUG] ${message}`)
    })
  })

  describe('ファイルログ', () => {
    it('ログファイルに書き込まれること', async () => {
      const message = 'ファイルログテスト'
      await logger.info(message)
      
      // ログファイルの存在確認
      const logFiles = await fs.readdir(testLogPath)
      expect(logFiles.length).toBeGreaterThan(0)
      
      // ログ内容の確認
      const logContent = await fs.readFile(path.join(testLogPath, logFiles[0]), 'utf-8')
      expect(logContent).toContain(message)
      expect(logContent).toContain('"level":"info"')
    })
  })

  describe('ログ検索', () => {
    beforeEach(async () => {
      await logger.info('検索テスト1')
      await logger.error('検索テスト2')
      await logger.warn('検索テスト3')
      await logger.debug('別のメッセージ')
    })

    it('キーワードでログを検索できること', async () => {
      const results = await logger.searchLogs('検索テスト')
      expect(results.length).toBe(3)
    })

    it('ログレベルでフィルタリングできること', async () => {
      const results = await logger.searchLogs('検索テスト', 'error')
      expect(results.length).toBe(1)
      expect(results[0]).toContain('"level":"error"')
    })
  })

  describe('ログ統計', () => {
    beforeEach(async () => {
      await logger.info('統計テスト1')
      await logger.error('統計テスト2')
      await logger.error('統計テスト3')
      await logger.warn('統計テスト4')
    })

    it('ログレベルの分布を取得できること', async () => {
      const stats = await logger.getLogStats()
      expect(stats.total).toBe(4)
      expect(stats.levels.info).toBe(1)
      expect(stats.levels.error).toBe(2)
      expect(stats.levels.warn).toBe(1)
      expect(stats.levels.debug).toBe(0)
    })

    it('エラー発生率を計算できること', async () => {
      const stats = await logger.getLogStats()
      expect(stats.errorRate).toBe(0.5) // 2/4 = 0.5
    })
  })

  describe('バリデーション', () => {
    it('空のメッセージでエラーになること', async () => {
      await expect(logger.info('')).rejects.toThrow('メッセージは空にできません')
    })

    it('無効なログレベルでエラーになること', async () => {
      await expect(logger.log('INVALID' as any, 'テストメッセージ')).rejects.toThrow('無効なログレベル')
    })
  })
}) 