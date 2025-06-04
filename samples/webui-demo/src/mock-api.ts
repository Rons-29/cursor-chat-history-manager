// ChatFlow検索デモ用模擬API

export type MockMessage = {
  id: string
  content: string
  timestamp: Date
  role: 'user' | 'assistant'
}

export type MockSession = {
  id: string
  title: string
  timestamp: Date
  messageCount: number
  source: 'cursor' | 'claude-dev' | 'chatgpt' | 'github-copilot'
  tags: string[]
  messages: MockMessage[]
}

export type SearchFilters = {
  keyword?: string
  source?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  messageCountRange?: {
    min: number
    max: number
  }
  tags?: string[]
}

export type SearchResult = {
  sessions: MockSession[]
  totalCount: number
  executionTime: number
}

// デモ用データ
const DEMO_SESSIONS: MockSession[] = [
  {
    id: '1',
    title: 'React hooks の使い方',
    timestamp: new Date('2025-06-01T10:30:00'),
    messageCount: 15,
    source: 'cursor',
    tags: ['React', 'JavaScript', 'フロントエンド'],
    messages: [
      {
        id: '1-1',
        content: 'useStateとuseEffectの違いについて教えてください',
        timestamp: new Date('2025-06-01T10:30:00'),
        role: 'user'
      },
      {
        id: '1-2',
        content: 'useStateは状態管理、useEffectは副作用処理に使用します...',
        timestamp: new Date('2025-06-01T10:31:00'),
        role: 'assistant'
      }
    ]
  },
  {
    id: '2',
    title: 'TypeScript エラー解決',
    timestamp: new Date('2025-06-02T14:15:00'),
    messageCount: 8,
    source: 'claude-dev',
    tags: ['TypeScript', 'エラー解決'],
    messages: [
      {
        id: '2-1',
        content: 'Type \'string\' is not assignable to type \'number\' エラーが出ます',
        timestamp: new Date('2025-06-02T14:15:00'),
        role: 'user'
      }
    ]
  },
  {
    id: '3',
    title: 'API設計のベストプラクティス',
    timestamp: new Date('2025-06-03T09:45:00'),
    messageCount: 22,
    source: 'chatgpt',
    tags: ['API', 'バックエンド', '設計'],
    messages: []
  },
  {
    id: '4',
    title: 'CSS Grid レイアウト',
    timestamp: new Date('2025-06-03T16:20:00'),
    messageCount: 12,
    source: 'github-copilot',
    tags: ['CSS', 'レイアウト'],
    messages: []
  },
  {
    id: '5',
    title: 'SQLite パフォーマンス最適化',
    timestamp: new Date('2025-06-04T11:10:00'),
    messageCount: 18,
    source: 'cursor',
    tags: ['SQLite', 'データベース', 'パフォーマンス'],
    messages: []
  },
  {
    id: '6',
    title: 'Vite 設定トラブルシューティング',
    timestamp: new Date('2025-06-04T15:30:00'),
    messageCount: 6,
    source: 'claude-dev',
    tags: ['Vite', '設定', 'トラブルシューティング'],
    messages: []
  }
]

export class MockSearchAPI {
  private static instance: MockSearchAPI
  
  static getInstance(): MockSearchAPI {
    if (!MockSearchAPI.instance) {
      MockSearchAPI.instance = new MockSearchAPI()
    }
    return MockSearchAPI.instance
  }

  async searchSessions(filters: SearchFilters): Promise<SearchResult> {
    const startTime = performance.now()
    
    // 検索実行のシミュレート（10-60ms）
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10))
    
    let filteredSessions = [...DEMO_SESSIONS]
    
    // キーワード検索
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      filteredSessions = filteredSessions.filter(session => 
        session.title.toLowerCase().includes(keyword) ||
        session.tags.some(tag => tag.toLowerCase().includes(keyword)) ||
        session.messages.some(msg => msg.content.toLowerCase().includes(keyword))
      )
    }
    
    // ソースフィルタ
    if (filters.source && filters.source.length > 0) {
      filteredSessions = filteredSessions.filter(session =>
        filters.source!.includes(session.source)
      )
    }
    
    // 日付範囲フィルタ
    if (filters.dateRange) {
      filteredSessions = filteredSessions.filter(session =>
        session.timestamp >= filters.dateRange!.start &&
        session.timestamp <= filters.dateRange!.end
      )
    }
    
    // メッセージ数フィルタ
    if (filters.messageCountRange) {
      filteredSessions = filteredSessions.filter(session =>
        session.messageCount >= filters.messageCountRange!.min &&
        session.messageCount <= filters.messageCountRange!.max
      )
    }
    
    // タグフィルタ
    if (filters.tags && filters.tags.length > 0) {
      filteredSessions = filteredSessions.filter(session =>
        filters.tags!.some(tag => session.tags.includes(tag))
      )
    }
    
    const endTime = performance.now()
    
    return {
      sessions: filteredSessions,
      totalCount: filteredSessions.length,
      executionTime: Math.round(endTime - startTime)
    }
  }

  async getFilterOptions() {
    return {
      sources: ['cursor', 'claude-dev', 'chatgpt', 'github-copilot'],
      tags: Array.from(new Set(DEMO_SESSIONS.flatMap(s => s.tags))),
      dateRange: {
        min: new Date('2025-06-01'),
        max: new Date('2025-06-04')
      },
      messageCountRange: {
        min: Math.min(...DEMO_SESSIONS.map(s => s.messageCount)),
        max: Math.max(...DEMO_SESSIONS.map(s => s.messageCount))
      }
    }
  }

  async getStats() {
    return {
      totalSessions: DEMO_SESSIONS.length,
      totalMessages: DEMO_SESSIONS.reduce((sum, s) => sum + s.messageCount, 0),
      sourceDistribution: {
        cursor: DEMO_SESSIONS.filter(s => s.source === 'cursor').length,
        'claude-dev': DEMO_SESSIONS.filter(s => s.source === 'claude-dev').length,
        chatgpt: DEMO_SESSIONS.filter(s => s.source === 'chatgpt').length,
        'github-copilot': DEMO_SESSIONS.filter(s => s.source === 'github-copilot').length
      }
    }
  }

  async getSearchHistory() {
    // ローカルストレージから検索履歴を取得
    const history = localStorage.getItem('chatflow-search-history')
    return history ? JSON.parse(history) : []
  }

  async saveSearchHistory(keyword: string) {
    const history = await this.getSearchHistory()
    const newHistory = [keyword, ...history.filter((h: string) => h !== keyword)].slice(0, 10)
    localStorage.setItem('chatflow-search-history', JSON.stringify(newHistory))
  }
}

export const mockAPI = MockSearchAPI.getInstance() 