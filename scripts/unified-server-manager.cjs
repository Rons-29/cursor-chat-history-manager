#!/usr/bin/env node

/**
 * ChatFlow 統一サーバー管理システム
 * - 既存システム完全保護
 * - CommonJSベース安全実装
 * - ポート統一管理・重複起動防止
 */

const fs = require('fs-extra')
const path = require('path')
const { spawn, exec } = require('child_process')

const PROJECT_ROOT = path.resolve(__dirname, '..')

class UnifiedServerManager {
  constructor() {
    this.config = this.loadConfig()
  }

  /**
   * 設定ファイルを読み込み
   */
  loadConfig() {
    const configPath = path.join(PROJECT_ROOT, 'config/server-config.json')
    if (!fs.existsSync(configPath)) {
      // デフォルト設定で動作
      return {
        ports: { api: 3001, web: 5173 },
        servers: {
          api: {
            name: "Real API Server",
            port: 3001,
            command: ["npm", "run", "server"],
            healthEndpoint: "/api/health",
            pidFile: "data/.api-server.pid"
          },
          web: {
            name: "Web UI Server",
            port: 5173,
            command: ["npm", "run", "web"],
            healthEndpoint: "/",
            pidFile: "data/.web-server.pid"
          }
        }
      }
    }
    return fs.readJsonSync(configPath)
  }

  /**
   * ポートが使用中かチェック
   */
  async isPortInUse(port) {
    return new Promise((resolve) => {
      exec(`lsof -i :${port}`, (error) => {
        resolve(!error) // エラーなし = ポート使用中
      })
    })
  }

  /**
   * PID管理
   */
  async getPidFromFile(pidFile) {
    const fullPath = path.join(PROJECT_ROOT, pidFile)
    if (!fs.existsSync(fullPath)) return null
    
    try {
      const pid = parseInt(await fs.readFile(fullPath, 'utf8'), 10)
      return isNaN(pid) ? null : pid
    } catch {
      return null
    }
  }

  async savePidToFile(pidFile, pid) {
    const fullPath = path.join(PROJECT_ROOT, pidFile)
    const dir = path.dirname(fullPath)
    await fs.ensureDir(dir)
    await fs.writeFile(fullPath, pid.toString())
  }

  isProcessRunning(pid) {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(port, endpoint) {
    return new Promise((resolve) => {
      exec(`curl -f -s --max-time 5 http://localhost:${port}${endpoint}`, (error) => {
        resolve(!error)
      })
    })
  }

  /**
   * サーバー状況表示
   */
  async status() {
    console.log('📊 ChatFlow サーバー統一管理')
    console.log('='.repeat(60))

    for (const [serverType, server] of Object.entries(this.config.servers)) {
      const pid = await this.getPidFromFile(server.pidFile)
      const portInUse = await this.isPortInUse(server.port)
      const isHealthy = pid && this.isProcessRunning(pid) ? 
        await this.healthCheck(server.port, server.healthEndpoint) : false

      console.log(`\n🔧 ${server.name}:`)
      console.log(`   ポート: ${server.port}`)
      console.log(`   PID: ${pid || 'なし'}`)
      console.log(`   プロセス: ${pid && this.isProcessRunning(pid) ? '🟢 動作中' : '🔴 停止中'}`)
      console.log(`   ポート: ${portInUse ? '🔴 使用中' : '🟢 利用可能'}`)
      console.log(`   ヘルス: ${isHealthy ? '🟢 正常' : '🔴 異常'}`)
      
      // 統合判定
      if (pid && this.isProcessRunning(pid) && isHealthy) {
        console.log(`   ✅ 正常動作中`)
      } else if (portInUse && !pid) {
        console.log(`   ⚠️ 外部プロセスがポート使用中`)
      } else {
        console.log(`   ❌ 停止中または異常`)
      }
    }

    // 推奨アクション表示
    console.log('\n📋 利用可能なコマンド:')
    console.log('  npm run server:start-api   - APIサーバー開始')
    console.log('  npm run server:start-web   - Webサーバー開始') 
    console.log('  npm run server:restart     - 全サーバー再起動')
    console.log('  npm run server:stop        - 全サーバー停止')
    console.log('  npm run server:health      - ヘルスチェック実行')
  }

  /**
   * 既存プロセスチェックとクリーンアップ
   */
  async checkAndCleanupExisting(serverType) {
    const server = this.config.servers[serverType]
    const pid = await this.getPidFromFile(server.pidFile)
    
    if (!pid) {
      console.log(`✅ ${server.name}: 新規起動準備完了`)
      return false
    }

    if (!this.isProcessRunning(pid)) {
      console.log(`🧹 ${server.name}: 古いPIDファイルをクリーンアップ`)
      await fs.remove(path.join(PROJECT_ROOT, server.pidFile))
      return false
    }

    const isHealthy = await this.healthCheck(server.port, server.healthEndpoint)
    if (isHealthy) {
      console.log(`🟢 ${server.name}: 既に正常動作中 (PID: ${pid})`)
      return true
    } else {
      console.log(`🟡 ${server.name}: プロセス動作中だがヘルスチェック失敗`)
      console.log(`🔄 自動再起動を実行します...`)
      await this.stopProcess(pid)
      await fs.remove(path.join(PROJECT_ROOT, server.pidFile))
      return false
    }
  }

  /**
   * プロセス停止
   */
  async stopProcess(pid) {
    try {
      console.log(`🛑 プロセス停止: PID ${pid}`)
      process.kill(pid, 'SIGTERM')
      
      // グレースフル停止を待機
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      if (this.isProcessRunning(pid)) {
        console.log(`⚠️ 強制停止実行: PID ${pid}`)
        process.kill(pid, 'SIGKILL')
      }
    } catch (error) {
      console.log(`⚠️ プロセス停止失敗 (PID: ${pid}):`, error.message)
    }
  }

  /**
   * APIサーバー開始 (既存コマンド活用)
   */
  async startApiServer() {
    const serverType = 'api'
    const server = this.config.servers[serverType]

    const isRunning = await this.checkAndCleanupExisting(serverType)
    if (isRunning) return

    const portInUse = await this.isPortInUse(server.port)
    if (portInUse) {
      console.log(`❌ ポート ${server.port} は他のプロセスで使用中です`)
      console.log(`💡 'npm run server:stop' で停止してから再試行してください`)
      return
    }

    console.log(`🚀 ${server.name} を開始中...`)
    
    // 既存コマンド活用（非破壊的）
    if (!server.command || !Array.isArray(server.command)) {
      console.log(`❌ コマンド設定エラー:`, server.command)
      return
    }
    const serverProcess = spawn(server.command[0], server.command.slice(1), {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      detached: false
    })

    // PID保存（非同期）
    setTimeout(async () => {
      if (serverProcess.pid) {
        await this.savePidToFile(server.pidFile, serverProcess.pid)
        console.log(`✅ ${server.name} 開始完了 (PID: ${serverProcess.pid}, ポート: ${server.port})`)
      }
    }, 2000)
  }

  /**
   * Webサーバー開始 (既存コマンド活用)
   */
  async startWebServer() {
    const serverType = 'web'
    const server = this.config.servers[serverType]

    const isRunning = await this.checkAndCleanupExisting(serverType)
    if (isRunning) return

    const portInUse = await this.isPortInUse(server.port)
    if (portInUse) {
      console.log(`❌ ポート ${server.port} は他のプロセスで使用中です`)
      return
    }

    console.log(`🚀 ${server.name} を開始中...`)
    
    // 既存コマンド活用
    const webProcess = spawn(server.command[0], server.command.slice(1), {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      detached: false
    })

    setTimeout(async () => {
      if (webProcess.pid) {
        await this.savePidToFile(server.pidFile, webProcess.pid)
        console.log(`✅ ${server.name} 開始完了 (PID: ${webProcess.pid}, ポート: ${server.port})`)
      }
    }, 2000)
  }

  /**
   * 全サーバー停止
   */
  async stopAll() {
    console.log('🛑 ChatFlow全サーバー停止中...')

    for (const [serverType, server] of Object.entries(this.config.servers)) {
      const pid = await this.getPidFromFile(server.pidFile)
      if (pid && this.isProcessRunning(pid)) {
        console.log(`🛑 ${server.name} 停止中...`)
        await this.stopProcess(pid)
        await fs.remove(path.join(PROJECT_ROOT, server.pidFile))
      }
    }

    console.log('✅ 全サーバー停止完了')
  }

  /**
   * ヘルスチェック実行
   */
  async healthCheckAll() {
    console.log('🏥 ChatFlow ヘルスチェック実行中...')
    
    let allHealthy = true
    for (const [serverType, server] of Object.entries(this.config.servers)) {
      const pid = await this.getPidFromFile(server.pidFile)
      const isHealthy = pid && this.isProcessRunning(pid) ? 
        await this.healthCheck(server.port, server.healthEndpoint) : false
      
      console.log(`${isHealthy ? '🟢' : '🔴'} ${server.name}: ${isHealthy ? '正常' : '異常'}`)
      
      if (!isHealthy) allHealthy = false
    }
    
    console.log(`\n📊 総合ヘルス: ${allHealthy ? '🟢 正常' : '🔴 要対応'}`)
    return allHealthy
  }

  /**
   * 全サーバー再起動
   */
  async restart() {
    console.log('🔄 ChatFlow全サーバー再起動中...')
    
    await this.stopAll()
    
    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // APIサーバーから開始
    console.log('🚀 サーバー順次起動中...')
    await this.startApiServer()
    
    // 少し待ってからWebサーバー
    setTimeout(async () => {
      await this.startWebServer()
    }, 5000)
  }
}

// コマンドライン実行
async function main() {
  const manager = new UnifiedServerManager()
  const command = process.argv[2]

  try {
    switch (command) {
      case 'start-api':
        await manager.startApiServer()
        break
      case 'start-web':
        await manager.startWebServer()
        break
      case 'restart':
        await manager.restart()
        break
      case 'status':
        await manager.status()
        break
      case 'stop':
        await manager.stopAll()
        break
      case 'health':
        await manager.healthCheckAll()
        break
      default:
        console.log('🎯 ChatFlow 統一サーバー管理')
        console.log('使用方法:')
        console.log('  npm run server:start-api   - APIサーバー開始')
        console.log('  npm run server:start-web   - Webサーバー開始')
        console.log('  npm run server:restart     - 全サーバー再起動')
        console.log('  npm run server:status      - サーバー状況確認')
        console.log('  npm run server:stop        - 全サーバー停止')
        console.log('  npm run server:health      - ヘルスチェック')
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { UnifiedServerManager } 