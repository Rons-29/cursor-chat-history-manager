import fs from 'fs-extra'
import path from 'path'
import { createHash } from 'crypto'
import { Logger } from '../server/utils/Logger.js'
import type { ChatSession } from '../types/index.js'

/**
 * 増分インデックス管理サービス
 * ファイルの変更を追跡して効率的にインデックスを更新
 */
export class IncrementalIndexService {
  private indexPath: string
  private sessionDir: string
  private checksumPath: string
  private logger: Logger
  private processingQueue: Set<string> = new Set()
  private batchQueue: string[] = []
  private processingBatch = false
  
  private readonly BATCH_SIZE = 50
  private readonly BATCH_INTERVAL = 2000 // 2秒

  constructor(sessionDir: string, indexPath: string, logger: Logger) {
    this.sessionDir = sessionDir
    this.indexPath = indexPath
    this.checksumPath = path.join(path.dirname(indexPath), 'checksums.json')
    this.logger = logger
  }

  async initialize(): Promise<void> {
    await fs.ensureFile(this.indexPath)
    await fs.ensureFile(this.checksumPath)
    
    // 既存インデックスが空の場合のみ初期化
    const indexContent = await this.getIndexContent()
    if (Object.keys(indexContent).length === 0) {
      await this.writeIndex({})
    }
    
    // バッチ処理の開始
    this.startBatchProcessor()
  }

  /**
   * ファイルのチェックサムを計算
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath)
      return createHash('sha256').update(content).digest('hex')
    } catch (error) {
      return ''
    }
  }

  /**
   * 変更されたファイルを検出
   */
  async detectChangedFiles(): Promise<{
    added: string[]
    modified: string[]
    deleted: string[]
  }> {
    const result = {
      added: [] as string[],
      modified: [] as string[],
      deleted: [] as string[]
    }

    try {
      // 現在のチェックサム情報を読み込み
      const checksums = await this.getChecksums()
      const newChecksums: Record<string, string> = {}
      
      // 現在のファイル一覧を取得
      const currentFiles = await fs.readdir(this.sessionDir)
      const jsonFiles = currentFiles.filter(file => file.endsWith('.json'))
      
      // 各ファイルのチェックサムを計算
      for (const file of jsonFiles) {
        const filePath = path.join(this.sessionDir, file)
        const checksum = await this.calculateChecksum(filePath)
        newChecksums[file] = checksum
        
        if (!(file in checksums)) {
          // 新規ファイル
          result.added.push(file)
        } else if (checksums[file] !== checksum) {
          // 変更されたファイル
          result.modified.push(file)
        }
      }
      
      // 削除されたファイルを検出
      for (const file in checksums) {
        if (!(file in newChecksums)) {
          result.deleted.push(file)
        }
      }
      
      // チェックサム情報を更新
      await this.writeChecksums(newChecksums)
      
      return result
    } catch (error) {
      this.logger.error('ファイル変更検出エラー:', error)
      return result
    }
  }

  /**
   * 増分同期を実行
   */
  async performIncrementalSync(): Promise<{
    processed: number
    added: number
    modified: number
    deleted: number
    errors: string[]
  }> {
    const result = {
      processed: 0,
      added: 0,
      modified: 0,
      deleted: 0,
      errors: [] as string[]
    }

    try {
      const changes = await this.detectChangedFiles()
      const index = await this.getIndexContent()
      
      // 削除されたファイルの処理
      for (const file of changes.deleted) {
        const sessionId = path.basename(file, '.json')
        delete index[sessionId]
        result.deleted++
        result.processed++
      }
      
      // 追加・変更されたファイルの処理
      const filesToProcess = [...changes.added, ...changes.modified]
      
      for (const file of filesToProcess) {
        try {
          const sessionId = path.basename(file, '.json')
          const filePath = path.join(this.sessionDir, file)
          
          if (!(await fs.pathExists(filePath))) {
            continue
          }
          
          const sessionData = await fs.readJson(filePath)
          
          // 基本的なバリデーション
          if (!sessionData.id || !sessionData.messages) {
            result.errors.push(`無効なセッションデータ: ${sessionId}`)
            continue
          }
          
          // インデックスエントリを作成
          index[sessionId] = {
            id: sessionId,
            title: sessionData.title || '',
            tags: sessionData.tags || [],
            createdAt: new Date(sessionData.createdAt).toISOString(),
            updatedAt: new Date(sessionData.updatedAt).toISOString(),
            messageCount: sessionData.messages?.length || 0
          }
          
          if (changes.added.includes(file)) {
            result.added++
          } else {
            result.modified++
          }
          result.processed++
          
        } catch (error) {
          result.errors.push(`セッション ${file} の処理エラー: ${error}`)
        }
      }
      
      // インデックスを保存
      await this.writeIndex(index)
      
      this.logger.info('増分同期完了', {
        processed: result.processed,
        added: result.added,
        modified: result.modified,
        deleted: result.deleted,
        errors: result.errors.length
      })
      
      return result
    } catch (error) {
      this.logger.error('増分同期エラー:', error)
      result.errors.push(`同期エラー: ${error}`)
      return result
    }
  }

  /**
   * 単一ファイルをキューに追加
   */
  async queueFileForProcessing(filePath: string): Promise<void> {
    const fileName = path.basename(filePath)
    
    if (this.processingQueue.has(fileName)) {
      return // 既に処理中
    }
    
    this.processingQueue.add(fileName)
    this.batchQueue.push(fileName)
    
    // バッチサイズに達した場合は即座に処理
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.processBatch()
    }
  }

  /**
   * バッチ処理プロセッサを開始
   */
  private startBatchProcessor(): void {
    setInterval(async () => {
      if (this.batchQueue.length > 0 && !this.processingBatch) {
        await this.processBatch()
      }
    }, this.BATCH_INTERVAL)
  }

  /**
   * バッチ処理を実行
   */
  private async processBatch(): Promise<void> {
    if (this.processingBatch || this.batchQueue.length === 0) {
      return
    }
    
    this.processingBatch = true
    const batch = this.batchQueue.splice(0, this.BATCH_SIZE)
    
    try {
      const index = await this.getIndexContent()
      let updated = false
      
      for (const fileName of batch) {
        try {
          const sessionId = path.basename(fileName, '.json')
          const filePath = path.join(this.sessionDir, fileName)
          
          if (!(await fs.pathExists(filePath))) {
            // ファイルが削除された
            if (index[sessionId]) {
              delete index[sessionId]
              updated = true
            }
          } else {
            // ファイルを処理
            const sessionData = await fs.readJson(filePath)
            
            if (sessionData.id && sessionData.messages) {
              index[sessionId] = {
                id: sessionId,
                title: sessionData.title || '',
                tags: sessionData.tags || [],
                createdAt: new Date(sessionData.createdAt).toISOString(),
                updatedAt: new Date(sessionData.updatedAt).toISOString(),
                messageCount: sessionData.messages?.length || 0
              }
              updated = true
            }
          }
          
          this.processingQueue.delete(fileName)
        } catch (error) {
          this.logger.error(`バッチ処理エラー - ファイル: ${fileName}`, error)
          this.processingQueue.delete(fileName)
        }
      }
      
      if (updated) {
        await this.writeIndex(index)
      }
      
    } finally {
      this.processingBatch = false
    }
  }

  /**
   * インデックス内容を取得
   */
  private async getIndexContent(): Promise<Record<string, any>> {
    try {
      if (await fs.pathExists(this.indexPath)) {
        return await fs.readJson(this.indexPath)
      }
      return {}
    } catch (error) {
      this.logger.error('インデックス読み込みエラー:', error)
      return {}
    }
  }

  /**
   * インデックスを書き込み
   */
  private async writeIndex(content: Record<string, any>): Promise<void> {
    try {
      await fs.writeJson(this.indexPath, content, { spaces: 2 })
    } catch (error) {
      this.logger.error('インデックス書き込みエラー:', error)
      throw error
    }
  }

  /**
   * チェックサム情報を取得
   */
  private async getChecksums(): Promise<Record<string, string>> {
    try {
      if (await fs.pathExists(this.checksumPath)) {
        return await fs.readJson(this.checksumPath)
      }
      return {}
    } catch (error) {
      return {}
    }
  }

  /**
   * チェックサム情報を書き込み
   */
  private async writeChecksums(checksums: Record<string, string>): Promise<void> {
    try {
      await fs.writeJson(this.checksumPath, checksums, { spaces: 2 })
    } catch (error) {
      this.logger.error('チェックサム書き込みエラー:', error)
    }
  }

  /**
   * 統計情報を取得
   */
  async getStats(): Promise<{
    totalSessions: number
    queueSize: number
    processing: boolean
  }> {
    const index = await this.getIndexContent()
    
    return {
      totalSessions: Object.keys(index).length,
      queueSize: this.batchQueue.length,
      processing: this.processingBatch
    }
  }

  /**
   * 強制フラッシュ（キューの全処理）
   */
  async flush(): Promise<void> {
    while (this.batchQueue.length > 0 || this.processingBatch) {
      if (!this.processingBatch) {
        await this.processBatch()
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
} 