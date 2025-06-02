import fs from 'fs-extra'
import path from 'path'
import { Logger } from '../server/utils/Logger.js'
import { StorageError } from '../errors/ChatHistoryError.js'

export interface SessionIndex {
  id: string
  tags?: string[]
  createdAt: Date
  updatedAt: Date
  size: number
}

export interface IndexData {
  sessions: SessionIndex[]
  lastUpdated: Date
  version: string
}

interface IndexOptions {
  autoSave?: boolean
  saveInterval?: number
  maxIndexSize?: number
  compression?: boolean
}

export class IndexManager {
  private indexPath: string
  private logger: Logger
  private indexData: IndexData
  private isInitialized: boolean = false
  private readonly VERSION = '1.0.0'
  private isDirty: boolean
  private saveTimeout: NodeJS.Timeout | null
  private options: Required<IndexOptions>

  constructor(indexPath: string, logger: Logger, options: IndexOptions = {}) {
    this.indexPath = indexPath
    this.logger = logger
    this.isDirty = false
    this.saveTimeout = null
    this.options = {
      autoSave: options.autoSave ?? true,
      saveInterval: options.saveInterval ?? 5000,
      maxIndexSize: options.maxIndexSize ?? 10000,
      compression: options.compression ?? false,
    }
    this.indexData = {
      sessions: [],
      lastUpdated: new Date(),
      version: this.VERSION,
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await fs.ensureDir(path.dirname(this.indexPath))

      if (await fs.pathExists(this.indexPath)) {
        const data = await fs.readJson(this.indexPath)
        if (this.validateIndexData(data)) {
          this.indexData = {
            ...data,
            lastUpdated: new Date(data.lastUpdated),
            sessions: data.sessions.map((session: any) => ({
              ...session,
              createdAt: new Date(session.createdAt),
              updatedAt: new Date(session.updatedAt),
            })),
          }
        } else {
          await this.logger.warn(
            'インデックスデータが無効なため、新規作成します'
          )
          await this.createNewIndex()
        }
      } else {
        await this.createNewIndex()
      }

      this.isInitialized = true
      await this.logger.info('IndexManagerを初期化しました', {
        indexPath: this.indexPath,
        sessionCount: this.indexData.sessions.length,
      })
    } catch (error) {
      await this.logger.error('IndexManagerの初期化に失敗しました', { error })
      throw new Error('IndexManagerの初期化に失敗しました')
    }
  }

  private async createNewIndex(): Promise<void> {
    this.indexData = {
      sessions: [],
      lastUpdated: new Date(),
      version: this.VERSION,
    }
    // 初期化中なので直接ファイルに書き込み
    await fs.writeJson(this.indexPath, this.indexData, { spaces: 2 })
  }

  private async saveIndex(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IndexManager not initialized')
    }

    try {
      await fs.writeJson(this.indexPath, this.indexData, { spaces: 2 })
    } catch (error) {
      await this.logger.error('インデックスの保存に失敗しました', { error })
      throw new Error('インデックスの保存に失敗しました')
    }
  }

  private validateIndexData(data: unknown): data is IndexData {
    if (!data || typeof data !== 'object') return false
    const index = data as IndexData
    if (!Array.isArray(index.sessions)) return false
    if (!index.version || typeof index.version !== 'string') return false
    if (!index.lastUpdated) return false

    return index.sessions.every(session => {
      if (!session.id || typeof session.id !== 'string') return false
      if (session.tags && !Array.isArray(session.tags)) return false
      if (!session.createdAt) return false
      if (!session.updatedAt) return false
      if (typeof session.size !== 'number') return false
      return true
    })
  }

  async addSession(
    sessionId: string,
    metadata: {
      tags?: string[]
      createdAt: Date
      updatedAt: Date
      size: number
    }
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IndexManager not initialized')
    }

    try {
      const existingIndex = this.indexData.sessions.findIndex(
        s => s.id === sessionId
      )
      const sessionIndex: SessionIndex = {
        id: sessionId,
        tags: metadata.tags,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        size: metadata.size,
      }

      if (existingIndex >= 0) {
        this.indexData.sessions[existingIndex] = sessionIndex
      } else {
        this.indexData.sessions.push(sessionIndex)
      }

      this.indexData.lastUpdated = new Date()
      await this.saveIndex()

      await this.logger.debug('セッションをインデックスに追加しました', {
        sessionId,
        metadata,
      })
    } catch (error) {
      await this.logger.error('セッションのインデックス追加に失敗しました', {
        error,
        sessionId,
        metadata,
      })
      throw new Error('セッションのインデックス追加に失敗しました')
    }
  }

  async removeSession(sessionId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IndexManager not initialized')
    }

    try {
      const index = this.indexData.sessions.findIndex(s => s.id === sessionId)
      if (index >= 0) {
        this.indexData.sessions.splice(index, 1)
        this.indexData.lastUpdated = new Date()
        await this.saveIndex()

        await this.logger.debug('セッションをインデックスから削除しました', {
          sessionId,
        })
      }
    } catch (error) {
      await this.logger.error('セッションのインデックス削除に失敗しました', {
        error,
        sessionId,
      })
      throw new Error('セッションのインデックス削除に失敗しました')
    }
  }

  async getAllSessions(): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('IndexManager not initialized')
    }

    return this.indexData.sessions.map(s => s.id)
  }

  async getSessionCount(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('IndexManager not initialized')
    }

    return this.indexData.sessions.length
  }

  async getSessionMetadata(sessionId: string): Promise<SessionIndex | null> {
    if (!this.isInitialized) {
      throw new Error('IndexManager not initialized')
    }

    return this.indexData.sessions.find(s => s.id === sessionId) || null
  }

  async getSessionsByTag(tag: string): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('IndexManager not initialized')
    }

    return this.indexData.sessions
      .filter(s => s.tags?.includes(tag))
      .map(s => s.id)
  }

  async getSessionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('IndexManager not initialized')
    }

    return this.indexData.sessions
      .filter(s => s.createdAt >= startDate && s.createdAt <= endDate)
      .map(s => s.id)
  }

  async optimize(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IndexManager not initialized')
    }

    try {
      // 重複の削除
      const uniqueSessions = new Map<string, SessionIndex>()
      this.indexData.sessions.forEach(session => {
        uniqueSessions.set(session.id, session)
      })

      // 日付でソート
      this.indexData.sessions = Array.from(uniqueSessions.values()).sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
      )

      this.indexData.lastUpdated = new Date()
      await this.saveIndex()

      await this.logger.info('インデックスを最適化しました', {
        sessionCount: this.indexData.sessions.length,
      })
    } catch (error) {
      await this.logger.error('インデックスの最適化に失敗しました', { error })
      throw new Error('インデックスの最適化に失敗しました')
    }
  }

  async getStats(): Promise<{
    totalSessions: number
    totalSize: number
    lastUpdated: Date
    tagCount: number
  }> {
    if (!this.isInitialized) {
      throw new Error('IndexManager not initialized')
    }

    const tags = new Set<string>()
    this.indexData.sessions.forEach(session => {
      session.tags?.forEach(tag => tags.add(tag))
    })

    return {
      totalSessions: this.indexData.sessions.length,
      totalSize: this.indexData.sessions.reduce((sum, s) => sum + s.size, 0),
      lastUpdated: this.indexData.lastUpdated,
      tagCount: tags.size,
    }
  }
}
