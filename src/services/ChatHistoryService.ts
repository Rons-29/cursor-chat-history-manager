import { v4 as uuidv4 } from 'uuid'
import { format, isAfter, isBefore, parseISO } from 'date-fns'
import fs from 'fs-extra'
import path from 'path'
import type {
  ChatMessage,
  ChatSession,
  ChatHistoryFilter,
  ChatHistorySearchResult,
  ChatHistoryConfig,
  ChatHistoryStats,
  Message,
  SessionMetadata,
} from '../types/index.js'
import {
  ChatHistoryError,
  SessionNotFoundError,
  StorageError,
  ValidationError,
  BackupError,
  ImportError,
} from '../errors/ChatHistoryError.js'
import { Logger } from '../server/utils/Logger.js'
import { CacheManager } from '../utils/CacheManager.js'
import { IndexManager } from '../utils/IndexManager.js'
import { BatchProcessor } from '../utils/BatchProcessor.js'
import { ConfigService } from './ConfigService.js'
import { AnalyticsService } from './AnalyticsService.js'
import { AutoSaveService } from './AutoSaveService.js'
import { ExportService } from './ExportService.js'
import { CursorIntegrationService } from './CursorIntegrationService.js'
import { CursorLogService } from './CursorLogService.js'

class ChatHistoryService {
  private config: ChatHistoryConfig
  private sessionsPath: string
  private logger: Logger
  private sessionCache: CacheManager<ChatSession>
  private indexManager: IndexManager
  private messageBatchProcessor: BatchProcessor<{
    sessionId: string
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  }>
  private isInitialized: boolean = false

  constructor(config: ChatHistoryConfig) {
    this.config = {
      ...config,
      maxSessions: config.maxSessions ?? 1000,
      maxMessagesPerSession: config.maxMessagesPerSession ?? 500,
      autoCleanup: config.autoCleanup ?? true,
      cleanupDays: config.cleanupDays ?? 30,
      enableSearch: config.enableSearch ?? true,
      enableBackup: config.enableBackup ?? false,
      backupInterval: config.backupInterval ?? 24,
    }

    this.sessionsPath = path.join(this.config.storagePath, 'sessions')
    this.logger = Logger.getInstance(path.join(this.config.storagePath, 'logs'))
    this.sessionCache = new CacheManager<ChatSession>({
      max: 1000,
      maxAge: 3600000, // 1時間
      updateAgeOnGet: true
    })
    this.indexManager = new IndexManager(
      path.join(this.config.storagePath, 'index.json'),
      this.logger
    )
    this.messageBatchProcessor = new BatchProcessor(
      {
        maxSize: 50,
        maxWaitTime: 1000,
        onBatch: async (items) => {
          for (const { sessionId, message } of items) {
            await this.addMessageInternal(sessionId, message)
          }
        },
      },
      this.logger
    )
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await fs.ensureDir(this.sessionsPath)
      await this.indexManager.initialize()
      this.isInitialized = true
      await this.logger.info('ChatHistoryServiceを初期化しました', {
        storagePath: this.config.storagePath,
      })
    } catch (error) {
      await this.logger.error('初期化に失敗しました', error instanceof Error ? error : undefined)
      throw new StorageError('初期化', error as Error)
    }
  }

  private async addMessageInternal(
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    const session = await this.getSession(sessionId)
    if (!session) {
      throw new SessionNotFoundError(sessionId)
    }

    const newMessage: ChatMessage = {
      id: this.generateId(),
      timestamp: new Date(),
      ...message,
    }

    session.messages.push(newMessage)
    session.updatedAt = new Date()

    await this.saveSession(session)
    await this.sessionCache.set(sessionId, session)
  }

  async addMessage(
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    await this.messageBatchProcessor.add({ sessionId, message })
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const cachedSession = await this.sessionCache.get(sessionId)
      if (cachedSession) {
        return cachedSession
      }

      const filePath = path.join(this.sessionsPath, `${sessionId}.json`)
      if (!(await fs.pathExists(filePath))) {
        await this.logger.debug('セッションが見つかりません', { sessionId })
        return null
      }

      const data = await fs.readJson(filePath)
      if (!this.validateSessionData(data)) {
        throw new ValidationError('Invalid session data format')
      }

      await this.sessionCache.set(sessionId, data)
      return data
    } catch (error) {
      await this.logger.error('セッションの取得に失敗しました', { 
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      })
      throw new StorageError('セッション取得', error as Error)
    }
  }

  private async saveSession(session: ChatSession): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const sessionPath = path.join(this.sessionsPath, `${session.id}.json`)
      await fs.writeJson(sessionPath, session, { spaces: 2 })
      await this.sessionCache.set(session.id, session)
      await this.indexManager.addSession(session.id, {
        tags: session.tags,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        size: session.messages.length
      })
    } catch (error) {
      await this.logger.error('セッションの保存に失敗しました', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: session.id,
      })
      throw new StorageError('セッション保存', error as Error)
    }
  }

  async searchSessions(
    filter: ChatHistoryFilter
  ): Promise<ChatHistorySearchResult> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const sessionIds = await this.indexManager.getAllSessions()
      const results: ChatSession[] = []

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId)
        if (!session) continue

        if (filter.keyword) {
          const keyword = filter.keyword.toLowerCase()
          if (
            !session.title.toLowerCase().includes(keyword) &&
            !session.messages.some((msg) =>
              msg.content.toLowerCase().includes(keyword)
            )
          ) {
            continue
          }
        }

        if (filter.tags && filter.tags.length > 0) {
          if (!filter.tags.some((tag) => session.tags?.includes(tag))) {
            continue
          }
        }

        if (filter.startDate) {
          if (!isAfter(session.createdAt, filter.startDate)) {
            continue
          }
        }

        if (filter.endDate) {
          if (!isBefore(session.createdAt, filter.endDate)) {
            continue
          }
        }

        results.push(session)
      }

      results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

      const total = results.length
      const page = filter.page || 1
      const pageSize = filter.pageSize || 10
      const totalPages = Math.ceil(total / pageSize)
      const pagedResults = results.slice((page - 1) * pageSize, page * pageSize)

      await this.logger.debug('セッションを検索しました', {
        filter,
        total,
        page,
        pageSize,
      })

      return {
        sessions: pagedResults,
        total,
        totalCount: total,
        page,
        currentPage: page,
        pageSize,
        totalPages,
        hasMore: page < totalPages
      }
    } catch (error) {
      await this.logger.error('セッションの検索に失敗しました', {
        error,
        filter,
      })
      throw new StorageError('セッション検索', error as Error)
    }
  }

  async getStats(): Promise<ChatHistoryStats> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const sessionCount = await this.indexManager.getSessionCount()
      const sessions = await Promise.all(
        (await this.indexManager.getAllSessions()).map((id) =>
          this.getSession(id)
        )
      )

      const totalMessages = sessions.reduce(
        (sum, session) => sum + (session?.messages.length || 0),
        0
      )
      const totalSize = await this.calculateDirectorySize(this.sessionsPath)

      const tags = new Map<string, number>()
      sessions.forEach((session) => {
        if (session) {
          session.tags?.forEach((tag) => {
            tags.set(tag, (tags.get(tag) || 0) + 1)
          })
        }
      })

      const tagDistribution = Object.fromEntries(tags)

      const stats: ChatHistoryStats = {
        totalSessions: sessionCount,
        totalMessages,
        totalSize,
        storageSize: totalSize,
        thisMonthMessages: 0,
        activeProjects: 0,
        averageMessagesPerSession:
          sessionCount > 0 ? totalMessages / sessionCount : 0,
        tagDistribution,
        lastUpdated: new Date(),
        lastActivity: sessions.length > 0 ? (sessions[sessions.length - 1]?.updatedAt || null) : null,
        oldestSession: sessions.length > 0 ? (sessions[0]?.createdAt || null) : null,
        newestSession: sessions.length > 0 ? (sessions[sessions.length - 1]?.createdAt || null) : null,
      }

      await this.logger.debug('統計情報を取得しました', { ...stats })

      return stats
    } catch (error) {
      await this.logger.error('統計情報の取得に失敗しました', { error })
      throw new StorageError('統計情報取得', error as Error)
    }
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      let size = 0
      const items = await fs.readdir(dirPath)

      for (const item of items) {
        const itemPath = path.join(dirPath, item)
        const stats = await fs.stat(itemPath)

        if (stats.isDirectory()) {
          size += await this.calculateDirectorySize(itemPath)
        } else {
          size += stats.size
        }
      }

      return size
    } catch (error) {
      await this.logger.error('ディレクトリサイズの計算に失敗しました', {
        error,
        dirPath,
      })
      throw new StorageError('ディレクトリサイズ計算', error as Error)
    }
  }

  async cleanup(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    if (!this.config.autoCleanup || !this.config.cleanupDays) {
      return 0
    }

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanupDays)

      const sessionIds = await this.indexManager.getAllSessions()
      let deletedCount = 0

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId)
        if (session && session.createdAt < cutoffDate) {
          await this.deleteSession(sessionId)
          deletedCount++
        }
      }

      await this.logger.info('クリーンアップを実行しました', {
        deletedCount,
        cutoffDate,
      })

      return deletedCount
    } catch (error) {
      await this.logger.error('クリーンアップに失敗しました', { error })
      throw new StorageError('クリーンアップ', error as Error)
    }
  }

  async optimize(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      await this.indexManager.optimize()
      await this.sessionCache.clear()
      await this.logger.info('最適化を完了しました')
    } catch (error) {
      await this.logger.error('最適化に失敗しました', { error })
      throw new StorageError('最適化', error as Error)
    }
  }

  private generateId(): string {
    return uuidv4()
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const filePath = path.join(this.sessionsPath, `${sessionId}.json`)
      if (!(await fs.pathExists(filePath))) {
        await this.logger.debug('削除対象のセッションが見つかりません', {
          sessionId,
        })
        return false
      }

      await fs.remove(filePath)
      await this.indexManager.removeSession(sessionId)
      await this.sessionCache.delete(sessionId)

      await this.logger.info('セッションを削除しました', { sessionId })
      return true
    } catch (error) {
      await this.logger.error('セッションの削除に失敗しました', {
        error,
        sessionId,
      })
      throw new StorageError('セッション削除', error as Error)
    }
  }

  async updateSession(
    sessionId: string,
    updates: Partial<ChatSession>
  ): Promise<ChatSession | null> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const session = await this.getSession(sessionId)
      if (!session) {
        await this.logger.debug('更新対象のセッションが見つかりません', {
          sessionId,
        })
        return null
      }

      const updatedSession = {
        ...session,
        ...updates,
        updatedAt: new Date(),
      }

      await this.saveSession(updatedSession)

      await this.logger.info('セッションを更新しました', {
        sessionId,
        updates,
      })

      return updatedSession
    } catch (error) {
      await this.logger.error('セッションの更新に失敗しました', {
        error,
        sessionId,
        updates,
      })
      throw new StorageError('セッション更新', error as Error)
    }
  }

  async importSessions(
    filePath: string,
    options: {
      overwrite?: boolean
      skipDuplicates?: boolean
      validateData?: boolean
    } = {}
  ): Promise<{
    imported: number
    skipped: number
    errors: string[]
  }> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    const {
      overwrite = false,
      skipDuplicates = true,
      validateData = true,
    } = options
    const result = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    }

    try {
      if (!(await fs.pathExists(filePath))) {
        throw new ImportError(`インポートファイルが見つかりません: ${filePath}`)
      }

      const ext = path.extname(filePath).toLowerCase()
      let sessionsData: ChatSession[] = []

      if (ext === '.json') {
        const data = await fs.readJson(filePath)

        if (Array.isArray(data)) {
          sessionsData = data
        } else if (data.sessions && Array.isArray(data.sessions)) {
          sessionsData = data.sessions
        } else if (data.id && data.messages) {
          sessionsData = [data]
        } else {
          throw new ImportError('不正なJSONフォーマットです')
        }
      } else {
        throw new ImportError(`サポートされていないファイル形式: ${ext}`)
      }

      const existingSessionIds = await this.indexManager.getAllSessions()
      const existingIds = new Set(existingSessionIds)

      for (const sessionData of sessionsData) {
        try {
          if (validateData && !this.validateSessionData(sessionData)) {
            result.errors.push(
              `無効なセッションデータ: ${sessionData.id || 'ID不明'}`
            )
            continue
          }

          const session: ChatSession = {
            ...sessionData,
            createdAt: new Date(sessionData.createdAt),
            updatedAt: new Date(sessionData.updatedAt),
            messages: sessionData.messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          }

          if (existingIds.has(session.id)) {
            if (skipDuplicates && !overwrite) {
              result.skipped++
              continue
            }

            if (!overwrite) {
              session.id = uuidv4()
            }
          }

          await this.saveSession(session)

          if (!existingIds.has(session.id)) {
            await this.indexManager.addSession(session.id, {
              tags: session.tags,
              createdAt: session.createdAt,
              updatedAt: session.updatedAt,
              size: session.messages.length
            })
            existingIds.add(session.id)
          }

          result.imported++
        } catch (error) {
          result.errors.push(
            `セッション ${sessionData.id || 'ID不明'} のインポートエラー: ${error}`
          )
        }
      }

      for (const sessionId of existingIds) {
        const session = await this.getSession(sessionId)
        if (session) {
          await this.indexManager.addSession(sessionId, {
            tags: session.tags,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            size: session.messages.length
          })
        }
      }

      return result
    } catch (error) {
      result.errors.push(`インポート処理エラー: ${error}`)
      return result
    }
  }

  private validateSessionData(data: unknown): data is ChatSession {
    if (!data || typeof data !== 'object') return false
    const session = data as ChatSession
    if (!session.id || typeof session.id !== 'string') return false
    if (!session.title || typeof session.title !== 'string') return false
    if (!session.createdAt) return false
    if (!Array.isArray(session.messages)) return false

    for (const msg of session.messages) {
      if (!msg.id || typeof msg.id !== 'string') return false
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role))
        return false
      if (!msg.content || typeof msg.content !== 'string') return false
      if (!msg.timestamp) return false
    }

    return true
  }

  private async loadIndex(): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    return this.indexManager.getAllSessions()
  }

  private getSessionFilePath(sessionId: string): string {
    return path.join(this.sessionsPath, `${sessionId}.json`)
  }

  async restoreFromBackup(backupPath: string): Promise<{
    restored: number
    errors: string[]
  }> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    const result = {
      restored: 0,
      errors: [] as string[],
    }

    try {
      const sessionIds = await this.loadIndex()
      for (const sessionId of sessionIds) {
        const sessionPath = this.getSessionFilePath(sessionId)
        if (await fs.pathExists(sessionPath)) {
          await fs.remove(sessionPath)
        }
      }
      await this.indexManager.initialize()

      const importResult = await this.importSessions(backupPath, {
        overwrite: true,
        skipDuplicates: false,
        validateData: true,
      })

      result.restored = importResult.imported
      result.errors = importResult.errors

      return result
    } catch (error) {
      result.errors.push(`復元処理エラー: ${error}`)
      return result
    }
  }

  async createBackup(backupPath?: string): Promise<{
    backupPath: string
    sessionCount: number
    size: number
  }> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const defaultBackupPath = path.join(
      this.config.storagePath,
      'backups',
      `backup_${timestamp}.json`
    )

    const finalBackupPath = backupPath || defaultBackupPath

    try {
      await fs.ensureDir(path.dirname(finalBackupPath))

      const sessionIds = await this.loadIndex()
      const sessions: ChatSession[] = []

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId)
        if (session) {
          sessions.push(session)
        }
      }

      const backupData = {
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          sessionCount: sessions.length,
          totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
        },
        sessions,
      }

      await fs.writeJson(finalBackupPath, backupData, { spaces: 2 })

      const stats = await fs.stat(finalBackupPath)

      return {
        backupPath: finalBackupPath,
        sessionCount: sessions.length,
        size: stats.size,
      }
    } catch (error) {
      await this.logger.error('バックアップの作成に失敗しました', { error })
      throw new BackupError('バックアップ作成', error as Error)
    }
  }

  async performAutoBackup(): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    if (!this.config.enableBackup) {
      return false
    }

    try {
      const backupDir = path.join(this.config.storagePath, 'backups')
      await fs.ensureDir(backupDir)

      const lastBackupPath = path.join(backupDir, 'last_backup.json')
      let shouldBackup = true

      if (await fs.pathExists(lastBackupPath)) {
        const lastBackupInfo = await fs.readJson(lastBackupPath)
        const lastBackupTime = new Date(lastBackupInfo.timestamp)
        const hoursSinceLastBackup =
          (Date.now() - lastBackupTime.getTime()) / (1000 * 60 * 60)

        shouldBackup =
          hoursSinceLastBackup >= (this.config.backupInterval || 24)
      }

      if (!shouldBackup) {
        return false
      }

      const result = await this.createBackup()

      await fs.writeJson(lastBackupPath, {
        timestamp: new Date().toISOString(),
        backupPath: result.backupPath,
        sessionCount: result.sessionCount,
        size: result.size,
      })

      await this.cleanupOldBackups()

      return true
    } catch (error) {
      await this.logger.error('自動バックアップに失敗しました', { error })
      return false
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    const backupDir = path.join(this.config.storagePath, 'backups')
    const maxBackups = 10

    try {
      const files = await fs.readdir(backupDir)
      const backupFiles = await Promise.all(
        files
          .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
          .map(async file => {
            const filePath = path.join(backupDir, file)
            const stat = await fs.stat(filePath)
            return {
              name: file,
              path: filePath,
              stat
            }
          })
      )

      const sortedBackupFiles = backupFiles.sort(
        (a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime()
      )

      if (sortedBackupFiles.length > maxBackups) {
        const filesToDelete = sortedBackupFiles.slice(maxBackups)
        for (const file of filesToDelete) {
          await fs.remove(file.path)
        }
      }
    } catch (error) {
      await this.logger.error('バックアップのクリーンアップに失敗しました', { error })
    }
  }

  async getBackupList(): Promise<
    Array<{
      path: string
      name: string
      createdAt: Date
      size: number
      sessionCount?: number
    }>
  > {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    const backupDir = path.join(this.config.storagePath, 'backups')

    if (!(await fs.pathExists(backupDir))) {
      return []
    }

    try {
      const files = await fs.readdir(backupDir)
      const backupFiles = []

      for (const file of files) {
        if (file.startsWith('backup_') && file.endsWith('.json')) {
          const filePath = path.join(backupDir, file)
          const stats = await fs.stat(filePath)

          let sessionCount: number | undefined
          try {
            const backupData = await fs.readJson(filePath)
            sessionCount = backupData.metadata?.sessionCount
          } catch {
            // メタデータ読み取りエラーは無視
          }

          backupFiles.push({
            path: filePath,
            name: file,
            createdAt: stats.mtime,
            size: stats.size,
            sessionCount,
          })
        }
      }

      return backupFiles.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
    } catch (error) {
      await this.logger.error('バックアップ一覧の取得に失敗しました', { error })
      return []
    }
  }

  async getMessage(sessionId: string, messageId: string): Promise<ChatMessage | null> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const session = await this.getSession(sessionId)
      if (!session) {
        return null
      }

      const message = session.messages.find(msg => msg.id === messageId)
      return message || null
    } catch (error) {
      await this.logger.error('メッセージの取得に失敗しました', {
        error,
        sessionId,
        messageId,
      })
      throw new StorageError('メッセージ取得', error as Error)
    }
  }

  async updateMessage(
    sessionId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ): Promise<ChatMessage | null> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const session = await this.getSession(sessionId)
      if (!session) {
        return null
      }

      const messageIndex = session.messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) {
        return null
      }

      const updatedMessage = {
        ...session.messages[messageIndex],
        ...updates,
        id: messageId,
        timestamp: session.messages[messageIndex].timestamp,
      }

      session.messages[messageIndex] = updatedMessage
      session.updatedAt = new Date()

      await this.saveSession(session)
      await this.sessionCache.set(sessionId, session)

      return updatedMessage
    } catch (error) {
      await this.logger.error('メッセージの更新に失敗しました', {
        error,
        sessionId,
        messageId,
        updates,
      })
      throw new StorageError('メッセージ更新', error as Error)
    }
  }

  async deleteMessage(sessionId: string, messageId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const session = await this.getSession(sessionId)
      if (!session) {
        return false
      }

      const messageIndex = session.messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) {
        return false
      }

      session.messages.splice(messageIndex, 1)
      session.updatedAt = new Date()

      await this.saveSession(session)
      await this.sessionCache.set(sessionId, session)

      return true
    } catch (error) {
      await this.logger.error('メッセージの削除に失敗しました', {
        error,
        sessionId,
        messageId,
      })
      throw new StorageError('メッセージ削除', error as Error)
    }
  }

  async getSessionMessages(
    sessionId: string,
    options: {
      limit?: number
      offset?: number
      before?: Date
      after?: Date
    } = {}
  ): Promise<{
    messages: ChatMessage[]
    total: number
    hasMore: boolean
  }> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const session = await this.getSession(sessionId)
      if (!session) {
        return {
          messages: [],
          total: 0,
          hasMore: false,
        }
      }

      let filteredMessages = session.messages

      if (options.before) {
        filteredMessages = filteredMessages.filter(
          msg => msg.timestamp < options.before!
        )
      }

      if (options.after) {
        filteredMessages = filteredMessages.filter(
          msg => msg.timestamp > options.after!
        )
      }

      const total = filteredMessages.length
      const offset = options.offset || 0
      const limit = options.limit || total

      const messages = filteredMessages
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(offset, offset + limit)

      return {
        messages,
        total,
        hasMore: offset + limit < total,
      }
    } catch (error) {
      await this.logger.error('セッションメッセージの取得に失敗しました', {
        error,
        sessionId,
        options,
      })
      throw new StorageError('セッションメッセージ取得', error as Error)
    }
  }

  async searchMessages(
    query: string,
    options: {
      limit?: number
      offset?: number
      sessionId?: string
      role?: 'user' | 'assistant' | 'system'
    } = {}
  ): Promise<{
    messages: Array<{
      message: ChatMessage
      sessionId: string
      sessionTitle: string
    }>
    total: number
    hasMore: boolean
  }> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const sessionIds = options.sessionId
        ? [options.sessionId]
        : await this.indexManager.getAllSessions()

      const results: Array<{
        message: ChatMessage
        sessionId: string
        sessionTitle: string
      }> = []

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId)
        if (!session) continue

        const matchedMessages = session.messages.filter(msg => {
          if (options.role && msg.role !== options.role) {
            return false
          }

          return msg.content.toLowerCase().includes(query.toLowerCase())
        })

        results.push(
          ...matchedMessages.map(message => ({
            message,
            sessionId,
            sessionTitle: session.title,
          }))
        )
      }

      const total = results.length
      const offset = options.offset || 0
      const limit = options.limit || total

      const messages = results
        .sort((a, b) => b.message.timestamp.getTime() - a.message.timestamp.getTime())
        .slice(offset, offset + limit)

      return {
        messages,
        total,
        hasMore: offset + limit < total,
      }
    } catch (error) {
      await this.logger.error('メッセージ検索に失敗しました', {
        error,
        query,
        options,
      })
      throw new StorageError('メッセージ検索', error as Error)
    }
  }

  async getSessionTags(): Promise<Array<{ tag: string; count: number }>> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const sessionIds = await this.indexManager.getAllSessions()
      const tagCounts = new Map<string, number>()

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId)
        if (session) {
          session.tags?.forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
          })
        }
      }

      return Array.from(tagCounts.entries()).map(([tag, count]) => ({
        tag,
        count,
      }))
    } catch (error) {
      await this.logger.error('タグ一覧の取得に失敗しました', { error })
      throw new StorageError('タグ一覧取得', error as Error)
    }
  }

  async getSessionsByTag(tag: string): Promise<ChatSession[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const sessionIds = await this.indexManager.getAllSessions()
      const sessions: ChatSession[] = []

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId)
        if (session && session.tags?.includes(tag)) {
          sessions.push(session)
        }
      }

      return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    } catch (error) {
      await this.logger.error('タグによるセッション取得に失敗しました', {
        error,
        tag,
      })
      throw new StorageError('タグによるセッション取得', error as Error)
    }
  }

  async getSessionTimeline(
    options: {
      startDate?: Date
      endDate?: Date
      limit?: number
    } = {}
  ): Promise<Array<{
    date: string
    sessions: ChatSession[]
  }>> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const sessionIds = await this.indexManager.getAllSessions()
      const sessions: ChatSession[] = []

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId)
        if (session) {
          if (options.startDate && session.createdAt < options.startDate) {
            continue
          }
          if (options.endDate && session.createdAt > options.endDate) {
            continue
          }
          sessions.push(session)
        }
      }

      const timeline = new Map<string, ChatSession[]>()

      sessions.forEach(session => {
        const date = format(session.createdAt, 'yyyy-MM-dd')
        const dateSessions = timeline.get(date) || []
        dateSessions.push(session)
        timeline.set(date, dateSessions)
      })

      return Array.from(timeline.entries())
        .map(([date, sessions]) => ({
          date,
          sessions: sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, options.limit)
    } catch (error) {
      await this.logger.error('タイムラインの取得に失敗しました', {
        error,
        options,
      })
      throw new StorageError('タイムライン取得', error as Error)
    }
  }

  async createSession(session: Omit<ChatSession, 'createdAt' | 'updatedAt'>): Promise<ChatSession> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const now = new Date()
      const newSession: ChatSession = {
        ...session,
        createdAt: now,
        updatedAt: now,
      }

      await this.saveSession(newSession)
      await this.indexManager.addSession(newSession.id, {
        tags: newSession.tags,
        createdAt: newSession.createdAt,
        updatedAt: newSession.updatedAt,
        size: newSession.messages.length
      })

      return newSession
    } catch (error) {
      await this.logger.error('セッションの作成に失敗しました', {
        error,
        session,
      })
      throw new StorageError('セッション作成', error as Error)
    }
  }
}

export { ChatHistoryService };

