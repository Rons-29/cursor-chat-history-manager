import express from 'express'
import { IntegrationService } from '../../services/IntegrationService.js'
import type { IntegrationConfig } from '../../types/integration.js'
import { IntegrationSearchRequestSchema, IntegrationAnalyticsRequestSchema } from '../../types/integration.js'

import { Logger } from '../utils/Logger.js'
// import { z } from 'zod' // バリデーション用（後で追加）

const router = express.Router()
const logger = new Logger({ logPath: './logs', level: 'info' })

// サービス初期化（本来はDIやapp.tsで管理するのが理想）
const config: IntegrationConfig = {
  cursor: {
    enabled: true,
    watchPath: process.env.CURSOR_LOG_PATH || '~/.cursor/logs',
    logDir: process.env.CURSOR_LOG_DIR || './logs/cursor',
    autoImport: true,
    syncInterval: 300,
    batchSize: 100,
    retryAttempts: 3
  },
  chatHistory: {
    storagePath: process.env.CHAT_HISTORY_PATH || '~/.chat-history',
    maxSessions: 1000,
    maxMessagesPerSession: 500,
    autoCleanup: true,
    cleanupDays: 30,
    enableSearch: true,
    enableBackup: false,
    backupInterval: 24
  },
  sync: {
    interval: 300,
    batchSize: 100,
    retryAttempts: 3
  }
}
const integrationService = new IntegrationService(config, logger)

// POST /api/integration/search
router.post('/search', async (req, res) => {
  try {
    const validatedData = IntegrationSearchRequestSchema.parse(req.body)
    let options: any = { ...validatedData }
    if (validatedData.timeRange) {
      options = {
        ...validatedData,
        timeRange: {
          start: new Date(validatedData.timeRange.start),
          end: new Date(validatedData.timeRange.end)
        }
      }
    }
    const results = await integrationService.search(options)
    res.json({ results })
  } catch (error) {
    logger.error('Search error:', error)
    res.status(500).json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

// GET /api/integration/analytics
router.get('/analytics', async (req, res) => {
  try {
    const validatedData = IntegrationAnalyticsRequestSchema.parse(req.query)
    const results = await integrationService.getAnalytics(validatedData)
    res.json(results)
  } catch (error) {
    logger.error('Analytics error:', error)
    res.status(500).json({ 
      error: 'Analytics failed',
      message: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

export default router 