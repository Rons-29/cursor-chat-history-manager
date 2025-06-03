#!/usr/bin/env node

/**
 * Chat History Manager - Integration CLI
 * .mdcルール準拠: Cursor統合機能のテスト・デバッグ用CLI
 */

import { Command } from 'commander'
import { IntegrationService } from './server/services/IntegrationService.js'
import { Logger } from './server/utils/Logger.js'
import type { IntegrationConfig } from './server/types/integration.js'
import path from 'path'
import os from 'os'

const program = new Command()

// デフォルト設定
const getDefaultConfig = (): IntegrationConfig => {
  const homeDir = os.homedir()
  const platform = process.platform

  let cursorPath: string
  switch (platform) {
    case 'darwin': // macOS
      cursorPath = path.join(
        homeDir,
        'Library',
        'Application Support',
        'Cursor',
        'User',
        'workspaceStorage'
      )
      break
    case 'win32': // Windows
      cursorPath = path.join(
        homeDir,
        'AppData',
        'Roaming',
        'Cursor',
        'User',
        'workspaceStorage'
      )
      break
    case 'linux': // Linux
      cursorPath = path.join(
        homeDir,
        '.config',
        'Cursor',
        'User',
        'workspaceStorage'
      )
      break
    default:
      cursorPath = path.join(homeDir, '.cursor', 'workspaceStorage')
  }

  return {
    cursor: {
      enabled: true,
      watchPath: cursorPath,
      logDir: path.join(homeDir, '.chat-history', 'cursor-logs'),
      autoImport: true,
      syncInterval: 300,
      batchSize: 100,
      retryAttempts: 3,
    },
    chatHistory: {
      storagePath: path.join(homeDir, '.chat-history'),
      maxSessions: 1000,
      maxMessagesPerSession: 500,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24,
    },
    sync: {
      interval: 300,
      batchSize: 100,
      retryAttempts: 3,
    },
  }
}

async function main() {
  const logger = Logger.getInstance('./logs')
  await logger.initialize()

  program
    .name('chat-history-integration')
    .description('Chat History Manager - Cursor統合機能CLI')
    .version('1.0.0')

  /**
   * Cursorログスキャンコマンド
   */
  program
    .command('scan')
    .description('Cursorログファイルをスキャンしてインポート')
    .option('-p, --path <path>', 'Cursorデータパス（デフォルト: 自動検出）')
    .option('-v, --verbose', '詳細ログを表示')
    .action(async options => {
      try {
        console.log('🔍 Cursorログスキャンを開始します...')

        const config = getDefaultConfig()
        if (options.path) {
          config.cursor.watchPath = options.path
        }

        const integrationService = new IntegrationService(config, logger)
        await integrationService.initialize()

        const importCount = await integrationService.scanCursorLogs(
          options.path
        )

        console.log(
          `✅ スキャン完了: ${importCount}件のセッションをインポートしました`
        )
        console.log(`📁 スキャンパス: ${config.cursor.watchPath}`)
      } catch (error) {
        console.error(
          '❌ スキャンエラー:',
          error instanceof Error ? error.message : error
        )
        process.exit(1)
      }
    })

  /**
   * 統合サービス監視開始コマンド
   */
  program
    .command('watch')
    .description('Cursorログの監視を開始')
    .option('-p, --path <path>', 'Cursorデータパス（デフォルト: 自動検出）')
    .option('-i, --interval <seconds>', '同期間隔（秒）', '300')
    .option('-v, --verbose', '詳細ログを表示')
    .action(async options => {
      try {
        console.log('👀 Cursorログ監視を開始します...')

        const config = getDefaultConfig()
        if (options.path) {
          config.cursor.watchPath = options.path
        }
        config.sync.interval = parseInt(options.interval)

        const integrationService = new IntegrationService(config, logger)
        await integrationService.initialize()

        // イベントリスナーの設定
        integrationService.on('syncStarted', (data: any) => {
          console.log(`🚀 同期開始: ${data.watchPath}`)
        })

        integrationService.on('syncCompleted', (data: any) => {
          console.log(`🔄 同期完了: ${data.importCount}件のログを処理`)
        })

        integrationService.on('fileProcessed', (data: any) => {
          console.log(`📄 ファイル処理: ${data.filePath} (${data.logCount}件)`)
        })

        integrationService.on('scanCompleted', (data: any) => {
          console.log(`✅ スキャン完了: ${data.importCount}件インポート`)
        })

        integrationService.on('syncError', (error: any) => {
          console.error('❌ 同期エラー:', error.message || error)
        })

        await integrationService.startSync()

        console.log(`✅ 監視開始: ${config.cursor.watchPath}`)
        console.log('🛑 停止するには Ctrl+C を押してください')

        // Graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n🛑 監視を停止しています...')
          await integrationService.stopSync()
          console.log('✅ 監視を停止しました')
          process.exit(0)
        })

        // プロセスを継続
        await new Promise(() => {})
      } catch (error) {
        console.error(
          '❌ 監視エラー:',
          error instanceof Error ? error.message : error
        )
        process.exit(1)
      }
    })

  /**
   * ステータス確認コマンド
   */
  program
    .command('status')
    .description('統合サービスのステータスを確認')
    .option('-p, --path <path>', 'Cursorデータパス（デフォルト: 自動検出）')
    .action(async options => {
      try {
        console.log('📊 統合サービスのステータスを確認中...')

        const config = getDefaultConfig()
        if (options.path) {
          config.cursor.watchPath = options.path
        }

        const integrationService = new IntegrationService(config, logger)
        await integrationService.initialize()

        const status = integrationService.getCursorWatcherStatus()
        const stats = await integrationService.getStats()

        console.log('\n📈 ステータス情報:')
        console.log(
          `  監視状態: ${status.isActive ? '✅ 監視中' : '❌ 停止中'}`
        )
        console.log(`  Cursorパス: ${status.watchPath}`)
        console.log(`  最終チェック: ${status.lastCheck.toLocaleString()}`)
        console.log(`  エラー数: ${status.errorCount}`)

        console.log('\n📊 統計情報:')
        console.log(`  総ログ数: ${stats.totalLogs}`)
        console.log(`  チャットログ数: ${stats.chatLogs}`)
        console.log(`  Cursorログ数: ${stats.cursorLogs}`)
        console.log(
          `  ストレージサイズ: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`
        )
      } catch (error) {
        console.error(
          '❌ ステータス確認エラー:',
          error instanceof Error ? error.message : error
        )
        process.exit(1)
      }
    })

  /**
   *
   * 検索コマンド
   */
  program
    .command('search')
    .description('統合ログを検索')
    .option('-q, --query <query>', '検索クエリ')
    .option('-t, --type <types>', 'ログタイプ（chat,cursor）', 'chat,cursor')
    .option('-l, --limit <limit>', '結果数制限', '10')
    .option('--start <date>', '開始日（YYYY-MM-DD）')
    .option('--end <date>', '終了日（YYYY-MM-DD）')
    .action(async options => {
      try {
        console.log('🔍 統合ログを検索中...')

        const config = getDefaultConfig()
        const integrationService = new IntegrationService(config, logger)
        await integrationService.initialize()

        const searchOptions = {
          query: options.query,
          types: options.type.split(',') as ('chat' | 'cursor')[],
          pageSize: parseInt(options.limit),
          timeRange:
            options.start && options.end
              ? {
                  start: new Date(options.start),
                  end: new Date(options.end),
                }
              : undefined,
        }

        const results = await integrationService.search(searchOptions)

        console.log(`\n📋 検索結果: ${results.length}件`)
        results.forEach((result, index) => {
          console.log(
            `\n${index + 1}. [${result.type.toUpperCase()}] ${result.timestamp.toLocaleString()}`
          )
          console.log(
            `   内容: ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}`
          )
          if (result.metadata.project) {
            console.log(`   プロジェクト: ${result.metadata.project}`)
          }
          if (result.metadata.tags && result.metadata.tags.length > 0) {
            console.log(`   タグ: ${result.metadata.tags.join(', ')}`)
          }
        })
      } catch (error) {
        console.error(
          '❌ 検索エラー:',
          error instanceof Error ? error.message : error
        )
        process.exit(1)
      }
    })

  /**
   * 設定表示コマンド
   */
  program
    .command('config')
    .description('現在の設定を表示')
    .action(async () => {
      try {
        const config = getDefaultConfig()

        console.log('\n⚙️ 現在の設定:')
        console.log('\n📁 Cursor設定:')
        console.log(`  有効: ${config.cursor.enabled}`)
        console.log(`  監視パス: ${config.cursor.watchPath}`)
        console.log(`  ログディレクトリ: ${config.cursor.logDir}`)
        console.log(`  自動インポート: ${config.cursor.autoImport}`)
        console.log(`  同期間隔: ${config.cursor.syncInterval}秒`)
        console.log(`  バッチサイズ: ${config.cursor.batchSize}`)
        console.log(`  リトライ回数: ${config.cursor.retryAttempts}`)

        console.log('\n💬 チャット履歴設定:')
        console.log(`  保存パス: ${config.chatHistory.storagePath}`)
        console.log(`  最大セッション数: ${config.chatHistory.maxSessions}`)
        console.log(
          `  セッション当たり最大メッセージ数: ${config.chatHistory.maxMessagesPerSession}`
        )
        console.log(`  自動クリーンアップ: ${config.chatHistory.autoCleanup}`)
        console.log(`  クリーンアップ日数: ${config.chatHistory.cleanupDays}`)

        console.log('\n🔄 同期設定:')
        console.log(`  間隔: ${config.sync.interval}秒`)
        console.log(`  バッチサイズ: ${config.sync.batchSize}`)
        console.log(`  リトライ回数: ${config.sync.retryAttempts}`)
      } catch (error) {
        console.error(
          '❌ 設定表示エラー:',
          error instanceof Error ? error.message : error
        )
        process.exit(1)
      }
    })

  // エラーハンドリング
  program.on('command:*', () => {
    console.error('❌ 不明なコマンドです。--help でヘルプを表示してください。')
    process.exit(1)
  })

  // プログラム実行
  if (import.meta.url === `file://${process.argv[1]}`) {
    program.parse()
  }
}

main()
