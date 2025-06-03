import { ChatHistoryService } from '../../services/ChatHistoryService.js'
import { PerformanceTest } from '../../utils/PerformanceTest.js'
import { Logger } from '../../server/utils/Logger.js'
import type { ChatMessage, ChatSession } from '../../types/index.js'
import path from 'path'
import fs from 'fs-extra'

describe('ChatHistoryService Performance Tests', () => {
  let service: ChatHistoryService
  let performanceTest: PerformanceTest
  let logger: Logger
  const testStoragePath = path.join(__dirname, 'test-storage')

  beforeAll(async () => {
    await fs.ensureDir(testStoragePath)
    logger = new Logger({
      logPath: path.join(testStoragePath, 'logs'),
      level: 'info',
    })
    await logger.initialize()
    performanceTest = new PerformanceTest(logger)
  })

  afterAll(async () => {
    await fs.remove(testStoragePath)
  })

  beforeEach(async () => {
    service = new ChatHistoryService({
      storagePath: testStoragePath,
      maxSessions: 1000,
      maxMessagesPerSession: 500,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24,
    })
    await service.initialize()
  })

  afterEach(async () => {
    await service.cleanup()
  })

  const createTestSession = async (
    messageCount: number
  ): Promise<ChatSession> => {
    const now = new Date()
    const session: ChatSession = {
      id: `test-${Date.now()}`,
      title: 'Test Session',
      messages: [],
      tags: ['test'],
      startTime: now,
      createdAt: now,
      updatedAt: now,
      metadata: { project: 'test', source: 'test' },
    }

    for (let i = 0; i < messageCount; i++) {
      const message: ChatMessage = {
        id: `msg-${i}`,
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Test message ${i}`,
        timestamp: new Date(),
      }
      session.messages.push(message)
    }

    return session
  }

  describe('セッション操作のパフォーマンス', () => {
    it('セッション作成のパフォーマンスを測定できること', async () => {
      const testCases = [
        {
          name: '100セッションの作成（各10メッセージ）',
          iterations: 100,
          fn: async () => {
            const session = await createTestSession(10)
            await service.createSession(session)
          },
        },
        {
          name: '10セッションの作成（各100メッセージ）',
          iterations: 10,
          fn: async () => {
            const session = await createTestSession(100)
            await service.createSession(session)
          },
        },
      ]

      const results = await performanceTest.runTests(testCases)
      const report = performanceTest.generateReport()
      console.log(report)

      // パフォーマンス基準の検証
      results.forEach(result => {
        expect(result.averageTime).toBeLessThan(1000) // 1秒以内
        expect(result.p95Time).toBeLessThan(2000) // 95パーセンタイルが2秒以内
      })
    })

    it('セッション取得のパフォーマンスを測定できること', async () => {
      const session = await createTestSession(100)
      await service.createSession(session)

      const testCases = [
        {
          name: '100メッセージを含むセッションの取得',
          iterations: 100,
          fn: async () => {
            await service.getSession(session.id)
          },
        },
        {
          name: 'ページネーション付きメッセージ取得',
          iterations: 100,
          fn: async () => {
            await service.getSessionMessages(session.id, {
              limit: 10,
              offset: 0,
            })
          },
        },
      ]

      const results = await performanceTest.runTests(testCases)
      const report = performanceTest.generateReport()
      console.log(report)

      // パフォーマンス基準の検証
      results.forEach(result => {
        expect(result.averageTime).toBeLessThan(500) // 500ms以内
        expect(result.p95Time).toBeLessThan(1000) // 95パーセンタイルが1秒以内
      })
    })
  })

  describe('検索機能のパフォーマンス', () => {
    beforeEach(async () => {
      const sessions = await Promise.all(
        Array(10)
          .fill(null)
          .map(async (_, i) => {
            const session = await createTestSession(50)
            session.title = `Test Session ${i}`
            session.tags = [`tag${i}`, 'common']
            return session
          })
      )

      for (const session of sessions) {
        await service.createSession(session)
      }
    })

    it('検索操作のパフォーマンスを測定できること', async () => {
      const testCases = [
        {
          name: 'キーワード検索',
          iterations: 50,
          fn: async () => {
            await service.searchSessions({
              keyword: 'Test',
              page: 1,
              pageSize: 10,
            })
          },
        },
        {
          name: '全セッションのメッセージ検索',
          iterations: 50,
          fn: async () => {
            await service.searchMessages('Test', {
              limit: 10,
              offset: 0,
            })
          },
        },
        {
          name: 'タグによるセッション取得',
          iterations: 50,
          fn: async () => {
            await service.getSessionsByTag('common')
          },
        },
      ]

      const results = await performanceTest.runTests(testCases)
      const report = performanceTest.generateReport()
      console.log(report)

      // パフォーマンス基準の検証
      results.forEach(result => {
        expect(result.averageTime).toBeLessThan(1000) // 1秒以内
        expect(result.p95Time).toBeLessThan(2000) // 95パーセンタイルが2秒以内
      })
    })
  })

  describe('バッチ処理のパフォーマンス', () => {
    it('バッチ操作のパフォーマンスを測定できること', async () => {
      const testCases = [
        {
          name: '100メッセージのバッチ追加',
          iterations: 1,
          fn: async () => {
            const session = await createTestSession(0)
            await service.createSession(session)
            const messages = Array(100)
              .fill(null)
              .map((_, i) => ({
                role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
                content: `Batch message ${i}`,
              }))
            await Promise.all(
              messages.map(msg => service.addMessage(session.id, msg))
            )
          },
        },
      ]

      const results = await performanceTest.runTests(testCases)
      const report = performanceTest.generateReport()
      console.log(report)

      // パフォーマンス基準の検証
      results.forEach(result => {
        expect(result.averageTime).toBeLessThan(5000) // 5秒以内
        expect(result.p95Time).toBeLessThan(10000) // 95パーセンタイルが10秒以内
      })
    })
  })

  describe('バックアップ/復元のパフォーマンス', () => {
    beforeEach(async () => {
      const sessions = await Promise.all(
        Array(5)
          .fill(null)
          .map(async (_, i) => {
            const session = await createTestSession(20)
            session.title = `Backup Test ${i}`
            return session
          })
      )

      for (const session of sessions) {
        await service.createSession(session)
      }
    })

    it('バックアップ/復元操作のパフォーマンスを測定できること', async () => {
      const testCases = [
        {
          name: '5セッションのバックアップ作成',
          iterations: 5,
          fn: async () => {
            await service.createBackup()
          },
        },
        {
          name: 'バックアップからの復元',
          iterations: 5,
          fn: async () => {
            const backups = await service.getBackupList()
            if (backups.length > 0) {
              await service.restoreFromBackup(backups[0].path)
            }
          },
        },
      ]

      const results = await performanceTest.runTests(testCases)
      const report = performanceTest.generateReport()
      console.log(report)

      // パフォーマンス基準の検証
      results.forEach(result => {
        expect(result.averageTime).toBeLessThan(5000) // 5秒以内
        expect(result.p95Time).toBeLessThan(10000) // 95パーセンタイルが10秒以内
      })
    })
  })

  describe('メモリ使用量の測定', () => {
    it('大量のセッション作成時のメモリ使用量を測定できること', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      const sessions = await Promise.all(
        Array(100)
          .fill(null)
          .map(async (_, i) => {
            const session = await createTestSession(10)
            return session
          })
      )

      for (const session of sessions) {
        await service.createSession(session)
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      console.log(`メモリ使用量の増加: ${memoryIncrease / 1024 / 1024}MB`)
      expect(memoryIncrease / 1024 / 1024).toBeLessThan(500) // 500MB以内
    })
  })
})
