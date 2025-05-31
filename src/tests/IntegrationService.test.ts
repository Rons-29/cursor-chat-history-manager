import { IntegrationService } from '../services/IntegrationService'
import { ChatHistoryService } from '../services/ChatHistoryService'
import { CursorLogService } from '../services/CursorLogService'
import { IntegrationConfig, IntegrationSearchOptions } from '../types/integration'
import fs from 'fs-extra'
import path from 'path'

jest.mock('../services/ChatHistoryService')
jest.mock('../services/CursorLogService')
jest.mock('fs-extra')

describe('IntegrationService', () => {
  let service: IntegrationService
  let config: IntegrationConfig

  beforeEach(() => {
    config = {
      cursor: {
        enabled: true,
        watchPath: '/test/cursor/logs',
        autoImport: true
      },
      chatHistory: {
        storagePath: '/test/chat/history',
        maxSessions: 100
      },
      sync: {
        interval: 300,
        batchSize: 100,
        retryAttempts: 3
      }
    }

    service = new IntegrationService(config)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initialize', () => {
    it('should initialize both services', async () => {
      await service.initialize()
      expect(ChatHistoryService.prototype.initialize).toHaveBeenCalled()
      expect(CursorLogService.prototype.initialize).toHaveBeenCalled()
    })

    it('should throw error if initialization fails', async () => {
      const error = new Error('Initialization failed')
      ;(ChatHistoryService.prototype.initialize as jest.Mock).mockRejectedValue(error)

      await expect(service.initialize()).rejects.toThrow('Failed to initialize IntegrationService')
    })
  })

  describe('search', () => {
    const searchOptions: IntegrationSearchOptions = {
      query: 'test',
      timeRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31')
      }
    }

    beforeEach(async () => {
      await service.initialize()
    })

    it('should search both cursor logs and chat history', async () => {
      const mockCursorLogs = [
        {
          id: '1',
          timestamp: new Date(),
          type: 'cursor',
          content: 'test log',
          metadata: { project: 'test' }
        }
      ]

      const mockChatLogs = {
        sessions: [
          {
            id: '2',
            timestamp: new Date(),
            content: 'test chat',
            metadata: { project: 'test' }
          }
        ]
      }

      ;(fs.pathExists as jest.Mock).mockResolvedValue(true)
      ;(fs.readdir as jest.Mock).mockResolvedValue(['test.json'])
      ;(fs.readJson as jest.Mock).mockResolvedValue(mockCursorLogs)
      ;(ChatHistoryService.prototype.searchSessions as jest.Mock).mockResolvedValue(mockChatLogs)

      const results = await service.search(searchOptions)

      expect(results).toHaveLength(2)
      expect(results[0].type).toBe('cursor')
      expect(results[1].type).toBe('chat')
    })

    it('should handle empty results', async () => {
      ;(fs.pathExists as jest.Mock).mockResolvedValue(false)
      ;(ChatHistoryService.prototype.searchSessions as jest.Mock).mockResolvedValue({ sessions: [] })

      const results = await service.search(searchOptions)
      expect(results).toHaveLength(0)
    })
  })

  describe('getStats', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should return combined statistics', async () => {
      const mockCursorStats = {
        size: 1000,
        count: 10
      }

      const mockChatStats = {
        totalSessions: 20,
        storageSize: 2000
      }

      ;(fs.pathExists as jest.Mock).mockResolvedValue(true)
      ;(fs.readdir as jest.Mock).mockResolvedValue(['test.json'])
      ;(fs.stat as jest.Mock).mockResolvedValue({ size: mockCursorStats.size })
      ;(fs.readJson as jest.Mock).mockResolvedValue(Array(mockCursorStats.count))
      ;(ChatHistoryService.prototype.getStats as jest.Mock).mockResolvedValue(mockChatStats)

      const stats = await service.getStats()

      expect(stats.totalLogs).toBe(mockCursorStats.count + mockChatStats.totalSessions)
      expect(stats.storageSize).toBe(mockCursorStats.size + mockChatStats.storageSize)
    })

    it('should handle missing cursor logs', async () => {
      const mockChatStats = {
        totalSessions: 20,
        storageSize: 2000
      }

      ;(fs.pathExists as jest.Mock).mockResolvedValue(false)
      ;(ChatHistoryService.prototype.getStats as jest.Mock).mockResolvedValue(mockChatStats)

      const stats = await service.getStats()

      expect(stats.cursorLogs).toBe(0)
      expect(stats.totalLogs).toBe(mockChatStats.totalSessions)
    })
  })
}) 