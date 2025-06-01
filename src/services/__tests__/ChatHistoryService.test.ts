import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ChatHistoryService } from '../ChatHistoryService.js'
import type { ChatHistoryConfig, ChatSession, ChatMessage } from '../../types/index.js'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { Logger } from '../../server/utils/Logger.js'

describe('ChatHistoryService', () => {
  let service: ChatHistoryService
  let logger: Logger
  let testStoragePath: string
  let testConfig: ChatHistoryConfig

  beforeEach(async () => {
    testStoragePath = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-history-test-'))
    logger = Logger.getInstance(path.join(testStoragePath, 'logs'))
    await logger.initialize()

    testConfig = {
      storagePath: testStoragePath,
      maxSessions: 1000,
      maxMessagesPerSession: 500,
      autoCleanup: false,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24
    }

    service = new ChatHistoryService(testConfig)
    await service.initialize()
  })

  afterEach(async () => {
    await fs.remove(testStoragePath)
    Logger.reset()
  })

  describe('初期化', () => {
    it('正常に初期化できること', async () => {
      expect(service).toBeDefined()
    })

    it('無効な設定で初期化に失敗すること', async () => {
      const invalidConfig = {
        ...testConfig,
        storagePath: '/invalid/path/that/cannot/be/created'
      }

      const invalidService = new ChatHistoryService(invalidConfig)
      await expect(invalidService.initialize()).rejects.toThrow()
    })
  })

  describe('セッション管理', () => {
    it('新しいセッションを作成できること', async () => {
      const session: Omit<ChatSession, 'createdAt' | 'updatedAt'> = {
        id: 'test-session',
        title: 'テストセッション',
        messages: [],
        tags: ['test'],
        startTime: new Date(),
        metadata: { project: 'test', source: 'test' }
      }

      const created = await service.createSession(session)
      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(created.title).toBe('テストセッション')
      expect(created.tags).toContain('test')
      expect(created.metadata?.project).toBe('test')
      expect(created.metadata?.source).toBe('test')
      expect(created.messages).toHaveLength(0)
    })

    it('セッションを取得できること', async () => {
      const created = await service.createSession({
        id: 'test-session-2',
        title: 'テストセッション',
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      })

      const retrieved = await service.getSession(created.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.title).toBe(created.title)
    })

    it('存在しないセッションはnullを返すこと', async () => {
      const session = await service.getSession('non-existent-id')
      expect(session).toBeNull()
    })

    it('セッションを更新できること', async () => {
      const session = await service.createSession({
        id: 'test-session-3',
        title: '元のタイトル',
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      })

      const updated = await service.updateSession(session.id, {
        title: '更新されたタイトル',
        tags: ['updated'],
      })

      expect(updated).toBeDefined()
      expect(updated?.title).toBe('更新されたタイトル')
      expect(updated?.tags).toContain('updated')
    })

    it('セッションを削除できること', async () => {
      const session = await service.createSession({
        id: 'test-session-4',
        title: '削除対象セッション',
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      })

      const deleted = await service.deleteSession(session.id)
      expect(deleted).toBe(true)

      const retrieved = await service.getSession(session.id)
      expect(retrieved).toBeNull()
    })

    it('最大セッション数を超えるとエラーになること', async () => {
      const sessions = Array(testConfig.maxSessions + 1).fill(null).map((_, i) => ({
        id: `test-session-${i}`,
        title: `テストセッション${i}`,
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      }))

      for (let i = 0; i < testConfig.maxSessions; i++) {
        await service.createSession(sessions[i])
      }

      await expect(service.createSession(sessions[testConfig.maxSessions]))
        .rejects.toThrow('最大セッション数を超えています')
    })
  })

  describe('メッセージ管理', () => {
    it('セッションにメッセージを追加できること', async () => {
      const session = await service.createSession({
        id: 'test-session-5',
        title: 'メッセージテスト',
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      })

      const message: Omit<ChatMessage, 'id' | 'timestamp'> = {
        role: 'user',
        content: 'テストメッセージ',
      }

      await service.addMessage(session.id, message)

      const updated = await service.getSession(session.id)
      expect(updated?.messages).toHaveLength(1)
      expect(updated?.messages[0].content).toBe('テストメッセージ')
      expect(updated?.messages[0].role).toBe('user')
    })

    it('存在しないセッションにメッセージを追加するとエラーになること', async () => {
      const message: Omit<ChatMessage, 'id' | 'timestamp'> = {
        role: 'user',
        content: 'テストメッセージ',
      }

      await expect(
        service.addMessage('non-existent-id', message)
      ).rejects.toThrow('Session not found')
    })

    it('最大メッセージ数を超えるとエラーになること', async () => {
      const session = await service.createSession({
        id: 'test-session-6',
        title: 'メッセージ制限テスト',
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      })

      const messages = Array(testConfig.maxMessagesPerSession + 1).fill(null).map((_, i) => ({
        role: 'user' as const,
        content: `テストメッセージ${i}`
      }))

      for (let i = 0; i < testConfig.maxMessagesPerSession; i++) {
        await service.addMessage(session.id, messages[i])
      }

      await expect(service.addMessage(session.id, messages[testConfig.maxMessagesPerSession]))
        .rejects.toThrow('最大メッセージ数を超えています')
    })
  })

  describe('検索機能', () => {
    it('タイトルで検索できること', async () => {
      const session = await service.createSession({
        id: 'test-session-7',
        title: '検索テストセッション',
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      })

      const results = await service.search('検索テスト')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(session.id)
    })

    it('メッセージ内容で検索できること', async () => {
      const session = await service.createSession({
        id: 'test-session-8',
        title: 'メッセージ検索テスト',
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      })

      await service.addMessage(session.id, {
        role: 'user',
        content: '検索対象のメッセージ'
      })

      const results = await service.search('検索対象')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(session.id)
    })

    it('タグで検索できること', async () => {
      const session = await service.createSession({
        id: 'test-session-9',
        title: 'タグ検索テスト',
        tags: ['search-test'],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      })

      const results = await service.search('search-test')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(session.id)
    })
  })

  describe('統計情報', () => {
    it('セッション数を取得できること', async () => {
      const sessions = Array(3).fill(null).map((_, i) => ({
        id: `test-session-${i + 10}`,
        title: `統計テスト${i}`,
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      }))

      for (const session of sessions) {
        await service.createSession(session)
      }

      const stats = await service.getStats()
      expect(stats.totalSessions).toBe(3)
    })

    it('メッセージ数を取得できること', async () => {
      const session = await service.createSession({
        id: 'test-session-13',
        title: 'メッセージ統計テスト',
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        startTime: new Date()
      })

      await service.addMessage(session.id, {
        role: 'user',
        content: 'テストメッセージ1'
      })

      await service.addMessage(session.id, {
        role: 'assistant',
        content: 'テストメッセージ2'
      })

      const stats = await service.getStats()
      expect(stats.totalMessages).toBe(2)
    })
  })

  describe('バックアップ機能', () => {
    it('バックアップを作成できること', async () => {
      const session = await service.createSession({
        id: 'backup-session-1',
        title: 'バックアップテスト',
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const backup = await service.createBackup()
      expect(backup.backupPath).toBeDefined()
      expect(backup.sessionCount).toBe(1)
      expect(backup.size).toBeGreaterThan(0)
    })

    it('バックアップから復元できること', async () => {
      const session = await service.createSession({
        id: 'restore-session-1',
        title: '復元テスト',
        tags: [],
        messages: [],
        metadata: { project: 'test-project' },
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const backup = await service.createBackup()
      await service.deleteSession(session.id)

      const restore = await service.restoreFromBackup(backup.backupPath)
      expect(restore.restored).toBe(1)
      expect(restore.errors).toHaveLength(0)

      const restored = await service.getSession(session.id)
      expect(restored).toBeDefined()
      expect(restored?.title).toBe('復元テスト')
    })

    it('無効なバックアップファイルでエラーになること', async () => {
      await expect(
        service.restoreFromBackup('/invalid/backup/path')
      ).rejects.toThrow('バックアップファイルが見つかりません')
    })
  })
}) 