import { CursorLogService } from '../services/CursorLogService'
import fs from 'fs-extra'
import path from 'path'

jest.mock('fs-extra')

describe('CursorLogService', () => {
  let service: CursorLogService
  const mockConfig = {
    watchPath: '/test/logs',
    autoImport: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new CursorLogService(mockConfig)
  })

  describe('initialize', () => {
    it('should create necessary directories', async () => {
      await service.initialize()
      expect(fs.ensureDir).toHaveBeenCalledWith(mockConfig.watchPath)
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(mockConfig.watchPath, 'processed'))
    })

    it('should throw error if initialization fails', async () => {
      const error = new Error('Failed to create directory')
      ;(fs.ensureDir as jest.Mock).mockRejectedValue(error)

      await expect(service.initialize()).rejects.toThrow('Failed to initialize CursorLogService')
    })
  })

  describe('startWatching', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should start watching directory', async () => {
      const mockWatcher = {
        close: jest.fn()
      }
      ;(fs.watch as jest.Mock).mockReturnValue(mockWatcher)

      await service.startWatching()
      expect(fs.watch).toHaveBeenCalledWith(mockConfig.watchPath, expect.any(Function))
    })

    it('should throw error if not initialized', async () => {
      service = new CursorLogService(mockConfig)
      await expect(service.startWatching()).rejects.toThrow('Service not initialized')
    })
  })

  describe('stopWatching', () => {
    it('should close watcher if exists', async () => {
      const mockWatcher = {
        close: jest.fn()
      }
      ;(fs.watch as jest.Mock).mockReturnValue(mockWatcher)

      await service.initialize()
      await service.startWatching()
      await service.stopWatching()

      expect(mockWatcher.close).toHaveBeenCalled()
    })
  })

  describe('log processing', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should process new log file', async () => {
      const mockLog = {
        id: 'test-id',
        timestamp: '2024-01-01T00:00:00Z',
        content: 'test log',
        metadata: {
          project: 'test-project',
          tags: ['test']
        }
      }

      ;(fs.pathExists as jest.Mock).mockResolvedValue(true)
      ;(fs.readJson as jest.Mock).mockResolvedValue(mockLog)
      ;(fs.writeJson as jest.Mock).mockResolvedValue(undefined)

      const callback = jest.fn()
      service.on('logProcessed', callback)

      const mockWatcher = {
        close: jest.fn()
      }
      ;(fs.watch as jest.Mock).mockReturnValue(mockWatcher)

      await service.startWatching()
      const watchCallback = (fs.watch as jest.Mock).mock.calls[0][1]
      await watchCallback('rename', 'test.log')

      expect(fs.readJson).toHaveBeenCalled()
      expect(fs.writeJson).toHaveBeenCalled()
      expect(callback).toHaveBeenCalled()
    })

    it('should emit error if processing fails', async () => {
      const error = new Error('Failed to process log')
      ;(fs.pathExists as jest.Mock).mockResolvedValue(true)
      ;(fs.readJson as jest.Mock).mockRejectedValue(error)

      const callback = jest.fn()
      service.on('error', callback)

      const mockWatcher = {
        close: jest.fn()
      }
      ;(fs.watch as jest.Mock).mockReturnValue(mockWatcher)

      await service.startWatching()
      const watchCallback = (fs.watch as jest.Mock).mock.calls[0][1]
      await watchCallback('rename', 'test.log')

      expect(callback).toHaveBeenCalled()
    })
  })
}) 