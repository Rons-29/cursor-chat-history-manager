/**
 * Cursor Chat Import API Routes
 * Cursorからエクスポートされたチャットファイルのインポート機能を提供
 */

import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from 'express'
import CursorChatImportService from '../../services/CursorChatImportService.js'
import path from 'path'

// 型安全なルートハンドラー
type AsyncRequestHandler = (req: Request, res: Response) => Promise<void>

const router = Router()

// 型安全なハンドラーラッパー
const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res)).catch(next)

// Cursor Chat Import サービスのインスタンス
let importService: CursorChatImportService | null = null

/**
 * Cursor Chat Import サービスの初期化
 */
async function initializeImportService(): Promise<CursorChatImportService> {
  if (!importService) {
    const storagePath = path.join(process.cwd(), 'data')
    const exportsDir = path.join(process.cwd(), 'exports')
    importService = new CursorChatImportService(storagePath, exportsDir)
    await importService.initialize()
  }
  return importService
}

/**
 * GET /api/cursor-chat-import/status
 * Cursor Chat Import サービスの状態確認
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    try {
      const service = await initializeImportService()
      const stats = await service.getImportStats()

      res.json({
        success: true,
        data: {
          serviceStatus: 'active',
          exportsDirectory: path.join(process.cwd(), 'exports'),
          ...stats,
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Cursor Chat Import status error:', error)
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
 * POST /api/cursor-chat-import/import-all
 * エクスポートディレクトリ内の全ファイルを一括インポート
 */
router.post(
  '/import-all',
  asyncHandler(async (req, res) => {
    try {
      const service = await initializeImportService()
      const results = await service.importAllExports()

      res.json({
        success: true,
        data: {
          message: `インポート完了: ${results.imported}件成功, ${results.skipped}件スキップ`,
          ...results,
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Cursor Chat import error:', error)
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
 * GET /api/cursor-chat-import/stats
 * インポート統計情報の取得
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    try {
      const service = await initializeImportService()
      const stats = await service.getImportStats()

      res.json({
        success: true,
        data: stats,
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Cursor Chat stats error:', error)
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
 * GET /api/cursor-chat-import/files
 * エクスポートディレクトリ内のファイル一覧
 */
router.get(
  '/files',
  asyncHandler(async (req, res) => {
    try {
      const fs = await import('fs-extra')
      const exportsDir = path.join(process.cwd(), 'exports')

      const files = await fs.default.readdir(exportsDir)
      const chatFiles = files.filter(
        f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.json')
      )

      const fileStats = await Promise.all(
        chatFiles.map(async file => {
          const filePath = path.join(exportsDir, file)
          const stat = await fs.default.stat(filePath)
          return {
            name: file,
            size: stat.size,
            modified: stat.mtime,
            extension: path.extname(file),
          }
        })
      )

      res.json({
        success: true,
        data: {
          directory: exportsDir,
          totalFiles: fileStats.length,
          files: fileStats.sort(
            (a, b) => b.modified.getTime() - a.modified.getTime()
          ),
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Cursor Chat files error:', error)
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
 * GET /api/cursor-chat-import/usage-guide
 * 使用方法ガイド
 */
router.get(
  '/usage-guide',
  asyncHandler(async (req, res) => {
    const guide = {
      title: 'Cursor Chat インポート使用方法',
      steps: [
        {
          step: 1,
          title: 'Cursorでチャットをエクスポート',
          description: 'Cursor内のチャット画面でエクスポート機能を使用',
          formats: ['Markdown (.md)', 'Text (.txt)', 'JSON (.json)'],
        },
        {
          step: 2,
          title: 'exportsディレクトリに配置',
          description: `${path.join(process.cwd(), 'exports')}にファイルを配置`,
          note: 'ファイル名は自動でタイトルとして使用されます',
        },
        {
          step: 3,
          title: 'インポート実行',
          description: 'POST /api/cursor-chat-import/import-all でインポート',
          note: '重複チェックにより同じファイルは1回のみインポートされます',
        },
        {
          step: 4,
          title: 'スマート分析版で確認',
          description:
            'ChatFlowのスマート分析版でインポートされたチャットを確認',
          features: ['自動タイトル生成', 'カテゴリ分類', '統計情報表示'],
        },
      ],
      supportedFormats: {
        markdown: {
          description: 'Markdownエクスポート形式',
          patterns: ['**User:**', '**Assistant:**', '## User', '## Assistant'],
          example: '**User:** 質問内容\n**Assistant:** 回答内容',
        },
        text: {
          description: 'プレーンテキスト形式',
          patterns: ['行ごとに交互にユーザー・AI'],
          example: '質問内容\n回答内容',
        },
        json: {
          description: 'JSON形式',
          structure:
            '{ messages: [{ role: "user|assistant", content: "..." }] }',
          example: '{"messages": [{"role": "user", "content": "質問"}]}',
        },
      },
    }

    res.json({
      success: true,
      data: guide,
      timestamp: new Date(),
    })
  })
)

export default router
