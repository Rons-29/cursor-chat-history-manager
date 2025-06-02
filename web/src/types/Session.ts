// Session型定義
export interface Session {
  id: string
  title: string
  startTime?: string
  endTime?: string
  timestamp?: string | number
  metadata?: {
    totalMessages?: number
    tags?: string[]
    description?: string
    source?: string
    [key: string]: any
  }
  messages?: Message[]
}

export interface Message {
  id: string
  timestamp: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: {
    sessionId?: string
    [key: string]: any
  }
}

// ApiSessionとの互換性のためのエイリアス
export type ApiSession = Session
export type ApiMessage = Message 