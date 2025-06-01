import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ChatHistoryService } from '../services/ChatHistoryService.js'
import type { ChatHistoryConfig, ChatSession, ChatMessage } from '../types/index.js'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

describe('ChatHistoryService', () => {
  let service: ChatHistoryService
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-history-test-'))
    const config: ChatHistoryConfig = {
      storagePath: tempDir,
      maxSessions: 100,
      maxMessagesPerSession: 1000,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: true,
      backupInterval: 24
    }
    service = new ChatHistoryService(config)
    await service.initialize()
  })

  afterEach(async () => {
    await fs.remove(tempDir)
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

      const result = await service.createSession(session)
      expect(result).toBeDefined()
      expect(result.id).toBe('test-session')
      expect(result.title).toBe('テストセッション')
      expect(result.tags).toContain('test')
      expect(result.metadata?.project).toBe('test')
      expect(result.metadata?.source).toBe('test')
    })

    it('セッションにメッセージを追加できること', async () => {
      const session: Omit<ChatSession, 'createdAt' | 'updatedAt'> = {
        id: 'test-session',
        title: 'テストセッション',
        messages: [],
        tags: ['test'],
        startTime: new Date(),
        metadata: { project: 'test', source: 'test' }
      }

      await service.createSession(session)

      const message: Omit<ChatMessage, 'id' | 'timestamp'> = {
        role: 'user' as const,
        content: 'テストメッセージ'
      }

      const result = await service.addMessage(session.id, message)
      expect(result).toBeDefined()
      expect(result.role).toBe('user')
      expect(result.content).toBe('テストメッセージ')
    })

    it('セッションを検索できること', async () => {
      const session1: Omit<ChatSession, 'createdAt' | 'updatedAt'> = {
        id: 'session1',
        title: 'セッション1',
        messages: [],
        tags: ['test'],
        startTime: new Date(),
        metadata: {
          project: 'project1'
        }
      }

      const session2: Omit<ChatSession, 'createdAt' | 'updatedAt'> = {
        id: 'session2',
        title: 'セッション2',
        messages: [],
        tags: ['test'],
        startTime: new Date(),
        metadata: {
          project: 'project2'
        }
      }

      await service.createSession(session1)
      await service.createSession(session2)

      const results = await service.searchSessions({
        keyword: 'セッション1',
        page: 1,
        pageSize: 10
      })

      expect(results.sessions).toHaveLength(1)
      expect(results.sessions[0].id).toBe('session1')
    })
  })

  describe('統計情報', () => {
    beforeEach(async () => {
      const session1: Omit<ChatSession, 'createdAt' | 'updatedAt'> = {
        id: 'session1',
        title: 'セッション1',
        messages: [],
        tags: ['test'],
        startTime: new Date(),
        metadata: {
          project: 'project1'
        }
      }

      const session2: Omit<ChatSession, 'createdAt' | 'updatedAt'> = {
        id: 'session2',
        title: 'セッション2',
        messages: [],
        tags: ['test'],
        startTime: new Date(),
        metadata: {
          project: 'project2'
        }
      }

      await service.createSession(session1)
      await service.createSession(session2)

      await service.addMessage(session1.id, {
        role: 'user' as const,
        content: 'メッセージ1'
      })

      await service.addMessage(session2.id, {
        role: 'assistant' as const,
        content: 'メッセージ2'
      })
    })

    it('統計情報を取得できること', async () => {
      const stats = await service.getStats()
      expect(stats.totalSessions).toBe(2)
      expect(stats.totalMessages).toBe(2)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.storageSize).toBeGreaterThan(0)
      expect(stats.thisMonthMessages).toBe(2)
      expect(stats.activeProjects).toBe(2)
      expect(stats.averageMessagesPerSession).toBe(1)
      expect(stats.tagDistribution).toBeDefined()
      expect(stats.lastUpdated).toBeDefined()
      expect(stats.lastActivity).toBeDefined()
      expect(stats.oldestSession).toBeDefined()
      expect(stats.newestSession).toBeDefined()
    })
  })
}) 