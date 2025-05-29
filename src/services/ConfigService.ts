import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { ChatHistoryConfig, AutoSaveConfig } from '../types/index.js'

export interface CursorConfig {
  enabled?: boolean
  cursorDataPath?: string
  autoImport?: boolean
  watchInterval?: number
  importOnStartup?: boolean
}

export interface UserConfig {
  storagePath: string
  storageType: 'file' | 'database'
  maxSessions?: number
  maxMessagesPerSession?: number
  autoCleanup?: boolean
  cleanupDays?: number
  enableSearch?: boolean
  enableBackup?: boolean
  backupInterval?: number
  autoSave?: AutoSaveConfig
  cursor?: CursorConfig
  // 追加の設定項目
  excludeKeywords?: string[]
  autoSaveInterval?: number // 分単位
  maxBackupFiles?: number
  exportFormats?: ('json' | 'markdown' | 'txt')[]
  theme?: 'light' | 'dark' | 'auto'
  language?: 'ja' | 'en'
}

export class ConfigService {
  private configPath: string
  private defaultConfig: UserConfig

  constructor(configPath?: string) {
    this.configPath =
      configPath ||
      path.join(os.homedir(), '.cursor-chat-history', 'config.json')
    this.defaultConfig = {
      storagePath: path.join(os.homedir(), '.cursor-chat-history'),
      storageType: 'file' as const,
      maxSessions: 1000,
      maxMessagesPerSession: 500,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24,
      excludeKeywords: [],
      autoSaveInterval: 5,
      maxBackupFiles: 10,
      exportFormats: ['json', 'markdown', 'txt'],
      theme: 'auto',
      language: 'ja',
    }
  }

  /**
   * 設定ファイルを初期化
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(path.dirname(this.configPath))

    if (!(await fs.pathExists(this.configPath))) {
      await this.saveUserConfig(this.defaultConfig)
    }
  }

  /**
   * 設定を読み込み
   */
  async loadConfig(): Promise<UserConfig> {
    try {
      if (!(await fs.pathExists(this.configPath))) {
        return this.defaultConfig
      }

      const configData = await fs.readJson(this.configPath)

      // デフォルト値とマージ
      return {
        ...this.defaultConfig,
        ...configData,
      }
    } catch (error) {
      console.warn(
        '設定ファイルの読み込みに失敗しました。デフォルト設定を使用します:',
        error
      )
      return this.defaultConfig
    }
  }

  /**
   * UserConfig形式で設定を保存
   */
  async saveUserConfig(config: Partial<UserConfig>): Promise<void> {
    try {
      const currentConfig = await this.loadConfig()
      const newConfig = {
        ...currentConfig,
        ...config,
      }

      await fs.ensureDir(path.dirname(this.configPath))
      await fs.writeJson(this.configPath, newConfig, { spaces: 2 })
    } catch (error) {
      throw new Error(`設定の保存に失敗しました: ${error}`)
    }
  }

  /**
   * 特定の設定値を取得
   */
  async getConfigValue<K extends keyof UserConfig>(
    key: K
  ): Promise<UserConfig[K]> {
    const config = await this.loadConfig()
    return config[key]
  }

  /**
   * 特定の設定値を更新
   */
  async updateConfigValue<K extends keyof UserConfig>(
    key: K,
    value: UserConfig[K]
  ): Promise<void> {
    const config = await this.loadConfig()
    config[key] = value
    await this.saveUserConfig(config)
  }

  /**
   * 設定をデフォルトにリセット
   */
  async resetToDefault(): Promise<void> {
    await fs.remove(this.configPath)
    await this.initialize()
  }

  /**
   * 設定ファイルのパスを取得
   */
  getConfigPath(): string {
    return this.configPath
  }

  /**
   * デフォルト設定を取得
   */
  getDefaultConfig(): UserConfig {
    return { ...this.defaultConfig }
  }

  /**
   * 設定の検証
   */
  validateConfig(config: Partial<UserConfig>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (
      config.maxSessions !== undefined &&
      (config.maxSessions < 1 || config.maxSessions > 10000)
    ) {
      errors.push('maxSessions は 1 から 10000 の間で設定してください')
    }

    if (
      config.maxMessagesPerSession !== undefined &&
      (config.maxMessagesPerSession < 1 || config.maxMessagesPerSession > 1000)
    ) {
      errors.push('maxMessagesPerSession は 1 から 1000 の間で設定してください')
    }

    if (
      config.cleanupDays !== undefined &&
      (config.cleanupDays < 1 || config.cleanupDays > 365)
    ) {
      errors.push('cleanupDays は 1 から 365 の間で設定してください')
    }

    if (
      config.backupInterval !== undefined &&
      (config.backupInterval < 1 || config.backupInterval > 168)
    ) {
      errors.push('backupInterval は 1 から 168 時間の間で設定してください')
    }

    if (
      config.autoSaveInterval !== undefined &&
      (config.autoSaveInterval < 1 || config.autoSaveInterval > 60)
    ) {
      errors.push('autoSaveInterval は 1 から 60 分の間で設定してください')
    }

    if (
      config.maxBackupFiles !== undefined &&
      (config.maxBackupFiles < 1 || config.maxBackupFiles > 100)
    ) {
      errors.push('maxBackupFiles は 1 から 100 の間で設定してください')
    }

    if (
      config.theme !== undefined &&
      !['light', 'dark', 'auto'].includes(config.theme)
    ) {
      errors.push('theme は light, dark, auto のいずれかを設定してください')
    }

    if (
      config.language !== undefined &&
      !['ja', 'en'].includes(config.language)
    ) {
      errors.push('language は ja または en を設定してください')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 設定のエクスポート
   */
  async exportConfig(exportPath: string): Promise<void> {
    const config = await this.loadConfig()
    await fs.writeJson(exportPath, config, { spaces: 2 })
  }

  /**
   * 設定のインポート
   */
  async importConfig(
    importPath: string,
    validate: boolean = true
  ): Promise<{ success: boolean; errors: string[] }> {
    try {
      if (!(await fs.pathExists(importPath))) {
        return {
          success: false,
          errors: ['インポートファイルが見つかりません'],
        }
      }

      const importedConfig = await fs.readJson(importPath)

      if (validate) {
        const validation = this.validateConfig(importedConfig)
        if (!validation.valid) {
          return { success: false, errors: validation.errors }
        }
      }

      await this.saveUserConfig(importedConfig)
      return { success: true, errors: [] }
    } catch (error) {
      return {
        success: false,
        errors: [`設定のインポートに失敗しました: ${error}`],
      }
    }
  }

  /**
   * ChatHistoryConfig形式で設定を取得
   */
  async getConfig(): Promise<ChatHistoryConfig> {
    const userConfig = await this.loadConfig()
    
    // UserConfigをChatHistoryConfigに変換
    return {
      storagePath: userConfig.storagePath,
      storageType: userConfig.storageType,
      maxSessions: userConfig.maxSessions,
      maxMessagesPerSession: userConfig.maxMessagesPerSession,
      autoCleanup: userConfig.autoCleanup,
      cleanupDays: userConfig.cleanupDays,
      enableSearch: userConfig.enableSearch,
      enableBackup: userConfig.enableBackup,
      backupInterval: userConfig.backupInterval,
      autoSave: userConfig.autoSave || {
        enabled: true,
        interval: userConfig.autoSaveInterval || 5,
        watchDirectories: [],
        filePatterns: ['*.md', '*.ts', '*.js', '*.tsx', '*.jsx'],
        maxSessionDuration: 2 * 60 * 60 * 1000, // 2時間
        idleTimeout: (userConfig.autoSaveInterval || 5) * 60 * 1000 // 分をミリ秒に変換
      },
      cursor: userConfig.cursor ? {
        enabled: userConfig.cursor.enabled ?? false,
        watchPath: userConfig.cursor.cursorDataPath,
        autoImport: userConfig.cursor.autoImport ?? false
      } : {
        enabled: false,
        autoImport: false
      }
    }
  }

  /**
   * ChatHistoryConfig形式で設定を保存
   */
  async saveConfig(config: ChatHistoryConfig): Promise<void> {
    // ChatHistoryConfigをUserConfigに変換
    const userConfig: Partial<UserConfig> = {
      storagePath: config.storagePath,
      storageType: config.storageType,
      maxSessions: config.maxSessions,
      maxMessagesPerSession: config.maxMessagesPerSession,
      autoCleanup: config.autoCleanup,
      cleanupDays: config.cleanupDays,
      enableSearch: config.enableSearch,
      enableBackup: config.enableBackup,
      backupInterval: config.backupInterval,
      autoSave: config.autoSave,
      cursor: config.cursor ? {
        enabled: config.cursor.enabled,
        cursorDataPath: config.cursor.watchPath,
        autoImport: config.cursor.autoImport
      } : undefined
    }

    await this.saveUserConfig(userConfig)
  }
}
