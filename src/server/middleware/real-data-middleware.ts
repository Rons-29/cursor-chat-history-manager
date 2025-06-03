/**
 * 実データ統合Middleware
 * .mdcルール準拠: Express型定義問題の根本回避
 *
 * 戦略: Middleware方式で実データ統合を実現
 */

import type { Request, Response, NextFunction } from 'express'
import { apiDataService } from '../api-router.js'
import { Logger } from '../utils/Logger.js'

const logger = new Logger({ logPath: './logs', level: 'info' })

// 実データサービス状態
let realDataAvailable = false

// 初期化（アプリケーション起動時に呼び出し）
export async function initializeRealDataMiddleware(): Promise<void> {
  try {
    console.log('🔧 実データMiddleware初期化開始...')
    await apiDataService.initialize()
    realDataAvailable = true
    console.log('🎉 実データMiddleware初期化完了 - WebUIで実データ利用可能')
  } catch (error) {
    console.log(
      '⚠️  実データMiddleware初期化失敗 - 仮データモードで継続:',
      error
    )
    realDataAvailable = false
  }
}

// リクエストに実データサービス情報を追加するMiddleware
export const realDataMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // リクエストの検証
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid request body')
    }

    // データの検証
    const { data } = req.body
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format')
    }

    // データの型チェック
    if (!Array.isArray(data.messages)) {
      throw new Error('Messages must be an array')
    }

    // メッセージの検証
    for (const message of data.messages) {
      if (!message.role || !message.content) {
        throw new Error('Invalid message format')
      }
    }

    // 実データサービス情報の追加
    // @ts-ignore カスタムプロパティ
    req.realDataAvailable = realDataAvailable
    // @ts-ignore カスタムプロパティ
    req.apiDataService = realDataAvailable ? apiDataService : null

    next()
  } catch (error) {
    logger.error('Middleware error:', error)
    res.status(400).json({ error: 'Invalid request format' })
  }
}

// セッション取得ハンドラー（実データ統合版）
export async function getSessionsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const keyword = req.query.keyword as string

    // @ts-ignore カスタムプロパティ
    if (req.realDataAvailable && req.apiDataService) {
      console.log('📊 実データからセッション一覧を取得中...')

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined
      const tags = req.query.tags
        ? (req.query.tags as string).split(',')
        : undefined

      // @ts-ignore カスタムプロパティ
      const result = await req.apiDataService.getSessions(
        page,
        limit,
        keyword,
        startDate,
        endDate,
        tags
      )
      res.json(result)
      return
    }

    // フォールバック: 仮データ
    console.log('💡 仮データからセッション一覧を返します（Middleware版）')
    const mockSessions = getMockSessions()
    let filteredSessions = mockSessions

    if (keyword) {
      filteredSessions = mockSessions.filter(
        session =>
          session.title.toLowerCase().includes(keyword.toLowerCase()) ||
          session.metadata.summary
            ?.toLowerCase()
            .includes(keyword.toLowerCase()) ||
          session.metadata.tags?.some(tag =>
            tag.toLowerCase().includes(keyword.toLowerCase())
          )
      )
    }

    const total = filteredSessions.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedSessions = filteredSessions.slice(offset, offset + limit)

    res.json({
      sessions: paginatedSessions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: offset + limit < total,
      },
      mode: 'mock-data',
    })
  } catch (error) {
    console.error('セッション取得エラー:', error)
    res.status(500).json({
      error: 'セッションの取得に失敗しました',
      // @ts-ignore カスタムプロパティ
      mode: req.realDataAvailable ? 'real-data' : 'mock-data',
    })
  }
}

// セッション詳細取得ハンドラー（実データ統合版）
export async function getSessionHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const sessionId = req.params.id

    // @ts-ignore カスタムプロパティ
    if (req.realDataAvailable && req.apiDataService) {
      console.log(`📊 実データからセッション ${sessionId} を取得中...`)

      try {
        // @ts-ignore カスタムプロパティ
        const session = await req.apiDataService.getSession(sessionId)
        res.json(session)
        return
      } catch (error) {
        res.status(404).json({
          error: 'セッションが見つかりません',
          mode: 'real-data',
        })
        return
      }
    }

    // フォールバック: 仮データ
    console.log(
      `💡 仮データからセッション ${sessionId} を返します（Middleware版）`
    )
    const sampleSession = {
      id: sessionId,
      title: 'WebUI実装プロジェクト',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      endTime: null,
      metadata: {
        totalMessages: 15,
        tags: ['開発', 'React', 'TypeScript'],
        summary: 'React + TypeScriptでWebUIを実装',
      },
      messages: [
        {
          id: 'msg-1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          role: 'user',
          content: 'React + TypeScriptでWebUIを実装したいです',
          metadata: { sessionId },
        },
        {
          id: 'msg-2',
          timestamp: new Date(
            Date.now() - 2 * 60 * 60 * 1000 + 30000
          ).toISOString(),
          role: 'assistant',
          content:
            'React + TypeScriptでWebUIを実装しましょう。まず、Viteを使用して開発環境をセットアップします。',
          metadata: { sessionId },
        },
      ],
      mode: 'mock-data',
    }

    res.json(sampleSession)
  } catch (error) {
    console.error('セッション取得エラー:', error)
    res.status(500).json({
      error: 'セッションの取得に失敗しました',
      // @ts-ignore カスタムプロパティ
      mode: req.realDataAvailable ? 'real-data' : 'mock-data',
    })
  }
}

// 統計情報取得ハンドラー（実データ統合版）
export async function getStatsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // @ts-ignore カスタムプロパティ
    if (req.realDataAvailable && req.apiDataService) {
      console.log('📊 実データから統計情報を取得中...')

      // @ts-ignore カスタムプロパティ
      const stats = await req.apiDataService.getStats()
      res.json(stats)
      return
    }

    // フォールバック: 仮データ
    console.log('💡 仮データから統計情報を返します（Middleware版）')
    res.json({
      totalSessions: 3,
      totalMessages: 35,
      thisMonthMessages: 35,
      activeProjects: 1,
      lastUpdated: new Date().toISOString(),
      averageSessionLength: 11.7,
      mostActiveHour: 14,
      storageSize: 2048000,
      mode: 'mock-data',
    })
  } catch (error) {
    console.error('統計取得エラー:', error)
    res.status(500).json({
      error: '統計情報の取得に失敗しました',
      // @ts-ignore カスタムプロパティ
      mode: req.realDataAvailable ? 'real-data' : 'mock-data',
    })
  }
}

// 検索ハンドラー（実データ統合版）
export async function searchHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { keyword, filters = {} } = req.body

    // @ts-ignore カスタムプロパティ
    if (req.realDataAvailable && req.apiDataService) {
      console.log(`📊 実データで検索中: "${keyword}"`)

      // @ts-ignore カスタムプロパティ
      const searchResults = await req.apiDataService.searchSessions(
        keyword,
        filters
      )
      res.json(searchResults)
      return
    }

    // フォールバック: 仮データ
    console.log(`💡 仮データで検索: "${keyword}"（Middleware版）`)
    const searchResults = keyword
      ? [
          {
            id: 'session-1',
            title: 'WebUI実装プロジェクト',
            startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            metadata: {
              totalMessages: 15,
              tags: ['開発', 'React', 'TypeScript'],
              summary: 'React + TypeScriptでWebUIを実装',
            },
            messages: [],
          },
        ]
      : []

    res.json({
      keyword,
      results: searchResults,
      total: searchResults.length,
      hasMore: false,
      mode: 'mock-data',
    })
  } catch (error) {
    console.error('検索エラー:', error)
    res.status(500).json({
      error: '検索に失敗しました',
      // @ts-ignore カスタムプロパティ
      mode: req.realDataAvailable ? 'real-data' : 'mock-data',
    })
  }
}

// ヘルスチェックハンドラー
// ApiDataServiceを取得する関数
export function getApiDataService() {
  return realDataAvailable ? apiDataService : null
}

export function healthHandler(req: Request, res: Response): void {
  const status = realDataAvailable ? apiDataService.getServiceStatus() : null

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: status || {
      initialized: false,
      error: 'リアルデータ未初期化',
      mode: 'mock-data',
      note: '仮データモードで動作中',
    },
  })
}

// 仮データ取得
function getMockSessions() {
  return [
    {
      id: 'session-1',
      title: 'WebUI実装プロジェクト',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      endTime: null,
      metadata: {
        totalMessages: 15,
        tags: ['開発', 'React', 'TypeScript'],
        summary: 'React + TypeScriptでWebUIを実装',
      },
      messages: [],
    },
    {
      id: 'session-2',
      title: 'Express API開発',
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      metadata: {
        totalMessages: 8,
        tags: ['API', 'Express'],
        summary: 'APIエンドポイントの実装',
      },
      messages: [],
    },
    {
      id: 'session-3',
      title: 'データベース設計',
      startTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
      metadata: {
        totalMessages: 12,
        tags: ['設計', 'データベース'],
        summary: 'Chat履歴のデータ構造設計',
      },
      messages: [],
    },
  ]
}
