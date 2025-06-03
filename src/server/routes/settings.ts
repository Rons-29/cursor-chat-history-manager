import { Router, Request, Response, RequestHandler } from 'express'
import {
  SettingsService,
  CursorSettings,
} from '../../services/SettingsService.js'
import { Logger } from '../utils/Logger.js'

// ロガーインスタンス作成
const logger = new Logger({ logPath: './logs', level: 'info' })

const router = Router()
const settingsService = new SettingsService()

/**
 * 設定サービス初期化
 */
let isInitialized = false
const initializeService = async () => {
  if (!isInitialized) {
    await settingsService.initialize()
    isInitialized = true
  }
}

/**
 * GET /api/settings/cursor
 * Cursor設定の取得
 */
router.get('/cursor', async (req: Request, res: Response) => {
  try {
    await initializeService()

    const settings = await settingsService.loadCursorSettings()

    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    })

    logger.info('Cursor settings retrieved successfully')
  } catch (error) {
    logger.error('Failed to get cursor settings:', error)
    res.status(500).json({
      success: false,
      error: 'Cursor設定の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * POST /api/settings/cursor
 * Cursor設定の保存
 */
const saveCursorSettings: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await initializeService()

    const cursorSettings: CursorSettings = req.body

    // リクエストボディの基本チェック
    if (!cursorSettings || typeof cursorSettings !== 'object') {
      res.status(400).json({
        success: false,
        error: '無効な設定データです',
        timestamp: new Date().toISOString(),
      })
      return
    }

    await settingsService.saveCursorSettings(cursorSettings)

    res.json({
      success: true,
      message: 'Cursor設定を保存しました',
      data: cursorSettings,
      timestamp: new Date().toISOString(),
    })

    logger.info('Cursor settings saved successfully', {
      enabled: cursorSettings.enabled,
      scanInterval: cursorSettings.scanInterval,
    })
  } catch (error) {
    logger.error('Failed to save cursor settings:', error)
    res.status(500).json({
      success: false,
      error: 'Cursor設定の保存に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}

router.post('/cursor', saveCursorSettings)

/**
 * POST /api/settings/cursor/reset
 * Cursor設定のリセット
 */
router.post('/cursor/reset', async (req: Request, res: Response) => {
  try {
    await initializeService()

    const defaultSettings = await settingsService.resetCursorSettings()

    res.json({
      success: true,
      message: 'Cursor設定をデフォルト値にリセットしました',
      data: defaultSettings,
      timestamp: new Date().toISOString(),
    })

    logger.info('Cursor settings reset to defaults')
  } catch (error) {
    logger.error('Failed to reset cursor settings:', error)
    res.status(500).json({
      success: false,
      error: 'Cursor設定のリセットに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * GET /api/settings/general
 * 一般設定の取得
 */
router.get('/general', async (req: Request, res: Response) => {
  try {
    await initializeService()

    const settings = await settingsService.loadGeneralSettings()

    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    })

    logger.info('General settings retrieved successfully')
  } catch (error) {
    logger.error('Failed to get general settings:', error)
    res.status(500).json({
      success: false,
      error: '一般設定の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * POST /api/settings/general
 * 一般設定の保存
 */
const saveGeneralSettings: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await initializeService()

    const generalSettings = req.body

    // リクエストボディの基本チェック
    if (!generalSettings || typeof generalSettings !== 'object') {
      res.status(400).json({
        success: false,
        error: '無効な設定データです',
        timestamp: new Date().toISOString(),
      })
      return
    }

    await settingsService.saveGeneralSettings(generalSettings)

    res.json({
      success: true,
      message: '一般設定を保存しました',
      data: generalSettings,
      timestamp: new Date().toISOString(),
    })

    logger.info('General settings saved successfully', {
      theme: generalSettings.theme,
      language: generalSettings.language,
    })
  } catch (error) {
    logger.error('Failed to save general settings:', error)
    res.status(500).json({
      success: false,
      error: '一般設定の保存に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}

router.post('/general', saveGeneralSettings)

/**
 * GET /api/settings/export
 * 全設定のエクスポート
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    await initializeService()

    const settings = await settingsService.exportSettings()

    // ファイルダウンロードとして送信
    const filename = `chat-history-settings-${new Date().toISOString().split('T')[0]}.json`
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    res.json(settings)

    logger.info('Settings exported successfully')
  } catch (error) {
    logger.error('Failed to export settings:', error)
    res.status(500).json({
      success: false,
      error: '設定のエクスポートに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * POST /api/settings/import
 * 設定のインポート
 */
const importSettings: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await initializeService()

    const importedSettings = req.body

    if (!importedSettings || typeof importedSettings !== 'object') {
      res.status(400).json({
        success: false,
        error: '無効な設定データです',
        timestamp: new Date().toISOString(),
      })
      return
    }

    await settingsService.importSettings(importedSettings)

    res.json({
      success: true,
      message: '設定をインポートしました',
      timestamp: new Date().toISOString(),
    })

    logger.info('Settings imported successfully')
  } catch (error) {
    logger.error('Failed to import settings:', error)
    res.status(500).json({
      success: false,
      error: '設定のインポートに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}

router.post('/import', importSettings)

/**
 * GET /api/settings/backups
 * バックアップファイル一覧の取得
 */
router.get('/backups', async (req: Request, res: Response) => {
  try {
    await initializeService()

    const backups = await settingsService.getBackupList()

    res.json({
      success: true,
      data: backups,
      count: backups.length,
      timestamp: new Date().toISOString(),
    })

    logger.info('Backup list retrieved successfully')
  } catch (error) {
    logger.error('Failed to get backup list:', error)
    res.status(500).json({
      success: false,
      error: 'バックアップ一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * GET /api/settings/health
 * 設定サービスのヘルスチェック
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    await initializeService()

    // 設定ファイルの読み込みテスト
    await settingsService.loadSettings()

    res.json({
      success: true,
      status: 'healthy',
      message: '設定サービスは正常に動作しています',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Settings service health check failed:', error)
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: '設定サービスに問題があります',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
})

export default router
