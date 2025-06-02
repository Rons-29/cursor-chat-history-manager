import fs from 'fs-extra'
import path from 'path'
import { Logger } from '../server/utils/Logger.js'

// ロガーインスタンス作成
const logger = new Logger({ logPath: './logs', level: 'info' })

/**
 * Cursor設定インターフェース
 */
export interface CursorSettings {
  enabled: boolean
  monitorPath: string
  scanInterval: number
  maxSessions: number
  autoImport: boolean
  includeMetadata: boolean
}

/**
 * 設定ファイル構造
 */
interface SettingsFile {
  cursor: CursorSettings
  general?: Record<string, any>
  security?: Record<string, any>
  backup?: Record<string, any>
  version: string
  lastUpdated: string
}

/**
 * 設定管理サービス
 *
 * 機能:
 * - 設定の読み込み・保存
 * - 設定ファイルの管理
 * - バリデーション
 * - バックアップ機能
 */
export class SettingsService {
  private readonly settingsDir: string
  private readonly settingsFile: string
  private readonly backupDir: string
  private readonly currentVersion = '1.0.0'

  private readonly defaultCursorSettings: CursorSettings = {
    enabled: true,
    monitorPath:
      '/Users/shirokki22/Library/Application Support/Cursor/User/workspaceStorage',
    scanInterval: 30,
    maxSessions: 1000,
    autoImport: true,
    includeMetadata: false,
  }

  constructor() {
    this.settingsDir = path.join(process.cwd(), 'data', 'settings')
    this.settingsFile = path.join(this.settingsDir, 'settings.json')
    this.backupDir = path.join(this.settingsDir, 'backups')
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    try {
      // ディレクトリ作成
      await fs.ensureDir(this.settingsDir)
      await fs.ensureDir(this.backupDir)

      // 設定ファイルが存在しない場合は作成
      if (!(await fs.pathExists(this.settingsFile))) {
        await this.createDefaultSettings()
      }

      logger.info('SettingsService initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize SettingsService:', error)
      throw new Error('設定サービスの初期化に失敗しました')
    }
  }

  /**
   * デフォルト設定ファイルの作成
   */
  private async createDefaultSettings(): Promise<void> {
    const defaultSettings: SettingsFile = {
      cursor: this.defaultCursorSettings,
      version: this.currentVersion,
      lastUpdated: new Date().toISOString(),
    }

    await fs.writeJson(this.settingsFile, defaultSettings, { spaces: 2 })
    logger.info('Default settings file created')
  }

  /**
   * 設定ファイル全体の読み込み
   */
  async loadSettings(): Promise<SettingsFile> {
    try {
      if (!(await fs.pathExists(this.settingsFile))) {
        await this.createDefaultSettings()
      }

      const settings = (await fs.readJson(this.settingsFile)) as SettingsFile

      // バージョンチェックとマイグレーション
      if (settings.version !== this.currentVersion) {
        return await this.migrateSettings(settings)
      }

      return settings
    } catch (error) {
      logger.error('Failed to load settings:', error)
      // エラー時はデフォルト設定を返す
      return {
        cursor: this.defaultCursorSettings,
        version: this.currentVersion,
        lastUpdated: new Date().toISOString(),
      }
    }
  }

  /**
   * Cursor設定の読み込み
   */
  async loadCursorSettings(): Promise<CursorSettings> {
    const settings = await this.loadSettings()
    return { ...this.defaultCursorSettings, ...settings.cursor }
  }

  /**
   * Cursor設定の保存
   */
  async saveCursorSettings(cursorSettings: CursorSettings): Promise<void> {
    try {
      // バリデーション
      this.validateCursorSettings(cursorSettings)

      // 現在の設定を読み込み
      const currentSettings = await this.loadSettings()

      // バックアップ作成
      await this.createBackup(currentSettings)

      // 新しい設定で更新
      const updatedSettings: SettingsFile = {
        ...currentSettings,
        cursor: cursorSettings,
        lastUpdated: new Date().toISOString(),
      }

      // 保存
      await fs.writeJson(this.settingsFile, updatedSettings, { spaces: 2 })

      logger.info('Cursor settings saved successfully', {
        enabled: cursorSettings.enabled,
        scanInterval: cursorSettings.scanInterval,
        maxSessions: cursorSettings.maxSessions,
      })
    } catch (error) {
      logger.error('Failed to save cursor settings:', error)
      throw new Error('Cursor設定の保存に失敗しました')
    }
  }

  /**
   * 設定のバリデーション
   */
  private validateCursorSettings(settings: CursorSettings): void {
    const errors: string[] = []

    // 必須フィールドチェック
    if (typeof settings.enabled !== 'boolean') {
      errors.push('enabled must be boolean')
    }

    if (!settings.monitorPath || typeof settings.monitorPath !== 'string') {
      errors.push('monitorPath must be non-empty string')
    }

    // 数値範囲チェック
    if (
      typeof settings.scanInterval !== 'number' ||
      settings.scanInterval < 10 ||
      settings.scanInterval > 3600
    ) {
      errors.push('scanInterval must be between 10 and 3600 seconds')
    }

    if (
      typeof settings.maxSessions !== 'number' ||
      settings.maxSessions < 100 ||
      settings.maxSessions > 10000
    ) {
      errors.push('maxSessions must be between 100 and 10000')
    }

    if (typeof settings.autoImport !== 'boolean') {
      errors.push('autoImport must be boolean')
    }

    if (typeof settings.includeMetadata !== 'boolean') {
      errors.push('includeMetadata must be boolean')
    }

    if (errors.length > 0) {
      throw new Error(`設定バリデーションエラー: ${errors.join(', ')}`)
    }
  }

  /**
   * 設定のバックアップ作成
   */
  private async createBackup(settings: SettingsFile): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFile = path.join(
        this.backupDir,
        `settings-backup-${timestamp}.json`
      )

      await fs.writeJson(backupFile, settings, { spaces: 2 })

      // 古いバックアップファイルの削除（最新10個まで保持）
      await this.cleanupOldBackups()

      logger.info('Settings backup created:', backupFile)
    } catch (error) {
      logger.warn('Failed to create settings backup:', error)
      // バックアップ失敗は致命的エラーではない
    }
  }

  /**
   * 古いバックアップファイルの削除
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir)
      const backupFiles = files
        .filter(
          file => file.startsWith('settings-backup-') && file.endsWith('.json')
        )
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stat: fs.statSync(path.join(this.backupDir, file)),
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime())

      // 最新10個を除いて削除
      const filesToDelete = backupFiles.slice(10)
      for (const file of filesToDelete) {
        await fs.remove(file.path)
        logger.info('Old backup deleted:', file.name)
      }
    } catch (error) {
      logger.warn('Failed to cleanup old backups:', error)
    }
  }

  /**
   * 設定のマイグレーション
   */
  private async migrateSettings(oldSettings: any): Promise<SettingsFile> {
    logger.info(
      `Migrating settings from version ${oldSettings.version} to ${this.currentVersion}`
    )

    // 現在は単純にデフォルト設定とマージ
    const migratedSettings: SettingsFile = {
      cursor: { ...this.defaultCursorSettings, ...oldSettings.cursor },
      general: oldSettings.general,
      security: oldSettings.security,
      backup: oldSettings.backup,
      version: this.currentVersion,
      lastUpdated: new Date().toISOString(),
    }

    // マイグレーション後の設定を保存
    await fs.writeJson(this.settingsFile, migratedSettings, { spaces: 2 })

    return migratedSettings
  }

  /**
   * 設定のリセット
   */
  async resetCursorSettings(): Promise<CursorSettings> {
    try {
      await this.saveCursorSettings(this.defaultCursorSettings)
      logger.info('Cursor settings reset to defaults')
      return this.defaultCursorSettings
    } catch (error) {
      logger.error('Failed to reset cursor settings:', error)
      throw new Error('Cursor設定のリセットに失敗しました')
    }
  }

  /**
   * 設定のエクスポート
   */
  async exportSettings(): Promise<SettingsFile> {
    return await this.loadSettings()
  }

  /**
   * 設定のインポート
   */
  async importSettings(importedSettings: Partial<SettingsFile>): Promise<void> {
    try {
      const currentSettings = await this.loadSettings()

      // バックアップ作成
      await this.createBackup(currentSettings)

      // インポートされた設定をマージ
      const mergedSettings: SettingsFile = {
        ...currentSettings,
        ...importedSettings,
        version: this.currentVersion,
        lastUpdated: new Date().toISOString(),
      }

      // Cursor設定がある場合はバリデーション
      if (importedSettings.cursor) {
        this.validateCursorSettings(importedSettings.cursor)
        mergedSettings.cursor = {
          ...this.defaultCursorSettings,
          ...importedSettings.cursor,
        }
      }

      // 保存
      await fs.writeJson(this.settingsFile, mergedSettings, { spaces: 2 })

      logger.info('Settings imported successfully')
    } catch (error) {
      logger.error('Failed to import settings:', error)
      throw new Error('設定のインポートに失敗しました')
    }
  }

  /**
   * バックアップファイル一覧の取得
   */
  async getBackupList(): Promise<
    Array<{ name: string; date: Date; size: number }>
  > {
    try {
      const files = await fs.readdir(this.backupDir)
      const backupFiles = []

      for (const file of files) {
        if (file.startsWith('settings-backup-') && file.endsWith('.json')) {
          const filePath = path.join(this.backupDir, file)
          const stat = await fs.stat(filePath)
          backupFiles.push({
            name: file,
            date: stat.mtime,
            size: stat.size,
          })
        }
      }

      return backupFiles.sort((a, b) => b.date.getTime() - a.date.getTime())
    } catch (error) {
      logger.error('Failed to get backup list:', error)
      return []
    }
  }
}
