import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ChatHistoryService } from '../services/ChatHistoryService.js'
import { ChatHistoryConfig } from '../types/index.js'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'

describe('ChatHistoryService', () => {
  let service: ChatHistoryService
  let tempDir: string
  let config: ChatHistoryConfig

  beforeEach(async () => {
    // テスト用の一時ディレクトリを作成
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-history-test-'))
    
    config = {
      storagePath: tempDir,
      storageType: 'file',
      maxSessions: 1000,
      maxMessagesPerSession: 1000,
      autoCleanup: false,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24
    }
    
    service = new ChatHistoryService(config)
    await service.initialize()
  })

  afterEach(async () => {
    // テスト後にクリーンアップ
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir)
    }
  })

  describe('初期化', () => {
    it('正常に初期化できること', async () => {
      expect(service).toBeDefined()
      expect(await fs.pathExists(tempDir)).toBe(true)
    })
  })

  describe('セッション作成', () => {
    it('新しいセッションを作成できること', async () => {
      const session = await service.createSession({
        title: 'テストセッション'
      })
      
      expect(session).toBeDefined()
      expect(session.id).toBeDefined()
      expect(session.title).toBe('テストセッション')
      expect(session.messages).toEqual([])
      expect(session.createdAt).toBeInstanceOf(Date)
      expect(session.startTime).toBeInstanceOf(Date)
      expect(Array.isArray(session.tags)).toBe(true)
      
      // 保存・読み込み後の状態もテスト
      const retrievedSession = await service.getSession(session.id)
      expect(retrievedSession).toBeDefined()
      expect(retrievedSession?.title).toBe('テストセッション')
      expect(retrievedSession?.createdAt).toBeInstanceOf(Date)
      expect(Array.isArray(retrievedSession?.tags)).toBe(true)
    })

    it('メタデータ付きでセッションを作成できること', async () => {
      const session = await service.createSession({
        title: 'メタデータテスト',
        tags: ['test', 'demo']
      })
      
      expect(session.tags).toEqual(['test', 'demo'])
      expect(session.title).toBe('メタデータテスト')
      
      // 保存・読み込み後の状態もテスト
      const retrievedSession = await service.getSession(session.id)
      expect(retrievedSession?.tags).toEqual(['test', 'demo'])
      expect(retrievedSession?.title).toBe('メタデータテスト')
    })
  })

  describe('メッセージ追加', () => {
    it('セッションにメッセージを追加できること', async () => {
      const session = await service.createSession({
        title: 'メッセージテスト'
      })
      
      const message = await service.addMessage(session.id, {
        role: 'user',
        content: 'こんにちは',
      })
      
      expect(message).toBeDefined()
      expect(message.id).toBeDefined()
      expect(message.role).toBe('user')
      expect(message.content).toBe('こんにちは')
      expect(message.timestamp).toBeInstanceOf(Date)
    })

    it('存在しないセッションにメッセージを追加するとエラーになること', async () => {
      await expect(
        service.addMessage('nonexistent', {
          role: 'user',
          content: 'テスト',
        })
      ).rejects.toThrow()
    })
  })

  describe('セッション検索', () => {
    beforeEach(async () => {
      // テストデータを準備
      const session1 = await service.createSession({
        title: 'JavaScript入門',
        tags: ['javascript', 'programming']
      })
      await service.addMessage(session1.id, {
        role: 'user',
        content: 'JavaScriptを学びたいです',
      })

      const session2 = await service.createSession({
        title: 'React開発',
        tags: ['react', 'frontend']
      })
      await service.addMessage(session2.id, {
        role: 'user',
        content: 'Reactコンポーネントの作り方',
      })
    })

    it('すべてのセッションを取得できること', async () => {
      const result = await service.searchSessions({})
      
      expect(result.sessions).toHaveLength(2)
      expect(result.totalCount).toBe(2)
    })

    it('キーワードでセッションを検索できること', async () => {
      const result = await service.searchSessions({
        keyword: 'React',
      })
      
      expect(result.sessions).toHaveLength(1)
      const foundSession = result.sessions[0]
      expect(foundSession).toBeDefined()
      expect(foundSession.title).toBe('React開発')
    })

    it('タグでセッションをフィルタできること', async () => {
      const result = await service.searchSessions({
        tags: ['javascript'],
      })
      
      expect(result.sessions).toHaveLength(1)
      const foundSession = result.sessions[0]
      expect(foundSession).toBeDefined()
      expect(foundSession.title).toBe('JavaScript入門')
    })
  })

  describe('統計情報', () => {
    it('統計情報を取得できること', async () => {
      // テストデータを作成
      const session = await service.createSession({
        title: '統計テスト'
      })
      await service.addMessage(session.id, {
        role: 'user',
        content: 'テストメッセージ1',
      })
      await service.addMessage(session.id, {
        role: 'assistant',
        content: 'テストメッセージ2',
      })

      const stats = await service.getStats()
      
      expect(stats.totalSessions).toBe(1)
      expect(stats.totalMessages).toBe(2)
      expect(stats.averageMessagesPerSession).toBe(2)
    })
  })

  describe('セッション削除', () => {
    it('セッションを削除できること', async () => {
      const session = await service.createSession({
        title: '削除テスト'
      })
      const sessionId = session.id
      
      const deleted = await service.deleteSession(sessionId)
      expect(deleted).toBe(true)
      
      const retrievedSession = await service.getSession(sessionId)
      expect(retrievedSession).toBeNull()
    })
  })
}) 