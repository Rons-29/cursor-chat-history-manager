# 🚀 ChatFlow AIメモリシステム - クイックスタートガイド

**目的**: AIメモリシステム実装を即座に開始するための具体的な手順  
**対象**: 開発者・プロジェクトマネージャー  
**推定時間**: 最初の実装まで1-2日  

---

## 🎯 **今すぐ開始：Priority 1タスク**

### **Step 1: 基盤準備（30分）**

#### **1.1 プロジェクト構造確認**
```bash
# 現在のプロジェクト構造確認
tree src/ -I node_modules
tree web/src/ -I node_modules

# 必要ディレクトリ作成
mkdir -p src/types src/services src/adapters src/middleware
mkdir -p web/src/components/memory web/src/components/analytics
mkdir -p docs/implementation docs/api-specs docs/schemas
```

#### **1.2 依存関係追加**
```bash
# バックエンド依存関係
npm install --save uuid date-fns crypto-js
npm install --save-dev @types/uuid

# フロントエンド依存関係（webディレクトリで実行）
cd web
npm install --save @tanstack/react-query react-router-dom
npm install --save-dev @types/react @types/react-dom
cd ..
```

### **Step 2: 型定義作成（45分）**

#### **2.1 基本記憶型定義**
```typescript:src/types/memory-system.ts
/**
 * AIメモリシステム基本型定義
 * 実装優先度: 🔴 Critical
 */

export interface BasicMemory {
  id: string
  content: string
  type: MemoryType
  tags: string[]
  metadata: MemoryMetadata
  createdAt: Date
  updatedAt: Date
}

export enum MemoryType {
  KNOWLEDGE = 'knowledge',           // 宣言的記憶
  EXPERIENCE = 'experience',         // エピソード記憶
  PATTERN = 'pattern',              // パターン記憶
  CONTEXT = 'context'               // 文脈記憶
}

export interface MemoryMetadata {
  source: 'cursor' | 'claude' | 'windsurf' | 'manual'
  project?: string
  sessionId?: string
  importance: 'low' | 'medium' | 'high'
  confidence: number                // 0-1
  tools: string[]                   // アクセス可能ツール
}

export interface MemorySearchQuery {
  text?: string
  type?: MemoryType
  tags?: string[]
  projectFilter?: string
  dateRange?: {
    start: Date
    end: Date
  }
  limit?: number
  offset?: number
}

export interface MemorySearchResult {
  memories: BasicMemory[]
  totalCount: number
  relatedMemories: BasicMemory[]
  suggestions: string[]
}
```

#### **2.2 MCP通信型定義**
```typescript:src/types/mcp-protocol.ts
/**
 * Model Context Protocol型定義
 * 実装優先度: 🔴 Critical
 */

export interface MCPMessage {
  id: string
  method: string
  params?: any
  result?: any
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: any
}

export interface MCPMemoryRequest {
  action: 'create' | 'read' | 'update' | 'delete' | 'search'
  memory?: BasicMemory
  query?: MemorySearchQuery
  options?: {
    sync?: boolean
    broadcast?: boolean
    tools?: string[]
  }
}

export interface MCPMemoryResponse {
  success: boolean
  data?: any
  error?: string
  metadata?: {
    executionTime: number
    affectedTools: string[]
  }
}
```

### **Step 3: 基本サービス実装（2時間）**

#### **3.1 基本記憶サービス**
```typescript:src/services/BasicMemoryService.ts
/**
 * 基本記憶管理サービス
 * 実装優先度: 🔴 Critical
 * 
 * このサービスを最初に実装する理由：
 * 1. 他の全機能の基盤となる
 * 2. 即座にテスト・検証可能
 * 3. MCP統合の前提条件
 */

import { v4 as uuidv4 } from 'uuid'
import fs from 'fs-extra'
import path from 'path'
import type {
  BasicMemory,
  MemoryType,
  MemoryMetadata,
  MemorySearchQuery,
  MemorySearchResult
} from '../types/memory-system.js'
import { Logger } from '../server/utils/Logger.js'

export class BasicMemoryService {
  private memories: Map<string, BasicMemory> = new Map()
  private memoryPath: string
  private logger: Logger
  private isInitialized = false

  constructor(storagePath: string, logger: Logger) {
    this.memoryPath = path.join(storagePath, 'memories.json')
    this.logger = logger
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.loadMemories()
      this.isInitialized = true
      await this.logger.info('基本記憶サービスを初期化しました', {
        memoriesLoaded: this.memories.size
      })
    } catch (error) {
      await this.logger.error('基本記憶サービスの初期化に失敗', error as Error)
      throw error
    }
  }

  /**
   * 記憶作成
   */
  async createMemory(
    content: string,
    type: MemoryType,
    metadata: Partial<MemoryMetadata> = {}
  ): Promise<BasicMemory> {
    if (!this.isInitialized) {
      throw new Error('記憶サービスが初期化されていません')
    }

    const memory: BasicMemory = {
      id: uuidv4(),
      content,
      type,
      tags: metadata.tags || [],
      metadata: {
        source: metadata.source || 'manual',
        project: metadata.project,
        sessionId: metadata.sessionId,
        importance: metadata.importance || 'medium',
        confidence: metadata.confidence || 0.8,
        tools: metadata.tools || ['cursor', 'claude']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.memories.set(memory.id, memory)
    await this.saveMemories()

    await this.logger.info('記憶を作成しました', {
      memoryId: memory.id,
      type: memory.type,
      source: memory.metadata.source
    })

    return memory
  }

  /**
   * 記憶検索
   */
  async searchMemories(query: MemorySearchQuery): Promise<MemorySearchResult> {
    if (!this.isInitialized) {
      throw new Error('記憶サービスが初期化されていません')
    }

    const allMemories = Array.from(this.memories.values())
    let filteredMemories = allMemories

    // テキスト検索
    if (query.text) {
      const searchText = query.text.toLowerCase()
      filteredMemories = filteredMemories.filter(memory =>
        memory.content.toLowerCase().includes(searchText) ||
        memory.tags.some(tag => tag.toLowerCase().includes(searchText))
      )
    }

    // タイプフィルター
    if (query.type) {
      filteredMemories = filteredMemories.filter(memory => memory.type === query.type)
    }

    // プロジェクトフィルター
    if (query.projectFilter) {
      filteredMemories = filteredMemories.filter(memory => 
        memory.metadata.project === query.projectFilter
      )
    }

    // 日付範囲フィルター
    if (query.dateRange) {
      filteredMemories = filteredMemories.filter(memory =>
        memory.createdAt >= query.dateRange!.start &&
        memory.createdAt <= query.dateRange!.end
      )
    }

    // ソート（重要度・更新日時順）
    filteredMemories.sort((a, b) => {
      const importanceOrder = { high: 3, medium: 2, low: 1 }
      const aImportance = importanceOrder[a.metadata.importance]
      const bImportance = importanceOrder[b.metadata.importance]
      
      if (aImportance !== bImportance) {
        return bImportance - aImportance
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    })

    // ページネーション
    const offset = query.offset || 0
    const limit = query.limit || 20
    const paginatedMemories = filteredMemories.slice(offset, offset + limit)

    // 関連記憶の検索（簡易版）
    const relatedMemories = this.findRelatedMemories(paginatedMemories, allMemories)

    return {
      memories: paginatedMemories,
      totalCount: filteredMemories.length,
      relatedMemories: relatedMemories.slice(0, 5),
      suggestions: this.generateSearchSuggestions(query, filteredMemories)
    }
  }

  /**
   * 記憶取得
   */
  async getMemory(id: string): Promise<BasicMemory | null> {
    return this.memories.get(id) || null
  }

  /**
   * 記憶更新
   */
  async updateMemory(id: string, updates: Partial<BasicMemory>): Promise<BasicMemory | null> {
    const memory = this.memories.get(id)
    if (!memory) return null

    const updatedMemory: BasicMemory = {
      ...memory,
      ...updates,
      id: memory.id, // IDは変更不可
      updatedAt: new Date()
    }

    this.memories.set(id, updatedMemory)
    await this.saveMemories()

    await this.logger.info('記憶を更新しました', { memoryId: id })
    return updatedMemory
  }

  /**
   * 記憶削除
   */
  async deleteMemory(id: string): Promise<boolean> {
    const existed = this.memories.has(id)
    this.memories.delete(id)
    
    if (existed) {
      await this.saveMemories()
      await this.logger.info('記憶を削除しました', { memoryId: id })
    }

    return existed
  }

  /**
   * 統計情報取得
   */
  async getMemoryStats(): Promise<{
    totalMemories: number
    byType: Record<MemoryType, number>
    byImportance: Record<string, number>
    bySource: Record<string, number>
    recentActivity: number
  }> {
    const memories = Array.from(this.memories.values())
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const byType = memories.reduce((acc, memory) => {
      acc[memory.type] = (acc[memory.type] || 0) + 1
      return acc
    }, {} as Record<MemoryType, number>)

    const byImportance = memories.reduce((acc, memory) => {
      acc[memory.metadata.importance] = (acc[memory.metadata.importance] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const bySource = memories.reduce((acc, memory) => {
      acc[memory.metadata.source] = (acc[memory.metadata.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const recentActivity = memories.filter(memory => memory.createdAt > lastWeek).length

    return {
      totalMemories: memories.length,
      byType,
      byImportance,
      bySource,
      recentActivity
    }
  }

  // プライベートメソッド

  private async loadMemories(): Promise<void> {
    try {
      if (await fs.pathExists(this.memoryPath)) {
        const data = await fs.readJson(this.memoryPath)
        
        // 日付文字列をDateオブジェクトに変換
        const memories = data.map((memory: any) => ({
          ...memory,
          createdAt: new Date(memory.createdAt),
          updatedAt: new Date(memory.updatedAt)
        }))

        this.memories = new Map(memories.map((memory: BasicMemory) => [memory.id, memory]))
      }
    } catch (error) {
      await this.logger.error('記憶ファイルの読み込みに失敗', error as Error)
      // エラーの場合は空のMapで初期化
      this.memories = new Map()
    }
  }

  private async saveMemories(): Promise<void> {
    try {
      const memoriesArray = Array.from(this.memories.values())
      await fs.writeJson(this.memoryPath, memoriesArray, { spaces: 2 })
    } catch (error) {
      await this.logger.error('記憶ファイルの保存に失敗', error as Error)
      throw error
    }
  }

  private findRelatedMemories(
    targetMemories: BasicMemory[],
    allMemories: BasicMemory[]
  ): BasicMemory[] {
    const targetIds = new Set(targetMemories.map(m => m.id))
    const related: BasicMemory[] = []

    for (const target of targetMemories) {
      for (const memory of allMemories) {
        if (targetIds.has(memory.id)) continue

        // タグの重複による関連性
        const commonTags = target.tags.filter(tag => memory.tags.includes(tag))
        if (commonTags.length > 0) {
          related.push(memory)
          continue
        }

        // プロジェクトによる関連性
        if (target.metadata.project && target.metadata.project === memory.metadata.project) {
          related.push(memory)
        }
      }
    }

    return related
  }

  private generateSearchSuggestions(
    query: MemorySearchQuery,
    results: BasicMemory[]
  ): string[] {
    const suggestions: string[] = []

    // 人気のタグを提案
    const tagFrequency = results.reduce((acc, memory) => {
      memory.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    const popularTags = Object.entries(tagFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag)

    suggestions.push(...popularTags)

    // プロジェクトを提案
    const projects = [...new Set(results
      .map(memory => memory.metadata.project)
      .filter(Boolean)
    )].slice(0, 2)

    suggestions.push(...projects)

    return suggestions
  }
}
```

### **Step 4: APIエンドポイント実装（1時間）**

#### **4.1 記憶管理API**
```typescript:src/server/routes/memory.ts
/**
 * 記憶管理APIルート
 * 実装優先度: 🔴 Critical
 */

import { Router } from 'express'
import type { Request, Response } from 'express'
import { BasicMemoryService } from '../../services/BasicMemoryService.js'
import { Logger } from '../utils/Logger.js'
import type { MemorySearchQuery } from '../../types/memory-system.js'

const router = Router()

export function createMemoryRoutes(
  memoryService: BasicMemoryService,
  logger: Logger
): Router {
  
  /**
   * 記憶作成
   */
  router.post('/memories', async (req: Request, res: Response) => {
    try {
      const { content, type, metadata = {} } = req.body

      if (!content || !type) {
        return res.status(400).json({
          success: false,
          error: 'contentとtypeは必須です'
        })
      }

      const memory = await memoryService.createMemory(content, type, metadata)

      res.json({
        success: true,
        data: memory,
        timestamp: new Date()
      })
    } catch (error) {
      await logger.error('記憶作成エラー', error as Error)
      res.status(500).json({
        success: false,
        error: '記憶の作成に失敗しました',
        timestamp: new Date()
      })
    }
  })

  /**
   * 記憶検索
   */
  router.get('/memories/search', async (req: Request, res: Response) => {
    try {
      const query: MemorySearchQuery = {
        text: req.query.text as string,
        type: req.query.type as any,
        projectFilter: req.query.project as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      }

      const result = await memoryService.searchMemories(query)

      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      })
    } catch (error) {
      await logger.error('記憶検索エラー', error as Error)
      res.status(500).json({
        success: false,
        error: '記憶の検索に失敗しました',
        timestamp: new Date()
      })
    }
  })

  /**
   * 記憶取得
   */
  router.get('/memories/:id', async (req: Request, res: Response) => {
    try {
      const memory = await memoryService.getMemory(req.params.id)

      if (!memory) {
        return res.status(404).json({
          success: false,
          error: '記憶が見つかりません'
        })
      }

      res.json({
        success: true,
        data: memory,
        timestamp: new Date()
      })
    } catch (error) {
      await logger.error('記憶取得エラー', error as Error)
      res.status(500).json({
        success: false,
        error: '記憶の取得に失敗しました',
        timestamp: new Date()
      })
    }
  })

  /**
   * 統計情報取得
   */
  router.get('/memories/stats', async (req: Request, res: Response) => {
    try {
      const stats = await memoryService.getMemoryStats()

      res.json({
        success: true,
        data: stats,
        timestamp: new Date()
      })
    } catch (error) {
      await logger.error('統計取得エラー', error as Error)
      res.status(500).json({
        success: false,
        error: '統計の取得に失敗しました',
        timestamp: new Date()
      })
    }
  })

  return router
}
```

### **Step 5: 基本UI実装（1.5時間）**

#### **5.1 記憶管理コンポーネント**
```typescript:web/src/components/memory/MemoryManager.tsx
/**
 * 基本記憶管理UI
 * 実装優先度: 🟡 High
 */

import React, { useState, useEffect } from 'react'
import type { BasicMemory, MemoryType, MemorySearchQuery } from '../../../../src/types/memory-system'

interface MemoryManagerProps {
  apiBaseUrl?: string
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({ 
  apiBaseUrl = 'http://localhost:3001/api' 
}) => {
  const [memories, setMemories] = useState<BasicMemory[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<MemoryType | ''>('')

  // 記憶検索
  const searchMemories = async (query: MemorySearchQuery = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.text) params.append('text', query.text)
      if (query.type) params.append('type', query.type)
      if (query.limit) params.append('limit', query.limit.toString())

      const response = await fetch(`${apiBaseUrl}/memories/search?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setMemories(data.data.memories)
      }
    } catch (error) {
      console.error('記憶検索エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 初期読み込み
  useEffect(() => {
    searchMemories()
  }, [])

  // 検索実行
  const handleSearch = () => {
    searchMemories({
      text: searchQuery || undefined,
      type: selectedType || undefined,
      limit: 20
    })
  }

  return (
    <div className="memory-manager p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧠 AI記憶管理</h1>
      
      {/* 検索セクション */}
      <div className="search-section bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索キーワード
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="記憶を検索..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              記憶タイプ
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as MemoryType | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全て</option>
              <option value="knowledge">知識</option>
              <option value="experience">経験</option>
              <option value="pattern">パターン</option>
              <option value="context">文脈</option>
            </select>
          </div>
          
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '検索中...' : '検索'}
          </button>
        </div>
      </div>

      {/* 記憶一覧 */}
      <div className="memories-list">
        <h2 className="text-xl font-semibold mb-4">
          記憶一覧 ({memories.length}件)
        </h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">記憶を読み込み中...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            記憶が見つかりませんでした
          </div>
        ) : (
          <div className="grid gap-4">
            {memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const MemoryCard: React.FC<{ memory: BasicMemory }> = ({ memory }) => {
  const getTypeIcon = (type: MemoryType) => {
    switch (type) {
      case 'knowledge': return '📚'
      case 'experience': return '🎯'
      case 'pattern': return '🔄'
      case 'context': return '🌐'
      default: return '💭'
    }
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="memory-card bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getTypeIcon(memory.type)}</span>
          <span className="font-medium text-gray-900 capitalize">
            {memory.type}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(memory.metadata.importance)}`}>
            {memory.metadata.importance}
          </span>
          <span className="text-xs text-gray-500">
            {memory.metadata.source}
          </span>
        </div>
      </div>
      
      <p className="text-gray-700 mb-3 line-clamp-3">
        {memory.content}
      </p>
      
      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {memory.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          作成: {new Date(memory.createdAt).toLocaleDateString('ja-JP')}
        </span>
        {memory.metadata.project && (
          <span>
            📁 {memory.metadata.project}
          </span>
        )}
        <span>
          信頼度: {Math.round(memory.metadata.confidence * 100)}%
        </span>
      </div>
    </div>
  )
}
```

---

## 🧪 **Step 6: テスト・検証（30分）**

### **6.1 基本機能テスト**
```bash
# サーバー起動
npm run server

# 記憶作成テスト
curl -X POST http://localhost:3001/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "content": "React useState hooks should be used for component state management",
    "type": "knowledge",
    "metadata": {
      "source": "manual",
      "project": "chatflow",
      "importance": "high",
      "tags": ["react", "hooks", "state"]
    }
  }'

# 記憶検索テスト
curl "http://localhost:3001/api/memories/search?text=react&limit=5"
```

---

## 📋 **次のステップ・優先順位**

### **🔴 Critical - Week 1で実装**
1. **[ ] MCP Protocol通信層**
2. **[ ] Cursor統合テスト**

### **🟡 High - Week 2で実装**
3. **[ ] 高度検索機能**
4. **[ ] 記憶分析機能**

---

**🚀 今すぐ開始**: OpenMemory MCPを超える高度なAIメモリシステムをChatFlowで実現しましょう！ 