import express from 'express'
import { IntegrationService } from '../../services/IntegrationService.js'
import type { IntegrationConfig } from '../../types/integration.js'
import { IntegrationSearchRequestSchema, IntegrationAnalyticsRequestSchema } from '../../types/integration.js'
import { ZodError } from 'zod'
import { Logger } from '../../utils/Logger.js'
// import { z } from 'zod' // バリデーション用（後で追加）

const router = express.Router()
const logger = new Logger({ logPath: './logs', level: 'info' })

// サービス初期化（本来はDIやapp.tsで管理するのが理想）
const config: IntegrationConfig = {
  cursor: {
    enabled: true,
    watchPath: process.env.CURSOR_LOG_PATH || '~/.cursor/logs',
    autoImport: true
  },
  chatHistory: {
    storagePath: process.env.CHAT_HISTORY_PATH || '~/.chat-history',
    storageType: 'file',
    maxSessions: 1000
  },
  sync: {
    interval: 300,
    batchSize: 100,
    retryAttempts: 3
  }
}
const integrationService = new IntegrationService(config)

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
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
    } else {
      logger.error('Search error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

// GET /api/integration/analytics
router.get('/analytics', async (req, res) => {
  try {
    const validatedData = IntegrationAnalyticsRequestSchema.parse(req.query)
    const results = await integrationService.getAnalytics(validatedData)
    res.json(results)
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
    } else {
      logger.error('Analytics error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

export default router 