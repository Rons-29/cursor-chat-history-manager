import React from 'react'
import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Dashboard } from '../components/Dashboard'
import { ChatHistoryService } from '../services/ChatHistoryService.js'
import { CursorLogService } from '../services/CursorLogService.js'
import { IntegrationService } from '../services/IntegrationService.js'
import type { ChatHistoryConfig } from '../types/index.js'
import type { CursorConfig } from '../types/cursor.js'
import type { IntegrationConfig } from '../types/integration.js'

beforeAll(() => {
  const fs = require('fs')
  const path = require('path')
  const tmpDir = path.join(process.cwd(), 'tmp')
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir)
  }
})

describe('Dashboard', () => {
  let chatHistoryService: ChatHistoryService
  let cursorLogService: CursorLogService
  let integrationService: IntegrationService

  beforeEach(() => {
    const chatHistoryConfig: ChatHistoryConfig = {
      storagePath: 'tmp/chat-history',
      maxSessions: 100,
      maxMessagesPerSession: 1000,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: true,
      backupInterval: 24
    }

    const cursorConfig: CursorConfig = {
      enabled: true,
      watchPath: 'tmp/cursor-logs',
      autoImport: true
    }

    const integrationConfig: IntegrationConfig = {
      cursor: cursorConfig,
      chatHistory: chatHistoryConfig,
      sync: {
        interval: 5,
        batchSize: 100,
        retryAttempts: 3
      }
    }

    chatHistoryService = new ChatHistoryService(chatHistoryConfig)
    cursorLogService = new CursorLogService(cursorConfig)
    integrationService = new IntegrationService(integrationConfig)
  })

  it('ダッシュボードが正しく表示されること', () => {
    render(
      <Dashboard
        chatHistoryStats={{
          totalSessions: 10,
          totalMessages: 100,
          totalSize: 1000,
          storageSize: 1000,
          thisMonthMessages: 50,
          activeProjects: 5,
          averageMessagesPerSession: 10,
          tagDistribution: { test: 5 },
          lastUpdated: new Date(),
          lastActivity: new Date(),
          oldestSession: new Date(),
          newestSession: new Date()
        }}
        cursorLogStats={{
          totalLogs: 100,
          storageSize: 1000,
          logsByType: { chat: 50, command: 50 },
          logsByProject: { project1: 30, project2: 70 },
          logsByTag: { test: 20, debug: 80 },
          lastUpdated: new Date()
        }}
        integrationStats={{
          totalLogs: 200,
          cursorLogs: 100,
          chatLogs: 100,
          storageSize: 2000
        }}
        onRefresh={() => {}}
        onExport={() => {}}
        onSettings={() => {}}
      />
    )

    expect(screen.getByText('チャット履歴')).toBeInTheDocument()
    expect(screen.getByText('統計情報')).toBeInTheDocument()
    expect(screen.getByText('アクティビティ')).toBeInTheDocument()
  })

  it('統計情報が正しく表示されること', async () => {
    render(
      <Dashboard
        chatHistoryStats={{
          totalSessions: 10,
          totalMessages: 100,
          totalSize: 1000,
          storageSize: 1000,
          thisMonthMessages: 50,
          activeProjects: 5,
          averageMessagesPerSession: 10,
          tagDistribution: { test: 5 },
          lastUpdated: new Date(),
          lastActivity: new Date(),
          oldestSession: new Date(),
          newestSession: new Date()
        }}
        cursorLogStats={{
          totalLogs: 100,
          storageSize: 1000,
          logsByType: { chat: 50, command: 50 },
          logsByProject: { project1: 30, project2: 70 },
          logsByTag: { test: 20, debug: 80 },
          lastUpdated: new Date()
        }}
        integrationStats={{
          totalLogs: 200,
          cursorLogs: 100,
          chatLogs: 100,
          storageSize: 2000
        }}
        onRefresh={() => {}}
        onExport={() => {}}
        onSettings={() => {}}
      />
    )

    expect(await screen.findByText('総セッション数')).toBeInTheDocument()
    expect(await screen.findByText('総メッセージ数')).toBeInTheDocument()
    expect(await screen.findByText('アクティブプロジェクト')).toBeInTheDocument()
  })

  it('アクティビティタイムラインが正しく表示されること', async () => {
    render(
      <Dashboard
        chatHistoryStats={{
          totalSessions: 10,
          totalMessages: 100,
          totalSize: 1000,
          storageSize: 1000,
          thisMonthMessages: 50,
          activeProjects: 5,
          averageMessagesPerSession: 10,
          tagDistribution: { test: 5 },
          lastUpdated: new Date(),
          lastActivity: new Date(),
          oldestSession: new Date(),
          newestSession: new Date()
        }}
        cursorLogStats={{
          totalLogs: 100,
          storageSize: 1000,
          logsByType: { chat: 50, command: 50 },
          logsByProject: { project1: 30, project2: 70 },
          logsByTag: { test: 20, debug: 80 },
          lastUpdated: new Date()
        }}
        integrationStats={{
          totalLogs: 200,
          cursorLogs: 100,
          chatLogs: 100,
          storageSize: 2000
        }}
        onRefresh={() => {}}
        onExport={() => {}}
        onSettings={() => {}}
      />
    )

    expect(await screen.findByText('アクティビティタイムライン')).toBeInTheDocument()
  })
}) 