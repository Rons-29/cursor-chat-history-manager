/**
 * LogViewer - 統合ログの詳細表示コンポーネント
 * .mdcルール準拠: リアルタイム更新、フィルタリング機能
 */

import React, { useState, useEffect } from 'react'
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface LogEntry {
  id?: string
  timestamp: string
  level?: 'info' | 'warn' | 'error' | 'success'
  type?: string // APIから来るtype
  message?: string
  content?: string // APIから来るcontent
  details?: any
  metadata?: any // APIから来るmetadata
  source?: 'cursor' | 'integration' | 'system' | 'chat' | 'claude-dev'
}

interface LogViewerProps {
  logs: LogEntry[]
  isLoading?: boolean
  onRefresh?: () => void
  autoRefresh?: boolean
  refreshInterval?: number
}

const LogViewer: React.FC<LogViewerProps> = ({
  logs = [],
  isLoading = false,
  onRefresh,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  // 安全な配列の確保
  const safeLogs = Array.isArray(logs) ? logs : []
  
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>(safeLogs)
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 自動更新
  useEffect(() => {
    if (autoRefresh && onRefresh) {
      const interval = setInterval(onRefresh, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, onRefresh, refreshInterval])

  // フィルタリング
  useEffect(() => {
    // 安全な配列の確保とデータ変換
    let filtered = Array.isArray(logs) ? logs.map(log => ({
      ...log,
      level: log.level || (log.type === 'error' ? 'error' : log.type === 'cursor' ? 'info' : log.type === 'system' ? 'info' : 'info'),
      message: log.message || log.content || 'No message',
      source: log.source || log.metadata?.source || log.type,
      details: log.details || log.metadata
    })) : []

    // レベルフィルタ
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter)
    }

    // ソースフィルタ
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(log => log.source === sourceFilter)
    }

    // 検索フィルタ
    if (searchQuery) {
      filtered = filtered.filter(log => 
        (log.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredLogs(filtered)
  }, [logs, levelFilter, sourceFilter, searchQuery])

  // ログレベルのアイコンと色
  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'warn':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />
    }
  }

  const getLogBgColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warn':
        return 'bg-yellow-50 border-yellow-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">統合ログ</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ArrowPathIcon className={`-ml-1 mr-1 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </button>
          </div>
        </div>
      </div>

      {/* フィルタ */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {/* 検索 */}
          <div>
            <input
              type="text"
              placeholder="ログを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* レベルフィルタ */}
          <div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">すべてのレベル</option>
              <option value="info">情報</option>
              <option value="warn">警告</option>
              <option value="error">エラー</option>
              <option value="success">成功</option>
            </select>
          </div>

          {/* ソースフィルタ */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">すべてのソース</option>
              <option value="cursor">Cursor</option>
              <option value="chat">チャット</option>
              <option value="system">システム</option>
              <option value="integration">統合</option>
              <option value="claude-dev">Claude Dev</option>
            </select>
          </div>

          {/* 統計 */}
          <div className="flex items-center text-sm text-gray-500">
            <FunnelIcon className="h-4 w-4 mr-1" />
            {Array.isArray(filteredLogs) ? filteredLogs.length : 0} / {Array.isArray(logs) ? logs.length : 0} 件
          </div>
        </div>
      </div>

      {/* ログリスト */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading && (!Array.isArray(filteredLogs) || filteredLogs.length === 0) ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="animate-spin h-6 w-6 text-gray-400 mr-2" />
            <span className="text-gray-500">ログを読み込み中...</span>
          </div>
        ) : (!Array.isArray(filteredLogs) || filteredLogs.length === 0) ? (
          <div className="text-center py-8 text-gray-500">
            表示するログがありません
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Array.isArray(filteredLogs) && filteredLogs.map((log, index) => (
              <div key={index} className={`p-4 ${getLogBgColor(log.level || 'info')}`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getLogIcon(log.level || 'info')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {log.message || log.content || 'メッセージなし'}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {new Date(log.timestamp || Date.now()).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    {(log.source || log.metadata?.source || log.type) && (
                      <p className="text-xs text-gray-500 mt-1">
                        ソース: {log.source || log.metadata?.source || log.type || '不明'}
                      </p>
                    )}
                    {log.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                          詳細を表示
                        </summary>
                        <pre className="mt-1 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default LogViewer 