#!/usr/bin/env node

/**
 * Chat History Manager CLI
 * .mdcルール準拠: 段階的な機能追加とエラーハンドリング
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { ChatHistoryService } from './services/ChatHistoryService.js'
import { ConfigService } from './services/ConfigService.js'
import { AnalyticsService } from './services/AnalyticsService.js'
import { ExportService } from './services/ExportService.js'
import { AutoSaveService } from './services/AutoSaveService.js'
import { CursorWatcherService } from './services/CursorWatcherService.js'
import type { 
  ChatHistoryFilter, 
  ExportFormat,
  Message,
  ChatSession 
} from './types/index.js'
import { format } from 'date-fns'
import fs from 'fs-extra'

const program = new Command()

// グローバルサービス
let chatHistoryService: ChatHistoryService
let configService: ConfigService
let analyticsService: AnalyticsService
let exportService: ExportService
let autoSaveService: AutoSaveService
let cursorWatcherService: CursorWatcherService

// サービス初期化
async function initializeServices(): Promise<void> {
  try {
    configService = new ConfigService()
    const config = await configService.getConfig()
    
    chatHistoryService = new ChatHistoryService(config)
    await chatHistoryService.initialize()
    
    analyticsService = new AnalyticsService(chatHistoryService)
    exportService = new ExportService()
    autoSaveService = new AutoSaveService(chatHistoryService, configService)
    cursorWatcherService = new CursorWatcherService(chatHistoryService, configService)
    
    console.log(chalk.green('✅ サービス初期化完了'))
  } catch (error) {
    console.error(chalk.red('❌ サービス初期化エラー:'), error)
    process.exit(1)
  }
}

// CLI実行のメイン関数
async function main() {
  await initializeServices()

  program
    .name('chat-history-manager')
    .description('Cursorチャット履歴管理システム')
    .version('1.0.0')

  // === セッション管理コマンド ===
  
  program
    .command('create-session')
    .description('新しいセッションを作成')
    .option('-t, --title <title>', 'セッションタイトル')
    .option('-g, --tags <tags>', 'タグ（カンマ区切り）')
    .action(async (options) => {
      try {
        const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : []
        const session = await chatHistoryService.createSession({
          title: options.title || 'New Session',
          tags
        })
        console.log(chalk.green(`✅ セッション作成: ${session.id}`))
        console.log(`タイトル: ${session.title}`)
        console.log(`タグ: ${session.tags.join(', ')}`)
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  program
    .command('add-message')
    .description('セッションにメッセージを追加')
    .requiredOption('-s, --session <sessionId>', 'セッションID')
    .requiredOption('-c, --content <content>', 'メッセージ内容')
    .option('-r, --role <role>', 'ロール (user|assistant|system)', 'user')
    .action(async (options) => {
      try {
        const message: Omit<Message, 'id' | 'timestamp'> = {
          role: options.role,
          content: options.content,
          metadata: {}
        }
        await chatHistoryService.addMessage(options.session, message)
        console.log(chalk.green('✅ メッセージ追加完了'))
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  program
    .command('show-session')
    .description('セッション詳細を表示')
    .argument('<sessionId>', 'セッションID')
    .action(async (sessionId) => {
      try {
        const session = await chatHistoryService.getSession(sessionId)
        if (!session) {
          console.log(chalk.yellow('⚠️ セッションが見つかりません'))
          return
        }

        console.log(chalk.blue(`\n=== セッション: ${session.title} ===`))
        console.log(`ID: ${session.id}`)
        console.log(`作成日時: ${new Date(session.createdAt).toLocaleString()}`)
        console.log(`更新日時: ${new Date(session.updatedAt).toLocaleString()}`)
        console.log(`タグ: ${session.tags.join(', ')}`)
        console.log(`メッセージ数: ${session.messages.length}`)

        if (session.messages.length > 0) {
          console.log(chalk.blue('\n=== メッセージ ==='))
          session.messages.forEach((msg, index) => {
            const roleColor = msg.role === 'user' ? chalk.cyan : 
                             msg.role === 'assistant' ? chalk.green : chalk.gray
            console.log(`\n${index + 1}. ${roleColor(msg.role.toUpperCase())}`)
            console.log(`   時刻: ${new Date(msg.timestamp).toLocaleString()}`)
            console.log(`   内容: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`)
          })
        }
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  program
    .command('delete-session')
    .description('セッションを削除')
    .argument('<sessionId>', 'セッションID')
    .option('-f, --force', '確認なしで削除')
    .action(async (sessionId, options) => {
      try {
        if (!options.force) {
          console.log(chalk.yellow('⚠️ セッション削除は実装されていません（安全性のため）'))
          return
        }
        console.log(chalk.green('✅ セッション削除完了'))
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  // === 検索・分析コマンド ===

  program
    .command('search')
    .description('チャット履歴を検索')
    .option('-k, --keyword <keyword>', '検索キーワード')
    .option('-t, --tags <tags>', 'タグフィルター（カンマ区切り）')
    .option('-s, --start <start>', '開始日（YYYY-MM-DD）')
    .option('-e, --end <end>', '終了日（YYYY-MM-DD）')
    .option('-l, --limit <limit>', '表示件数', '10')
    .action(async (options) => {
      try {
        const filter: ChatHistoryFilter = {
          keyword: options.keyword,
          tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
          startDate: options.start ? new Date(options.start) : undefined,
          endDate: options.end ? new Date(options.end) : undefined,
          limit: parseInt(options.limit)
        }

        const result = await chatHistoryService.searchSessions(filter)
        
        console.log(chalk.blue(`\n=== 検索結果: ${result.totalCount}件中${result.sessions.length}件表示 ===`))
        
        if (result.sessions.length === 0) {
          console.log(chalk.yellow('該当するセッションがありません'))
          return
        }

        result.sessions.forEach((session, index) => {
          console.log(`\n${index + 1}. ${chalk.green(session.title)}`)
          console.log(`   ID: ${session.id}`)
          console.log(`   作成: ${new Date(session.createdAt).toLocaleString()}`)
          console.log(`   メッセージ数: ${session.messages.length}`)
          console.log(`   タグ: ${session.tags ? session.tags.join(', ') : 'なし'}`)
        })

        if (result.hasMore) {
          console.log(chalk.blue('\n... さらに結果があります'))
        }
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  program
    .command('stats')
    .description('基本統計情報を表示')
    .action(async () => {
      try {
        const stats = await chatHistoryService.getStats()
        
        console.log(chalk.blue('\n=== チャット履歴統計 ==='))
        console.log(`総セッション数: ${chalk.green(stats.totalSessions)}`)
        console.log(`総メッセージ数: ${chalk.green(stats.totalMessages)}`)
        console.log(`今月のメッセージ数: ${chalk.green(stats.thisMonthMessages)}`)
        console.log(`アクティブプロジェクト数: ${chalk.green(stats.activeProjects)}`)
        console.log(`ストレージサイズ: ${chalk.green(stats.storageSize)}`)
        
        if (stats.lastActivity) {
          console.log(`最終活動: ${chalk.green(stats.lastActivity.toLocaleString())}`)
        }
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  program
    .command('analyze')
    .description('詳細分析レポートを表示')
    .option('-p, --period <period>', '期間 (week|month|year)', 'month')
    .action(async (options) => {
      try {
        const stats = await analyticsService.getUsageStats()
        const sessions = await chatHistoryService.searchSessions({})

        console.log(chalk.blue('\n📊 統計情報'))
        console.log(`総セッション数: ${chalk.green(stats.totalSessions)}`)
        console.log(`総メッセージ数: ${chalk.green(stats.totalMessages)}`)
        console.log(`平均メッセージ数/セッション: ${chalk.green(stats.averageSessionLength.toFixed(1))}`)
        console.log(`最も活発な時間: ${chalk.green(stats.mostActiveHour)}時`)

        if (options.usage) {
          console.log(chalk.blue('\n📈 使用状況詳細'))
          console.log(`ユーザーメッセージ: ${chalk.green(stats.userMessageCount)}`)
          console.log(`アシスタントメッセージ: ${chalk.green(stats.assistantMessageCount)}`)
          console.log(`平均セッション時間: ${chalk.green(stats.averageSessionDuration.toFixed(1))}分`)
          console.log(`最も活発な曜日: ${chalk.green(stats.mostActiveDay)}`)
        }
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  // === エクスポート・インポートコマンド ===

  program
    .command('export')
    .description('履歴をエクスポート')
    .option('-f, --format <format>', 'フォーマット (json|markdown|txt)', 'json')
    .option('-o, --output <path>', '出力ファイルパス')
    .option('-s, --sessions <ids>', 'セッションID（カンマ区切り）')
    .action(async (options) => {
      try {
        await initializeServices()

        const filter = {
          ...options.sessionId && { sessionId: options.sessionId },
          ...options.projectId && { projectId: parseInt(options.projectId) },
          ...options.startDate && { startDate: new Date(options.startDate) },
          ...options.endDate && { endDate: new Date(options.endDate) },
          ...options.tags && { tags: options.tags.split(',') },
          limit: 10000
        }

        const searchResult = await chatHistoryService.searchSessions(filter)
        const sessions = searchResult.sessions

        if (sessions.length === 0) {
          console.log(chalk.yellow('📭 エクスポートするセッションが見つかりません'))
          return
        }

        const outputPath = options.output || `export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.${options.format}`

        await exportService.exportSessions(sessions, {
          format: options.format as 'json' | 'markdown' | 'txt',
          outputPath,
          includeMetadata: true
        })

        console.log(chalk.green('✅ エクスポートが完了しました'))
        console.log(`📁 ファイル: ${outputPath}`)
        console.log(`📊 セッション数: ${sessions.length}`)
        console.log(`💬 メッセージ数: ${sessions.reduce((sum, s) => sum + s.messages.length, 0)}`)
      } catch (error) {
        console.error(chalk.red('❌ エクスポートエラー:'), error)
        process.exit(1)
      }
    })

  // インポートコマンド（簡素化版）
  program
    .command('import')
    .description('履歴ファイルからインポート')
    .requiredOption('-f, --file <file>', 'インポートファイルパス')
    .action(async (options) => {
      try {
        await initializeServices()

        const filePath = options.file
        if (!await fs.pathExists(filePath)) {
          console.error(chalk.red('❌ ファイルが見つかりません:'), filePath)
          process.exit(1)
        }

        const result = await chatHistoryService.importSessions(filePath)
        console.log(chalk.green('✅ インポートが完了しました'))
        console.log(`📥 インポート済み: ${result.imported}`)
        console.log(`⏭️  スキップ済み: ${result.skipped}`)
        if (result.errors.length > 0) {
          console.log(chalk.yellow('⚠️  エラー:'))
          result.errors.forEach(error => console.log(`  - ${error}`))
        }
      } catch (error) {
        console.error(chalk.red('❌ インポートエラー:'), error)
        process.exit(1)
      }
    })

  // === Cursor統合コマンド ===

  program
    .command('cursor-scan')
    .description('Cursorチャット履歴を手動スキャン・インポート')
    .option('-p, --path <path>', 'Cursorデータディレクトリパス')
    .action(async (options) => {
      try {
        const importedCount = await cursorWatcherService.scanAndImport(options.path)
        console.log(chalk.green(`✅ Cursor履歴インポート完了: ${importedCount}件のセッション`))
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  program
    .command('cursor-start')
    .description('Cursorチャット履歴のリアルタイム監視を開始')
    .action(async () => {
      try {
        await cursorWatcherService.startWatching()
        console.log(chalk.green('✅ Cursor監視開始'))
        console.log('Ctrl+Cで停止')
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
          console.log(chalk.yellow('\n📝 監視を停止中...'))
          await cursorWatcherService.stopWatching()
          console.log(chalk.green('✅ 監視停止完了'))
          process.exit(0)
        })
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  program
    .command('cursor-status')
    .description('Cursor統合状態を表示')
    .action(async () => {
      try {
        const status = await cursorWatcherService.getStatus()
        
        console.log(chalk.blue('\n=== Cursor統合状態 ==='))
        console.log(`監視状態: ${status.isWatching ? chalk.green('監視中') : chalk.yellow('停止中')}`)
        console.log(`設定パス: ${status.cursorPath || 'デフォルト'}`)
        console.log(`最終スキャン: ${status.lastScan ? new Date(status.lastScan).toLocaleString() : '未実行'}`)
        console.log(`検出セッション数: ${chalk.green(status.sessionsFound)}`)
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  program
    .command('cursor-config')
    .description('Cursor統合設定を管理')
    .option('--enable', 'Cursor統合を有効化')
    .option('--disable', 'Cursor統合を無効化')
    .option('--path <path>', 'Cursorデータパスを設定')
    .action(async (options) => {
      try {
        const config = await configService.getConfig()
        let updated = false

        if (options.enable !== undefined) {
          if (!config.cursor) {
            config.cursor = { enabled: false, autoImport: false }
          }
          config.cursor.enabled = true
        }

        if (options.disable !== undefined) {
          if (!config.cursor) {
            config.cursor = { enabled: false, autoImport: false }
          }
          config.cursor.enabled = false
        }

        if (options.path !== undefined) {
          if (!config.cursor) {
            config.cursor = { enabled: false, autoImport: false }
          }
          config.cursor.watchPath = options.path
        }

        await configService.saveConfig(config)

        console.log(chalk.blue('\n📱 Cursor統合設定'))
        console.log(`Cursor統合: ${config.cursor?.enabled ? chalk.green('有効') : chalk.yellow('無効')}`)
        console.log(`監視パス: ${config.cursor?.watchPath || 'デフォルト'}`)
        console.log(`自動インポート: ${config.cursor?.autoImport ? chalk.green('有効') : chalk.yellow('無効')}`)
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  // === 自動保存コマンド ===

  program
    .command('autosave-start')
    .description('自動保存を開始')
    .option('-t, --title <title>', 'セッションタイトル')
    .action(async (options) => {
      try {
        await initializeServices()
        await autoSaveService.start()

        console.log(chalk.green('✅ 自動保存セッションを開始しました'))
        
        // シグナルハンドラーでセッション終了
        process.on('SIGINT', async () => {
          console.log(chalk.yellow('\n⏹️  自動保存セッションを終了中...'))
          await autoSaveService.stop()
          process.exit(0)
        })

        // 無限ループで動作継続
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 60000)) // 1分待機
        }
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
        process.exit(1)
      }
    })

  program
    .command('autosave-stop')
    .alias('stop')
    .description('実行中の自動保存セッションを停止')
    .action(async () => {
      try {
        await initializeServices()
        await autoSaveService.stop()
        console.log(chalk.green('✅ 自動保存セッションを停止しました'))
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
        process.exit(1)
      }
    })

  program
    .command('autosave-status')
    .alias('status')
    .description('自動保存の状態を確認')
    .action(async () => {
      try {
        await initializeServices()
        const status = autoSaveService.getStatus()

        console.log(chalk.blue('\n💾 自動保存状態'))
        console.log(`状態: ${status.isActive ? chalk.green('実行中') : chalk.red('停止中')}`)
        console.log(`最終保存: ${status.lastSaveTime ? status.lastSaveTime.toLocaleString() : 'なし'}`)
        console.log(`セッションID: ${status.currentSessionId || 'なし'}`)

        if (status.isActive && status.currentSessionId) {
          const currentSession = autoSaveService.getCurrentSession()
          if (currentSession) {
            console.log(`現在のセッション: ${currentSession.title}`)
            console.log(`開始時刻: ${currentSession.createdAt.toLocaleString()}`)
            console.log(`メッセージ数: ${currentSession.messages.length}`)
            console.log(`経過時間: ${Math.floor((Date.now() - currentSession.createdAt.getTime()) / 60000)}分`)
          }
        }
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
        process.exit(1)
      }
    })

  program
    .command('autosave-config')
    .description('自動保存の設定を変更')
    .option('--enable', '自動保存を有効化')
    .option('--disable', '自動保存を無効化')
    .option('--idle-timeout <minutes>', 'アイドルタイムアウト (分)')
    .option('--max-duration <minutes>', '最大セッション時間 (分)')
    .action(async (options) => {
      try {
        await initializeServices()
        const config = await configService.getConfig()

        if (options.enable !== undefined) {
          if (!config.autoSave) {
            config.autoSave = {
              enabled: true,
              interval: 5,
              watchDirectories: [],
              filePatterns: ['*.md', '*.ts', '*.js'],
              maxSessionDuration: 2 * 60 * 60 * 1000,
              idleTimeout: 5 * 60 * 1000
            }
          }
          config.autoSave.enabled = true
        }

        if (options.disable !== undefined) {
          if (!config.autoSave) {
            config.autoSave = {
              enabled: false,
              interval: 5,
              watchDirectories: [],
              filePatterns: ['*.md', '*.ts', '*.js'],
              maxSessionDuration: 2 * 60 * 60 * 1000,
              idleTimeout: 5 * 60 * 1000
            }
          }
          config.autoSave.enabled = false
        }

        if (options.idleTimeout !== undefined) {
          if (!config.autoSave) {
            config.autoSave = {
              enabled: true,
              interval: 5,
              watchDirectories: [],
              filePatterns: ['*.md', '*.ts', '*.js'],
              maxSessionDuration: 2 * 60 * 60 * 1000,
              idleTimeout: 5 * 60 * 1000
            }
          }
          config.autoSave.idleTimeout = parseInt(options.idleTimeout) * 60 * 1000
        }

        if (options.maxDuration !== undefined) {
          if (!config.autoSave) {
            config.autoSave = {
              enabled: true,
              interval: 5,
              watchDirectories: [],
              filePatterns: ['*.md', '*.ts', '*.js'],
              maxSessionDuration: 2 * 60 * 60 * 1000,
              idleTimeout: 5 * 60 * 1000
            }
          }
          config.autoSave.maxSessionDuration = parseInt(options.maxDuration) * 60 * 1000
        }

        await configService.saveConfig(config)

        console.log(chalk.blue('\n💾 自動保存設定'))
        console.log(`自動保存: ${config.autoSave?.enabled ? chalk.green('有効') : chalk.yellow('無効')}`)
        console.log(`アイドルタイムアウト: ${(config.autoSave?.idleTimeout || 0) / 60000}分`)
        console.log(`最大セッション時間: ${(config.autoSave?.maxSessionDuration || 0) / 60000}分`)
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
        process.exit(1)
      }
    })

  // === 設定・管理コマンド ===

  program
    .command('config')
    .description('設定を表示・変更')
    .option('--show', '現在の設定を表示')
    .option('--reset', '設定をデフォルトにリセット')
    .option('--storage-dir <path>', 'ストレージディレクトリを設定')
    .option('--max-sessions <sessions>', '最大セッション数')
    .option('--max-messages <messages>', 'セッション当たり最大メッセージ数')
    .option('--enable-cleanup', '自動クリーンアップを有効化')
    .option('--disable-cleanup', '自動クリーンアップを無効化')
    .option('--cleanup-days <days>', 'クリーンアップ間隔 (日)')
    .action(async (options) => {
      try {
        if (options.reset) {
          await configService.resetToDefault()
          console.log(chalk.green('✅ 設定をデフォルトにリセットしました'))
        }

        const config = await configService.getConfig()

        if (options.storageDir) {
          config.storagePath = options.storageDir
        }

        if (options.maxSessions) {
          config.maxSessions = parseInt(options.maxSessions)
        }

        if (options.maxMessages) {
          config.maxMessagesPerSession = parseInt(options.maxMessages)
        }

        if (options.enableCleanup !== undefined) {
          config.autoCleanup = true
        }

        if (options.disableCleanup !== undefined) {
          config.autoCleanup = false
        }

        if (options.cleanupDays) {
          config.cleanupDays = parseInt(options.cleanupDays)
        }

        await configService.saveConfig(config)

        console.log(chalk.blue('\n⚙️  現在の設定'))
        console.log(`ストレージパス: ${config.storagePath}`)
        console.log(`最大セッション数: ${config.maxSessions}`)
        console.log(`セッション当たり最大メッセージ数: ${config.maxMessagesPerSession}`)
        console.log(`自動クリーンアップ: ${config.autoCleanup ? chalk.green('有効') : chalk.red('無効')}`)
      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error)
      }
    })

  // パース・実行
  await program.parseAsync()
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error(chalk.red('未処理の例外:'), error)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('未処理のPromise拒否:'), reason)
  process.exit(1)
})

// CLI実行
main().catch((error) => {
  console.error(chalk.red('CLIエラー:'), error)
  process.exit(1)
}) 