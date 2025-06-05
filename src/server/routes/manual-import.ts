/**
 * Manual Import API Routes
 * ユーザーが手動でアップロードしたファイルのインポート機能を提供
 */

import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'
import CursorChatImportService from '../../services/CursorChatImportService.js'

// 型安全なルートハンドラー
type AsyncRequestHandler = (req: Request, res: Response) => Promise<void>

const router = Router()

// デバッグ用のテストエンドポイント
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Manual Import router is working!',
    timestamp: new Date(),
  })
})

// 型安全なハンドラーラッパー
const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res)).catch(next)

// アップロード設定
const uploadDir = path.join(process.cwd(), 'data', 'manual-uploads')
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.ensureDir(uploadDir)
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // セキュリティのためファイル名をハッシュ化
    const timestamp = Date.now()
    const randomString = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(file.originalname)
    cb(null, `manual-import-${timestamp}-${randomString}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB制限
    files: 10, // 最大10ファイル同時
  },
  fileFilter: (req, file, cb) => {
    // サポートされるファイル形式をチェック
    const allowedExtensions = ['.json', '.md', '.txt', '.csv']
    const ext = path.extname(file.originalname).toLowerCase()

    if (allowedExtensions.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`サポートされていないファイル形式: ${ext}`))
    }
  },
})

// インポートジョブの状態管理
interface ImportJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  files: Array<{
    originalName: string
    fileName: string
    size: number
    processed: boolean
    error?: string
  }>
  progress: {
    total: number
    processed: number
    errors: number
  }
  startTime: Date
  endTime?: Date
  results?: {
    imported: number
    skipped: number
    errors: string[]
  }
}

const importJobs = new Map<string, ImportJob>()

// Manual Import サービスのインスタンス
let importService: CursorChatImportService | null = null

/**
 * Manual Import サービスの初期化
 */
async function initializeImportService(): Promise<CursorChatImportService> {
  if (!importService) {
    const storagePath = path.join(process.cwd(), 'data')
    importService = new CursorChatImportService(storagePath, uploadDir)
    await importService.initialize()
  }
  return importService
}

/**
 * POST /api/manual-import/upload
 * ファイルアップロード（複数ファイル対応）
 */
router.post(
  '/upload',
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[]

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'アップロードされたファイルがありません',
          timestamp: new Date(),
        })
        return
      }

      // ジョブIDを生成
      const jobId = crypto.randomUUID()

      // ジョブを作成
      const job: ImportJob = {
        id: jobId,
        status: 'pending',
        files: files.map(file => ({
          originalName: file.originalname,
          fileName: file.filename,
          size: file.size,
          processed: false,
        })),
        progress: {
          total: files.length,
          processed: 0,
          errors: 0,
        },
        startTime: new Date(),
      }

      importJobs.set(jobId, job)

      res.json({
        success: true,
        data: {
          jobId,
          message: `${files.length}個のファイルをアップロードしました`,
          files: job.files.map(f => ({
            originalName: f.originalName,
            size: f.size,
          })),
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Manual import upload error:', error)
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      })
    }
  })
)

/**
 * POST /api/manual-import/process/:jobId
 * アップロードされたファイルの処理開始
 */
router.post(
  '/process/:jobId',
  asyncHandler(async (req, res) => {
    try {
      const { jobId } = req.params
      const job = importJobs.get(jobId)

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'ジョブが見つかりません',
          timestamp: new Date(),
        })
        return
      }

      if (job.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: 'このジョブは既に処理中または完了済みです',
          timestamp: new Date(),
        })
        return
      }

      // ジョブステータスを更新
      job.status = 'processing'
      importJobs.set(jobId, job)

      // バックグラウンドで処理を開始
      processImportJob(jobId).catch(error => {
        console.error(`Import job ${jobId} failed:`, error)
        const failedJob = importJobs.get(jobId)
        if (failedJob) {
          failedJob.status = 'failed'
          failedJob.endTime = new Date()
          importJobs.set(jobId, failedJob)
        }
      })

      res.json({
        success: true,
        data: {
          jobId,
          status: 'processing',
          message: 'インポート処理を開始しました',
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Manual import process error:', error)
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      })
    }
  })
)

/**
 * GET /api/manual-import/status/:jobId
 * インポートジョブのステータス取得
 */
router.get(
  '/status/:jobId',
  asyncHandler(async (req, res) => {
    try {
      const { jobId } = req.params
      const job = importJobs.get(jobId)

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'ジョブが見つかりません',
          timestamp: new Date(),
        })
        return
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          startTime: job.startTime,
          endTime: job.endTime,
          results: job.results,
          files: job.files.map(f => ({
            originalName: f.originalName,
            size: f.size,
            processed: f.processed,
            error: f.error,
          })),
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Manual import status error:', error)
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      })
    }
  })
)

/**
 * DELETE /api/manual-import/cancel/:jobId
 * インポートジョブのキャンセル
 */
router.delete(
  '/cancel/:jobId',
  asyncHandler(async (req, res) => {
    try {
      const { jobId } = req.params
      const job = importJobs.get(jobId)

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'ジョブが見つかりません',
          timestamp: new Date(),
        })
        return
      }

      if (job.status === 'completed') {
        res.status(400).json({
          success: false,
          error: '完了したジョブはキャンセルできません',
          timestamp: new Date(),
        })
        return
      }

      // ジョブを削除し、アップロードされたファイルも削除
      for (const file of job.files) {
        const filePath = path.join(uploadDir, file.fileName)
        try {
          await fs.remove(filePath)
        } catch (error) {
          console.warn(`Failed to delete file ${file.fileName}:`, error)
        }
      }

      importJobs.delete(jobId)

      res.json({
        success: true,
        data: {
          message: 'ジョブをキャンセルしました',
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Manual import cancel error:', error)
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      })
    }
  })
)

/**
 * GET /api/manual-import/jobs
 * 全インポートジョブの一覧取得
 */
router.get(
  '/jobs',
  asyncHandler(async (req, res) => {
    try {
      const jobs = Array.from(importJobs.values())
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        .slice(0, 50) // 最新50件まで

      res.json({
        success: true,
        data: {
          total: jobs.length,
          jobs: jobs.map(job => ({
            id: job.id,
            status: job.status,
            progress: job.progress,
            startTime: job.startTime,
            endTime: job.endTime,
            fileCount: job.files.length,
          })),
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Manual import jobs error:', error)
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      })
    }
  })
)

/**
 * バックグラウンドでインポートジョブを処理
 */
async function processImportJob(jobId: string): Promise<void> {
  const job = importJobs.get(jobId)
  if (!job) return

  try {
    const service = await initializeImportService()
    const importResults = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // 各ファイルを順次処理
    for (const file of job.files) {
      try {
        const filePath = path.join(uploadDir, file.fileName)

        // ファイル形式に応じて処理
        const ext = path.extname(file.originalName).toLowerCase()
        let result

        if (ext === '.json') {
          result = await service.processSingleFile(filePath, 'json')
        } else if (ext === '.md') {
          result = await service.processSingleFile(filePath, 'markdown')
        } else if (ext === '.txt') {
          result = await service.processSingleFile(filePath, 'text')
        } else {
          throw new Error(`未サポートのファイル形式: ${ext}`)
        }

        // 結果を集計
        importResults.imported += result.imported
        importResults.skipped += result.skipped
        importResults.errors.push(...result.errors)

        file.processed = true
        job.progress.processed++

        // 処理済みファイルを移動
        const processedDir = path.join(uploadDir, 'processed')
        await fs.ensureDir(processedDir)
        await fs.move(filePath, path.join(processedDir, file.fileName))
      } catch (error) {
        file.error = error instanceof Error ? error.message : String(error)
        job.progress.errors++
        importResults.errors.push(`${file.originalName}: ${file.error}`)
      }
    }

    // ジョブ完了
    job.status = 'completed'
    job.endTime = new Date()
    job.results = importResults
    importJobs.set(jobId, job)
  } catch (error) {
    job.status = 'failed'
    job.endTime = new Date()
    job.results = {
      imported: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    }
    importJobs.set(jobId, job)
  }
}

export default router
