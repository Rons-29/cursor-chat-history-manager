/**
 * 統合サービス
 * Cursorとの統合機能を提供するサービスクラス
 */

import { EventEmitter } from 'events'
import type {
  IntegrationConfig,
  IntegrationSearchOptions,
  IntegrationStats,
  IntegrationAnalytics,
  CursorWatcherStatus,
  IntegratedLog,
  IntegrationAnalyticsRequest,
} from '../types/integration.js'
import { Logger } from '../utils/Logger.js'
import { ChatHistoryService } from '../../services/ChatHistoryService.js'
import { CursorLogService } from '../../services/CursorLogService.js'

export class IntegrationService extends EventEmitter {
  private config: IntegrationConfig
  private logger: Logger
  private chatHistoryService: ChatHistoryService
  private cursorLogService: CursorLogService
  private isInitialized: boolean = false
  private cursorWatcherStatus: CursorWatcherStatus = {
    isActive: false,
    lastCheck: new Date(),
    watchPath: '',
    errorCount: 0,
  }

  constructor(config: IntegrationConfig, logger: Logger) {
    super()
    this.config = config
    this.logger = logger
    this.chatHistoryService = new ChatHistoryService(config.chatHistory)
    this.cursorLogService = new CursorLogService(config.cursor, logger)
  }

  /**
   * サービスの初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await this.chatHistoryService.initialize()
      await this.cursorLogService.initialize()
      this.isInitialized = true
      await this.logger.info('IntegrationServiceを初期化しました')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      await this.logger.error(
        '初期化エラー',
        error instanceof Error ? error : undefined
      )
      throw new Error(
        `Failed to initialize IntegrationService: ${errorMessage}`
      )
    }
  }

  /**
   * 同期開始
   */
  async startSync(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('サービスが初期化されていません')
    }

    try {
      // Cursorログの監視を開始
      await this.cursorLogService.startWatching()

      // 定期的な同期処理を開始
      this.setupPeriodicSync()

      // ステータス更新
      this.cursorWatcherStatus.isActive = true
      this.cursorWatcherStatus.watchPath = this.config.cursor.watchPath
      this.cursorWatcherStatus.lastCheck = new Date()

      await this.logger.info('統合同期を開始しました', {
        watchPath: this.config.cursor.watchPath,
        interval: this.config.sync.interval,
      })

      this.emit('syncStarted', {
        watchPath: this.config.cursor.watchPath,
        interval: this.config.sync.interval,
      })
    } catch (error) {
      this.cursorWatcherStatus.errorCount += 1
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      await this.logger.error(
        '同期開始エラー',
        error instanceof Error ? error : undefined
      )
      throw new Error(`Failed to start sync: ${errorMessage}`)
    }
  }

  /**
   * 定期的な同期処理の設定
   */
  private setupPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.performSync()
      } catch (error) {
        await this.logger.error(
          '定期同期エラー',
          error instanceof Error ? error : undefined
        )
        this.emit('syncError', error)
      }
    }, this.config.sync.interval * 1000)
  }

  /**
   * 同期処理の実行
   */
  private async performSync(): Promise<void> {
    const startTime = Date.now()

    try {
      // Cursorログの新規スキャン
      const newLogs = await this.scanNewCursorLogs()

      // チャット履歴との統合処理
      await this.integrateLogs(newLogs)

      // ステータス更新
      this.cursorWatcherStatus.lastCheck = new Date()

      const duration = Date.now() - startTime
      await this.logger.debug('同期処理完了', {
        newLogs: newLogs.length,
        duration,
      })

      this.emit('syncCompleted', {
        importCount: newLogs.length,
        duration,
      })
    } catch (error) {
      this.cursorWatcherStatus.errorCount += 1
      throw error
    }
  }

  /**
   * 新しいCursorログのスキャン
   */
  private async scanNewCursorLogs(): Promise<IntegratedLog[]> {
    const logs: IntegratedLog[] = []

    try {
      // 最後のチェック時刻以降のログを取得
      const cursorLogs = await this.cursorLogService.getLogs(
        this.cursorWatcherStatus.lastCheck
      )

      for (const log of cursorLogs) {
        const integratedLog: IntegratedLog = {
          id: log.id,
          type: 'cursor',
          content: log.content,
          timestamp: log.timestamp,
          metadata: {
            project: log.metadata?.project,
            source: 'cursor',
            tags: log.metadata?.tags,
            status: log.metadata?.status,
            taskId: log.sessionId,
            cursorId: log.id,
          },
        }
        logs.push(integratedLog)
      }

      return logs
    } catch (error) {
      await this.logger.error(
        'Cursorログスキャンエラー',
        error instanceof Error ? error : undefined
      )
      return []
    }
  }

  /**
   * ログの統合処理
   */
  private async integrateLogs(logs: IntegratedLog[]): Promise<void> {
    for (const log of logs) {
      try {
        // プロジェクト情報の抽出・更新
        await this.extractProjectInfo(log)

        // タグの自動タグ付与
        await this.autoTagLog(log)

        // 関連セッションの検索と紐付け
        await this.linkRelatedSessions(log)

        this.emit('logIntegrated', log)
      } catch (error) {
        await this.logger.warn('ログ統合エラー', {
          logId: log.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  /**
   * プロジェクト情報の抽出
   */
  private async extractProjectInfo(log: IntegratedLog): Promise<void> {
    // ログ内容からプロジェクト名を推定
    const content = log.content.toLowerCase()

    // よくあるプロジェクト指標を検索
    const projectPatterns = [
      /project[:\s]+([a-zA-Z0-9-_]+)/i,
      /repo[:\s]+([a-zA-Z0-9-_]+)/i,
      /workspace[:\s]+([a-zA-Z0-9-_]+)/i,
    ]

    for (const pattern of projectPatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        log.metadata.project = match[1]
        break
      }
    }
  }

  /**
   * ログの自動タグ付与
   */
  private async autoTagLog(log: IntegratedLog): Promise<void> {
    const tags: string[] = log.metadata.tags || []
    const content = log.content.toLowerCase()

    // コンテンツベースの自動タグ付与
    const tagPatterns: Record<string, RegExp[]> = {
      error: [/error/i, /エラー/i, /fail/i, /exception/i],
      debug: [/debug/i, /デバッグ/i, /console\.log/i],
      feature: [/feature/i, /機能/i, /implement/i, /実装/i],
      bug: [/bug/i, /バグ/i, /issue/i, /問題/i],
      refactor: [/refactor/i, /リファクタ/i, /clean/i, /整理/i],
      test: [/test/i, /テスト/i, /spec/i, /jest/i],
      documentation: [/docs?/i, /document/i, /readme/i, /ドキュメント/i],
    }

    for (const [tag, patterns] of Object.entries(tagPatterns)) {
      if (patterns.some(pattern => pattern.test(content))) {
        if (!tags.includes(tag)) {
          tags.push(tag)
        }
      }
    }

    log.metadata.tags = tags
  }

  /**
   * 関連セッションの検索と紐付け
   */
  private async linkRelatedSessions(log: IntegratedLog): Promise<void> {
    try {
      // プロジェクトやタグが一致するセッションを検索
      const searchResults = await this.chatHistoryService.searchSessions({
        keyword: log.metadata.project,
        tags: log.metadata.tags,
      })

      if (searchResults.sessions.length > 0) {
        // 最も関連性の高いセッションを選択
        const relatedSession = searchResults.sessions[0]
        log.metadata.projectId = parseInt(relatedSession.id) || undefined
      }
    } catch (error) {
      await this.logger.debug('関連セッション検索エラー', {
        logId: log.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * 同期停止
   */
  async stopSync(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('サービスが初期化されていません')
    }

    try {
      // Cursorログの監視を停止
      await this.cursorLogService.stopWatching()

      // 定期同期の停止
      if (this.syncInterval) {
        clearInterval(this.syncInterval)
        this.syncInterval = null
      }

      // ステータス更新
      this.cursorWatcherStatus.isActive = false

      await this.logger.info('統合同期を停止しました')
      this.emit('syncStopped')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      await this.logger.error(
        '同期停止エラー',
        error instanceof Error ? error : undefined
      )
      throw new Error(`Failed to stop sync: ${errorMessage}`)
    }
  }

  /**
   * Cursorログのスキャン
   */
  async scanCursorLogs(customPath?: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('サービスが初期化されていません')
    }

    let importCount = 0

    try {
      const scanPath = customPath || this.config.cursor.watchPath
      await this.logger.info('Cursorログスキャンを開始', { scanPath })

      // 指定パスからログファイルを検索
      const logFiles = await this.findCursorLogFiles(scanPath)

      for (const filePath of logFiles) {
        try {
          const logs = await this.processCursorLogFile(filePath)
          importCount += logs.length

          this.emit('fileProcessed', {
            filePath,
            logCount: logs.length,
          })
        } catch (error) {
          await this.logger.warn('ログファイル処理エラー', {
            filePath,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      await this.logger.info('Cursorログスキャン完了', {
        scannedFiles: logFiles.length,
        importCount,
      })

      this.emit('scanCompleted', {
        scannedFiles: logFiles.length,
        importCount,
      })

      return importCount
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      await this.logger.error(
        'Cursorログスキャンエラー',
        error instanceof Error ? error : undefined
      )
      throw new Error(`Failed to scan Cursor logs: ${errorMessage}`)
    }
  }

  /**
   * Cursorログファイルの検索
   */
  private async findCursorLogFiles(scanPath: string): Promise<string[]> {
    const fs = await import('fs-extra')
    const path = await import('path')
    const files: string[] = []

    try {
      if (!(await fs.pathExists(scanPath))) {
        await this.logger.warn('スキャンパスが存在しません', { scanPath })
        return files
      }

      const entries = await fs.readdir(scanPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(scanPath, entry.name)

        if (entry.isDirectory()) {
          // 再帰的にサブディレクトリも検索
          const subFiles = await this.findCursorLogFiles(fullPath)
          files.push(...subFiles)
        } else if (this.isCursorLogFile(entry.name)) {
          files.push(fullPath)
        }
      }

      return files
    } catch (error) {
      await this.logger.error('ログファイル検索エラー', {
        scanPath,
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }

  /**
   * Cursorログファイルの判定
   */
  private isCursorLogFile(fileName: string): boolean {
    const logExtensions = ['.json', '.log', '.txt']
    const cursorPatterns = [/cursor/i, /chat/i, /session/i, /conversation/i]

    const hasValidExtension = logExtensions.some(ext => fileName.endsWith(ext))
    const matchesPattern = cursorPatterns.some(pattern =>
      pattern.test(fileName)
    )

    return hasValidExtension && matchesPattern
  }

  /**
   * Cursorログファイルの処理
   */
  private async processCursorLogFile(
    filePath: string
  ): Promise<IntegratedLog[]> {
    const fs = await import('fs-extra')
    const logs: IntegratedLog[] = []

    try {
      const content = await fs.readFile(filePath, 'utf-8')

      // JSON形式の場合
      if (filePath.endsWith('.json')) {
        const jsonData = JSON.parse(content)
        const processedLogs = this.parseJsonLogs(jsonData)
        logs.push(...processedLogs)
      }
      // テキスト形式の場合
      else {
        const processedLogs = this.parseTextLogs(content)
        logs.push(...processedLogs)
      }

      return logs
    } catch (error) {
      await this.logger.warn('ログファイル読み込みエラー', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }

  /**
   * JSONログの解析
   */
  private parseJsonLogs(jsonData: any): IntegratedLog[] {
    const logs: IntegratedLog[] = []

    try {
      // 配列の場合
      if (Array.isArray(jsonData)) {
        for (const item of jsonData) {
          const log = this.createIntegratedLogFromJson(item)
          if (log) logs.push(log)
        }
      }
      // 単一オブジェクトの場合
      else if (typeof jsonData === 'object') {
        const log = this.createIntegratedLogFromJson(jsonData)
        if (log) logs.push(log)
      }

      return logs
    } catch (error) {
      return []
    }
  }

  /**
   * JSONからIntegratedLogを作成
   */
  private createIntegratedLogFromJson(data: any): IntegratedLog | null {
    try {
      return {
        id: data.id || this.generateId(),
        type: 'cursor',
        content: data.content || data.message || data.text || '',
        timestamp: new Date(data.timestamp || data.createdAt || Date.now()),
        metadata: {
          project: data.project || data.metadata?.project,
          source: 'cursor',
          tags: data.tags || data.metadata?.tags || [],
          status: data.status || 'active',
          cursorId: data.id,
        },
      }
    } catch (error) {
      return null
    }
  }

  /**
   * テキストログの解析
   */
  private parseTextLogs(content: string): IntegratedLog[] {
    const logs: IntegratedLog[] = []
    const lines = content.split('\n').filter(line => line.trim())

    for (const line of lines) {
      try {
        // JSON形式の行を試行
        const jsonLog = JSON.parse(line)
        const log = this.createIntegratedLogFromJson(jsonLog)
        if (log) logs.push(log)
      } catch {
        // プレーンテキストとして処理
        if (line.trim()) {
          logs.push({
            id: this.generateId(),
            type: 'cursor',
            content: line.trim(),
            timestamp: new Date(),
            metadata: {
              source: 'cursor',
              tags: ['text-log'],
              status: 'active',
            },
          })
        }
      }
    }

    return logs
  }

  /**
   * ID生成
   */
  private generateId(): string {
    return `cursor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // プライベートプロパティを追加
  private syncInterval: NodeJS.Timeout | null = null

  /**
   * CursorWatcherのステータス取得
   */
  getCursorWatcherStatus(): CursorWatcherStatus {
    return this.cursorWatcherStatus
  }

  /**
   * 統合ログ検索
   */
  async search(options: {
    query?: string
    project?: string
    types?: string[]
    timeRange?: {
      start: Date
      end: Date
    }
  }): Promise<IntegratedLog[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const [chatResults, cursorResults] = await Promise.all([
        this.chatHistoryService.searchSessions({
          keyword: options.query,
          startDate: options.timeRange?.start,
          endDate: options.timeRange?.end,
        }),
        this.cursorLogService.search({
          query: options.query,
          timeRange: options.timeRange,
        }),
      ])

      const results: IntegratedLog[] = [
        ...chatResults.sessions.map(session => ({
          id: session.id,
          type: 'chat' as const,
          content: session.title,
          timestamp: session.startTime,
          metadata: {
            project: session.metadata?.project,
            source: 'chat',
            tags: session.metadata?.tags,
          },
        })),
        ...cursorResults.map(log => ({
          id: log.id,
          type: 'cursor' as const,
          content: log.content,
          timestamp: log.timestamp,
          metadata: {
            project: log.metadata?.project,
            source: 'cursor',
            tags: log.metadata?.tags,
          },
        })),
      ]

      if (options.types) {
        return results.filter(log => options.types?.includes(log.type))
      }

      return results
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      await this.logger.error(
        '検索エラー',
        error instanceof Error ? error : undefined
      )
      throw new Error(`Failed to search: ${errorMessage}`)
    }
  }

  /**
   * 統計情報取得
   */
  async getStats(): Promise<IntegrationStats> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const [chatStats, cursorStats] = await Promise.all([
        this.chatHistoryService.getStats(),
        this.cursorLogService.getStats(),
      ])

      return {
        totalLogs: chatStats.totalSessions + cursorStats.totalLogs,
        cursorLogs: cursorStats.totalLogs,
        chatLogs: chatStats.totalSessions,
        storageSize: chatStats.storageSize + cursorStats.storageSize,
        logsByType: {
          chat: chatStats.totalSessions,
          cursor: cursorStats.totalLogs,
        },
        logsByProject: {}, // TODO: 実装
        logsByTag: {}, // TODO: 実装
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      await this.logger.error(
        '統計取得エラー',
        error instanceof Error ? error : undefined
      )
      throw new Error(`Failed to get stats: ${errorMessage}`)
    }
  }

  /**
   * 分析データ取得
   */
  async getAnalytics(
    options: IntegrationAnalyticsRequest
  ): Promise<IntegrationAnalytics> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const stats = await this.getStats()

      return {
        timeRange: options.timeRange,
        granularity: options.granularity,
        summary: {
          totalLogs: stats.totalLogs,
          totalChats: stats.chatLogs,
          totalCursorLogs: stats.cursorLogs,
          uniqueProjects: Object.keys(stats.logsByProject).length,
          uniqueTags: Object.keys(stats.logsByTag).length,
        },
        logsByType: stats.logsByType,
        logsByProject: stats.logsByProject,
        logsByTag: stats.logsByTag,
        activityTimeline: [], // TODO: 実装
        hourlyDistribution: {}, // TODO: 実装
        topKeywords: [], // TODO: 実装
        metrics: {
          messageCount: [],
          sessionCount: [],
          timestamps: [],
        },
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      await this.logger.error(
        '分析情報取得エラー',
        error instanceof Error ? error : undefined
      )
      throw new Error(`Failed to get analytics: ${errorMessage}`)
    }
  }
}
