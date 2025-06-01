import fs from 'fs-extra'
import path from 'path'
import { EventEmitter } from 'events'
import { Logger } from '../server/utils/Logger.js'
import type { ChatSession, ChatMessage } from '../types/index.js'
import { v4 as uuidv4 } from 'uuid'

export interface CursorWorkspaceConfig {
  workspaceStoragePath: string
  outputPath: string
  scanInterval?: number
  maxSessions?: number
  includeMetadata?: boolean
}

export interface CursorScanResult {
  sessionsFound: number
  messagesImported: number
  duration: number
  errors: string[]
}

export class CursorWorkspaceScanner extends EventEmitter {
  private config: CursorWorkspaceConfig
  private logger: Logger
  private isScanning: boolean = false
  private scanInterval: NodeJS.Timeout | null = null

  constructor(config: CursorWorkspaceConfig, logger: Logger) {
    super()
    this.config = {
      scanInterval: 300000, // 5分
      maxSessions: 1000,
      includeMetadata: true,
      ...config
    }
    this.logger = logger
  }

  async initialize(): Promise<void> {
    try {
      await fs.ensureDir(this.config.outputPath)
      this.logger.info('CursorWorkspaceScanner initialized', {
        workspaceStoragePath: this.config.workspaceStoragePath,
        outputPath: this.config.outputPath
      })
    } catch (error) {
      throw new Error(`Failed to initialize CursorWorkspaceScanner: ${error}`)
    }
  }

  async scanWorkspaces(): Promise<CursorScanResult> {
    if (this.isScanning) {
      throw new Error('Scan already in progress')
    }

    this.isScanning = true
    const startTime = Date.now()
    const result: CursorScanResult = {
      sessionsFound: 0,
      messagesImported: 0,
      duration: 0,
      errors: []
    }

    try {
      this.logger.info('Starting Cursor workspace scan')
      
      // Cursorワークスペースディレクトリの存在確認
      if (!await fs.pathExists(this.config.workspaceStoragePath)) {
        throw new Error(`Cursor workspace path not found: ${this.config.workspaceStoragePath}`)
      }

      // ワークスペースディレクトリを走査
      const workspaceDirs = await this.findWorkspaceDirectories()
      this.logger.info(`Found ${workspaceDirs.length} workspace directories`)

      for (const workspaceDir of workspaceDirs) {
        try {
          const sessions = await this.extractSessionsFromWorkspace(workspaceDir)
          result.sessionsFound += sessions.length
          
          for (const session of sessions) {
            result.messagesImported += session.messages.length
            await this.saveSession(session)
          }
          
          this.emit('workspaceProcessed', {
            workspaceDir,
            sessionsFound: sessions.length,
            messagesImported: sessions.reduce((sum, s) => sum + s.messages.length, 0)
          })
        } catch (error) {
          const errorMsg = `Failed to process workspace ${workspaceDir}: ${error}`
          result.errors.push(errorMsg)
          this.logger.error(errorMsg)
        }
      }

      result.duration = Date.now() - startTime
      this.logger.info('Cursor workspace scan completed', result)
      
      this.emit('scanCompleted', result)
      return result
    } catch (error) {
      const errorMsg = `Scan failed: ${error}`
      result.errors.push(errorMsg)
      this.logger.error(errorMsg)
      throw error
    } finally {
      this.isScanning = false
    }
  }

  private async findWorkspaceDirectories(): Promise<string[]> {
    const workspaceDirs: string[] = []
    
    try {
      const entries = await fs.readdir(this.config.workspaceStoragePath, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const workspacePath = path.join(this.config.workspaceStoragePath, entry.name)
          
          // Cursorのチャット履歴ファイルが存在するかチェック
          const chatHistoryPath = path.join(workspacePath, 'state.vscdb')
          const chatLogsPath = path.join(workspacePath, 'logs')
          
          if (await fs.pathExists(chatHistoryPath) || await fs.pathExists(chatLogsPath)) {
            workspaceDirs.push(workspacePath)
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to find workspace directories:', error)
    }
    
    return workspaceDirs
  }

  private async extractSessionsFromWorkspace(workspaceDir: string): Promise<ChatSession[]> {
    const sessions: ChatSession[] = []
    
    try {
      // state.vscdbファイルからチャット履歴を抽出
      const stateDbPath = path.join(workspaceDir, 'state.vscdb')
      if (await fs.pathExists(stateDbPath)) {
        const stateSessions = await this.extractFromStateDb(stateDbPath, workspaceDir)
        sessions.push(...stateSessions)
      }

      // logsディレクトリからログファイルを抽出
      const logsPath = path.join(workspaceDir, 'logs')
      if (await fs.pathExists(logsPath)) {
        const logSessions = await this.extractFromLogs(logsPath, workspaceDir)
        sessions.push(...logSessions)
      }

      // その他のチャット関連ファイルを探索
      const chatFiles = await this.findChatFiles(workspaceDir)
      for (const chatFile of chatFiles) {
        try {
          const fileSessions = await this.extractFromChatFile(chatFile, workspaceDir)
          sessions.push(...fileSessions)
        } catch (error) {
          this.logger.warn(`Failed to extract from chat file ${chatFile}:`, error)
        }
      }
    } catch (error) {
      this.logger.error(`Failed to extract sessions from workspace ${workspaceDir}:`, error)
    }
    
    return sessions
  }

  private async extractFromStateDb(stateDbPath: string, workspaceDir: string): Promise<ChatSession[]> {
    const sessions: ChatSession[] = []
    
    try {
      // SQLiteデータベースの代わりに、JSONファイルとして読み込みを試行
      // 実際のCursorの実装に応じて調整が必要
      const stateContent = await fs.readFile(stateDbPath, 'utf8')
      
      // チャット履歴のパターンを検索
      const chatPatterns = [
        /"chat":\s*\[(.*?)\]/gs,
        /"messages":\s*\[(.*?)\]/gs,
        /"conversation":\s*\[(.*?)\]/gs
      ]
      
      for (const pattern of chatPatterns) {
        const matches = stateContent.match(pattern)
        if (matches) {
          for (const match of matches) {
            try {
              const chatData = JSON.parse(`{${match}}`)
              const session = this.createSessionFromChatData(chatData, workspaceDir)
              if (session) {
                sessions.push(session)
              }
            } catch (error) {
              // JSON解析エラーは無視して続行
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to extract from state.vscdb ${stateDbPath}:`, error)
    }
    
    return sessions
  }

  private async extractFromLogs(logsPath: string, workspaceDir: string): Promise<ChatSession[]> {
    const sessions: ChatSession[] = []
    
    try {
      const logFiles = await fs.readdir(logsPath)
      
      for (const logFile of logFiles) {
        if (logFile.endsWith('.log') || logFile.endsWith('.json')) {
          const logFilePath = path.join(logsPath, logFile)
          try {
            const logContent = await fs.readFile(logFilePath, 'utf8')
            const logSessions = await this.parseLogContent(logContent, workspaceDir)
            sessions.push(...logSessions)
          } catch (error) {
            this.logger.warn(`Failed to read log file ${logFilePath}:`, error)
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to extract from logs ${logsPath}:`, error)
    }
    
    return sessions
  }

  private async findChatFiles(workspaceDir: string): Promise<string[]> {
    const chatFiles: string[] = []
    
    try {
      const findChatFilesRecursive = async (dir: string, depth: number = 0): Promise<void> => {
        if (depth > 3) return // 深度制限
        
        const entries = await fs.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await findChatFilesRecursive(fullPath, depth + 1)
          } else if (entry.isFile()) {
            // チャット関連ファイルのパターン
            if (entry.name.includes('chat') || 
                entry.name.includes('conversation') || 
                entry.name.includes('message') ||
                entry.name.endsWith('.chat') ||
                entry.name.endsWith('.conversation')) {
              chatFiles.push(fullPath)
            }
          }
        }
      }
      
      await findChatFilesRecursive(workspaceDir)
    } catch (error) {
      this.logger.warn(`Failed to find chat files in ${workspaceDir}:`, error)
    }
    
    return chatFiles
  }

  private async extractFromChatFile(chatFilePath: string, workspaceDir: string): Promise<ChatSession[]> {
    const sessions: ChatSession[] = []
    
    try {
      const content = await fs.readFile(chatFilePath, 'utf8')
      
      // JSONファイルの場合
      if (chatFilePath.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content)
          const session = this.createSessionFromChatData(jsonData, workspaceDir)
          if (session) {
            sessions.push(session)
          }
        } catch (error) {
          // JSON解析エラーの場合はテキストとして処理
        }
      }
      
      // テキストファイルの場合
      const textSessions = await this.parseLogContent(content, workspaceDir)
      sessions.push(...textSessions)
    } catch (error) {
      this.logger.warn(`Failed to extract from chat file ${chatFilePath}:`, error)
    }
    
    return sessions
  }

  private async parseLogContent(content: string, workspaceDir: string): Promise<ChatSession[]> {
    const sessions: ChatSession[] = []
    
    try {
      // ログ内容からチャットメッセージを抽出
      const lines = content.split('\n')
      let currentSession: ChatSession | null = null
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            // JSON形式のログエントリを試行
            const logEntry = JSON.parse(line)
            if (logEntry.type === 'chat' || logEntry.message || logEntry.content) {
              if (!currentSession) {
                currentSession = this.createNewSession(workspaceDir)
              }
              
              const message = this.createMessageFromLogEntry(logEntry)
              if (message) {
                currentSession.messages.push(message)
              }
            }
          } catch (error) {
            // JSON解析失敗の場合はテキストメッセージとして処理
            if (line.includes('user:') || line.includes('assistant:') || line.includes('system:')) {
              if (!currentSession) {
                currentSession = this.createNewSession(workspaceDir)
              }
              
              const message = this.createMessageFromText(line)
              if (message) {
                currentSession.messages.push(message)
              }
            }
          }
        }
      }
      
      if (currentSession && currentSession.messages.length > 0) {
        sessions.push(currentSession)
      }
    } catch (error) {
      this.logger.warn('Failed to parse log content:', error)
    }
    
    return sessions
  }

  private createSessionFromChatData(chatData: any, workspaceDir: string): ChatSession | null {
    try {
      const session: ChatSession = {
        id: chatData.id || uuidv4(),
        title: chatData.title || this.generateSessionTitle(workspaceDir),
        startTime: new Date(chatData.createdAt || chatData.timestamp || Date.now()),
        createdAt: new Date(chatData.createdAt || chatData.timestamp || Date.now()),
        updatedAt: new Date(chatData.updatedAt || chatData.timestamp || Date.now()),
        messages: [],
        tags: chatData.tags || ['cursor', 'imported'],
        metadata: {
          source: 'cursor',
          project: workspaceDir,
          originalId: chatData.id,
          ...chatData.metadata
        }
      }
      
      // メッセージの変換
      if (chatData.messages && Array.isArray(chatData.messages)) {
        session.messages = chatData.messages.map((msg: any) => this.createMessageFromData(msg)).filter(Boolean)
      } else if (chatData.chat && Array.isArray(chatData.chat)) {
        session.messages = chatData.chat.map((msg: any) => this.createMessageFromData(msg)).filter(Boolean)
      }
      
      return session.messages.length > 0 ? session : null
    } catch (error) {
      this.logger.warn('Failed to create session from chat data:', error)
      return null
    }
  }

  private createNewSession(workspaceDir: string): ChatSession {
    return {
      id: uuidv4(),
      title: this.generateSessionTitle(workspaceDir),
      startTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      tags: ['cursor', 'imported'],
      metadata: {
        source: 'cursor',
        project: workspaceDir
      }
    }
  }

  private createMessageFromData(msgData: any): ChatMessage | null {
    try {
      return {
        id: msgData.id || uuidv4(),
        role: this.normalizeRole(msgData.role || msgData.type || 'user'),
        content: msgData.content || msgData.text || msgData.message || '',
        timestamp: new Date(msgData.timestamp || msgData.createdAt || Date.now()),
        metadata: {
          originalId: msgData.id,
          ...msgData.metadata
        }
      }
    } catch (error) {
      return null
    }
  }

  private createMessageFromLogEntry(logEntry: any): ChatMessage | null {
    try {
      return {
        id: uuidv4(),
        role: this.normalizeRole(logEntry.role || logEntry.type || 'user'),
        content: logEntry.content || logEntry.message || logEntry.text || '',
        timestamp: new Date(logEntry.timestamp || Date.now()),
        metadata: {
          logEntry: true,
          ...logEntry.metadata
        }
      }
    } catch (error) {
      return null
    }
  }

  private createMessageFromText(text: string): ChatMessage | null {
    try {
      const roleMatch = text.match(/^(user|assistant|system):\s*(.*)$/i)
      if (roleMatch) {
        return {
          id: uuidv4(),
          role: this.normalizeRole(roleMatch[1]),
          content: roleMatch[2].trim(),
          timestamp: new Date(),
          metadata: {}
        }
      }
      
      // ロールが明示されていない場合はユーザーメッセージとして扱う
      return {
        id: uuidv4(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
        metadata: {}
      }
    } catch (error) {
      return null
    }
  }

  private normalizeRole(role: string): 'user' | 'assistant' | 'system' {
    const normalized = role.toLowerCase()
    if (normalized.includes('assistant') || normalized.includes('ai') || normalized.includes('bot')) {
      return 'assistant'
    } else if (normalized.includes('system')) {
      return 'system'
    } else {
      return 'user'
    }
  }

  private generateSessionTitle(workspaceDir: string): string {
    const workspaceName = path.basename(workspaceDir)
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
    return `Cursor Session - ${workspaceName} (${timestamp})`
  }

  private async saveSession(session: ChatSession): Promise<void> {
    try {
      const sessionPath = path.join(this.config.outputPath, `${session.id}.json`)
      await fs.writeJson(sessionPath, session, { spaces: 2 })
      this.logger.debug(`Session saved: ${session.id}`)
    } catch (error) {
      this.logger.error(`Failed to save session ${session.id}:`, error)
    }
  }

  async startAutoScan(): Promise<void> {
    if (this.scanInterval) {
      return
    }

    this.logger.info(`Starting auto scan with interval: ${this.config.scanInterval}ms`)
    
    this.scanInterval = setInterval(async () => {
      try {
        await this.scanWorkspaces()
      } catch (error) {
        this.logger.error('Auto scan failed:', error)
      }
    }, this.config.scanInterval)
  }

  async stopAutoScan(): Promise<void> {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
      this.logger.info('Auto scan stopped')
    }
  }

  isAutoScanRunning(): boolean {
    return this.scanInterval !== null
  }
} 