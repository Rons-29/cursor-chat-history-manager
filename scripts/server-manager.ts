#!/usr/bin/env ts-node

import fs from 'fs-extra'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

interface ServerConfig {
  ports: {
    api: number
    web: number
    backup: {
      api: number
      web: number
    }
  }
  servers: {
    [key: string]: {
      name: string
      port: number
      path: string
      command?: string
      healthEndpoint: string
      pidFile: string
    }
  }
  development: {
    autoRestart: boolean
    singleInstance: boolean
    healthCheckInterval: number
    maxStartupTime: number
    gracefulShutdownTime: number
  }
}

/**
 * サーバー管理クラス
 */
class ServerManager {
  private config!: ServerConfig
  private processes: Map<string, ChildProcess> = new Map()

  constructor() {
    this.loadConfig()
  }

  /**
   * 設定ファイルを読み込み
   */
  private loadConfig(): void {
    const configPath = path.join(PROJECT_ROOT, 'config/server-config.json')
    if (!fs.existsSync(configPath)) {
      throw new Error(`設定ファイルが見つかりません: ${configPath}`)
    }
    this.config = fs.readJsonSync(configPath)
  }

  /**
   * ポートが使用中かチェック
   */
  private async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const { spawn } = require('child_process')
      const lsof = spawn('lsof', ['-i', `:${port}`])
      
      lsof.on('close', (code: number) => {
        resolve(code === 0)
      })
    })
  }

  /**
   * PIDファイルからプロセスIDを取得
   */
  private async getPidFromFile(pidFile: string): Promise<number | null> {
    const fullPath = path.join(PROJECT_ROOT, pidFile)
    if (!fs.existsSync(fullPath)) {
      return null
    }
    
    try {
      const pid = parseInt(await fs.readFile(fullPath, 'utf8'), 10)
      return isNaN(pid) ? null : pid
    } catch {
      return null
    }
  }

  /**
   * PIDファイルにプロセスIDを保存
   */
  private async savePidToFile(pidFile: string, pid: number): Promise<void> {
    const fullPath = path.join(PROJECT_ROOT, pidFile)
    const dir = path.dirname(fullPath)
    await fs.ensureDir(dir)
    await fs.writeFile(fullPath, pid.toString())
  }

  /**
   * プロセスが実際に動作しているかチェック
   */
  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  /**
   * ヘルスチェック実行
   */
  private async healthCheck(port: number, endpoint: string): Promise<boolean> {
    try {
      const { exec } = require('child_process')
      return new Promise((resolve) => {
        exec(`curl -f http://localhost:${port}${endpoint}`, (error: any) => {
          resolve(!error)
        })
      })
    } catch {
      return false
    }
  }

  /**
   * 既存プロセスをチェックし、必要に応じて停止
   */
  private async checkExistingProcess(serverType: string): Promise<boolean> {
    const server = this.config.servers[serverType]
    const pid = await this.getPidFromFile(server.pidFile)
    
    if (!pid) {
      console.log(`✅ ${server.name}: PIDファイルが存在しません`)
      return false
    }

    if (!this.isProcessRunning(pid)) {
      console.log(`✅ ${server.name}: プロセス ${pid} は既に停止しています`)
      await fs.remove(path.join(PROJECT_ROOT, server.pidFile))
      return false
    }

    const isHealthy = await this.healthCheck(server.port, server.healthEndpoint)
    if (isHealthy) {
      console.log(`🟢 ${server.name}: 既に正常動作中 (PID: ${pid}, Port: ${server.port})`)
      return true
    } else {
      console.log(`🟡 ${server.name}: プロセスは動作中だが、ヘルスチェックに失敗 (PID: ${pid})`)
      if (this.config.development.autoRestart) {
        console.log(`🔄 ${server.name}: 自動再起動を実行します`)
        await this.stopProcess(pid)
        await fs.remove(path.join(PROJECT_ROOT, server.pidFile))
        return false
      }
      return true
    }
  }

  /**
   * プロセスを停止
   */
  private async stopProcess(pid: number): Promise<void> {
    try {
      process.kill(pid, 'SIGTERM')
      
      // グレースフル停止を待機
      await new Promise(resolve => setTimeout(resolve, this.config.development.gracefulShutdownTime))
      
      // まだ動作している場合は強制停止
      if (this.isProcessRunning(pid)) {
        console.log(`⚠️ グレースフル停止に失敗。強制停止を実行します (PID: ${pid})`)
        process.kill(pid, 'SIGKILL')
      }
    } catch (error) {
      console.log(`⚠️ プロセス停止に失敗 (PID: ${pid}):`, error)
    }
  }

  /**
   * APIサーバーを開始
   */
  async startApiServer(): Promise<void> {
    const serverType = 'api'
    const server = this.config.servers[serverType]

    // 既存プロセスチェック
    const isRunning = await this.checkExistingProcess(serverType)
    if (isRunning) {
      return
    }

    // ポート使用状況チェック
    const portInUse = await this.isPortInUse(server.port)
    if (portInUse) {
      console.log(`❌ ポート ${server.port} は他のプロセスで使用中です`)
      return
    }

    console.log(`🚀 ${server.name} を開始します...`)
    
    // ビルド実行
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    })

    await new Promise((resolve, reject) => {
      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve(undefined)
        } else {
          reject(new Error(`ビルドに失敗しました (exit code: ${code})`))
        }
      })
    })

    // サーバー起動
    const serverProcess = spawn('node', [server.path], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      detached: true
    })

    await this.savePidToFile(server.pidFile, serverProcess.pid!)
    console.log(`✅ ${server.name} が開始されました (PID: ${serverProcess.pid}, Port: ${server.port})`)
  }

  /**
   * Webサーバーを開始
   */
  async startWebServer(): Promise<void> {
    const serverType = 'web'
    const server = this.config.servers[serverType]

    // 既存プロセスチェック
    const isRunning = await this.checkExistingProcess(serverType)
    if (isRunning) {
      return
    }

    // ポート使用状況チェック
    const portInUse = await this.isPortInUse(server.port)
    if (portInUse) {
      console.log(`❌ ポート ${server.port} は他のプロセスで使用中です`)
      return
    }

    console.log(`🚀 ${server.name} を開始します...`)
    
    // Webサーバー起動
    const webProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(PROJECT_ROOT, 'web'),
      stdio: 'inherit',
      detached: true
    })

    await this.savePidToFile(server.pidFile, webProcess.pid!)
    console.log(`✅ ${server.name} が開始されました (PID: ${webProcess.pid}, Port: ${server.port})`)
  }

  /**
   * 全サーバーの状況を表示
   */
  async status(): Promise<void> {
    console.log('📊 ChatFlow サーバー状況')
    console.log('=' .repeat(50))

    for (const [serverType, server] of Object.entries(this.config.servers)) {
      const pid = await this.getPidFromFile(server.pidFile)
      const portInUse = await this.isPortInUse(server.port)
      const isHealthy = pid ? await this.healthCheck(server.port, server.healthEndpoint) : false

      console.log(`\n🔧 ${server.name}:`)
      console.log(`   ポート: ${server.port}`)
      console.log(`   PID: ${pid || 'なし'}`)
      console.log(`   ポート使用状況: ${portInUse ? '🔴 使用中' : '🟢 利用可能'}`)
      console.log(`   ヘルス状況: ${isHealthy ? '🟢 正常' : '🔴 異常'}`)
    }
  }

  /**
   * 全サーバーを停止
   */
  async stopAll(): Promise<void> {
    console.log('🛑 全サーバーを停止します...')

    for (const [serverType, server] of Object.entries(this.config.servers)) {
      const pid = await this.getPidFromFile(server.pidFile)
      if (pid && this.isProcessRunning(pid)) {
        console.log(`🛑 ${server.name} を停止します (PID: ${pid})`)
        await this.stopProcess(pid)
        await fs.remove(path.join(PROJECT_ROOT, server.pidFile))
      }
    }

    console.log('✅ 全サーバーの停止が完了しました')
  }
}

// コマンドライン実行
async function main() {
  const manager = new ServerManager()
  const command = process.argv[2]

  try {
    switch (command) {
      case 'start-api':
        await manager.startApiServer()
        break
      case 'start-web':
        await manager.startWebServer()
        break
      case 'start-all':
        await manager.startApiServer()
        await manager.startWebServer()
        break
      case 'status':
        await manager.status()
        break
      case 'stop':
        await manager.stopAll()
        break
      default:
        console.log('使用方法:')
        console.log('  npm run server:start-api   - APIサーバーのみ開始')
        console.log('  npm run server:start-web   - Webサーバーのみ開始')
        console.log('  npm run server:start-all   - 全サーバー開始')
        console.log('  npm run server:status      - サーバー状況確認')
        console.log('  npm run server:stop        - 全サーバー停止')
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { ServerManager } 