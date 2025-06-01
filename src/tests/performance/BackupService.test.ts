import { BackupService } from '../../services/BackupService.js'
import { Logger } from '../../utils/Logger.js'
import path from 'path'
import fs from 'fs-extra'

describe('BackupService Performance Tests', () => {
  let backupService: BackupService
  let logger: Logger
  const testLogPath = path.join(__dirname, 'test-logs')
  const testBackupPath = path.join(__dirname, 'test-backups')

  beforeAll(async () => {
    await fs.ensureDir(testLogPath)
    await fs.ensureDir(testBackupPath)
    logger = new Logger({ logPath: testLogPath, level: 'info' })
    await logger.initialize()
  })

  afterAll(async () => {
    await fs.remove(testLogPath)
    await fs.remove(testBackupPath)
  })

  beforeEach(async () => {
    backupService = new BackupService({
      logPath: testLogPath,
      backupPath: testBackupPath,
      maxBackups: 5,
      compressionLevel: 6,
    })
    await backupService.initialize()
  })

  afterEach(async () => {
    await backupService.cleanup()
  })

  describe('バックアップ作成', () => {
    it('大量のデータをバックアップできること', async () => {
      // テストデータの作成
      const testData = {
        sessions: Array.from({ length: 1000 }, (_, i) => ({
          id: `session-${i}`,
          messages: Array.from({ length: 100 }, (_, j) => ({
            id: `message-${i}-${j}`,
            content: `テストメッセージ ${i}-${j}`,
            timestamp: new Date().toISOString(),
          })),
        })),
      }

      const startTime = Date.now()
      const backup = await backupService.createBackup(testData)
      const endTime = Date.now()

      expect(backup).toBeDefined()
      expect(backup.id).toBeDefined()
      expect(backup.timestamp).toBeDefined()
      expect(backup.size).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(5000) // 5秒以内
    })

    it('バックアップファイルが正しく作成されること', async () => {
      const testData = {
        sessions: [
          {
            id: 'test-session',
            messages: [
              {
                id: 'test-message',
                content: 'テストメッセージ',
                timestamp: new Date().toISOString(),
              },
            ],
          },
        ],
      }

      const backup = await backupService.createBackup(testData)
      const backupFile = path.join(testBackupPath, `${backup.id}.zip`)

      expect(await fs.pathExists(backupFile)).toBe(true)
      expect(await fs.stat(backupFile)).resolves.toHaveProperty('size', backup.size)
    })

    it('バックアップの圧縮率を測定できること', async () => {
      const testData = {
        sessions: Array.from({ length: 100 }, (_, i) => ({
          id: `session-${i}`,
          messages: Array.from({ length: 10 }, (_, j) => ({
            id: `message-${i}-${j}`,
            content: 'テストメッセージ'.repeat(100), // 大量のテキスト
            timestamp: new Date().toISOString(),
          })),
        })),
      }

      const backup = await backupService.createBackup(testData)
      const originalSize = JSON.stringify(testData).length
      const compressionRatio = originalSize / backup.size

      expect(compressionRatio).toBeGreaterThan(1) // 圧縮されていることを確認
    })
  })

  describe('バックアップ復元', () => {
    it('バックアップからデータを復元できること', async () => {
      const testData = {
        sessions: [
          {
            id: 'test-session',
            messages: [
              {
                id: 'test-message',
                content: 'テストメッセージ',
                timestamp: new Date().toISOString(),
              },
            ],
          },
        ],
      }

      const backup = await backupService.createBackup(testData)
      const startTime = Date.now()
      const restoredData = await backupService.restoreBackup(backup.id)
      const endTime = Date.now()

      expect(restoredData).toEqual(testData)
      expect(endTime - startTime).toBeLessThan(1000) // 1秒以内
    })

    it('大量のデータを復元できること', async () => {
      const testData = {
        sessions: Array.from({ length: 1000 }, (_, i) => ({
          id: `session-${i}`,
          messages: Array.from({ length: 100 }, (_, j) => ({
            id: `message-${i}-${j}`,
            content: `テストメッセージ ${i}-${j}`,
            timestamp: new Date().toISOString(),
          })),
        })),
      }

      const backup = await backupService.createBackup(testData)
      const startTime = Date.now()
      const restoredData = await backupService.restoreBackup(backup.id)
      const endTime = Date.now()

      expect(restoredData).toEqual(testData)
      expect(endTime - startTime).toBeLessThan(5000) // 5秒以内
    })
  })

  describe('バックアップ管理', () => {
    it('古いバックアップを自動的に削除できること', async () => {
      // 複数のバックアップを作成
      for (let i = 0; i < 10; i++) {
        await backupService.createBackup({
          sessions: [{ id: `session-${i}`, messages: [] }],
        })
      }

      const backups = await backupService.listBackups()
      expect(backups.length).toBeLessThanOrEqual(5) // maxBackupsの制限を確認
    })

    it('バックアップの一覧を取得できること', async () => {
      const testData = {
        sessions: [{ id: 'test-session', messages: [] }],
      }

      const backup = await backupService.createBackup(testData)
      const backups = await backupService.listBackups()

      expect(backups).toContainEqual(expect.objectContaining({
        id: backup.id,
        timestamp: backup.timestamp,
        size: backup.size,
      }))
    })
  })

  describe('エラーハンドリング', () => {
    it('無効なバックアップIDでエラーになること', async () => {
      await expect(
        backupService.restoreBackup('invalid-id')
      ).rejects.toThrow('バックアップが見つかりません')
    })

    it('破損したバックアップファイルでエラーになること', async () => {
      const testData = {
        sessions: [{ id: 'test-session', messages: [] }],
      }

      const backup = await backupService.createBackup(testData)
      const backupFile = path.join(testBackupPath, `${backup.id}.zip`)

      // バックアップファイルを破損させる
      await fs.writeFile(backupFile, 'corrupted data')

      await expect(
        backupService.restoreBackup(backup.id)
      ).rejects.toThrow('バックアップファイルが破損しています')
    })

    it('ディスク容量不足でエラーになること', async () => {
      // ディスク容量を強制的に0にする
      jest.spyOn(fs, 'stat').mockResolvedValue({ size: 0 } as any)

      const testData = {
        sessions: Array.from({ length: 1000 }, (_, i) => ({
          id: `session-${i}`,
          messages: Array.from({ length: 100 }, (_, j) => ({
            id: `message-${i}-${j}`,
            content: 'テストメッセージ'.repeat(1000),
            timestamp: new Date().toISOString(),
          })),
        })),
      }

      await expect(
        backupService.createBackup(testData)
      ).rejects.toThrow('ディスク容量が不足しています')
    })
  })

  describe('パフォーマンス測定', () => {
    it('バックアップ作成のパフォーマンスを測定できること', async () => {
      const testData = {
        sessions: Array.from({ length: 100 }, (_, i) => ({
          id: `session-${i}`,
          messages: Array.from({ length: 10 }, (_, j) => ({
            id: `message-${i}-${j}`,
            content: `テストメッセージ ${i}-${j}`,
            timestamp: new Date().toISOString(),
          })),
        })),
      }

      const startTime = Date.now()
      await backupService.createBackup(testData)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000) // 2秒以内
    })

    it('バックアップ復元のパフォーマンスを測定できること', async () => {
      const testData = {
        sessions: Array.from({ length: 100 }, (_, i) => ({
          id: `session-${i}`,
          messages: Array.from({ length: 10 }, (_, j) => ({
            id: `message-${i}-${j}`,
            content: `テストメッセージ ${i}-${j}`,
            timestamp: new Date().toISOString(),
          })),
        })),
      }

      const backup = await backupService.createBackup(testData)
      const startTime = Date.now()
      await backupService.restoreBackup(backup.id)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000) // 2秒以内
    })
  })
}) 