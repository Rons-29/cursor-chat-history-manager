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

    // 事前にファイル内容を読み込んでセッション情報を取得
    const content = await fs.readFile(filePath, 'utf-8')
    const fileHash = await this.calculateFileHash(filePath)

    // 仮のセッションデータを作成して重複チェック用のメタデータを取得
    let tempChatData: CursorChatExport | null = null

    switch (ext) {
      case '.md':
        tempChatData = await this.parseMarkdownExport(
          content,
          fileName,
          fileHash
        )
        break
      case '.txt':
        tempChatData = await this.parseTextExport(content, fileName, fileHash)
        break
      case '.json':
        tempChatData = await this.parseJsonExport(content, fileName, fileHash)
        break
      default:
        throw new Error(`Unsupported file format: ${ext}`)
    }

    if (!tempChatData) {
      return false
    }

    // 直接セッション検索による重複チェック
    console.log(
      `🔍 重複チェック開始: ${fileName} (タイトル: "${tempChatData.title}")`
    )
    try {
      const searchResults = await this.chatHistoryService.searchSessions({
        keyword: tempChatData.title,
        page: 1,
        pageSize: 20,
      })

      console.log(
        `📊 検索結果: ${searchResults.sessions.length}件のセッションが見つかりました`
      )

      // より詳細な重複チェック
      for (const existingSession of searchResults.sessions) {
        console.log(
          `🔍 セッション比較中: ${existingSession.id} - "${existingSession.title}"`
        )
        if (await this.isDuplicateSession(existingSession, tempChatData)) {
          console.log(
            `⏭️  スキップ: ${fileName} (重複セッション検出 - 既存ID: ${existingSession.id})`
          )
          return false
        }
      }
      console.log(`✅ 重複なし: ${fileName} をインポートします`)
    } catch (error) {
      console.warn(`検索による重複チェックに失敗: ${error}`)
      // フォールバック: ファイルハッシュベースの従来の方式
      const sessionId = `cursor-chat-${fileHash}`
      console.log(`🔄 フォールバック重複チェック: ID=${sessionId}`)
      try {
        const existingSession =
          await this.chatHistoryService.getSession(sessionId)
        if (existingSession) {
          console.log(
            `⏭️  スキップ: ${fileName} (既にインポート済み - ID: ${sessionId})`
          )
          return false
        }
      } catch (fallbackError) {
        // セッションが見つからない場合はインポート可能
        console.log(`✅ フォールバック確認完了: ${fileName} をインポートします`)
      }
    }

    // 重複なしの場合はインポート実行
    await this.storeChatData(tempChatData, fileHash)
    console.log(
      `✅ インポート完了: ${fileName} (${tempChatData.messages.length}メッセージ)`
    )
    return true
  }

  /**
   * 単一ファイルの処理（public メソッド）
   * manual-import APIから呼び出されるメソッド
   */
  async processSingleFile(filePath: string, format: 'json' | 'markdown' | 'text'): Promise<{
    imported: number
    skipped: number
    errors: string[]
  }> {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }

    try {
      const imported = await this.importSingleFile(filePath)
      if (imported) {
        results.imported++
      } else {
        results.skipped++
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      results.errors.push(`${path.basename(filePath)}: ${errorMessage}`)
    }

    return results
  }

  /**
   * セッション重複判定（詳細比較）
   */
  private async isDuplicateSession(
    existingSession: any,
    newChatData: CursorChatExport
  ): Promise<boolean> {
    console.log(
      `🔎 重複判定詳細: 既存="${existingSession.title}" vs 新規="${newChatData.title}"`
    )

    // 1. タイトルの完全一致チェック
    if (existingSession.title === newChatData.title) {
      console.log(`✅ タイトル一致: "${existingSession.title}"`)
      // 2. メッセージ数の一致チェック
      const existingMsgCount = existingSession.messages?.length || 0
      const newMsgCount = newChatData.messages.length
      console.log(
        `📊 メッセージ数比較: 既存=${existingMsgCount} vs 新規=${newMsgCount}`
      )

      if (existingMsgCount === newMsgCount) {
        console.log(`✅ メッセージ数一致: ${existingMsgCount}件`)
        // 3. 最初と最後のメッセージ内容の一致チェック（高速化のため）
        if (existingMsgCount > 0 && newMsgCount > 0) {
          const existingFirst = existingSession.messages[0]?.content || ''
          const existingLast =
            existingSession.messages[existingMsgCount - 1]?.content || ''
          const newFirst = newChatData.messages[0]?.content || ''
          const newLast = newChatData.messages[newMsgCount - 1]?.content || ''

          console.log(
            `🔤 内容比較 - 最初: "${existingFirst.slice(0, 50)}..." vs "${newFirst.slice(0, 50)}..."`
          )
          console.log(
            `🔤 内容比較 - 最後: "${existingLast.slice(0, 50)}..." vs "${newLast.slice(0, 50)}..."`
          )

          if (existingFirst === newFirst && existingLast === newLast) {
            console.log(`🚨 重複検出: タイトル・メッセージ数・内容が一致`)
            return true // 重複と判定
          }
        }
      }
    }

    // 4. メタデータベースの重複チェック
    if (existingSession.metadata?.source === 'cursor-chat-export') {
      console.log(`🏷️ メタデータソース一致: cursor-chat-export`)
      if (
        existingSession.metadata?.messageCount ===
        newChatData.metadata.messageCount
      ) {
        console.log(
          `📊 メタデータメッセージ数一致: ${existingSession.metadata.messageCount}`
        )
        // メッセージ数が同じかつソースが同じ場合、内容の類似度をチェック
        const similarity = this.calculateContentSimilarity(
          existingSession,
          newChatData
        )
        console.log(`📈 内容類似度: ${(similarity * 100).toFixed(1)}%`)
        if (similarity > 0.9) {
          console.log(`🚨 重複検出: 類似度90%超え`)
          return true
        }
      }
    }

    console.log(`✅ 重複なし: 異なるセッションです`)
    return false // 重複ではない
  }

  /**
   * セッション内容の類似度計算（簡易版）
   */
  private calculateContentSimilarity(
    existingSession: any,
    newChatData: CursorChatExport
  ): number {
    if (!existingSession.messages || !newChatData.messages) {
      return 0
    }

    const existingContent = existingSession.messages
      .map((msg: any) => msg.content || '')
      .join(' ')
      .toLowerCase()

    const newContent = newChatData.messages
      .map(msg => msg.content)
      .join(' ')
      .toLowerCase()

    // 簡易的な類似度計算（共通部分の割合）
    const existingWords = existingContent
      .split(/\s+/)
      .filter((word: string) => word.trim().length > 0)
    const newWords = newContent
      .split(/\s+/)
      .filter((word: string) => word.trim().length > 0)

    const existingSet = new Set(existingWords)
    const newSet = new Set(newWords)

    const intersection = existingWords.filter((word: string) =>
      newSet.has(word)
    )
    const union = [...new Set([...existingWords, ...newWords])]

    return union.length > 0 ? intersection.length / union.length : 0
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
      id: `cursor-chat-${fileHash}`,
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
      id: `cursor-chat-${fileHash}`,
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
      id: `cursor-chat-${fileHash}`,
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
