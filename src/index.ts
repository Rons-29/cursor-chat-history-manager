#!/usr/bin/env node

import { Command } from 'commander'
import path from 'path'
import os from 'os'
import { ChatHistoryService } from './services/ChatHistoryService.js'
import { ExportService } from './services/ExportService.js'
import { ConfigService } from './services/ConfigService.js'
import { AnalyticsService } from './services/AnalyticsService.js'
import { AutoSaveService } from './services/AutoSaveService.js'
import type { ChatHistoryConfig } from './types/index.js'
import { Logger } from './server/utils/Logger.js'
import { CursorIntegrationService } from './services/CursorIntegrationService.js'
import { CursorLogService } from './services/CursorLogService.js'

const program = new Command()

// デフォルト設定
const defaultConfig: ChatHistoryConfig = {
  storageType: 'file',
  storagePath: path.join(os.homedir(), '.cursor-chat-history'),
  maxSessions: 1000,
  maxMessagesPerSession: 500,
  autoCleanup: true,
  cleanupDays: 30,
  enableSearch: true,
  enableBackup: false,
  backupInterval: 24,
  autoSave: {
    enabled: false,
    interval: 5,
    watchDirectories: [],
    filePatterns: [
      '*.ts',
      '*.js',
      '*.tsx',
      '*.jsx',
      '*.py',
      '*.java',
      '*.cpp',
      '*.c',
      '*.html',
      '*.css',
      '*.scss',
      '*.md',
      '*.txt',
      '*.json',
    ],
    maxSessionDuration: 120,
    idleTimeout: 30,
  },
}

// サービスのインスタンス
let historyService: ChatHistoryService
let configService: ConfigService
let analyticsService: AnalyticsService
let autoSaveService: AutoSaveService
let logger: Logger

async function initializeService(): Promise<void> {
  configService = new ConfigService()
  await configService.initialize()

  const config = await configService.getConfig()
  historyService = new ChatHistoryService(config)
  await historyService.initialize()

  analyticsService = new AnalyticsService(historyService)
  autoSaveService = new AutoSaveService(historyService, configService)
  logger = Logger.getInstance('./logs')
  await logger.initialize()
}

program
  .name('cursor-chat-history')
  .description('Cursor Chat履歴管理ツール')
  .version('1.0.0')

// セッション作成コマンド
program
  .command('create-session')
  .description('新しいチャットセッションを作成')
  .option('-t, --title <title>', 'セッションのタイトル')
  .option('-p, --project <projectId>', 'プロジェクトID')
  .option('--tags <tags>', 'タグ（カンマ区切り）')
  .action(async options => {
    try {
      await initializeService()

      const metadata = {
        projectId: options.project ? parseInt(options.project) : undefined,
        tags: options.tags
          ? options.tags.split(',').map((tag: string) => tag.trim())
          : undefined,
      }

      const sessionData = {
        id: Date.now().toString(),
        title: options.title || 'New Session',
        messages: [],
        tags: metadata.tags || [],
        startTime: new Date(),
        metadata
      }
      const session = await historyService.createSession(sessionData)
      console.log('✅ 新しいセッションを作成しました:')
      console.log(`   ID: ${session.id}`)
      console.log(`   タイトル: ${session.title}`)
      console.log(`   開始時刻: ${session.startTime.toLocaleString()}`)
    } catch (error) {
      console.error('❌ セッション作成エラー:', error)
      process.exit(1)
    }
  })

// メッセージ追加コマンド
program
  .command('add-message')
  .description('セッションにメッセージを追加')
  .requiredOption('-s, --session <sessionId>', 'セッションID')
  .requiredOption('-r, --role <role>', 'ロール (user|assistant|system)')
  .requiredOption('-c, --content <content>', 'メッセージ内容')
  .option('--tags <tags>', 'タグ（カンマ区切り）')
  .action(async options => {
    try {
      await initializeService()

      const messageData = {
        role: options.role,
        content: options.content,
        timestamp: new Date()
      }
      await historyService.addMessage(options.session, messageData)
      
      const session = await historyService.getSession(options.session)
      const message = session?.messages[session.messages.length - 1]

      if (message) {
        console.log('✅ メッセージを追加しました:')
        console.log(`   ロール: ${message.role}`)
        console.log(`   時刻: ${message.timestamp.toLocaleString()}`)
        console.log(
          `   内容: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`
        )
      } else {
        console.log('❌ メッセージの追加に失敗しました')
      }
    } catch (error) {
      console.error('❌ メッセージ追加エラー:', error)
      process.exit(1)
    }
  })

// セッション表示コマンド
program
  .command('show-session')
  .description('セッションの詳細を表示')
  .requiredOption('-s, --session <sessionId>', 'セッションID')
  .action(async options => {
    try {
      await initializeService()

      const session = await historyService.getSession(options.session)
      if (!session) {
        console.error('❌ セッションが見つかりません')
        process.exit(1)
      }

      console.log('📋 セッション詳細:')
      console.log(`   ID: ${session.id}`)
      console.log(`   タイトル: ${session.title}`)
      console.log(`   開始時刻: ${session.startTime.toLocaleString()}`)
      console.log(`   メッセージ数: ${session.messages.length}`)

      if (session.metadata?.tags) {
        console.log(`   タグ: ${session.metadata.tags.join(', ')}`)
      }

      console.log('\n💬 メッセージ:')
      session.messages.forEach((msg, index) => {
        console.log(
          `\n${index + 1}. [${msg.role.toUpperCase()}] ${msg.timestamp.toLocaleString()}`
        )
        console.log(`   ${msg.content}`)
      })
    } catch (error) {
      console.error('❌ セッション表示エラー:', error)
      process.exit(1)
    }
  })

// セッション検索コマンド
program
  .command('search')
  .description('セッションを検索')
  .option('-k, --keyword <keyword>', 'キーワード検索')
  .option('-t, --tags <tags>', 'タグフィルター（カンマ区切り）')
  .option('-p, --project <projectId>', 'プロジェクトID')
  .option('-l, --limit <limit>', '表示件数', '10')
  .option('--start-date <date>', '開始日（YYYY-MM-DD）')
  .option('--end-date <date>', '終了日（YYYY-MM-DD）')
  .action(async options => {
    try {
      await initializeService()

      const filter = {
        keyword: options.keyword,
        tags: options.tags
          ? options.tags.split(',').map((tag: string) => tag.trim())
          : undefined,
        projectId: options.project ? parseInt(options.project) : undefined,
        limit: parseInt(options.limit),
        startDate: options.startDate ? new Date(options.startDate) : undefined,
        endDate: options.endDate ? new Date(options.endDate) : undefined,
      }

      const result = await historyService.searchSessions(filter)

      console.log(
        `🔍 検索結果: ${result.totalCount}件中${result.sessions.length}件を表示`
      )
      console.log(`   ページ: ${result.currentPage}/${result.totalPages}`)

      result.sessions.forEach((session, index) => {
        console.log(`\n${index + 1}. ${session.title}`)
        console.log(`   ID: ${session.id}`)
        console.log(`   開始: ${session.startTime.toLocaleString()}`)
        console.log(`   メッセージ数: ${session.messages.length}`)
        if (session.metadata?.tags) {
          console.log(`   タグ: ${session.metadata.tags.join(', ')}`)
        }
      })
    } catch (error) {
      console.error('❌ 検索エラー:', error)
      process.exit(1)
    }
  })

// 統計表示コマンド
program
  .command('stats')
  .description('履歴の統計情報を表示')
  .action(async () => {
    try {
      await initializeService()

      const stats = await historyService.getStats()

      console.log('📊 Chat履歴統計:')
      console.log(`   総セッション数: ${stats.totalSessions}`)
      console.log(`   総メッセージ数: ${stats.totalMessages}`)
      console.log(
        `   平均メッセージ数/セッション: ${stats.averageMessagesPerSession.toFixed(1)}`
      )
      console.log(`   ストレージサイズ: ${stats.storageSize}`)

      if (stats.oldestSession) {
        console.log(
          `   最古のセッション: ${stats.oldestSession.toLocaleString()}`
        )
      }
      if (stats.newestSession) {
        console.log(
          `   最新のセッション: ${stats.newestSession.toLocaleString()}`
        )
      }
    } catch (error) {
      console.error('❌ 統計取得エラー:', error)
      process.exit(1)
    }
  })

// クリーンアップコマンド
program
  .command('cleanup')
  .description('古いセッションをクリーンアップ')
  .action(async () => {
    try {
      await initializeService()

      const deletedCount = await historyService.cleanup()
      console.log(
        `🧹 クリーンアップ完了: ${deletedCount}個のセッションを削除しました`
      )
    } catch (error) {
      console.error('❌ クリーンアップエラー:', error)
      process.exit(1)
    }
  })

// セッション削除コマンド
program
  .command('delete-session')
  .description('セッションを削除')
  .requiredOption('-s, --session <sessionId>', 'セッションID')
  .option('-f, --force', '確認なしで削除')
  .action(async options => {
    try {
      await initializeService()

      if (!options.force) {
        const session = await historyService.getSession(options.session)
        if (!session) {
          console.error('❌ セッションが見つかりません')
          process.exit(1)
        }

        console.log(`⚠️  以下のセッションを削除しますか？`)
        console.log(`   タイトル: ${session.title}`)
        console.log(`   メッセージ数: ${session.messages.length}`)
        console.log(
          '   削除を続行するには --force オプションを使用してください'
        )
        return
      }

      const success = await historyService.deleteSession(options.session)
      if (success) {
        console.log('✅ セッションを削除しました')
      } else {
        console.error('❌ セッションの削除に失敗しました')
        process.exit(1)
      }
    } catch (error) {
      console.error('❌ セッション削除エラー:', error)
      process.exit(1)
    }
  })

// エクスポートコマンド
program
  .command('export')
  .description('セッションをエクスポート')
  .requiredOption(
    '-f, --format <format>',
    'エクスポート形式 (json|markdown|txt)'
  )
  .requiredOption('-o, --output <path>', '出力ファイルパス')
  .option('-s, --session <sessionId>', '特定のセッションをエクスポート')
  .option('-k, --keyword <keyword>', 'キーワードでフィルター')
  .option('-t, --tags <tags>', 'タグでフィルター（カンマ区切り）')
  .option('--include-metadata', 'メタデータを含める')
  .option('--start-date <date>', '開始日（YYYY-MM-DD）')
  .option('--end-date <date>', '終了日（YYYY-MM-DD）')
  .action(async options => {
    try {
      await initializeService()
      const exportConfig = {
        outputDir: './exports',
        format: 'json' as const,
        includeMetadata: true,
        compression: false
      }
      const exportService = new ExportService(exportConfig, historyService, logger)

      let sessions

      if (options.session) {
        // 特定のセッションをエクスポート
        const session = await historyService.getSession(options.session)
        if (!session) {
          console.error('❌ セッションが見つかりません')
          process.exit(1)
        }
        sessions = [session]
      } else {
        // フィルター条件でセッションを検索
        const filter = {
          keyword: options.keyword,
          tags: options.tags
            ? options.tags.split(',').map((tag: string) => tag.trim())
            : undefined,
          startDate: options.startDate
            ? new Date(options.startDate)
            : undefined,
          endDate: options.endDate ? new Date(options.endDate) : undefined,
          limit: 1000, // 大きな値を設定して全件取得
        }

        const result = await historyService.searchSessions(filter)
        sessions = result.sessions
      }

      if (sessions.length === 0) {
        console.log('⚠️  エクスポートするセッションが見つかりません')
        return
      }

      const exportOptions = {
        format: options.format as 'json' | 'markdown' | 'txt',
        outputPath: options.output,
        includeMetadata: options.includeMetadata || false,
      }

      await exportService.exportSessions(sessions, exportOptions)

      console.log('✅ エクスポートが完了しました:')
      console.log(`   ファイル: ${options.output}`)
      console.log(`   形式: ${options.format}`)
      console.log(`   セッション数: ${sessions.length}`)
      console.log(
        `   総メッセージ数: ${sessions.reduce((sum, session) => sum + session.messages.length, 0)}`
      )
    } catch (error) {
      console.error('❌ エクスポートエラー:', error)
      process.exit(1)
    }
  })

// インポートコマンド
program
  .command('import')
  .description('セッションをインポート')
  .requiredOption('-f, --file <path>', 'インポートファイルパス')
  .option('--overwrite', '既存のセッションを上書き')
  .option('--skip-duplicates', '重複をスキップ（デフォルト）')
  .option('--no-validate', 'データ検証をスキップ')
  .action(async options => {
    try {
      await initializeService()

      const importOptions = {
        overwrite: options.overwrite || false,
        skipDuplicates: !options.overwrite,
        validateData: options.validate !== false,
      }

      console.log('📥 インポートを開始します...')
      const result = await historyService.importSessions(
        options.file,
        importOptions
      )

      console.log('✅ インポートが完了しました:')
      console.log(`   インポート済み: ${result.imported}件`)
      console.log(`   スキップ: ${result.skipped}件`)

      if (result.errors.length > 0) {
        console.log(`   エラー: ${result.errors.length}件`)
        result.errors.forEach(error => console.log(`     - ${error}`))
      }
    } catch (error) {
      console.error('❌ インポートエラー:', error)
      process.exit(1)
    }
  })

// バックアップコマンド
program
  .command('backup')
  .description('データのバックアップを作成')
  .option('-o, --output <path>', 'バックアップファイルパス')
  .action(async options => {
    try {
      await initializeService()

      console.log('💾 バックアップを作成中...')
      const result = await historyService.createBackup(options.output)

      console.log('✅ バックアップが完了しました:')
      console.log(`   ファイル: ${result.backupPath}`)
      console.log(`   セッション数: ${result.sessionCount}`)
      console.log(
        `   ファイルサイズ: ${(result.size / 1024 / 1024).toFixed(2)} MB`
      )
    } catch (error) {
      console.error('❌ バックアップエラー:', error)
      process.exit(1)
    }
  })

// 復元コマンド
program
  .command('restore')
  .description('バックアップから復元')
  .requiredOption('-f, --file <path>', 'バックアップファイルパス')
  .option('--force', '確認なしで復元')
  .action(async options => {
    try {
      await initializeService()

      if (!options.force) {
        console.log('⚠️  この操作により現在のデータはすべて削除されます。')
        console.log(
          '   復元を続行するには --force オプションを使用してください'
        )
        return
      }

      console.log('🔄 復元を開始します...')
      const result = await historyService.restoreFromBackup(options.file)

      console.log('✅ 復元が完了しました:')
      console.log(`   復元済み: ${result.restored}件`)

      if (result.errors.length > 0) {
        console.log(`   エラー: ${result.errors.length}件`)
        result.errors.forEach(error => console.log(`     - ${error}`))
      }
    } catch (error) {
      console.error('❌ 復元エラー:', error)
      process.exit(1)
    }
  })

// バックアップ一覧コマンド
program
  .command('list-backups')
  .description('バックアップ一覧を表示')
  .action(async () => {
    try {
      await initializeService()

      const backups = await historyService.getBackupList()

      if (backups.length === 0) {
        console.log('📂 バックアップファイルが見つかりません')
        return
      }

      console.log('📂 バックアップ一覧:')
      backups.forEach((backup, index) => {
        console.log(`\n${index + 1}. ${backup.name}`)
        console.log(`   作成日時: ${backup.createdAt.toLocaleString()}`)
        console.log(
          `   ファイルサイズ: ${(backup.size / 1024 / 1024).toFixed(2)} MB`
        )
        if (backup.sessionCount) {
          console.log(`   セッション数: ${backup.sessionCount}`)
        }
        console.log(`   パス: ${backup.path}`)
      })
    } catch (error) {
      console.error('❌ バックアップ一覧取得エラー:', error)
      process.exit(1)
    }
  })

// 設定表示コマンド
program
  .command('config')
  .description('設定を表示・変更')
  .option('--show', '現在の設定を表示')
  .option('--set <key=value>', '設定値を変更')
  .option('--reset', 'デフォルト設定にリセット')
  .option('--export <path>', '設定をエクスポート')
  .option('--import <path>', '設定をインポート')
  .action(async options => {
    try {
      await initializeService()

      if (options.reset) {
        await configService.resetToDefault()
        console.log('✅ 設定をデフォルトにリセットしました')
        return
      }

      if (options.export) {
        await configService.exportConfig(options.export)
        console.log(`✅ 設定をエクスポートしました: ${options.export}`)
        return
      }

      if (options.import) {
        const result = await configService.importConfig(options.import)
        if (result.success) {
          console.log('✅ 設定をインポートしました')
        } else {
          console.error('❌ 設定インポートエラー:')
          result.errors.forEach(error => console.error(`   - ${error}`))
          process.exit(1)
        }
        return
      }

      if (options.set) {
        const [key, value] = options.set.split('=')
        if (!key || value === undefined) {
          console.error(
            '❌ 設定形式が正しくありません。例: --set maxSessions=500'
          )
          process.exit(1)
        }

        // 型変換
        let parsedValue: any = value
        if (value === 'true') parsedValue = true
        else if (value === 'false') parsedValue = false
        else if (!isNaN(Number(value))) parsedValue = Number(value)

        await configService.updateConfigValue(key as any, parsedValue)
        console.log(`✅ 設定を更新しました: ${key} = ${parsedValue}`)
        return
      }

      // デフォルトは設定表示
      const config = await configService.getConfig()
      console.log('⚙️  現在の設定:')
      console.log(`   設定ファイル: ${configService.getConfigPath()}`)
      console.log(`   ストレージパス: ${config.storagePath}`)
      console.log(`   最大セッション数: ${config.maxSessions}`)
      console.log(
        `   セッション当たり最大メッセージ数: ${config.maxMessagesPerSession}`
      )
      console.log(
        `   自動クリーンアップ: ${config.autoCleanup ? '有効' : '無効'}`
      )
      console.log(`   クリーンアップ期間: ${config.cleanupDays}日`)
      console.log(`   検索機能: ${config.enableSearch ? '有効' : '無効'}`)
      console.log(
        `   バックアップ機能: ${config.enableBackup ? '有効' : '無効'}`
      )
      console.log(`   バックアップ間隔: ${config.backupInterval}時間`)

      if (config.autoSave) {
        console.log('\n自動保存設定:')
        console.log(`   有効: ${config.autoSave.enabled ? '✅ はい' : '❌ いいえ'}`)
        console.log(`   間隔: ${config.autoSave.interval}分`)
        console.log(`   アイドルタイムアウト: ${config.autoSave.idleTimeout}分`)
        console.log(`   最大セッション時間: ${config.autoSave.maxSessionDuration}分`)

        if (config.autoSave.watchDirectories && config.autoSave.watchDirectories.length > 0) {
          console.log(`   監視ディレクトリ: ${config.autoSave.watchDirectories.join(', ')}`)
        }

        if (config.autoSave.filePatterns && config.autoSave.filePatterns.length > 0) {
          console.log(`   ファイルパターン: ${config.autoSave.filePatterns.join(', ')}`)
        }
      }
    } catch (error) {
      console.error('❌ 設定エラー:', error)
      process.exit(1)
    }
  })

// 分析コマンド
program
  .command('analyze')
  .description('使用統計と分析を表示')
  .option('--usage', '使用統計を表示')
  .option('--report <period>', '期間別レポート (daily|weekly|monthly)')
  .option('--keywords', 'キーワード分析')
  .option('--start-date <date>', '開始日（YYYY-MM-DD）')
  .option('--end-date <date>', '終了日（YYYY-MM-DD）')
  .option('--days <days>', '過去N日間', '30')
  .action(async options => {
    try {
      await initializeService()

      const days = parseInt(options.days)
      const endDate = options.endDate ? new Date(options.endDate) : new Date()
      const startDate = options.startDate
        ? new Date(options.startDate)
        : new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

      if (options.keywords) {
        console.log('🔍 キーワード分析:')
        const keywords = await analyticsService.analyzeKeywords(
          startDate,
          endDate
        )

        if (keywords.length === 0) {
          console.log('   キーワードが見つかりませんでした')
          return
        }

        keywords.slice(0, 20).forEach((keyword, index) => {
          console.log(`\n${index + 1}. "${keyword.keyword}"`)
          console.log(`   頻度: ${keyword.frequency}回`)
          console.log(`   セッション数: ${keyword.sessions.length}`)
          console.log(`   初回使用: ${keyword.firstUsed.toLocaleString()}`)
          console.log(`   最終使用: ${keyword.lastUsed.toLocaleString()}`)
        })
        return
      }

      if (options.report) {
        const period = options.report as 'daily' | 'weekly' | 'monthly'
        console.log(
          `📈 ${period === 'daily' ? '日別' : period === 'weekly' ? '週別' : '月別'}活動レポート:`
        )

        const report = await analyticsService.generateActivityReport(
          startDate,
          endDate,
          period
        )

        console.log(
          `\n📊 期間: ${report.startDate.toLocaleDateString()} - ${report.endDate.toLocaleDateString()}`
        )
        console.log(`   総セッション数: ${report.summary.totalSessions}`)
        console.log(`   総メッセージ数: ${report.summary.totalMessages}`)
        console.log(
          `   平均セッション長: ${report.summary.averageSessionLength.toFixed(1)}メッセージ`
        )
        console.log(
          `   平均セッション時間: ${report.summary.averageSessionDuration.toFixed(1)}分`
        )

        console.log('\n📈 トレンド:')
        console.log(
          `   セッション数: ${report.trends.sessionTrend === 'increasing' ? '📈 増加' : report.trends.sessionTrend === 'decreasing' ? '📉 減少' : '➡️ 安定'}`
        )
        console.log(
          `   メッセージ数: ${report.trends.messageTrend === 'increasing' ? '📈 増加' : report.trends.messageTrend === 'decreasing' ? '📉 減少' : '➡️ 安定'}`
        )
        console.log(
          `   エンゲージメント: ${report.trends.engagementTrend === 'increasing' ? '📈 増加' : report.trends.engagementTrend === 'decreasing' ? '📉 減少' : '➡️ 安定'}`
        )

        console.log('\n📅 期間別詳細:')
        report.activities.slice(-10).forEach(activity => {
          console.log(
            `   ${activity.date}: ${activity.sessionCount}セッション, ${activity.messageCount}メッセージ`
          )
        })
        return
      }

      // デフォルトは使用統計
      console.log('📊 使用統計:')
      const stats = await analyticsService.getUsageStats(startDate, endDate)

      console.log(
        `   期間: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
      )
      console.log(`   総セッション数: ${stats.totalSessions}`)
      console.log(`   総メッセージ数: ${stats.totalMessages}`)
      console.log(
        `   平均セッション長: ${stats.averageSessionLength.toFixed(1)}メッセージ`
      )
      console.log(
        `   平均セッション時間: ${stats.averageSessionDuration.toFixed(1)}分`
      )
      console.log(`   最も活発な時間: ${stats.mostActiveHour}時`)
      console.log(`   最も活発な曜日: ${stats.mostActiveDay}`)

      console.log('\n💬 メッセージ種別:')
      console.log(`   ユーザー: ${stats.userMessageCount}件`)
      console.log(`   アシスタント: ${stats.assistantMessageCount}件`)
      console.log(`   システム: ${stats.systemMessageCount}件`)
    } catch (error) {
      console.error('❌ 分析エラー:', error)
      process.exit(1)
    }
  })

// 自動保存開始コマンド
program
  .command('auto-save-start')
  .description('自動保存を開始')
  .action(async () => {
    try {
      await initializeService()
      await autoSaveService.start()
    } catch (error) {
      console.error('❌ 自動保存開始エラー:', error)
      process.exit(1)
    }
  })

// 自動保存停止コマンド
program
  .command('auto-save-stop')
  .description('自動保存を停止')
  .action(async () => {
    try {
      await initializeService()
      await autoSaveService.stop()
    } catch (error) {
      console.error('❌ 自動保存停止エラー:', error)
      process.exit(1)
    }
  })

// 自動保存状態確認コマンド
program
  .command('auto-save-status')
  .description('自動保存の状態を表示')
  .action(async () => {
    try {
      await initializeService()
      const status = autoSaveService.getStatus()

      console.log('🤖 自動保存状態:')
      console.log(`   実行中: ${status.isActive ? '✅ はい' : '❌ いいえ'}`)
      console.log(`   現在のセッションID: ${status.currentSessionId || 'なし'}`)
      console.log(`   セッション時間: ${status.sessionDuration}分`)
      console.log(`   メッセージ数: ${status.messageCount}個`)
      console.log(
        `   最終保存時刻: ${status.lastSaveTime ? status.lastSaveTime.toLocaleString() : 'なし'}`
      )
    } catch (error) {
      console.error('❌ 自動保存状態確認エラー:', error)
      process.exit(1)
    }
  })

// 自動保存メッセージ追加コマンド
program
  .command('auto-save-message')
  .description('自動保存セッションにメッセージを追加')
  .requiredOption('-c, --content <content>', 'メッセージ内容')
  .option('-r, --role <role>', 'ロール (user|assistant)', 'user')
  .action(async options => {
    try {
      await initializeService()
      await autoSaveService.saveMessage(options.content, options.role)
      console.log('✅ メッセージを自動保存セッションに追加しました')
    } catch (error) {
      console.error('❌ メッセージ追加エラー:', error)
      process.exit(1)
    }
  })

// 自動保存設定更新コマンド
program
  .command('auto-save-config')
  .description('自動保存設定を更新')
  .option('--enable', '自動保存を有効にする')
  .option('--disable', '自動保存を無効にする')
  .option('--interval <minutes>', '保存間隔（分）')
  .option('--idle-timeout <minutes>', 'アイドルタイムアウト（分）')
  .option('--max-duration <minutes>', '最大セッション時間（分）')
  .option('--add-directory <path>', '監視ディレクトリを追加')
  .option('--add-pattern <pattern>', 'ファイルパターンを追加')
  .action(async options => {
    try {
      await initializeService()

      const updates: any = {}

      if (options.enable) updates.enabled = true
      if (options.disable) updates.enabled = false
      if (options.interval) updates.interval = parseInt(options.interval)
      if (options.idleTimeout)
        updates.idleTimeout = parseInt(options.idleTimeout)
      if (options.maxDuration)
        updates.maxSessionDuration = parseInt(options.maxDuration)

      if (options.addDirectory) {
        const config = await configService.getConfig()
        updates.watchDirectories = [
          ...(config.autoSave?.watchDirectories || []),
          options.addDirectory,
        ]
      }

      if (options.addPattern) {
        const config = await configService.getConfig()
        updates.filePatterns = [
          ...(config.autoSave?.filePatterns || []),
          options.addPattern,
        ]
      }

      await autoSaveService.updateConfig(updates)
      console.log('✅ 自動保存設定を更新しました')
    } catch (error) {
      console.error('❌ 自動保存設定更新エラー:', error)
      process.exit(1)
    }
  })

// Cursor統合コマンド
program
  .command('cursor-start')
  .description('Cursor統合を開始')
  .action(async () => {
    try {
      await initializeService()

      const config = await configService.getConfig()
      const cursorService = new CursorIntegrationService(
        historyService,
        configService,
        new CursorLogService(config.cursor || { 
          enabled: false, 
          autoImport: false, 
          watchPath: './cursor-data',
          logDir: './logs/cursor'
        }, logger),
        logger
      )

      await cursorService.start()
      console.log('🚀 Cursor統合を開始しました。Ctrl+Cで停止します。')

      // 終了シグナルをハンドル
      process.on('SIGINT', async () => {
        console.log('\n⏹️  Cursor統合を停止しています...')
        await cursorService.stop()
        process.exit(0)
      })

      // プロセスを維持
      await new Promise(() => {})
    } catch (error) {
      console.error('❌ Cursor統合の開始に失敗しました:', error)
      process.exit(1)
    }
  })

program
  .command('cursor-scan')
  .description('Cursorチャット履歴をスキャンしてインポート')
  .action(async () => {
    try {
      await initializeService()

      const config = await configService.getConfig()
      const cursorService = new CursorIntegrationService(
        historyService,
        configService,
        new CursorLogService(config.cursor || { 
          enabled: false, 
          autoImport: false, 
          watchPath: './cursor-data',
          logDir: './logs/cursor'
        }, logger),
        logger
      )

      console.log('🔍 Cursorチャット履歴をスキャンしています...')
      await cursorService.scanAndImport()

      const status = cursorService.getStatus()
      console.log(
        `✅ スキャン完了: ${status.importedSessions}/${status.foundTasks} セッションをインポート`
      )
    } catch (error) {
      console.error('❌ Cursorチャット履歴のスキャンに失敗しました:', error)
      process.exit(1)
    }
  })

program
  .command('cursor-status')
  .description('Cursor統合の状態を表示')
  .action(async () => {
    try {
      await initializeService()

      const config = await configService.getConfig()
      const cursorService = new CursorIntegrationService(
        historyService,
        configService,
        new CursorLogService(config.cursor || { 
          enabled: false, 
          autoImport: false, 
          watchPath: './cursor-data',
          logDir: './logs/cursor'
        }, logger),
        logger
      )

      const status = cursorService.getStatus()
      const cursorConfig = await configService.getConfig()

      console.log('\n📊 Cursor統合状態')
      console.log('='.repeat(30))
      console.log(`Cursor統合: ${cursorConfig.cursor?.enabled ? '✅ 有効' : '❌ 無効'}`)
      console.log(
        `自動インポート: ${cursorConfig.cursor?.autoImport ? '✅ はい' : '❌ いいえ'}`
      )
      console.log(
        `監視パス: ${cursorConfig.cursor?.watchPath || 'デフォルト'}`
      )
    } catch (error) {
      console.error('❌ Cursor統合状態の取得に失敗しました:', error)
      process.exit(1)
    }
  })

program
  .command('cursor-config')
  .description('Cursor統合設定を管理')
  .option('--enable', 'Cursor統合を有効にする')
  .option('--disable', 'Cursor統合を無効にする')
  .option('--path <path>', 'Cursorデータパスを設定')
  .option('--auto-import <boolean>', '自動インポートを設定 (true/false)')
  .option('--startup-import <boolean>', '起動時インポートを設定 (true/false)')
  .option('--watch-interval <seconds>', '監視間隔を設定（秒）')
  .action(async options => {
    try {
      await initializeService()

      const updates: any = {}

      if (options.enable) {
        updates.enabled = true
      }
      if (options.disable) {
        updates.enabled = false
      }
      if (options.path) {
        updates.watchPath = options.path
      }
      if (options.autoImport !== undefined) {
        updates.autoImport = options.autoImport === 'true'
      }
      if (options.startupImport !== undefined) {
        updates.importOnStartup = options.startupImport === 'true'
      }
      if (options.watchInterval) {
        updates.watchInterval = parseInt(options.watchInterval)
      }

      if (Object.keys(updates).length === 0) {
        // 設定表示
        const config = await configService.getConfig()
        console.log('\n⚙️  Cursor統合設定')
        console.log('='.repeat(30))
        console.log(JSON.stringify(config.cursor || {}, null, 2))
      } else {
        // 設定更新
        const currentConfig = await configService.getConfig()
        const newConfig = {
          ...currentConfig,
          cursor: {
            ...currentConfig.cursor,
            ...updates,
          },
        }

        await configService.saveConfig(newConfig)
        console.log('✅ Cursor統合設定を更新しました')
        console.log(JSON.stringify(newConfig.cursor, null, 2))
      }
    } catch (error) {
      console.error('❌ Cursor統合設定の管理に失敗しました:', error)
      process.exit(1)
    }
  })

// プログラム実行
program.parse()
