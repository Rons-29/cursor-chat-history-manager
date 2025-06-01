import { Logger } from './Logger.js'
import { EventEmitter } from 'events'
import crypto from 'crypto'

interface User {
  id: string
  username: string
  roles: string[]
  permissions: string[]
  lastLogin?: Date
}

interface AccessLog {
  userId: string
  action: string
  resource: string
  timestamp: Date
  success: boolean
  details?: Record<string, unknown>
}

interface AccessControlConfig {
  maxLoginAttempts: number
  lockoutDuration: number
  sessionTimeout: number
  passwordPolicy: {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
  }
}

export class AccessControl extends EventEmitter {
  private logger: Logger
  private users: Map<string, User> = new Map()
  private sessions: Map<string, { userId: string; expires: Date }> = new Map()
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map()
  private accessLogs: AccessLog[] = []
  private config: AccessControlConfig

  constructor(logger: Logger, config: Partial<AccessControlConfig> = {}) {
    super()
    this.logger = logger
    this.config = {
      maxLoginAttempts: config.maxLoginAttempts ?? 5,
      lockoutDuration: config.lockoutDuration ?? 15 * 60 * 1000, // 15分
      sessionTimeout: config.sessionTimeout ?? 24 * 60 * 60 * 1000, // 24時間
      passwordPolicy: {
        minLength: config.passwordPolicy?.minLength ?? 8,
        requireUppercase: config.passwordPolicy?.requireUppercase ?? true,
        requireLowercase: config.passwordPolicy?.requireLowercase ?? true,
        requireNumbers: config.passwordPolicy?.requireNumbers ?? true,
        requireSpecialChars: config.passwordPolicy?.requireSpecialChars ?? true,
      },
    }
  }

  async createUser(username: string, password: string, roles: string[] = []): Promise<User> {
    if (this.users.has(username)) {
      throw new Error('ユーザーは既に存在します')
    }

    if (!this.validatePassword(password)) {
      throw new Error('パスワードがポリシーを満たしていません')
    }

    const hashedPassword = await this.hashPassword(password)
    const user: User = {
      id: crypto.randomUUID(),
      username,
      roles,
      permissions: this.getDefaultPermissions(roles),
    }

    this.users.set(username, user)
    this.logger.info('ユーザーが作成されました', { username, roles })

    return user
  }

  async login(username: string, password: string): Promise<string> {
    const attempts = this.loginAttempts.get(username)
    if (attempts && attempts.count >= this.config.maxLoginAttempts) {
      const lockoutTime = attempts.lastAttempt.getTime() + this.config.lockoutDuration
      if (Date.now() < lockoutTime) {
        throw new Error('アカウントがロックされています')
      }
      this.loginAttempts.delete(username)
    }

    const user = this.users.get(username)
    if (!user) {
      this.recordLoginAttempt(username, false)
      throw new Error('ユーザーが見つかりません')
    }

    const hashedPassword = await this.hashPassword(password)
    if (!await this.verifyPassword(password, hashedPassword)) {
      this.recordLoginAttempt(username, false)
      throw new Error('パスワードが正しくありません')
    }

    this.recordLoginAttempt(username, true)
    user.lastLogin = new Date()

    const sessionId = crypto.randomUUID()
    this.sessions.set(sessionId, {
      userId: user.id,
      expires: new Date(Date.now() + this.config.sessionTimeout),
    })

    return sessionId
  }

  async logout(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  async checkAccess(sessionId: string, action: string, resource: string): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      this.logAccess(sessionId, action, resource, false, { reason: 'セッションが無効' })
      return false
    }

    if (session.expires < new Date()) {
      this.sessions.delete(sessionId)
      this.logAccess(sessionId, action, resource, false, { reason: 'セッションが期限切れ' })
      return false
    }

    const user = Array.from(this.users.values()).find(u => u.id === session.userId)
    if (!user) {
      this.logAccess(sessionId, action, resource, false, { reason: 'ユーザーが見つからない' })
      return false
    }

    const hasPermission = this.checkPermission(user, action, resource)
    this.logAccess(sessionId, action, resource, hasPermission)

    return hasPermission
  }

  private validatePassword(password: string): boolean {
    const { minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars } = this.config.passwordPolicy

    if (password.length < minLength) return false
    if (requireUppercase && !/[A-Z]/.test(password)) return false
    if (requireLowercase && !/[a-z]/.test(password)) return false
    if (requireNumbers && !/\d/.test(password)) return false
    if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false

    return true
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex')
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err)
        resolve(salt + ':' + derivedKey.toString('hex'))
      })
    })
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':')
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err)
        resolve(key === derivedKey.toString('hex'))
      })
    })
  }

  private getDefaultPermissions(roles: string[]): string[] {
    const permissions = new Set<string>()
    for (const role of roles) {
      switch (role) {
        case 'admin':
          permissions.add('*')
          break
        case 'user':
          permissions.add('read:*')
          permissions.add('write:own')
          break
        case 'guest':
          permissions.add('read:public')
          break
      }
    }
    return Array.from(permissions)
  }

  private checkPermission(user: User, action: string, resource: string): boolean {
    if (user.permissions.includes('*')) return true

    const permission = `${action}:${resource}`
    return user.permissions.some(p => {
      if (p === permission) return true
      if (p.endsWith(':*') && permission.startsWith(p.slice(0, -2))) return true
      return false
    })
  }

  private recordLoginAttempt(username: string, success: boolean): void {
    const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: new Date() }
    attempts.count = success ? 0 : attempts.count + 1
    attempts.lastAttempt = new Date()
    this.loginAttempts.set(username, attempts)
  }

  private logAccess(
    sessionId: string,
    action: string,
    resource: string,
    success: boolean,
    details?: Record<string, unknown>
  ): void {
    const session = this.sessions.get(sessionId)
    const log: AccessLog = {
      userId: session?.userId ?? 'unknown',
      action,
      resource,
      timestamp: new Date(),
      success,
      details,
    }
    this.accessLogs.push(log)
    this.emit('access', log)
  }

  getAccessLogs(options: {
    userId?: string
    action?: string
    resource?: string
    startDate?: Date
    endDate?: Date
    success?: boolean
  } = {}): AccessLog[] {
    return this.accessLogs.filter(log => {
      if (options.userId && log.userId !== options.userId) return false
      if (options.action && log.action !== options.action) return false
      if (options.resource && log.resource !== options.resource) return false
      if (options.startDate && log.timestamp < options.startDate) return false
      if (options.endDate && log.timestamp > options.endDate) return false
      if (options.success !== undefined && log.success !== options.success) return false
      return true
    })
  }
} 