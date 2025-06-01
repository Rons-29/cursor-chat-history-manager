import type { ChatHistoryConfig, ChatSession, ChatMessage } from '../types/index.js'
import { Logger } from '../server/utils/Logger.js'
import { ConfigService } from './ConfigService.js'
import { ChatHistoryService } from './ChatHistoryService.js'

export interface TagStats {
  tag: string
  count: number
  sessions: string[]
  lastUsed: Date
}

export interface TagFilter {
  search?: string
  limit?: number
  offset?: number
  sortBy?: 'count' | 'name' | 'lastUsed'
  sortOrder?: 'asc' | 'desc'
}

export class TagService {
  private chatHistoryService: ChatHistoryService
  private logger: Logger
  private isInitialized: boolean = false

  constructor(chatHistoryService: ChatHistoryService, logger: Logger) {
    this.chatHistoryService = chatHistoryService
    this.logger = logger
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await this.logger.initialize()
      this.isInitialized = true
      this.logger.info('TagServiceを初期化しました')
    } catch (error) {
      this.logger.error('初期化に失敗しました:', error)
      throw error
    }
  }

  async getTags(filter?: TagFilter): Promise<TagStats[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const sessions = await this.chatHistoryService.searchSessions({})
      const tagMap = new Map<string, TagStats>()

      for (const session of sessions.sessions) {
        if (session.metadata?.tags) {
          for (const tag of session.metadata.tags) {
            const stats = tagMap.get(tag) || {
              tag,
              count: 0,
              sessions: [],
              lastUsed: session.updatedAt
            }

            stats.count++
            stats.sessions.push(session.id)
            if (session.updatedAt > stats.lastUsed) {
              stats.lastUsed = session.updatedAt
            }

            tagMap.set(tag, stats)
          }
        }
      }

      let tags = Array.from(tagMap.values())

      if (filter?.search) {
        const searchLower = filter.search.toLowerCase()
        tags = tags.filter(tag => tag.tag.toLowerCase().includes(searchLower))
      }

      if (filter?.sortBy) {
        tags.sort((a, b) => {
          let comparison = 0
          switch (filter.sortBy) {
            case 'count':
              comparison = b.count - a.count
              break
            case 'name':
              comparison = a.tag.localeCompare(b.tag)
              break
            case 'lastUsed':
              comparison = b.lastUsed.getTime() - a.lastUsed.getTime()
              break
          }
          return filter.sortOrder === 'desc' ? comparison : -comparison
        })
      }

      if (filter?.limit) {
        const offset = filter.offset || 0
        tags = tags.slice(offset, offset + filter.limit)
      }

      return tags
    } catch (error) {
      this.logger.error('タグの取得に失敗しました:', error)
      throw error
    }
  }

  async addTag(sessionId: string, tag: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const session = await this.chatHistoryService.getSession(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      const tags = session.metadata?.tags || []
      if (!tags.includes(tag)) {
        tags.push(tag)
        await this.chatHistoryService.updateSession(sessionId, {
          metadata: {
            ...session.metadata,
            tags
          }
        })
      }
    } catch (error) {
      this.logger.error('タグの追加に失敗しました:', error)
      throw error
    }
  }

  async removeTag(sessionId: string, tag: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const session = await this.chatHistoryService.getSession(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      const tags = session.metadata?.tags || []
      const index = tags.indexOf(tag)
      if (index !== -1) {
        tags.splice(index, 1)
        await this.chatHistoryService.updateSession(sessionId, {
          metadata: {
            ...session.metadata,
            tags
          }
        })
      }
    } catch (error) {
      this.logger.error('タグの削除に失敗しました:', error)
      throw error
    }
  }

  async getSessionsByTag(tag: string): Promise<ChatSession[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const sessions = await this.chatHistoryService.searchSessions({})
      return sessions.sessions.filter(
        session => session.metadata?.tags?.includes(tag)
      )
    } catch (error) {
      this.logger.error('タグによるセッション取得に失敗しました:', error)
      throw error
    }
  }

  async getPopularTags(limit: number = 10): Promise<TagStats[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const tags = await this.getTags()
      return tags
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
    } catch (error) {
      this.logger.error('人気タグの取得に失敗しました:', error)
      throw error
    }
  }
} 