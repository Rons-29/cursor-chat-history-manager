import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { CursorLogService } from '../services/CursorLogService.js'
import type { CursorConfig, CursorLog, CursorLogSearchOptions } from '../types/cursor.js'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import type { CursorLogConfig } from '../server/types/integration.js'
import { Logger } from '../server/utils/Logger.js'

describe('CursorLogService', () => {
  let service: CursorLogService
  let logger: Logger
  let tempDir: string
  const testDir = path.join(__dirname, '../test-logs')
  let config: CursorLogConfig

  beforeEach(async () => {
    await fs.ensureDir(testDir)
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cursor-log-test-'))
    
    config = {
      enabled: true,
      watchPath: path.join(tempDir, 'cursor'),
      logDir: path.join(tempDir, 'logs'),
      autoImport: true,
      syncInterval: 300,
      batchSize: 100,
      retryAttempts: 3,
      maxLogSize: 1024 * 1024,
      maxLogFiles: 10,
      cacheSize: 100,
      cacheTTL: 60000
    }

    logger = Logger.getInstance(path.join(tempDir, 'logs'))
    await logger.initialize()

    service = new CursorLogService(config, logger)
    await service.initialize()
  })

  afterEach(async () => {
    await fs.remove(testDir)
    await fs.remove(tempDir)
    await logger.cleanup()
  })

  describe('初期化', () => {
    it('正常に初期化できること', async () => {
      expect(service).toBeDefined()
      expect(await fs.pathExists(path.join(tempDir, 'logs'))).toBe(true)
    })

    it('無効な設定で初期化するとエラーになること', async () => {
      const invalidConfig = {} as CursorLogConfig
      expect(() => new CursorLogService(invalidConfig, logger)).toThrow()
    })
  })

  describe('ログ記録', () => {
    it('新しいログを記録できること', async () => {
      const log: Omit<CursorLog, 'id' | 'timestamp'> = {
        type: 'chat',
        content: 'テストメッセージ',
        metadata: {
          project: 'test-project',
          tags: ['test']
        }
      }

      const result = await service.log(log)
      expect(result).toBeDefined()
      expect(result.type).toBe('chat')
      expect(result.content).toBe('テストメッセージ')
      expect(result.metadata?.project).toBe('test-project')
      expect(result.metadata?.tags).toContain('test')
    })

    it('メタデータなしでログを記録できること', async () => {
      const log: Omit<CursorLog, 'id' | 'timestamp'> = {
        type: 'chat',
        content: 'テストメッセージ',
        metadata: {}
      }

      const result = await service.log(log)
      expect(result).toBeDefined()
      expect(result.type).toBe('chat')
      expect(result.content).toBe('テストメッセージ')
      expect(result.metadata).toEqual({})
    })

    it('無効なログタイプでエラーになること', async () => {
      const invalidLog = {
        type: 'invalid_type' as any,
        content: 'テストメッセージ',
        metadata: {}
      }

      await expect(service.log(invalidLog)).rejects.toThrow('無効なログタイプ')
    })

    it('空のコンテンツでエラーになること', async () => {
      const emptyLog = {
        type: 'chat',
        content: '',
        metadata: {}
      }

      await expect(service.log(emptyLog)).rejects.toThrow('ログのコンテンツは必須です')
    })
  })

  describe('ログ検索', () => {
    beforeEach(async () => {
      await service.log({
        type: 'chat',
        content: 'プロジェクト1のメッセージ',
        metadata: {
          project: 'project1',
          tags: ['test']
        }
      })

      await service.log({
        type: 'command',
        content: 'コマンド実行',
        metadata: {
          project: 'project2',
          tags: ['command']
        }
      })
    })

    it('キーワードで検索できること', async () => {
      const options: CursorLogSearchOptions = {
        query: 'メッセージ'
      }

      const results = await service.search(options)
      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('プロジェクト1のメッセージ')
    })

    it('プロジェクトで検索できること', async () => {
      const options: CursorLogSearchOptions = {
        project: 'project1'
      }

      const results = await service.search(options)
      expect(results).toHaveLength(1)
      expect(results[0].metadata?.project).toBe('project1')
    })

    it('タグで検索できること', async () => {
      const options: CursorLogSearchOptions = {
        tags: ['test']
      }

      const results = await service.search(options)
      expect(results).toHaveLength(1)
      expect(results[0].metadata?.tags).toContain('test')
    })

    it('複数条件で検索できること', async () => {
      const options: CursorLogSearchOptions = {
        query: 'コマンド',
        project: 'project2',
        tags: ['command']
      }

      const results = await service.search(options)
      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('コマンド実行')
    })

    it('日付範囲で検索できること', async () => {
      const startDate = new Date(Date.now() - 3600000) // 1時間前
      const endDate = new Date()

      const options: CursorLogSearchOptions = {
        startDate,
        endDate
      }

      const results = await service.search(options)
      expect(results.length).toBeGreaterThan(0)
      results.forEach(log => {
        expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
        expect(log.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime())
      })
    })
  })

  describe('ログ管理', () => {
    it('古いログを削除できること', async () => {
      const oldDate = new Date(Date.now() - 86400000) // 24時間前
      await service.log({
        type: 'chat',
        content: '古いログ',
        metadata: {}
      })

      await service.log({
        type: 'chat',
        content: '新しいログ',
        metadata: {}
      })

      const beforeStats = await service.getStats()
      await service.clearLogs()
      const afterStats = await service.getStats()

      expect(afterStats.totalLogs).toBeLessThan(beforeStats.totalLogs)
    })

    it('ログをエクスポートできること', async () => {
      await service.log({
        type: 'chat',
        content: 'エクスポートテスト',
        metadata: {
          project: 'test-project'
        }
      })

      const exportPath = path.join(tempDir, 'export.json')
      const logs = await service.getLogs()
      await fs.writeJson(exportPath, logs)

      expect(await fs.pathExists(exportPath)).toBe(true)
      const exportedData = await fs.readJson(exportPath)
      expect(exportedData).toHaveLength(1)
      expect(exportedData[0].content).toBe('エクスポートテスト')
    })

    it('ログをインポートできること', async () => {
      const importData = [{
        type: 'chat',
        content: 'インポートテスト',
        metadata: {
          project: 'test-project'
        },
        timestamp: new Date().toISOString()
      }]

      const importPath = path.join(tempDir, 'import.json')
      await fs.writeJson(importPath, importData)

      for (const logData of importData) {
        await service.log({
          type: logData.type,
          content: logData.content,
          metadata: logData.metadata
        })
      }
      
      const stats = await service.getStats()
      expect(stats.totalLogs).toBe(1)
    })
  })

  describe('統計情報', () => {
    beforeEach(async () => {
      await service.log({
        type: 'chat',
        content: 'テストメッセージ1',
        metadata: {
          project: 'project1',
          tags: ['test']
        }
      })

      await service.log({
        type: 'command',
        content: 'テストコマンド',
        metadata: {
          project: 'project2',
          tags: ['command']
        }
      })
    })

    it('統計情報を取得できること', async () => {
      const stats = await service.getStats()
      expect(stats.totalLogs).toBe(2)
      expect(stats.storageSize).toBeGreaterThan(0)
      expect(stats.logsByType).toBeDefined()
      expect(stats.logsByProject).toBeDefined()
      expect(stats.logsByTag).toBeDefined()
    })

    it('ログタイプ別の統計が正しいこと', async () => {
      const stats = await service.getStats()
      expect(stats.logsByType).toBeDefined()
      expect(stats.logsByType?.chat).toBe(1)
      expect(stats.logsByType?.command).toBe(1)
    })

    it('プロジェクト別の統計が正しいこと', async () => {
      const stats = await service.getStats()
      expect(stats.logsByProject).toBeDefined()
      expect(stats.logsByProject?.project1).toBe(1)
      expect(stats.logsByProject?.project2).toBe(1)
    })

    it('タグ別の統計が正しいこと', async () => {
      const stats = await service.getStats()
      expect(stats.logsByTag).toBeDefined()
      expect(stats.logsByTag?.test).toBe(1)
      expect(stats.logsByTag?.command).toBe(1)
    })
  })
}) 