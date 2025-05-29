/**
 * 実データ統合API Router
 * .mdcルール準拠: 型安全性とモジュラー設計
 * 
 * 目的: Express型定義問題を回避しながら実データ統合を段階的に実装
 */

import { ChatHistoryService } from '../services/ChatHistoryService.js'
import { ConfigService } from '../services/ConfigService.js'
import { AnalyticsService } from '../services/AnalyticsService.js'
import type { 
  ChatHistoryFilter, 
  ChatHistorySearchResult,
  ChatHistoryConfig
} from '../types/index.js'

// サービス管理クラス（型安全な実データ統合）
export class ApiDataService {
  private configService: ConfigService
  private chatHistoryService: ChatHistoryService | null = null
  private analyticsService: AnalyticsService | null = null
  private initialized = false
  private initializationError: string | null = null

  constructor() {
    this.configService = new ConfigService()
  }

  // 非同期初期化（型安全）
  async initialize(): Promise<void> {
    try {
      console.log('🔧 ApiDataService: 実データサービス初期化開始')
      
      const config: ChatHistoryConfig = await this.configService.loadConfig()
      this.chatHistoryService = new ChatHistoryService(config)
      await this.chatHistoryService.initialize()
      this.analyticsService = new AnalyticsService(this.chatHistoryService)
      
      this.initialized = true
      console.log('✅ ApiDataService: 実データサービス初期化完了')
    } catch (error) {
      this.initializationError = error instanceof Error ? error.message : '不明なエラー'
      console.error('❌ ApiDataService初期化エラー:', this.initializationError)
      throw error
    }
  }

  // サービス状態取得
  getServiceStatus() {
    return {
      initialized: this.initialized,
      error: this.initializationError,
      chatHistory: !!this.chatHistoryService,
      analytics: !!this.analyticsService,
      mode: this.initialized ? 'real-data' : 'error'
    }
  }

  // 実データセッション一覧取得（型安全）
  async getSessions(
    page: number, 
    limit: number, 
    keyword?: string,
    startDate?: Date,
    endDate?: Date,
    tags?: string[]
  ): Promise<{
    sessions: any[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number,
      hasMore: boolean
    },
    mode: string
  }> {
    if (!this.initialized || !this.chatHistoryService) {
      throw new Error('サービスが初期化されていません')
    }

    const offset = (page - 1) * limit
    const filter: ChatHistoryFilter = {
      limit,
      offset,
      keyword,
      startDate,
      endDate,
      tags,
    }

    const result: ChatHistorySearchResult = await this.chatHistoryService.searchSessions(filter)
    
    return {
      sessions: result.sessions,
      pagination: {
        page,
        limit,
        total: result.totalCount,
        totalPages: Math.ceil(result.totalCount / limit),
        hasMore: result.hasMore,
      },
      mode: 'real-data'
    }
  }

  // 実データセッション詳細取得（型安全）
  async getSession(sessionId: string): Promise<any> {
    if (!this.initialized || !this.chatHistoryService) {
      throw new Error('サービスが初期化されていません')
    }

    const session = await this.chatHistoryService.getSession(sessionId)
    
    if (!session) {
      throw new Error('セッションが見つかりません')
    }

    return {
      ...session,
      mode: 'real-data'
    }
  }

  // 実データ統計取得（型安全）
  async getStats(): Promise<{
    totalSessions: number,
    totalMessages: number,
    thisMonthMessages: number,
    activeProjects: number,
    lastUpdated: string,
    averageSessionLength: number,
    mostActiveHour: number,
    storageSize: number,
    mode: string
  }> {
    if (!this.initialized || !this.analyticsService) {
      throw new Error('サービスが初期化されていません')
    }

    const stats = await this.analyticsService.getUsageStats()
    
    // 今月のメッセージ数を計算
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthMessages = await this.calculateThisMonthMessages(thisMonthStart)
    
    // アクティブプロジェクト数を計算（タグ数をプロジェクト数として扱う）
    const activeProjects = await this.calculateActiveProjects()
    
    // ストレージサイズを計算
    const storageSize = await this.calculateStorageSize()
    
    return {
      totalSessions: stats.totalSessions,
      totalMessages: stats.totalMessages,
      thisMonthMessages,
      activeProjects,
      lastUpdated: new Date().toISOString(),
      averageSessionLength: stats.averageSessionLength,
      mostActiveHour: stats.mostActiveHour,
      storageSize,
      mode: 'real-data'
    }
  }

  // 今月のメッセージ数を計算
  private async calculateThisMonthMessages(thisMonthStart: Date): Promise<number> {
    if (!this.chatHistoryService) return 0
    
    try {
      const searchResult = await this.chatHistoryService.searchSessions({
        startDate: thisMonthStart,
        endDate: new Date(),
        limit: 1000 // 十分大きな数
      })
      
      return searchResult.sessions.reduce((total, session) => {
        return total + (session.metadata?.totalMessages || 0)
      }, 0)
    } catch (error) {
      console.warn('今月のメッセージ数計算でエラー:', error)
      return 0
    }
  }

  // アクティブプロジェクト数を計算（ユニークタグ数として計算）
  private async calculateActiveProjects(): Promise<number> {
    if (!this.chatHistoryService) return 0
    
    try {
      const searchResult = await this.chatHistoryService.searchSessions({
        limit: 1000 // 十分大きな数
      })
      
      const uniqueTags = new Set<string>()
      searchResult.sessions.forEach(session => {
        if (session.metadata?.tags) {
          session.metadata.tags.forEach(tag => uniqueTags.add(tag))
        }
      })
      
      return Math.max(uniqueTags.size, 1) // 最低1プロジェクト
    } catch (error) {
      console.warn('アクティブプロジェクト数計算でエラー:', error)
      return 1
    }
  }

  // ストレージサイズを計算（MBで返す）
  private async calculateStorageSize(): Promise<number> {
    if (!this.chatHistoryService) return 0
    
    try {
      const config = await this.configService.loadConfig()
      const fs = await import('fs/promises')
      const path = await import('path')
      
      let totalSize = 0
      
      // データディレクトリのサイズを計算
      const dataDir = config.storagePath
      
      const calculateDirSize = async (dirPath: string): Promise<number> => {
        let size = 0
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true })
          
          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name)
            
            if (entry.isDirectory()) {
              size += await calculateDirSize(fullPath)
            } else {
              const stats = await fs.stat(fullPath)
              size += stats.size
            }
          }
        } catch (error) {
          // ディレクトリが存在しない場合等はスキップ
        }
        
        return size
      }
      
      totalSize = await calculateDirSize(dataDir)
      
      // バイトからMBに変換
      return Math.round(totalSize / (1024 * 1024) * 100) / 100
    } catch (error) {
      console.warn('ストレージサイズ計算でエラー:', error)
      return 0
    }
  }

  // 実データ検索（型安全）
  async searchSessions(
    keyword: string,
    filters: {
      limit?: number,
      offset?: number,
      startDate?: string,
      endDate?: string,
      tags?: string[]
    } = {}
  ): Promise<{
    keyword: string,
    results: any[],
    total: number,
    hasMore: boolean,
    mode: string
  }> {
    if (!this.initialized || !this.chatHistoryService) {
      throw new Error('サービスが初期化されていません')
    }

    const searchFilter: ChatHistoryFilter = {
      keyword,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      tags: filters.tags,
    }

    const result: ChatHistorySearchResult = await this.chatHistoryService.searchSessions(searchFilter)
    
    return {
      keyword,
      results: result.sessions,
      total: result.totalCount,
      hasMore: result.hasMore,
      mode: 'real-data'
    }
  }
}

// シングルトンインスタンス
export const apiDataService = new ApiDataService()

// 実データ統合テスト関数（開発用）
export async function testRealDataIntegration(): Promise<boolean> {
  try {
    console.log('🧪 実データ統合テスト開始...')
    
    await apiDataService.initialize()
    const status = apiDataService.getServiceStatus()
    
    if (status.initialized) {
      console.log('✅ 実データ統合テスト成功')
      return true
    } else {
      console.log('❌ 実データ統合テスト失敗:', status.error)
      return false
    }
  } catch (error) {
    console.error('❌ 実データ統合テストエラー:', error)
    return false
  }
} 