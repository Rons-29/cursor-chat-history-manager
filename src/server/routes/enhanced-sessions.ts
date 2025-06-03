/**
 * 強化されたAI対話記録のAPIルート
 */

import express, { RequestHandler } from 'express'
import path from 'path'
import { TitleGenerator } from '../../utils/TitleGenerator.js'
import { MetadataEnhancer } from '../../utils/MetadataEnhancer.js'
import { ChatHistoryService } from '../../services/ChatHistoryService.js'

const router = express.Router()

// 共通のChatHistoryService設定
const createChatService = () =>
  new ChatHistoryService({
    storageType: 'file',
    storagePath: path.join(process.cwd(), 'data', 'chat-history'),
    maxSessions: 10000,
    maxMessagesPerSession: 500,
    autoCleanup: true,
    cleanupDays: 30,
    enableSearch: true,
    enableBackup: false,
    backupInterval: 24,
  })

/**
 * 強化されたセッション一覧の取得
 */
router.get('/enhanced-sessions', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      keyword,
      category,
      resolved,
      project,
    } = req.query

    console.log('🚀 Enhanced sessions API request:', {
      page,
      limit,
      keyword,
      category,
      resolved,
      project,
    })

    // 基本のセッション取得
    const chatService = createChatService()
    await chatService.initialize()

    const sessionsResult = await chatService.searchSessions({
      page: parseInt(page as string),
      pageSize: parseInt(limit as string),
      keyword: keyword as string,
    })

    // 各セッションのメタデータを強化
    const enhancedSessions = await Promise.all(
      sessionsResult.sessions.map(async (session: any) => {
        try {
          // メッセージを取得してメタデータを強化
          const messages = session.messages || []

          // タイトル自動生成
          const titleResult = TitleGenerator.generateTitleFromMessages(messages)

          // メタデータ強化
          const enhancedMetadata = MetadataEnhancer.enhanceSessionMetadata(
            messages,
            session.metadata || {},
            {
              projectPath: process.cwd(),
              timestamp: new Date(session.startTime),
            }
          )

          return {
            ...session,
            title: titleResult.title, // 自動生成されたタイトルを使用
            metadata: enhancedMetadata,
          }
        } catch (error) {
          console.warn(`Session ${session.id} enhancement failed:`, error)
          return session // エラー時は元のセッションを返却
        }
      })
    )

    // フィルタリング（クライアント側でも可能だが、パフォーマンス向上のため）
    let filteredSessions = enhancedSessions

    if (category) {
      filteredSessions = filteredSessions.filter(
        (s: any) => s.metadata?.category === category
      )
    }

    if (resolved !== undefined) {
      const isResolved = resolved === 'true'
      filteredSessions = filteredSessions.filter(
        (s: any) => s.metadata?.resolved === isResolved
      )
    }

    if (project) {
      filteredSessions = filteredSessions.filter(
        (s: any) => s.metadata?.project === project
      )
    }

    console.log(
      `✅ Enhanced sessions processed: ${enhancedSessions.length} → ${filteredSessions.length}`
    )

    res.json({
      sessions: filteredSessions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: sessionsResult.totalCount,
        totalPages: Math.ceil(
          sessionsResult.totalCount / parseInt(limit as string)
        ),
        hasMore: sessionsResult.hasMore,
      },
      enhancement: {
        processed: enhancedSessions.length,
        filtered: filteredSessions.length,
        categories: [
          ...new Set(
            enhancedSessions
              .map((s: any) => s.metadata?.category)
              .filter(Boolean)
          ),
        ],
        projects: [
          ...new Set(
            enhancedSessions
              .map((s: any) => s.metadata?.project)
              .filter(Boolean)
          ),
        ],
      },
    })
  } catch (error) {
    console.error('Enhanced sessions API error:', error)
    res.status(500).json({
      success: false,
      error: 'Enhanced sessions retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * 単一セッションの強化情報取得
 */
const getEnhancedSession: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params

    const chatService = createChatService()
    await chatService.initialize()

    const session = await chatService.getSession(id)
    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      })
      return
    }

    // メッセージを取得してメタデータを強化
    const messages = session.messages || []

    // タイトル自動生成
    const titleResult = TitleGenerator.generateTitleFromMessages(messages)

    // メタデータ強化
    const enhancedMetadata = MetadataEnhancer.enhanceSessionMetadata(
      messages,
      session.metadata || {},
      {
        projectPath: process.cwd(),
        timestamp: new Date(session.startTime),
      }
    )

    const enhancedSession = {
      ...session,
      title: titleResult.title,
      metadata: enhancedMetadata,
      titleGeneration: titleResult,
    }

    res.json({
      session: enhancedSession,
      enhancement: {
        titleConfidence: titleResult.confidence,
        keywordsFound: titleResult.keywords.length,
        categoryDetected: enhancedMetadata.category,
        complexityLevel: enhancedMetadata.complexity,
      },
    })
  } catch (error) {
    console.error('Enhanced session detail API error:', error)
    res.status(500).json({
      success: false,
      error: 'Enhanced session retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.get('/enhanced-sessions/:id', getEnhancedSession)

/**
 * バッチタイトル生成API
 */
const enhanceTitles: RequestHandler = async (req, res) => {
  try {
    const { sessionIds } = req.body

    if (!Array.isArray(sessionIds)) {
      res.status(400).json({
        success: false,
        error: 'sessionIds must be an array',
      })
      return
    }

    const chatService = createChatService()
    await chatService.initialize()

    const results = []

    for (const sessionId of sessionIds.slice(0, 10)) {
      // 最大10件まで
      try {
        const session = await chatService.getSession(sessionId)
        if (session) {
          const messages = session.messages || []
          const titleResult = TitleGenerator.generateTitleFromMessages(messages)

          results.push({
            sessionId,
            originalTitle: session.title,
            generatedTitle: titleResult.title,
            confidence: titleResult.confidence,
            keywords: titleResult.keywords,
            questionType: titleResult.questionType,
          })
        }
      } catch (error) {
        console.warn(`Title generation failed for session ${sessionId}:`, error)
        results.push({
          sessionId,
          error: 'Title generation failed',
        })
      }
    }

    res.json({
      success: true,
      results,
      processed: results.length,
      requested: sessionIds.length,
    })
  } catch (error) {
    console.error('Batch title generation error:', error)
    res.status(500).json({
      success: false,
      error: 'Batch title generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.post('/enhance-titles', enhanceTitles)

/**
 * 統計情報API（強化版）
 */
router.get('/enhanced-stats', async (req, res) => {
  try {
    const chatService = createChatService()
    await chatService.initialize()

    // 基本統計を取得
    const basicStats = await chatService.getStats()

    // 最近のセッションを取得してカテゴリ分析
    const recentSessions = await chatService.searchSessions({
      page: 1,
      pageSize: 100,
    })

    // カテゴリ別統計
    const categoryStats: Record<string, number> = {}
    const complexityStats: Record<string, number> = {}
    const questionTypeStats: Record<string, number> = {}
    let resolvedCount = 0
    let followUpNeededCount = 0

    // 簡易メタデータ分析
    for (const session of recentSessions.sessions) {
      const messages = session.messages || []
      if (messages.length > 0) {
        const enhancedMetadata = MetadataEnhancer.enhanceSessionMetadata(
          messages,
          session.metadata || {},
          { timestamp: new Date(session.startTime) }
        )

        // 統計情報の集計
        categoryStats[enhancedMetadata.category] =
          (categoryStats[enhancedMetadata.category] || 0) + 1
        complexityStats[enhancedMetadata.complexity] =
          (complexityStats[enhancedMetadata.complexity] || 0) + 1
        questionTypeStats[enhancedMetadata.questionType] =
          (questionTypeStats[enhancedMetadata.questionType] || 0) + 1

        if (enhancedMetadata.resolved) resolvedCount++
        if (enhancedMetadata.followUpNeeded) followUpNeededCount++
      }
    }

    res.json({
      ...basicStats,
      enhanced: {
        categoryDistribution: categoryStats,
        complexityDistribution: complexityStats,
        questionTypeDistribution: questionTypeStats,
        resolutionRate: Math.round(
          (resolvedCount / recentSessions.sessions.length) * 100
        ),
        followUpRate: Math.round(
          (followUpNeededCount / recentSessions.sessions.length) * 100
        ),
      },
      analysis: {
        totalAnalyzed: recentSessions.sessions.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Enhanced stats API error:', error)
    res.status(500).json({
      success: false,
      error: 'Enhanced stats retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
