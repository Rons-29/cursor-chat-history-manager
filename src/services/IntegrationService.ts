import { v4 as uuidv4 } from 'uuid'
import fs from 'fs-extra'
import path from 'path'
import { ChatHistoryService } from './ChatHistoryService'
import { CursorLogService } from './CursorLogService'
import {
  IntegrationConfig,
  IntegratedLog,
  IntegrationStats,
  IntegrationSearchOptions,
  IntegrationError
} from '../types/integration'
import { ChatHistoryFilter, ChatHistorySearchResult, ChatHistoryStats } from '../types'

export class IntegrationService {
  private config: IntegrationConfig
  private chatHistoryService: ChatHistoryService
  private cursorLogService: CursorLogService
  private isInitialized: boolean = false
  private syncInterval: NodeJS.Timeout | null = null

  constructor(config: IntegrationConfig) {
    this.config = {
      cursor: {
        ...config.cursor,
        enabled: config.cursor.enabled ?? true,
        watchPath: config.cursor.watchPath ?? '~/.cursor/logs',
        autoImport: config.cursor.autoImport ?? true,
        syncInterval: config.cursor.syncInterval ?? 300,
        batchSize: config.cursor.batchSize ?? 100,
        retryAttempts: config.cursor.retryAttempts ?? 3
      },
      chatHistory: {
        ...config.chatHistory,
        storagePath: config.chatHistory.storagePath ?? '~/.chat-history',
        maxSessions: config.chatHistory.maxSessions ?? 1000
      },
      sync: {
        ...config.sync,
        interval: config.sync.interval ?? 300,
        batchSize: config.sync.batchSize ?? 100,
        retryAttempts: config.sync.retryAttempts ?? 3
      }
    }

    this.chatHistoryService = new ChatHistoryService(this.config.chatHistory)
    this.cursorLogService = new CursorLogService(this.config.cursor)
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await this.chatHistoryService.initialize()
      await this.cursorLogService.initialize()
      this.isInitialized = true
    } catch (error) {
      throw this.createError('INIT_ERROR', 'Failed to initialize IntegrationService', error)
    }
  }

  async startSync(): Promise<void> {
    if (!this.isInitialized) {
      throw this.createError('NOT_INITIALIZED', 'Service not initialized')
    }

    try {
      await this.cursorLogService.startWatching()
      this.startSyncInterval()
    } catch (error) {
      throw this.createError('SYNC_ERROR', 'Failed to start sync', error)
    }
  }

  async stopSync(): Promise<void> {
    try {
      await this.cursorLogService.stopWatching()
      this.stopSyncInterval()
    } catch (error) {
      throw this.createError('STOP_ERROR', 'Failed to stop sync', error)
    }
  }

  async search(options: IntegrationSearchOptions): Promise<IntegratedLog[]> {
    if (!this.isInitialized) {
      throw this.createError('NOT_INITIALIZED', 'Service not initialized')
    }

    try {
      const results: IntegratedLog[] = []
      const processedLogsDir = path.join(this.config.cursor.watchPath, 'processed')

      // 処理済みログの検索
      if (await fs.pathExists(processedLogsDir)) {
        const logFiles = await fs.readdir(processedLogsDir)
        for (const file of logFiles) {
          if (file.endsWith('.json')) {
            const logs = await fs.readJson(path.join(processedLogsDir, file))
            const filteredLogs = this.filterLogs(logs, options)
            results.push(...filteredLogs)
          }
        }
      }

      // チャット履歴の検索
      const chatLogs = await this.chatHistoryService.searchSessions({
        filter: {
          text: options.query,
          timeRange: options.timeRange,
          limit: options.limit,
          offset: options.offset
        } as ChatHistoryFilter
      })

      // チャットログを統合ログ形式に変換
      const integratedChatLogs = chatLogs.sessions.map(chat => ({
        id: chat.id,
        timestamp: new Date(chat.timestamp),
        type: 'chat' as const,
        content: chat.content,
        metadata: {
          project: chat.metadata?.project,
          tags: chat.metadata?.tags || [],
          source: 'chat',
          ...chat.metadata
        }
      }))

      results.push(...integratedChatLogs)

      // 結果のソートとフィルタリング
      return this.sortAndFilterResults(results, options)
    } catch (error) {
      throw this.createError('SEARCH_ERROR', 'Failed to search logs', error)
    }
  }

  private filterLogs(logs: IntegratedLog[], options: IntegrationSearchOptions): IntegratedLog[] {
    return logs.filter(log => {
      // タイプフィルター
      if (options.types && !options.types.includes(log.type)) {
        return false
      }

      // プロジェクトフィルター
      if (options.projects && log.metadata.project && !options.projects.includes(log.metadata.project)) {
        return false
      }

      // タグフィルター
      if (options.tags && !options.tags.some(tag => log.metadata.tags?.includes(tag))) {
        return false
      }

      // 時間範囲フィルター
      if (options.timeRange) {
        const logTime = log.timestamp.getTime()
        if (logTime < options.timeRange.start.getTime() || 
            logTime > options.timeRange.end.getTime()) {
          return false
        }
      }

      // クエリフィルター
      if (options.query) {
        const searchText = options.query.toLowerCase()
        return log.content.toLowerCase().includes(searchText) ||
               (log.metadata.project?.toLowerCase() || '').includes(searchText) ||
               log.metadata.tags?.some(tag => tag.toLowerCase().includes(searchText)) || false
      }

      return true
    })
  }

  private sortAndFilterResults(results: IntegratedLog[], options: IntegrationSearchOptions): IntegratedLog[] {
    // タイムスタンプでソート
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // リミットとオフセットの適用
    const start = options.offset || 0
    const end = start + (options.limit || results.length)
    return results.slice(start, end)
  }

  async getStats(): Promise<IntegrationStats> {
    if (!this.isInitialized) {
      throw this.createError('NOT_INITIALIZED', 'Service not initialized')
    }

    try {
      const processedLogsDir = path.join(this.config.cursor.watchPath, 'processed')
      let cursorLogs = 0
      let totalSize = 0

      // 処理済みログの統計
      if (await fs.pathExists(processedLogsDir)) {
        const logFiles = await fs.readdir(processedLogsDir)
        for (const file of logFiles) {
          if (file.endsWith('.json')) {
            const filePath = path.join(processedLogsDir, file)
            const stats = await fs.stat(filePath)
            totalSize += stats.size

            const logs = await fs.readJson(filePath)
            cursorLogs += logs.length
          }
        }
      }

      // チャット履歴の統計
      const chatStats = await this.chatHistoryService.getStats()
      const chatLogs = chatStats.totalSessions

      return {
        totalLogs: cursorLogs + chatLogs,
        cursorLogs,
        chatLogs,
        lastSync: new Date(),
        syncStatus: this.syncInterval ? 'syncing' : 'idle',
        errorCount: 0, // TODO: エラーカウントの実装
        storageSize: totalSize + (chatStats.storageSize || 0)
      }
    } catch (error) {
      throw this.createError('STATS_ERROR', 'Failed to get stats', error)
    }
  }

  private startSyncInterval(): void {
    if (this.syncInterval) {
      return
    }

    this.syncInterval = setInterval(async () => {
      try {
        // TODO: 定期的な同期処理の実装
      } catch (error) {
        this.handleError(error)
      }
    }, this.config.sync.interval * 1000)
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  private handleError(error: any): void {
    const integrationError = this.createError('SYNC_ERROR', 'Error during sync', error)
    console.error(integrationError)
    // TODO: エラー通知の実装
  }

  private createError(code: string, message: string, originalError?: any): IntegrationError {
    const error = new Error(message) as IntegrationError
    error.code = code
    error.details = originalError
    error.timestamp = new Date()
    return error
  }
} 