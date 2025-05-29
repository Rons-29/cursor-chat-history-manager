/**
 * Git Service
 * .mdcルール準拠: バージョン管理とバックアップ機能
 */

import { execSync, exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface GitStatus {
  isGitRepo: boolean
  hasChanges: boolean
  currentBranch?: string
  lastCommit?: {
    hash: string
    message: string
    date: string
    author: string
  }
  uncommittedFiles: string[]
}

export interface GitCommitOptions {
  message: string
  addAll?: boolean
  author?: string
}

/**
 * Git操作を管理するサービス
 */
export class GitService {
  private repoPath: string

  constructor(repoPath: string) {
    this.repoPath = repoPath
  }

  /**
   * Gitリポジトリかどうかをチェック
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await fs.access(path.join(this.repoPath, '.git'))
      return true
    } catch {
      return false
    }
  }

  /**
   * Gitリポジトリを初期化
   */
  async initRepository(): Promise<void> {
    try {
      execSync('git init', { cwd: this.repoPath })
      
      // .gitignoreが存在しない場合は作成
      const gitignorePath = path.join(this.repoPath, '.gitignore')
      try {
        await fs.access(gitignorePath)
      } catch {
        await this.createDefaultGitignore()
      }
    } catch (error) {
      throw new Error(`Gitリポジトリの初期化に失敗: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * デフォルトの.gitignoreを作成
   */
  private async createDefaultGitignore(): Promise<void> {
    const gitignoreContent = `# Chat History Manager - Git除外設定

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm
.yarn-integrity

# TypeScript
*.tsbuildinfo
dist/

# 環境変数
.env
.env.local
.env.development.local
.env.test.local
# .env.production.local

# ログファイル
logs/
*.log

# ランタイムデータ
pids/
*.pid
*.seed
*.pid.lock

# キャッシュ
.cache/
.temp/
tmp/

# IDEファイル
.vscode/
.idea/
*.swp
*.swo
*~

# OS生成ファイル
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# カバレッジレポート
coverage/
.nyc_output/

# 依存関係分析
.pnp.*
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz

# Chat History Manager 固有
# データファイル (セキュリティ上の理由で除外)
data/sessions/**/*.json
data/exports/**/*
data/backups/**/*

# 設定ファイル (個人設定を除外)
config/local.json
config/personal.json

# 一時ファイル
*.tmp
*.temp
.chat-history-manager.lock

# ビルド成果物
web/dist/
*.tgz

# テスト結果
test-results/
playwright-report/
test-results.xml
`

    const gitignorePath = path.join(this.repoPath, '.gitignore')
    await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8')
  }

  /**
   * Git状態を取得
   */
  async getStatus(): Promise<GitStatus> {
    const isRepo = await this.isGitRepository()
    
    if (!isRepo) {
      return {
        isGitRepo: false,
        hasChanges: false,
        uncommittedFiles: []
      }
    }

    try {
      // 現在のブランチを取得
      const { stdout: branchOutput } = await execAsync('git branch --show-current', { cwd: this.repoPath })
      const currentBranch = branchOutput.trim()

      // 未コミットファイルを取得
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: this.repoPath })
      const uncommittedFiles = statusOutput.split('\n').filter(line => line.trim()).map(line => line.slice(3))
      const hasChanges = uncommittedFiles.length > 0

      // 最新コミット情報を取得
      let lastCommit
      try {
        const { stdout: logOutput } = await execAsync('git log -1 --pretty=format:"%H|%s|%ad|%an" --date=iso', { cwd: this.repoPath })
        const [hash, message, date, author] = logOutput.split('|')
        lastCommit = { hash, message, date, author }
      } catch {
        // コミットがない場合は無視
      }

      return {
        isGitRepo: true,
        hasChanges,
        currentBranch,
        lastCommit,
        uncommittedFiles
      }
    } catch (error) {
      throw new Error(`Git状態取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * ファイルを追加
   */
  async addFiles(files: string[] = ['.']): Promise<void> {
    try {
      const fileArgs = files.join(' ')
      execSync(`git add ${fileArgs}`, { cwd: this.repoPath })
    } catch (error) {
      throw new Error(`ファイル追加エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * コミット実行
   */
  async commit(options: GitCommitOptions): Promise<string> {
    try {
      if (options.addAll) {
        await this.addFiles()
      }

      let command = `git commit -m "${options.message}"`
      
      if (options.author) {
        command += ` --author="${options.author}"`
      }

      const { stdout } = await execAsync(command, { cwd: this.repoPath })
      
      // コミットハッシュを取得
      const { stdout: hashOutput } = await execAsync('git rev-parse HEAD', { cwd: this.repoPath })
      return hashOutput.trim()
    } catch (error) {
      throw new Error(`コミットエラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * 自動バックアップコミット
   */
  async autoBackup(description?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const message = description ? 
      `Auto backup: ${description} (${timestamp})` : 
      `Auto backup: ${timestamp}`

    return await this.commit({
      message,
      addAll: true,
      author: 'Chat History Manager <auto-backup@local>'
    })
  }

  /**
   * コミット履歴を取得
   */
  async getCommitHistory(limit: number = 10): Promise<Array<{
    hash: string
    message: string
    date: string
    author: string
  }>> {
    try {
      const { stdout } = await execAsync(
        `git log -${limit} --pretty=format:"%H|%s|%ad|%an" --date=iso`,
        { cwd: this.repoPath }
      )

      return stdout.split('\n').map(line => {
        const [hash, message, date, author] = line.split('|')
        return { hash, message, date, author }
      })
    } catch (error) {
      throw new Error(`コミット履歴取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * 特定のコミットに戻す
   */
  async resetToCommit(commitHash: string, hard: boolean = false): Promise<void> {
    try {
      const resetType = hard ? '--hard' : '--soft'
      execSync(`git reset ${resetType} ${commitHash}`, { cwd: this.repoPath })
    } catch (error) {
      throw new Error(`リセットエラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * ブランチを作成
   */
  async createBranch(branchName: string, checkout: boolean = true): Promise<void> {
    try {
      execSync(`git branch ${branchName}`, { cwd: this.repoPath })
      
      if (checkout) {
        execSync(`git checkout ${branchName}`, { cwd: this.repoPath })
      }
    } catch (error) {
      throw new Error(`ブランチ作成エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * ブランチを切り替え
   */
  async checkoutBranch(branchName: string): Promise<void> {
    try {
      execSync(`git checkout ${branchName}`, { cwd: this.repoPath })
    } catch (error) {
      throw new Error(`ブランチ切り替えエラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * ブランチ一覧を取得
   */
  async getBranches(): Promise<{ current: string; all: string[] }> {
    try {
      const { stdout } = await execAsync('git branch', { cwd: this.repoPath })
      const branches = stdout.split('\n').map(line => line.trim()).filter(line => line)
      
      const current = branches.find(branch => branch.startsWith('*'))?.slice(2) || ''
      const all = branches.map(branch => branch.replace(/^\*\s*/, ''))

      return { current, all }
    } catch (error) {
      throw new Error(`ブランチ取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * ファイルの変更差分を取得
   */
  async getDiff(file?: string): Promise<string> {
    try {
      const command = file ? `git diff ${file}` : 'git diff'
      const { stdout } = await execAsync(command, { cwd: this.repoPath })
      return stdout
    } catch (error) {
      throw new Error(`差分取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * リモートリポジトリを追加
   */
  async addRemote(name: string, url: string): Promise<void> {
    try {
      execSync(`git remote add ${name} ${url}`, { cwd: this.repoPath })
    } catch (error) {
      throw new Error(`リモート追加エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * リモートにプッシュ
   */
  async push(remote: string = 'origin', branch?: string): Promise<void> {
    try {
      const branchArg = branch ? ` ${branch}` : ''
      execSync(`git push ${remote}${branchArg}`, { cwd: this.repoPath })
    } catch (error) {
      throw new Error(`プッシュエラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * リモートからプル
   */
  async pull(remote: string = 'origin', branch?: string): Promise<void> {
    try {
      const branchArg = branch ? ` ${branch}` : ''
      execSync(`git pull ${remote}${branchArg}`, { cwd: this.repoPath })
    } catch (error) {
      throw new Error(`プルエラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * 設定を追加/更新
   */
  async setConfig(key: string, value: string, global: boolean = false): Promise<void> {
    try {
      const scope = global ? '--global' : '--local'
      execSync(`git config ${scope} ${key} "${value}"`, { cwd: this.repoPath })
    } catch (error) {
      throw new Error(`設定エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * タグを作成
   */
  async createTag(tagName: string, message?: string): Promise<void> {
    try {
      const messageArg = message ? ` -m "${message}"` : ''
      execSync(`git tag ${tagName}${messageArg}`, { cwd: this.repoPath })
    } catch (error) {
      throw new Error(`タグ作成エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * タグ一覧を取得
   */
  async getTags(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git tag', { cwd: this.repoPath })
      return stdout.split('\n').filter(tag => tag.trim())
    } catch (error) {
      throw new Error(`タグ取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }
} 