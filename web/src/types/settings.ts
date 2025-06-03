/**
 * 設定関連の型定義
 */

// 一般設定
export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'ja' | 'en'
  timezone: string
  dateFormat: '24h' | '12h'
  sessionsPerPage: 10 | 25 | 50 | 100
  notifications: {
    desktop: boolean
    newSession: boolean
    errors: boolean
  }
  performance: {
    cacheSize: number
    maxConnections: number
    autoUpdateInterval: number
  }
}

// セキュリティ設定
export interface SecuritySettings {
  encryption: {
    enabled: boolean
    algorithm: 'AES-256' | 'ChaCha20'
    keyRotationDays: number
  }
  access: {
    apiRestriction: boolean
    allowedIPs: string[]
    requireAuth: boolean
  }
  privacy: {
    autoMasking: boolean
    logLevel: 'error' | 'warn' | 'info' | 'debug'
    dataRetentionDays: number
  }
  audit: {
    enabled: boolean
    accessLog: boolean
    operationLog: boolean
  }
}

// バックアップ設定
export interface BackupSettings {
  auto: {
    enabled: boolean
    interval: 'hourly' | 'daily' | 'weekly'
    retentionDays: number
  }
  destinations: {
    local: {
      enabled: boolean
      path: string
    }
    cloud: {
      enabled: boolean
      provider: 'aws' | 'gcp' | 'azure' | 'none'
      credentials: Record<string, string>
    }
  }
  include: {
    sessions: boolean
    settings: boolean
    indexes: boolean
    logs: boolean
  }
  integrity: {
    checksumValidation: boolean
    compressionLevel: number
    encryptBackups: boolean
  }
}

// バックアップアイテム情報
export interface BackupItem {
  id: string
  name: string
  date: string
  size: number
  type: 'manual' | 'auto'
  status: 'completed' | 'failed' | 'in-progress'
  checksum?: string
  includes: {
    sessions: boolean
    settings: boolean
    indexes: boolean
    logs: boolean
  }
}

// セキュリティ監査ログ
export interface SecurityAuditLog {
  id: string
  timestamp: string
  type: 'access' | 'operation' | 'security'
  level: 'info' | 'warn' | 'error'
  message: string
  source: string
  metadata?: Record<string, any>
}

// デフォルト設定値
export const defaultGeneralSettings: GeneralSettings = {
  theme: 'system',
  language: 'ja',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: '24h',
  sessionsPerPage: 25,
  notifications: {
    desktop: true,
    newSession: true,
    errors: true
  },
  performance: {
    cacheSize: 100,
    maxConnections: 10,
    autoUpdateInterval: 30
  }
}

export const defaultSecuritySettings: SecuritySettings = {
  encryption: {
    enabled: false,
    algorithm: 'AES-256',
    keyRotationDays: 30
  },
  access: {
    apiRestriction: false,
    allowedIPs: [],
    requireAuth: false
  },
  privacy: {
    autoMasking: true,
    logLevel: 'info',
    dataRetentionDays: 365
  },
  audit: {
    enabled: false,
    accessLog: false,
    operationLog: false
  }
}

export const defaultBackupSettings: BackupSettings = {
  auto: {
    enabled: false,
    interval: 'daily',
    retentionDays: 30
  },
  destinations: {
    local: {
      enabled: true,
      path: './backups'
    },
    cloud: {
      enabled: false,
      provider: 'none',
      credentials: {}
    }
  },
  include: {
    sessions: true,
    settings: true,
    indexes: false,
    logs: false
  },
  integrity: {
    checksumValidation: true,
    compressionLevel: 6,
    encryptBackups: false
  }
} 