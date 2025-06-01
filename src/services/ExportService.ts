import fs from 'fs-extra'
import path from 'path'
import { format } from 'date-fns'
import type { ChatHistoryConfig, ChatSession, ChatMessage } from '../types/index.js'
import { Logger } from '../server/utils/Logger.js'
import { ConfigService } from './ConfigService.js'
import { ChatHistoryService } from './ChatHistoryService.js'
import { CursorIntegrationService } from './CursorIntegrationService.js'
import { CursorLogService } from './CursorLogService.js'

export interface ExportOptions {
  format: 'json' | 'markdown' | 'txt'
  outputPath: string
  includeMetadata?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
}

interface ExportConfig {
  outputDir: string
  format: 'json' | 'markdown' | 'text'
  includeMetadata: boolean
  compression: boolean
}

interface ExportResult {
  success: boolean
  filePath?: string
  error?: string
  stats?: {
    sessionsExported: number
    messagesExported: number
    fileSize: number
  }
}

export class ExportService {
  private config: ExportConfig
  private logger: Logger
  private chatHistoryService: ChatHistoryService
  private isInitialized: boolean = false

  constructor(
    config: ExportConfig,
    chatHistoryService: ChatHistoryService,
    logger: Logger
  ) {
    this.config = {
      outputDir: config.outputDir,
      format: config.format || 'json',
      includeMetadata: config.includeMetadata ?? true,
      compression: config.compression ?? false
    }
    this.logger = logger
    this.chatHistoryService = chatHistoryService
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await fs.ensureDir(this.config.outputDir)
      this.isInitialized = true
      this.logger.info('ExportServiceを初期化しました')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      this.logger.error('初期化エラー', { error: errorMessage })
      throw new Error(`Failed to initialize ExportService: ${errorMessage}`)
    }
  }

  /**
   * セッションをエクスポート
   */
  async exportSessions(
    sessions: ChatSession[],
    options: ExportOptions
  ): Promise<void> {
    await fs.ensureDir(path.dirname(options.outputPath))

    switch (options.format) {
      case 'json':
        await this.exportAsJson(sessions, options)
        break
      case 'markdown':
        await this.exportAsMarkdown(sessions, options)
        break
      case 'txt':
        await this.exportAsText(sessions, options)
        break
      default:
        throw new Error(`サポートされていないフォーマット: ${options.format}`)
    }
  }

  /**
   * JSON形式でエクスポート
   */
  private async exportAsJson(
    sessions: ChatSession[],
    options: ExportOptions
  ): Promise<void> {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalSessions: sessions.length,
      totalMessages: sessions.reduce(
        (sum, session) => sum + session.messages.length,
        0
      ),
      sessions: options.includeMetadata
        ? sessions
        : sessions.map(session => ({
            id: session.id,
            title: session.title,
            startTime: session.startTime,
            endTime: session.endTime,
            messages: session.messages,
          })),
    }

    await fs.writeJson(options.outputPath, exportData, { spaces: 2 })
  }

  /**
   * Markdown形式でエクスポート
   */
  private async exportAsMarkdown(
    sessions: ChatSession[],
    options: ExportOptions
  ): Promise<void> {
    let markdown = '# Cursor Chat履歴\n\n'
    markdown += `エクスポート日時: ${format(new Date(), 'yyyy年MM月dd日 HH:mm:ss')}\n`
    markdown += `総セッション数: ${sessions.length}\n`
    markdown += `総メッセージ数: ${sessions.reduce((sum, session) => sum + session.messages.length, 0)}\n\n`

    for (const session of sessions) {
      markdown += `## ${session.title || 'セッション'}\n\n`
      markdown += `- **セッションID**: ${session.id}\n`
      markdown += `- **開始時刻**: ${format(session.startTime, 'yyyy年MM月dd日 HH:mm:ss')}\n`

      if (session.endTime) {
        markdown += `- **終了時刻**: ${format(session.endTime, 'yyyy年MM月dd日 HH:mm:ss')}\n`
      }

      if (session.metadata?.tags && session.metadata.tags.length > 0) {
        markdown += `- **タグ**: ${session.metadata.tags.join(', ')}\n`
      }

      markdown += `- **メッセージ数**: ${session.messages.length}\n\n`

      if (session.messages.length > 0) {
        markdown += '### 会話内容\n\n'

        for (const [index, message] of session.messages.entries()) {
          const roleIcon = this.getRoleIcon(message.role)
          const timestamp = format(message.timestamp, 'HH:mm:ss')

          markdown += `#### ${index + 1}. ${roleIcon} ${message.role.toUpperCase()} (${timestamp})\n\n`
          markdown += `${message.content}\n\n`
        }
      }

      markdown += '---\n\n'
    }

    await fs.writeFile(options.outputPath, markdown, 'utf-8')
  }

  /**
   * テキスト形式でエクスポート
   */
  private async exportAsText(
    sessions: ChatSession[],
    options: ExportOptions
  ): Promise<void> {
    let text = 'Cursor Chat履歴\n'
    text += '='.repeat(50) + '\n\n'
    text += `エクスポート日時: ${format(new Date(), 'yyyy年MM月dd日 HH:mm:ss')}\n`
    text += `総セッション数: ${sessions.length}\n`
    text += `総メッセージ数: ${sessions.reduce((sum, session) => sum + session.messages.length, 0)}\n\n`

    for (const [sessionIndex, session] of sessions.entries()) {
      text += `${sessionIndex + 1}. ${session.title || 'セッション'}\n`
      text += '-'.repeat(30) + '\n'
      text += `セッションID: ${session.id}\n`
      text += `開始時刻: ${format(session.startTime, 'yyyy年MM月dd日 HH:mm:ss')}\n`

      if (session.endTime) {
        text += `終了時刻: ${format(session.endTime, 'yyyy年MM月dd日 HH:mm:ss')}\n`
      }

      if (session.metadata?.tags && session.metadata.tags.length > 0) {
        text += `タグ: ${session.metadata.tags.join(', ')}\n`
      }

      text += `メッセージ数: ${session.messages.length}\n\n`

      if (session.messages.length > 0) {
        text += '会話内容:\n'

        for (const [index, message] of session.messages.entries()) {
          const timestamp = format(message.timestamp, 'HH:mm:ss')
          text += `  ${index + 1}. [${message.role.toUpperCase()}] ${timestamp}\n`
          text += `     ${message.content.replace(/\n/g, '\n     ')}\n\n`
        }
      }

      text += '\n' + '='.repeat(50) + '\n\n'
    }

    await fs.writeFile(options.outputPath, text, 'utf-8')
  }

  /**
   * ロールに対応するアイコンを取得
   */
  private getRoleIcon(role: string): string {
    switch (role) {
      case 'user':
        return '👤'
      case 'assistant':
        return '🤖'
      case 'system':
        return '⚙️'
      default:
        return '❓'
    }
  }

  /**
   * 単一セッションをエクスポート
   */
  async exportSession(sessionId: string): Promise<ExportResult> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      const session = await this.chatHistoryService.getSession(sessionId)
      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        }
      }

      const exportData = this.prepareExportData(session)
      const filePath = await this.writeExportFile(sessionId, exportData)

      return {
        success: true,
        filePath,
        stats: {
          sessionsExported: 1,
          messagesExported: session.messages.length,
          fileSize: (await fs.stat(filePath)).size
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      this.logger.error('エクスポートエラー', { sessionId, error: errorMessage })
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  private prepareExportData(session: ChatSession): unknown {
    switch (this.config.format) {
      case 'json':
        return this.prepareJsonExport(session)
      case 'markdown':
        return this.prepareMarkdownExport(session)
      case 'text':
        return this.prepareTextExport(session)
      default:
        throw new Error(`Unsupported export format: ${this.config.format}`)
    }
  }

  private prepareJsonExport(session: ChatSession): unknown {
    const exportData = {
      id: session.id,
      title: session.title,
      messages: session.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    }

    if (this.config.includeMetadata) {
      return {
        ...exportData,
        metadata: session.metadata,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    }

    return exportData
  }

  private prepareMarkdownExport(session: ChatSession): string {
    let markdown = `# ${session.title}\n\n`
    
    if (this.config.includeMetadata) {
      markdown += `## Metadata\n\n`
      markdown += `- Created: ${new Date(session.createdAt).toLocaleString()}\n`
      markdown += `- Updated: ${new Date(session.updatedAt).toLocaleString()}\n`
      if (session.metadata.tags?.length) {
        markdown += `- Tags: ${session.metadata.tags.join(', ')}\n`
      }
      markdown += '\n'
    }

    markdown += `## Messages\n\n`
    for (const msg of session.messages) {
      markdown += `### ${msg.role}\n\n`
      markdown += `${msg.content}\n\n`
      markdown += `*${new Date(msg.timestamp).toLocaleString()}*\n\n`
    }

    return markdown
  }

  private prepareTextExport(session: ChatSession): string {
    let text = `${session.title}\n\n`
    
    if (this.config.includeMetadata) {
      text += `Created: ${new Date(session.createdAt).toLocaleString()}\n`
      text += `Updated: ${new Date(session.updatedAt).toLocaleString()}\n`
      if (session.metadata.tags?.length) {
        text += `Tags: ${session.metadata.tags.join(', ')}\n`
      }
      text += '\n'
    }

    for (const msg of session.messages) {
      text += `${msg.role.toUpperCase()}:\n`
      text += `${msg.content}\n\n`
      text += `[${new Date(msg.timestamp).toLocaleString()}]\n\n`
    }

    return text
  }

  private async writeExportFile(sessionId: string, data: unknown): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const extension = this.config.format === 'json' ? 'json' : 'md'
    const fileName = `session_${sessionId}_${timestamp}.${extension}`
    const filePath = path.join(this.config.outputDir, fileName)

    if (this.config.format === 'json') {
      await fs.writeJson(filePath, data, { spaces: 2 })
    } else {
      await fs.writeFile(filePath, data as string, 'utf-8')
    }

    return filePath
  }

  async getStats(): Promise<{
    totalExports: number
    totalSessions: number
    totalMessages: number
    storageSize: number
  }> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    try {
      let totalExports = 0
      let totalSessions = 0
      let totalMessages = 0
      let totalSize = 0

      const files = await fs.readdir(this.config.outputDir)
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.md')) {
          const filePath = path.join(this.config.outputDir, file)
          const stats = await fs.stat(filePath)
          totalSize += stats.size
          totalExports++

          if (file.endsWith('.json')) {
            const data = await fs.readJson(filePath)
            if (data.messages) {
              totalSessions++
              totalMessages += data.messages.length
            }
          }
        }
      }

      return {
        totalExports,
        totalSessions,
        totalMessages,
        storageSize: totalSize
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      this.logger.error('統計取得エラー', { error: errorMessage })
      throw new Error(`Failed to get stats: ${errorMessage}`)
    }
  }
}
