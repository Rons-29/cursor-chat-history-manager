import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
} from '@jest/globals'
import { ChatHistoryService } from '../../services/ChatHistoryService.js'
import type { ChatHistoryConfig, ChatSession } from '../../types/index.js'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { Monitor } from '../../utils/Monitor.js'
import { Logger } from '../../server/utils/Logger.js'

describe('MonitorEdgeCases', () => {
  let service: ChatHistoryService
  let tempDir: string
  let config: ChatHistoryConfig
  let monitor: Monitor
  let logger: Logger

  beforeAll(async () => {
    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) {
      await fs.mkdir(tmpDir)
    }
  })

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-history-test-'))
    config = {
      storagePath: tempDir,
      maxSessions: 1000,
      maxMessagesPerSession: 1000,
      autoCleanup: false,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24,
    }
    service = new ChatHistoryService(config)
    await service.initialize()
    logger = new Logger({ logPath: './logs', level: 'info' })
    monitor = new Monitor(logger)
  })

  afterEach(async () => {
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir)
    }
  })

  describe('エッジケース', () => {
    it('空のセッションを作成できること', async () => {
      const session = await service.createSession({
        id: 'empty-session',
        title: 'Empty Session',
        messages: [],
        tags: [],
        startTime: new Date(),
        metadata: {},
      })
      expect(session).toBeDefined()
      expect(session.messages).toHaveLength(0)
    })

    it('大量のメッセージを追加できること', async () => {
      const session = await service.createSession({
        id: 'large-session',
        title: 'Large Session',
        messages: [],
        tags: [],
        startTime: new Date(),
        metadata: {},
      })
      const messages = Array.from({ length: 1000 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: new Date(),
      }))
      for (const message of messages) {
        await service.addMessage(session.id, message)
      }
      const updated = await service.getSession(session.id)
      expect(updated?.messages).toHaveLength(1000)
    })

    it('特殊文字を含むメッセージを追加できること', async () => {
      const session = await service.createSession({
        id: 'special-chars',
        title: 'Special Characters',
        messages: [],
        tags: [],
        startTime: new Date(),
        metadata: {},
      })
      const specialMessage = {
        role: 'user' as const,
        content: '!@#$%^&*()_+{}|:"<>?[]\\;\',./~`',
        timestamp: new Date(),
      }
      await service.addMessage(session.id, specialMessage)
      const updated = await service.getSession(session.id)
      expect(updated?.messages[0].content).toBe(specialMessage.content)
    })

    it('長いメッセージを追加できること', async () => {
      const session = await service.createSession({
        id: 'long-message',
        title: 'Long Message',
        messages: [],
        tags: [],
        startTime: new Date(),
        metadata: {},
      })
      const longMessage = {
        role: 'user' as const,
        content: 'a'.repeat(10000),
        timestamp: new Date(),
      }
      await service.addMessage(session.id, longMessage)
      const updated = await service.getSession(session.id)
      expect(updated?.messages[0].content).toBe(longMessage.content)
    })

    it('複数のタグを持つセッションを作成できること', async () => {
      const session = await service.createSession({
        id: 'multi-tags',
        title: 'Multi Tags',
        messages: [],
        tags: ['tag1', 'tag2', 'tag3'],
        startTime: new Date(),
        metadata: {},
      })
      expect(session.tags).toHaveLength(3)
      expect(session.tags).toContain('tag1')
      expect(session.tags).toContain('tag2')
      expect(session.tags).toContain('tag3')
    })

    it('複雑なメタデータを持つセッションを作成できること', async () => {
      const session: Omit<ChatSession, 'createdAt' | 'updatedAt'> = {
        id: 'complex-metadata',
        title: 'Complex Metadata',
        messages: [],
        tags: [],
        startTime: new Date(),
        metadata: {
          project: 'project1',
          source: 'test',
        },
      }
      await service.createSession(session)
      const updated = await service.getSession(session.id)
      expect(updated?.metadata).toBeDefined()
      expect(updated?.metadata?.source).toBe('test')
      expect(updated?.metadata?.project).toBe('project1')
    })
  })

  describe('異常値の処理', () => {
    it('無効なメトリクス名を登録しようとするとエラーになること', async () => {
      await expect(monitor.registerMetric('', 'counter')).rejects.toThrow()
      await expect(
        monitor.registerMetric('invalid@name', 'counter')
      ).rejects.toThrow()
    })

    it('無効なメトリクスタイプを登録しようとするとエラーになること', async () => {
      await expect(
        monitor.registerMetric('test', 'invalid' as any)
      ).rejects.toThrow()
    })

    it('存在しないメトリクスに値を記録しようとするとエラーになること', async () => {
      await expect(monitor.recordMetric('nonexistent', 1)).rejects.toThrow()
    })

    it('無効な値を記録しようとするとエラーになること', async () => {
      await monitor.registerMetric('test', 'counter')
      await expect(monitor.recordMetric('test', -1)).rejects.toThrow()
      await expect(monitor.recordMetric('test', NaN)).rejects.toThrow()
      await expect(monitor.recordMetric('test', Infinity)).rejects.toThrow()
    })
  })

  describe('アラートの処理', () => {
    it('無効なアラート条件を設定しようとするとエラーになること', async () => {
      await expect(
        monitor.configureAlert('test', {
          condition: 'invalid' as any,
          threshold: 100,
          message: 'Test alert',
          severity: 'error',
        })
      ).rejects.toThrow()
    })

    it('無効な閾値を設定しようとするとエラーになること', async () => {
      await expect(
        monitor.configureAlert('test', {
          condition: '>',
          threshold: -1,
          message: 'Test alert',
          severity: 'error',
        })
      ).rejects.toThrow()
    })

    it('存在しないメトリクスのアラートを設定しようとするとエラーになること', async () => {
      await expect(
        monitor.configureAlert('nonexistent', {
          condition: '>',
          threshold: 100,
          message: 'Test alert',
          severity: 'error',
        })
      ).rejects.toThrow()
    })
  })

  describe('レポート生成', () => {
    it('無効な期間でレポートを生成しようとするとエラーになること', async () => {
      await expect(
        monitor.generateReport({
          startTime: new Date('2024-01-01'),
          endTime: new Date('2023-12-31'),
        })
      ).rejects.toThrow()
    })

    it('無効なフォーマットでレポートを生成しようとするとエラーになること', async () => {
      await expect(
        monitor.generateReport({
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endTime: new Date(),
        })
      ).rejects.toThrow()
    })
  })

  describe('セッション監視', () => {
    it('無効なセッションIDで監視を開始しようとするとエラーになること', async () => {
      await expect(monitor.startSessionMonitoring('')).rejects.toThrow()
    })

    it('無効なセッションデータで監視を開始しようとするとエラーになること', async () => {
      const invalidSession: Partial<ChatSession> = {
        id: 'test',
        title: '',
        messages: [],
      }
      await expect(
        monitor.startSessionMonitoring('test', invalidSession as ChatSession)
      ).rejects.toThrow()
    })

    it('存在しないセッションの監視を停止しようとするとエラーになること', async () => {
      await expect(
        monitor.stopSessionMonitoring('nonexistent')
      ).rejects.toThrow()
    })
  })

  describe('パフォーマンス監視', () => {
    it('無効なメモリ使用量の監視を開始しようとするとエラーになること', async () => {
      await expect(
        monitor.startMemoryMonitoring({
          threshold: -1,
          interval: 1000,
        })
      ).rejects.toThrow()
    })

    it('無効な監視間隔でメモリ使用量の監視を開始しようとするとエラーになること', async () => {
      await expect(
        monitor.startMemoryMonitoring({
          threshold: 1000,
          interval: 0,
        })
      ).rejects.toThrow()
    })
  })

  describe('エラー処理', () => {
    it('無効なエラーレベルでログを記録しようとするとエラーになること', async () => {
      await expect(
        monitor.logError('test', new Error('test'), 'invalid' as any)
      ).rejects.toThrow()
    })

    it('無効なエラーオブジェクトでログを記録しようとするとエラーになること', async () => {
      await expect(monitor.logError('test', null as any)).rejects.toThrow()
    })
  })
})
