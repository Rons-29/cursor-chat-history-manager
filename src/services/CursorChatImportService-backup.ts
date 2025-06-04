/**
 * Cursor Chat Import Service
 * Cursorからエクスポートされたチャットファイルを統合データベースに取り込む
 */

import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import { ChatHistoryService } from './ChatHistoryService.js'
import type { ChatHistoryConfig } from '../types/index.js'

export interface CursorChatExport {
  id: string
  title: string
  timestamp: Date
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
  metadata: {
    source: 'cursor-chat-export'
    exportDate: Date
    originalFormat: 'markdown' | 'text' | 'json'
    messageCount: number
    estimatedDuration?: number
  }
}

export class CursorChatImportService {
  private chatHistoryService: ChatHistoryService
  private exportsDir: string

  constructor(storagePath: string, exportsDir = 'exports') {
    const config: ChatHistoryConfig = {
      storagePath,
      maxSessions: 10000,
      maxMessagesPerSession: 1000,
      autoCleanup: false,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24,
    }
    this.chatHistoryService = new ChatHistoryService(config)
    this.exportsDir = path.resolve(exportsDir)
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    await this.chatHistoryService.initialize()
    await fs.ensureDir(this.exportsDir)
  }

  /**
   * エクスポートファイルをスキャンして一括インポート
   */
  async importAllExports(): Promise<{
    imported: number
    skipped: number
    errors: string[]
  }> {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    }

    try {
      const files = await fs.readdir(this.exportsDir)
      const chatFiles = files.filter(
        f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.json')
      )

      for (const file of chatFiles) {
        try {
          const filePath = path.join(this.exportsDir, file)
          const imported = await this.importSingleFile(filePath)

          if (imported) {
            results.imported++
          } else {
            results.skipped++
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          results.errors.push(`${file}: ${errorMessage}`)
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      results.errors.push(`Directory scan failed: ${errorMessage}`)
    }

    return results
  }

  /**
   * 単一ファイルのインポート
   */
  private async importSingleFile(filePath: string): Promise<boolean> {
    const fileName = path.basename(filePath)
    const ext = path.extname(filePath).toLowerCase()

    // 既にインポート済みかチェック
    const fileHash = await this.calculateFileHash(filePath)
    const searchResult = await this.chatHistoryService.searchSessions({
      keyword: fileHash, // fileHashをキーワードとして検索
      pageSize: 1,
      page: 1,
    })

    if (searchResult.sessions.length > 0) {
      // より厳密にfileHashをチェック
      const existing = searchResult.sessions.find(
        s => s.metadata?.fileHash === fileHash
      )
      if (existing) {
        console.log(`スキップ: ${fileName} (既にインポート済み)`)
        return false
      }
    }

    const content = await fs.readFile(filePath, 'utf-8')
    let chatData: CursorChatExport | null = null

    switch (ext) {
      case '.md':
        chatData = await this.parseMarkdownExport(content, fileName, fileHash)
        break
      case '.txt':
        chatData = await this.parseTextExport(content, fileName, fileHash)
        break
      case '.json':
        chatData = await this.parseJsonExport(content, fileName, fileHash)
        break
      default:
        throw new Error(`Unsupported file format: ${ext}`)
    }

    if (chatData) {
      await this.storeChatData(chatData, fileHash)
      console.log(
        `✅ インポート完了: ${fileName} (${chatData.messages.length}メッセージ)`
      )
      return true
    }

    return false
  }

  /**
   * Markdownエクスポートの解析
   */
  private async parseMarkdownExport(
    content: string,
    fileName: string,
    fileHash: string
  ): Promise<CursorChatExport> {
    const lines = content.split('\n')
    const messages: CursorChatExport['messages'] = []

    let currentRole: 'user' | 'assistant' | null = null
    let currentContent = ''
    let title = fileName.replace(/\.(md|txt|json)$/, '')

    // タイトル抽出（最初のh1またはファイル名）
    const titleMatch = content.match(/^#\s+(.+)$/m)
    if (titleMatch) {
      title = titleMatch[1].trim()
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // ユーザーメッセージの検出
      if (
        line.startsWith('**User:**') ||
        line.startsWith('**You:**') ||
        line.startsWith('## User')
      ) {
        if (currentRole && currentContent.trim()) {
          messages.push({
            role: currentRole,
            content: currentContent.trim(),
            timestamp: new Date(),
          })
        }
        currentRole = 'user'
        currentContent = line
          .replace(/^\*\*(?:User|You):\*\*\s*/, '')
          .replace(/^##\s*User\s*/, '')
      }
      // AIメッセージの検出
      else if (
        line.startsWith('**Assistant:**') ||
        line.startsWith('**AI:**') ||
        line.startsWith('## Assistant')
      ) {
        if (currentRole && currentContent.trim()) {
          messages.push({
            role: currentRole,
            content: currentContent.trim(),
            timestamp: new Date(),
          })
        }
        currentRole = 'assistant'
        currentContent = line
          .replace(/^\*\*(?:Assistant|AI):\*\*\s*/, '')
          .replace(/^##\s*Assistant\s*/, '')
      }
      // コンテンツの継続
      else if (currentRole) {
        if (currentContent) currentContent += '\n'
        currentContent += line
      }
    }

    // 最後のメッセージを追加
    if (currentRole && currentContent.trim()) {
      messages.push({
        role: currentRole,
        content: currentContent.trim(),
        timestamp: new Date(),
      })
    }

    return {
      id: `cursor-chat-${Date.now()}-${fileHash.substring(0, 8)}`,
      title,
      timestamp: new Date(),
      messages,
      metadata: {
        source: 'cursor-chat-export',
        exportDate: new Date(),
        originalFormat: 'markdown',
        messageCount: messages.length,
        estimatedDuration: messages.length * 2, // 概算: 1メッセージ2分
      },
    }
  }

  /**
   * テキストエクスポートの解析
   */
  private async parseTextExport(
    content: string,
    fileName: string,
    fileHash: string
  ): Promise<CursorChatExport> {
    // テキスト形式の簡易解析
    const lines = content.split('\n').filter(line => line.trim())
    const messages: CursorChatExport['messages'] = []

    let isUserMessage = true
    for (let i = 0; i < lines.length; i += 2) {
      const content1 = lines[i]
      const content2 = lines[i + 1]

      if (content1) {
        messages.push({
          role: isUserMessage ? 'user' : 'assistant',
          content: content1,
          timestamp: new Date(),
        })
      }

      if (content2) {
        messages.push({
          role: isUserMessage ? 'assistant' : 'user',
          content: content2,
          timestamp: new Date(),
        })
      }

      isUserMessage = !isUserMessage
    }

    return {
      id: `cursor-chat-${Date.now()}-${fileHash.substring(0, 8)}`,
      title: fileName.replace(/\.(md|txt|json)$/, ''),
      timestamp: new Date(),
      messages,
      metadata: {
        source: 'cursor-chat-export',
        exportDate: new Date(),
        originalFormat: 'text',
        messageCount: messages.length,
      },
    }
  }

  /**
   * JSONエクスポートの解析
   */
  private async parseJsonExport(
    content: string,
    fileName: string,
    fileHash: string
  ): Promise<CursorChatExport> {
    const data = JSON.parse(content)

    // 一般的なChatエクスポートJSON形式に対応
    const messages = (data.messages || data.conversation || []).map(
      (msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content || msg.text || msg.message || '',
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      })
    )

    return {
      id: `cursor-chat-${Date.now()}-${fileHash.substring(0, 8)}`,
      title: data.title || fileName.replace(/\.json$/, ''),
      timestamp: new Date(),
      messages,
      metadata: {
        source: 'cursor-chat-export',
        exportDate: new Date(),
        originalFormat: 'json',
        messageCount: messages.length,
      },
    }
  }

  /**
   * チャットデータを統一データベースに保存
   */
  private async storeChatData(
    chatData: CursorChatExport,
    fileHash: string
  ): Promise<void> {
    const sessionData = {
      id: chatData.id,
      title: chatData.title,
      startTime: chatData.timestamp,
      messages: chatData.messages.map((msg, index) => ({
        id: `${chatData.id}-msg-${index}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp,
      })),
      tags: ['Cursor Chat', 'エクスポート', '手動インポート'],
      metadata: {
        source: chatData.metadata.source,
        exportDate: chatData.metadata.exportDate.toISOString(),
        originalFormat: chatData.metadata.originalFormat,
        messageCount: chatData.metadata.messageCount,
        estimatedDuration: chatData.metadata.estimatedDuration,
        fileHash,
        description: `${chatData.messages.length}件のメッセージを含むCursorからのエクスポートチャット`,
        importDate: new Date().toISOString(),
      },
    }

    // セッションを統一データベースに保存
    await this.chatHistoryService.createSession(sessionData)
  }

  /**
   * ファイルハッシュ計算（重複チェック用）
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath)
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16)
  }

  /**
   * インポート統計情報取得
   */
  async getImportStats(): Promise<{
    totalImported: number
    totalMessages: number
    latestImport: Date | null
    sources: string[]
  }> {
    const searchResult = await this.chatHistoryService.searchSessions({
      pageSize: 1000,
      page: 1,
    })

    const importedSessions = searchResult.sessions.filter(
      s => s.metadata?.source === 'cursor-chat-export'
    )

    const totalMessages = importedSessions.reduce(
      (sum: number, session) => sum + (session.messages?.length || 0),
      0
    )

    const importDates = importedSessions
      .map(s => s.metadata?.importDate)
      .filter((d): d is string => typeof d === 'string')
      .map(d => new Date(d))

    return {
      totalImported: importedSessions.length,
      totalMessages,
      latestImport:
        importDates.length > 0
          ? new Date(Math.max(...importDates.map(d => d.getTime())))
          : null,
      sources: ['markdown', 'text', 'json'],
    }
  }
}

export default CursorChatImportService
