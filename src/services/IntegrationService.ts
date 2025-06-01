import { v4 as uuidv4 } from 'uuid'
import fs from 'fs-extra'
import path from 'path'
import { EventEmitter } from 'events'
import { ChatHistoryService } from './ChatHistoryService.js'
import { CursorLogService } from './CursorLogService.js'
import { CursorWatcherService } from './CursorWatcherService.js'
import { ConfigService } from './ConfigService.js'
import type {
  IntegrationConfig,
  IntegratedLog,
  IntegrationStats,
  IntegrationSearchOptions,
  IntegrationError,
  IntegrationAnalyticsRequest,
  IntegrationAnalyticsResponse
} from '../types/integration.js'
import type { ChatHistoryFilter, ChatHistorySearchResult, ChatHistoryStats } from '../types/index.js'
import { Logger } from '../utils/Logger.js'

export class IntegrationService extends EventEmitter {
  private config: IntegrationConfig
  private chatHistoryService: ChatHistoryService
  private cursorLogService: CursorLogService
  private cursorWatcherService: CursorWatcherService
  private configService: ConfigService
  private logger: Logger
  private isInitialized: boolean = false
  private syncInterval: NodeJS.Timeout | null = null

  constructor(config: IntegrationConfig, logger: Logger) {
    super()
    this.config = {
      cursor: {
        ...config.cursor,
        enabled: config.cursor.enabled ?? true,
        watchPath: config.cursor.watchPath ?? '~/.cursor/logs',
        autoImport: config.cursor.autoImport ?? true
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

    this.logger = logger
    this.configService = new ConfigService()
    this.chatHistoryService = new ChatHistoryService(this.config.chatHistory)
    this.cursorLogService = new CursorLogService(this.config.cursor, this.logger)
    this.cursorWatcherService = new CursorWatcherService(
      this.chatHistoryService,
      this.configService,
      this.config.cursor,
      this.logger
    )

    // CursorWatcherServiceのイベントリスナーを設定
    this.setupCursorWatcherEvents()
  }

  /**
   * CursorWatcherServiceのイベントリスナーを設定
   */
  private setupCursorWatcherEvents(): void {
    this.cursorWatcherService.on('sessionImported', (data) => {
      this.logger.info('Cursorセッションがインポートされました', data)
      this.emit('sessionImported', data)
    })

    this.cursorWatcherService.on('scanCompleted', (data) => {
      this.logger.info('Cursorスキャンが完了しました', data)
      this.emit('scanCompleted', data)
    })

    this.cursorWatcherService.on('error', (error) => {
      this.logger.error('CursorWatcherServiceエラー', error)
      this.emit('error', error)
    })

    this.cursorWatcherService.on('watchStopped', () => {
      this.logger.info('Cursor監視が停止されました')
      this.emit('watchStopped')
    })
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await this.logger.initialize()
      await this.configService.initialize()
      await this.chatHistoryService.initialize()
      await this.cursorLogService.initialize()
      await this.cursorWatcherService.initialize()
      
      this.isInitialized = true
      this.logger.info('IntegrationServiceを初期化しました')
    } catch (error) {
      throw this.createError('INIT_ERROR', 'Failed to initialize IntegrationService', error)
    }
  }

  async startSync(): Promise<void> {
    if (!this.isInitialized) {
      throw this.createError('NOT_INITIALIZED', 'Service not initialized')
    }

    try {
      // CursorWatcherServiceの監視を開始
      if (this.config.cursor.enabled) {
        await this.cursorWatcherService.startWatching()
        this.logger.info('Cursor監視を開始しました')
      }

      // 従来のCursorLogServiceも並行して動作
      await this.cursorLogService.startWatching()
      
      this.startSyncInterval()
      this.logger.info('統合同期を開始しました')
    } catch (error) {
      throw this.createError('SYNC_ERROR', 'Failed to start sync', error)
    }
  }

  async stopSync(): Promise<void> {
    try {
      await this.cursorWatcherService.stopWatching()
      await this.cursorLogService.stopWatching()
      this.stopSyncInterval()
      this.logger.info('統合同期を停止しました')
    } catch (error) {
      throw this.createError('STOP_ERROR', 'Failed to stop sync', error)
    }
  }

  /**
   * Cursorログの手動スキャン・インポート
   */
  async scanCursorLogs(customPath?: string): Promise<number> {
    if (!this.isInitialized) {
      throw this.createError('NOT_INITIALIZED', 'Service not initialized')
    }

    try {
      const importCount = await this.cursorWatcherService.scanAndImport(customPath)
      this.logger.info(`Cursorログスキャン完了: ${importCount}件インポート`)
      return importCount
    } catch (error) {
      throw this.createError('SCAN_ERROR', 'Failed to scan Cursor logs', error)
    }
  }

  /**
   * CursorWatcherServiceのステータスを取得
   */
  getCursorWatcherStatus() {
    return this.cursorWatcherService.getStatus()
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
        keyword: options.query,
        startDate: options.timeRange?.start,
        endDate: options.timeRange?.end,
        page: 1,
        pageSize: 10
      })

      // チャットログを統合ログ形式に変換
      const integratedChatLogs = chatLogs.sessions.map(chat => ({
        id: chat.id,
        timestamp: chat.createdAt,
        type: 'chat' as const,
        content: chat.messages[0]?.content || '',
        metadata: {
          project: chat.metadata?.project,
          tags: chat.tags || [],
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
      if (options.project && log.metadata.project && log.metadata.project !== options.project) {
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

    // ページネーションの適用
    const pageSize = options.pageSize || results.length
    return results.slice(0, pageSize)
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
        storageSize: totalSize + Number(chatStats.totalSize || 0)
      }
    } catch (error) {
      throw this.createError('STATS_ERROR', 'Failed to get stats', error)
    }
  }

  private async linkLogsWithChats(log: IntegratedLog): Promise<void> {
    try {
      // プロジェクトIDが一致するチャットセッションを検索
      const chatLogs = await this.chatHistoryService.searchSessions({
        keyword: log.metadata.project,
        startDate: new Date(log.timestamp.getTime() - 5 * 60 * 1000),
        endDate: new Date(log.timestamp.getTime() + 5 * 60 * 1000)
      })

      if (chatLogs.sessions.length > 0) {
        // 最も近い時間のセッションを選択
        const closestSession = chatLogs.sessions.reduce((closest, current) => {
          const closestTime = Math.abs(closest.createdAt.getTime() - log.timestamp.getTime())
          const currentTime = Math.abs(current.createdAt.getTime() - log.timestamp.getTime())
          return currentTime < closestTime ? current : closest
        })

        // ログとセッションを紐付け
        await this.chatHistoryService.updateSession(closestSession.id, {
          metadata: {
            ...closestSession.metadata,
            source: 'chat',
            project: closestSession.metadata?.project,
            summary: closestSession.metadata?.summary,
            status: closestSession.metadata?.status
          }
        })

        // ログにセッションIDを追加
        const processedPath = path.join(this.config.cursor.watchPath, 'processed', `${log.id}.json`)
        await fs.writeJson(processedPath, {
          ...log,
          metadata: {
            ...log.metadata,
            sessionId: closestSession.id
          }
        }, { spaces: 2 })

        this.emit('logsLinked', {
          logId: log.id,
          sessionId: closestSession.id
        })
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  private startSyncInterval(): void {
    if (this.syncInterval) {
      return
    }

    this.syncInterval = setInterval(async () => {
      try {
        const processedLogsDir = path.join(this.config.cursor.watchPath, 'processed')
        if (await fs.pathExists(processedLogsDir)) {
          const logFiles = await fs.readdir(processedLogsDir)
          for (const file of logFiles) {
            if (file.endsWith('.json')) {
              const log = await fs.readJson(path.join(processedLogsDir, file))
              if (!log.metadata?.sessionId) {
                await this.linkLogsWithChats(log)
              }
            }
          }
        }
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
    this.emit('error', integrationError)
  }

  private createError(code: string, message: string, originalError?: any): IntegrationError {
    const error = new Error(message) as IntegrationError
    error.code = code
    error.details = originalError
    error.timestamp = new Date()
    return error
  }

  async getAnalytics(options: IntegrationAnalyticsRequest): Promise<IntegrationAnalyticsResponse> {
    if (!this.isInitialized) {
      throw this.createError('NOT_INITIALIZED', 'Service not initialized')
    }

    try {
      const startDate = options.startDate ? new Date(options.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const endDate = options.endDate ? new Date(options.endDate) : new Date()

      // ログの集計
      const logs = await this.search({
        query: '',
        timeRange: { start: startDate, end: endDate },
        types: options.types,
        project: options.projectId
      })

      // 集計処理
      const summary = {
        totalLogs: logs.length,
        totalChats: logs.filter(log => log.type === 'chat').length,
        totalCursorLogs: logs.filter(log => log.type === 'cursor').length,
        uniqueProjects: new Set(logs.map(log => log.metadata.project)).size,
        uniqueTags: new Set(logs.flatMap(log => log.metadata.tags || [])).size
      }

      const logsByType = {
        chat: logs.filter(log => log.type === 'chat').length,
        cursor: logs.filter(log => log.type === 'cursor').length
      }

      const logsByProject = logs.reduce((acc, log) => {
        const project = log.metadata.project || 'unknown'
        acc[project] = (acc[project] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const logsByTag = logs.reduce((acc, log) => {
        (log.metadata.tags || []).forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1
        })
        return acc
      }, {} as Record<string, number>)

      // タイムライン生成
      const timeline: Array<{ date: Date; chatCount: number; cursorCount: number; totalCount: number }> = []
      const current = new Date(startDate)

      while (current <= endDate) {
        const next = new Date(current)
        switch (options.groupBy || 'day') {
          case 'day':
            next.setDate(next.getDate() + 1)
            break
          case 'week':
            next.setDate(next.getDate() + 7)
            break
          case 'month':
            next.setMonth(next.getMonth() + 1)
            break
        }

        const periodLogs = logs.filter(log => {
          const logDate = log.timestamp
          return logDate >= current && logDate < next
        })

        timeline.push({
          date: new Date(current),
          chatCount: periodLogs.filter(log => log.type === 'chat').length,
          cursorCount: periodLogs.filter(log => log.type === 'cursor').length,
          totalCount: periodLogs.length
        })

        current.setTime(next.getTime())
      }

      // 時間帯別分布
      const hourlyDistribution = this.generateHourlyDistribution(logs)

      // キーワード分析
      const topKeywords = this.analyzeKeywords(logs)

      return {
        summary,
        logsByType,
        logsByProject,
        logsByTag,
        activityTimeline: timeline.map(item => ({
          ...item,
          date: item.date.toISOString()
        })),
        hourlyDistribution,
        topKeywords
      }
    } catch (error) {
      throw this.createError('ANALYTICS_ERROR', 'Failed to get analytics', error)
    }
  }

  private generateHourlyDistribution(logs: IntegratedLog[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    for (let hour = 0; hour < 24; hour++) {
      distribution[hour.toString()] = logs.filter(log => {
        const logHour = log.timestamp.getHours()
        return logHour === hour
      }).length
    }
    return distribution
  }

  private analyzeKeywords(logs: IntegratedLog[]): Array<{ keyword: string; count: number }> {
    const keywordCounts: Record<string, number> = {}
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])

    logs.forEach(log => {
      const words = log.content.toLowerCase().split(/\W+/)
      words.forEach(word => {
        if (word.length > 3 && !commonWords.has(word)) {
          keywordCounts[word] = (keywordCounts[word] || 0) + 1
        }
      })
    })

    return Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }
} 