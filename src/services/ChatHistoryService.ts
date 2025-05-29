import { v4 as uuidv4 } from 'uuid'
import { format, isAfter, isBefore, parseISO } from 'date-fns'
import fs from 'fs-extra'
import path from 'path'
import {
  ChatMessage,
  ChatSession,
  ChatHistoryFilter,
  ChatHistorySearchResult,
  ChatHistoryConfig,
  ChatHistoryStats,
} from '../types/index.js'

export class ChatHistoryService {
  private config: ChatHistoryConfig
  private sessionsPath: string
  private indexPath: string

  constructor(config: ChatHistoryConfig) {
    this.config = {
      maxSessions: 1000,
      maxMessagesPerSession: 500,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24,
      ...config,
    }

    this.sessionsPath = path.join(this.config.storagePath, 'sessions')
    this.indexPath = path.join(this.config.storagePath, 'index.json')
  }

  async initialize(): Promise<void> {
    await this.initializeStorage()
  }

  private async initializeStorage(): Promise<void> {
    await fs.ensureDir(this.sessionsPath)

    if (!(await fs.pathExists(this.indexPath))) {
      await this.saveIndex([])
    }
  }

  private async loadIndex(): Promise<string[]> {
    try {
      const indexData = await fs.readJson(this.indexPath)
      return indexData.sessions || []
    } catch (error) {
      console.warn('インデックスファイルの読み込みに失敗しました:', error)
      return []
    }
  }

  private async saveIndex(sessionIds: string[]): Promise<void> {
    const indexData = {
      sessions: sessionIds,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    }
    await fs.writeJson(this.indexPath, indexData, { spaces: 2 })
  }

  private getSessionFilePath(sessionId: string): string {
    return path.join(this.sessionsPath, `${sessionId}.json`)
  }

  /**
   * 新しいチャットセッションを作成
   */
  async createSession(
    title?: string,
    metadata?: ChatSession['metadata']
  ): Promise<ChatSession> {
    const session: ChatSession = {
      id: uuidv4(),
      title: title || `セッション ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      startTime: new Date(),
      messages: [],
      metadata: {
        totalMessages: 0,
        ...metadata,
      },
    }

    await this.saveSession(session)

    const sessionIds = await this.loadIndex()
    sessionIds.push(session.id)
    await this.saveIndex(sessionIds)

    return session
  }

  /**
   * セッションにメッセージを追加
   */
  async addMessage(
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error(`セッション ${sessionId} が見つかりません`)
    }

    const newMessage: ChatMessage = {
      id: uuidv4(),
      timestamp: new Date(),
      ...message,
      metadata: {
        sessionId,
        ...message.metadata,
      },
    }

    session.messages.push(newMessage)
    session.metadata = {
      ...session.metadata,
      totalMessages: session.messages.length,
    }

    // メッセージ数制限チェック
    if (
      this.config.maxMessagesPerSession &&
      session.messages.length > this.config.maxMessagesPerSession
    ) {
      session.messages = session.messages.slice(
        -this.config.maxMessagesPerSession
      )
    }

    await this.saveSession(session)
    return newMessage
  }

  /**
   * セッションを取得
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const sessionPath = this.getSessionFilePath(sessionId)
      if (!(await fs.pathExists(sessionPath))) {
        return null
      }

      const sessionData = await fs.readJson(sessionPath)
      // 日付文字列をDateオブジェクトに変換
      sessionData.startTime = new Date(sessionData.startTime)
      if (sessionData.endTime) {
        sessionData.endTime = new Date(sessionData.endTime)
      }
      sessionData.messages.forEach((msg: any) => {
        msg.timestamp = new Date(msg.timestamp)
      })

      return sessionData
    } catch (error) {
      console.error(`セッション ${sessionId} の読み込みエラー:`, error)
      return null
    }
  }

  /**
   * セッションを保存
   */
  private async saveSession(session: ChatSession): Promise<void> {
    const sessionPath = this.getSessionFilePath(session.id)
    await fs.writeJson(sessionPath, session, { spaces: 2 })
  }

  /**
   * セッションを検索
   */
  async searchSessions(
    filter: ChatHistoryFilter = {}
  ): Promise<ChatHistorySearchResult> {
    const sessionIds = await this.loadIndex()
    const limit = filter.limit || 20
    const offset = filter.offset || 0

    let filteredSessions: ChatSession[] = []

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId)
      if (!session) continue

      if (this.matchesFilter(session, filter)) {
        filteredSessions.push(session)
      }
    }

    // 日付でソート（新しい順）
    filteredSessions.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    )

    const totalCount = filteredSessions.length
    const paginatedSessions = filteredSessions.slice(offset, offset + limit)

    return {
      sessions: paginatedSessions,
      totalCount,
      hasMore: offset + limit < totalCount,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(totalCount / limit),
    }
  }

  private matchesFilter(
    session: ChatSession,
    filter: ChatHistoryFilter
  ): boolean {
    // セッションIDフィルター
    if (filter.sessionId && session.id !== filter.sessionId) {
      return false
    }

    // プロジェクトIDフィルター
    if (filter.projectId && session.metadata?.projectId !== filter.projectId) {
      return false
    }

    // ユーザーIDフィルター
    if (filter.userId && session.metadata?.userId !== filter.userId) {
      return false
    }

    // 日付範囲フィルター
    if (filter.startDate && isBefore(session.startTime, filter.startDate)) {
      return false
    }
    if (filter.endDate && isAfter(session.startTime, filter.endDate)) {
      return false
    }

    // タグフィルター
    if (filter.tags && filter.tags.length > 0) {
      const sessionTags = session.metadata?.tags || []
      if (!filter.tags.some(tag => sessionTags.includes(tag))) {
        return false
      }
    }

    // キーワード検索
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase()
      const titleMatch = session.title?.toLowerCase().includes(keyword)
      const messageMatch = session.messages.some(msg =>
        msg.content.toLowerCase().includes(keyword)
      )
      if (!titleMatch && !messageMatch) {
        return false
      }
    }

    // ロールフィルター
    if (filter.role) {
      const hasRole = session.messages.some(msg => msg.role === filter.role)
      if (!hasRole) {
        return false
      }
    }

    return true
  }

  /**
   * セッションを削除
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionPath = this.getSessionFilePath(sessionId)
      if (await fs.pathExists(sessionPath)) {
        await fs.remove(sessionPath)
      }

      const sessionIds = await this.loadIndex()
      const updatedIds = sessionIds.filter(id => id !== sessionId)
      await this.saveIndex(updatedIds)

      return true
    } catch (error) {
      console.error(`セッション ${sessionId} の削除エラー:`, error)
      return false
    }
  }

  /**
   * セッションを更新
   */
  async updateSession(
    sessionId: string,
    updates: Partial<ChatSession>
  ): Promise<ChatSession | null> {
    const session = await this.getSession(sessionId)
    if (!session) {
      return null
    }

    const updatedSession = {
      ...session,
      ...updates,
      id: session.id, // IDは変更不可
      messages: updates.messages || session.messages,
    }

    await this.saveSession(updatedSession)
    return updatedSession
  }

  /**
   * 統計情報を取得
   */
  async getStats(): Promise<ChatHistoryStats> {
    const sessionIds = await this.loadIndex()
    let totalMessages = 0
    let oldestSession: Date | undefined
    let newestSession: Date | undefined

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId)
      if (!session) continue

      totalMessages += session.messages.length

      if (!oldestSession || session.startTime < oldestSession) {
        oldestSession = session.startTime
      }
      if (!newestSession || session.startTime > newestSession) {
        newestSession = session.startTime
      }
    }

    // ストレージサイズを計算
    let storageSize = 0
    try {
      const stats = await fs.stat(this.config.storagePath)
      storageSize = await this.calculateDirectorySize(this.config.storagePath)
    } catch (error) {
      console.warn('ストレージサイズの計算に失敗しました:', error)
    }

    return {
      totalSessions: sessionIds.length,
      totalMessages,
      averageMessagesPerSession:
        sessionIds.length > 0 ? totalMessages / sessionIds.length : 0,
      oldestSession,
      newestSession,
      storageSize,
    }
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let size = 0
    const items = await fs.readdir(dirPath)

    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stats = await fs.stat(itemPath)

      if (stats.isDirectory()) {
        size += await this.calculateDirectorySize(itemPath)
      } else {
        size += stats.size
      }
    }

    return size
  }

  /**
   * 古いセッションをクリーンアップ
   */
  async cleanup(): Promise<number> {
    if (!this.config.autoCleanup || !this.config.cleanupDays) {
      return 0
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanupDays)

    const sessionIds = await this.loadIndex()
    let deletedCount = 0

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId)
      if (session && session.startTime < cutoffDate) {
        await this.deleteSession(sessionId)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * セッションデータをインポート
   */
  async importSessions(
    filePath: string,
    options: {
      overwrite?: boolean
      skipDuplicates?: boolean
      validateData?: boolean
    } = {}
  ): Promise<{
    imported: number
    skipped: number
    errors: string[]
  }> {
    const {
      overwrite = false,
      skipDuplicates = true,
      validateData = true,
    } = options
    const result = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    }

    try {
      // ファイルの存在確認
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`インポートファイルが見つかりません: ${filePath}`)
      }

      // ファイル拡張子による処理分岐
      const ext = path.extname(filePath).toLowerCase()
      let sessionsData: ChatSession[] = []

      if (ext === '.json') {
        const data = await fs.readJson(filePath)

        // 単一セッションか複数セッションかを判定
        if (Array.isArray(data)) {
          sessionsData = data
        } else if (data.sessions && Array.isArray(data.sessions)) {
          // エクスポート形式の場合
          sessionsData = data.sessions
        } else if (data.id && data.messages) {
          // 単一セッション形式
          sessionsData = [data]
        } else {
          throw new Error('不正なJSONフォーマットです')
        }
      } else {
        throw new Error(`サポートされていないファイル形式: ${ext}`)
      }

      // 既存のセッションIDを取得
      const existingSessionIds = await this.loadIndex()
      const existingIds = new Set(existingSessionIds)

      // 各セッションをインポート
      for (const sessionData of sessionsData) {
        try {
          // データ検証
          if (validateData && !this.validateSessionData(sessionData)) {
            result.errors.push(
              `無効なセッションデータ: ${sessionData.id || 'ID不明'}`
            )
            continue
          }

          // 日付文字列をDateオブジェクトに変換
          const session: ChatSession = {
            ...sessionData,
            startTime: new Date(sessionData.startTime),
            endTime: sessionData.endTime
              ? new Date(sessionData.endTime)
              : undefined,
            messages: sessionData.messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          }

          // 重複チェック
          if (existingIds.has(session.id)) {
            if (skipDuplicates && !overwrite) {
              result.skipped++
              continue
            }

            if (!overwrite) {
              // 新しいIDを生成
              session.id = uuidv4()
            }
          }

          // セッションを保存
          await this.saveSession(session)

          // インデックスに追加（新しいIDの場合のみ）
          if (!existingIds.has(session.id)) {
            existingSessionIds.push(session.id)
            existingIds.add(session.id)
          }

          result.imported++
        } catch (error) {
          result.errors.push(
            `セッション ${sessionData.id || 'ID不明'} のインポートエラー: ${error}`
          )
        }
      }

      // インデックスを更新
      await this.saveIndex(existingSessionIds)

      return result
    } catch (error) {
      result.errors.push(`インポート処理エラー: ${error}`)
      return result
    }
  }

  /**
   * セッションデータの検証
   */
  private validateSessionData(data: any): boolean {
    if (!data || typeof data !== 'object') return false
    if (!data.id || typeof data.id !== 'string') return false
    if (!data.title || typeof data.title !== 'string') return false
    if (!data.startTime) return false
    if (!Array.isArray(data.messages)) return false

    // メッセージの検証
    for (const msg of data.messages) {
      if (!msg.id || typeof msg.id !== 'string') return false
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role))
        return false
      if (!msg.content || typeof msg.content !== 'string') return false
      if (!msg.timestamp) return false
    }

    return true
  }

  /**
   * バックアップファイルからの復元
   */
  async restoreFromBackup(backupPath: string): Promise<{
    restored: number
    errors: string[]
  }> {
    const result = {
      restored: 0,
      errors: [] as string[],
    }

    try {
      // 現在のデータをクリア
      const sessionIds = await this.loadIndex()
      for (const sessionId of sessionIds) {
        const sessionPath = this.getSessionFilePath(sessionId)
        if (await fs.pathExists(sessionPath)) {
          await fs.remove(sessionPath)
        }
      }
      await this.saveIndex([])

      // バックアップからインポート
      const importResult = await this.importSessions(backupPath, {
        overwrite: true,
        skipDuplicates: false,
        validateData: true,
      })

      result.restored = importResult.imported
      result.errors = importResult.errors

      return result
    } catch (error) {
      result.errors.push(`復元処理エラー: ${error}`)
      return result
    }
  }

  /**
   * 手動バックアップの作成
   */
  async createBackup(backupPath?: string): Promise<{
    backupPath: string
    sessionCount: number
    size: number
  }> {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const defaultBackupPath = path.join(
      this.config.storagePath,
      'backups',
      `backup_${timestamp}.json`
    )

    const finalBackupPath = backupPath || defaultBackupPath

    // バックアップディレクトリを作成
    await fs.ensureDir(path.dirname(finalBackupPath))

    // 全セッションを取得
    const sessionIds = await this.loadIndex()
    const sessions: ChatSession[] = []

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId)
      if (session) {
        sessions.push(session)
      }
    }

    // バックアップデータを作成
    const backupData = {
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        sessionCount: sessions.length,
        totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
      },
      sessions,
    }

    // バックアップファイルを保存
    await fs.writeJson(finalBackupPath, backupData, { spaces: 2 })

    // ファイルサイズを取得
    const stats = await fs.stat(finalBackupPath)

    return {
      backupPath: finalBackupPath,
      sessionCount: sessions.length,
      size: stats.size,
    }
  }

  /**
   * 自動バックアップの実行
   */
  async performAutoBackup(): Promise<boolean> {
    if (!this.config.enableBackup) {
      return false
    }

    try {
      const backupDir = path.join(this.config.storagePath, 'backups')
      await fs.ensureDir(backupDir)

      // 最後のバックアップ時刻をチェック
      const lastBackupPath = path.join(backupDir, 'last_backup.json')
      let shouldBackup = true

      if (await fs.pathExists(lastBackupPath)) {
        const lastBackupInfo = await fs.readJson(lastBackupPath)
        const lastBackupTime = new Date(lastBackupInfo.timestamp)
        const hoursSinceLastBackup =
          (Date.now() - lastBackupTime.getTime()) / (1000 * 60 * 60)

        shouldBackup =
          hoursSinceLastBackup >= (this.config.backupInterval || 24)
      }

      if (!shouldBackup) {
        return false
      }

      // バックアップを作成
      const result = await this.createBackup()

      // 最後のバックアップ情報を更新
      await fs.writeJson(lastBackupPath, {
        timestamp: new Date().toISOString(),
        backupPath: result.backupPath,
        sessionCount: result.sessionCount,
        size: result.size,
      })

      // 古いバックアップをクリーンアップ
      await this.cleanupOldBackups()

      return true
    } catch (error) {
      console.error('自動バックアップエラー:', error)
      return false
    }
  }

  /**
   * 古いバックアップファイルのクリーンアップ
   */
  private async cleanupOldBackups(): Promise<void> {
    const backupDir = path.join(this.config.storagePath, 'backups')
    const maxBackups = 10 // 最大保持バックアップ数

    try {
      const files = await fs.readdir(backupDir)
      const backupFiles = files
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          stat: fs.statSync(path.join(backupDir, file)),
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime())

      // 古いバックアップを削除
      if (backupFiles.length > maxBackups) {
        const filesToDelete = backupFiles.slice(maxBackups)
        for (const file of filesToDelete) {
          await fs.remove(file.path)
        }
      }
    } catch (error) {
      console.warn('バックアップクリーンアップエラー:', error)
    }
  }

  /**
   * バックアップ一覧を取得
   */
  async getBackupList(): Promise<
    Array<{
      path: string
      name: string
      createdAt: Date
      size: number
      sessionCount?: number
    }>
  > {
    const backupDir = path.join(this.config.storagePath, 'backups')

    if (!(await fs.pathExists(backupDir))) {
      return []
    }

    try {
      const files = await fs.readdir(backupDir)
      const backupFiles = []

      for (const file of files) {
        if (file.startsWith('backup_') && file.endsWith('.json')) {
          const filePath = path.join(backupDir, file)
          const stats = await fs.stat(filePath)

          // バックアップファイルのメタデータを読み取り
          let sessionCount: number | undefined
          try {
            const backupData = await fs.readJson(filePath)
            sessionCount = backupData.metadata?.sessionCount
          } catch {
            // メタデータ読み取りエラーは無視
          }

          backupFiles.push({
            path: filePath,
            name: file,
            createdAt: stats.mtime,
            size: stats.size,
            sessionCount,
          })
        }
      }

      // 作成日時でソート（新しい順）
      return backupFiles.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
    } catch (error) {
      console.error('バックアップ一覧取得エラー:', error)
      return []
    }
  }
}
