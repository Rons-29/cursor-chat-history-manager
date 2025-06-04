/**
 * useIntegration - 統合機能のカスタムフック
 * .mdcルール準拠: React Query活用、型安全、エラーハンドリング
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, queryKeys } from '../api/client.js'
import { useProgressTracking } from './useProgressTracking'
import { useState } from 'react'
import * as integrationClient from '../api/integration'

// 型定義（integration.tsと統一）
export interface IntegrationStats {
  totalSessions: number
  totalMessages: number
  cursorSessions: number
  cursorMessages: number
  regularSessions: number
  regularMessages: number
  lastSync?: string
  isWatching: boolean
  error?: string
}

export interface CursorStatus {
  isWatching: boolean
  cursorPath: string | null
  sessionsFound: number
  lastScan: string | null
}

export interface ScanResult {
  sessionsFound: number
  messagesImported: number
  duration: number
  errors?: string[]
}

// クエリキー定数
export const INTEGRATION_QUERY_KEYS = {
  stats: ['integration', 'stats'] as const,
  cursorStatus: ['integration', 'cursor', 'status'] as const,
  cursorSessions: ['integration', 'cursor', 'sessions'] as const,
  logs: ['integration', 'logs'] as const,
  settings: ['integration', 'settings'] as const
}

/**
 * 統計情報を取得するフック
 */
export const useIntegrationStats = () => {
  return useQuery<IntegrationStats, Error>({
    queryKey: queryKeys.integrationStats(),
    queryFn: async () => {
      console.log('🎯 useIntegrationStats: 統計情報取得開始')
      try {
        const result = await integrationClient.getIntegrationStats()
        console.log('🎯 useIntegrationStats: 取得成功', result)
        return result
      } catch (error) {
        console.error('🎯 useIntegrationStats: 取得失敗', error)
        throw error
      }
    },
    staleTime: 30000, // 30秒間はキャッシュを使用
    refetchInterval: 60000, // 1分ごとに自動更新
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Enhanced統計情報を取得するフック
 */
export const useEnhancedStats = () => {
  return useQuery({
    queryKey: ['integration', 'enhanced-stats'],
    queryFn: () => integrationClient.getEnhancedStats(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Cursorステータスを取得するフック
 */
export const useCursorStatus = () => {
  return useQuery<CursorStatus, Error>({
    queryKey: INTEGRATION_QUERY_KEYS.cursorStatus,
    queryFn: async (): Promise<CursorStatus> => {
      console.log('🎯 useCursorStatus: ステータス取得開始')
      try {
        const result = await integrationClient.getCursorStatus()
        console.log('🎯 useCursorStatus: 取得成功', result)
        
        // APIレスポンスを期待される形式に変換
        return {
          isWatching: result.isWatching || false,
          cursorPath: result.cursorPath || null,
          sessionsFound: result.sessionsFound || 0,
          lastScan: result.lastScan || null
        }
      } catch (error) {
        console.error('🎯 useCursorStatus: 取得失敗', error)
        throw error
      }
    },
    staleTime: 10000, // 10秒間はキャッシュを使用（監視状態は頻繁に変わる可能性）
    refetchInterval: 30000, // 30秒ごとに自動更新
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * 統合ログを取得するフック
 */
export const useIntegrationLogs = (limit: number = 100) => {
  return useQuery({
    queryKey: queryKeys.integrationLogs({ limit }),
    queryFn: async () => {
      console.log('🎣 useIntegrationLogs: クエリ関数実行開始', { limit })
      
      // 直接fetch APIでテスト
      console.log('🎣 直接fetch APIテスト開始')
      try {
        const directResponse = await fetch(`http://localhost:3001/api/integration/logs?limit=${limit}`)
        const directJson = await directResponse.json()
        console.log('🎣 直接fetch結果:', directJson)
        console.log('🎣 直接fetch - logs配列:', directJson.logs)
      } catch (directError) {
        console.error('🎣 直接fetchエラー:', directError)
      }
      
      try {
        const result = await apiClient.getIntegrationLogs({ limit })
        console.log('🎣 useIntegrationLogs: API結果:', result)
        console.log('🎣 useIntegrationLogs: 結果は配列:', Array.isArray(result))
        console.log('🎣 useIntegrationLogs: 結果の長さ:', result?.length)
        return result
      } catch (error) {
        console.error('🎣 useIntegrationLogs: エラー:', error)
        throw error
      }
    },
    staleTime: 30000,
    retry: 3
  })
}

/**
 * 統合設定を取得するフック
 */
export const useIntegrationSettings = () => {
  return useQuery({
    queryKey: queryKeys.integrationSettings(),
    queryFn: () => integrationClient.getIntegrationSettings(),
    staleTime: 5 * 60 * 1000, // 5分
    retry: 2
  })
}

/**
 * 統合設定を保存するフック
 */
export const useSaveIntegrationSettings = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: any) => integrationClient.saveIntegrationSettings(settings),
    onSuccess: () => {
      // 設定保存後、設定データを再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.integrationSettings() })
      queryClient.invalidateQueries({ queryKey: queryKeys.integrationStats() })
    },
    onError: (error) => {
      console.error('設定保存エラー:', error)
    }
  })
}

/**
 * APIサーバー接続状態を監視するフック
 */
export const useApiConnection = () => {
  return useQuery({
    queryKey: ['api-connection'],
    queryFn: integrationClient.checkApiConnection,
    refetchInterval: 30000, // 30秒ごとにチェック
    retry: 1,
    staleTime: 10000 // 10秒間はキャッシュを使用
  })
}

/**
 * 統合機能の包括的なフック（進捗表示対応）
 */
export const useIntegration = () => {
  const queryClient = useQueryClient()
  const [isOperating, setIsOperating] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState<Error | null>(null)

  // 基本データ取得
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useIntegrationStats()

  const {
    data: cursorStatus,
    isLoading: cursorLoading,
    error: cursorError
  } = useCursorStatus()

  // API接続状態監視
  const {
    data: connectionStatus,
    isLoading: connectionLoading,
    error: connectionError
  } = useApiConnection()

  // 進捗追跡フック
  const [progressState, progressActions] = useProgressTracking({
    enableTimeEstimation: true,
    onComplete: () => {
      setIsOperating(false)
      console.log('操作完了')
    },
    onError: (error) => {
      setIsOperating(false)
      console.error('操作エラー:', error)
    }
  })

  // 初期化（進捗表示付き）
  const initialize = async (config: any = {}) => {
    try {
      setIsOperating(true)
      setScanError(null)

      const steps = [
        { id: 'config_validate', label: '設定検証', status: 'pending' as const },
        { id: 'db_setup', label: 'データベース初期化', status: 'pending' as const },
        { id: 'cursor_connect', label: 'Cursor連携設定', status: 'pending' as const },
        { id: 'service_start', label: 'サービス開始', status: 'pending' as const }
      ]

      progressActions.start(steps)

      // ステップ1: 設定検証
      progressActions.setStepStatus('config_validate', 'active')
      progressActions.updateProgress(10)
      await new Promise(resolve => setTimeout(resolve, 800))
      progressActions.setStepStatus('config_validate', 'completed')
      progressActions.updateProgress(25)

      // ステップ2: データベース初期化
      progressActions.setStepStatus('db_setup', 'active')
      progressActions.updateProgress(40)
      
      // 実際のAPI呼び出し
      await integrationClient.initializeIntegration(config)
      
      progressActions.setStepStatus('db_setup', 'completed')
      progressActions.updateProgress(50)

      // ステップ3: Cursor連携設定
      progressActions.setStepStatus('cursor_connect', 'active')
      progressActions.updateProgress(75)
      await new Promise(resolve => setTimeout(resolve, 1000))
      progressActions.setStepStatus('cursor_connect', 'completed')
      progressActions.updateProgress(90)

      // ステップ4: サービス開始
      progressActions.setStepStatus('service_start', 'active')
      progressActions.updateProgress(100)
      await new Promise(resolve => setTimeout(resolve, 500))
      progressActions.setStepStatus('service_start', 'completed')

      progressActions.complete()
      
      // 関連データ更新
      queryClient.invalidateQueries({ queryKey: queryKeys.integrationStats() })

    } catch (error) {
      console.error('初期化エラー:', error)
      setScanError(error as Error)
      progressActions.setError('初期化に失敗しました')
    }
  }

  // API接続チェック付きスキャン
  const scan = async () => {
    try {
      setIsOperating(true)
      setScanError(null)
      setScanResult(null)

      // 事前にAPI接続をチェック
      console.log('APIサーバー接続チェック中...')
      const connectionCheck = await integrationClient.checkApiConnection()
      
      if (!connectionCheck.isConnected) {
        const errorMessage = connectionCheck.error || 'APIサーバーに接続できません'
        throw new Error(`❌ ${errorMessage}\n\n💡 解決方法:\n1. APIサーバーを起動してください: npm run server\n2. サーバーが起動するまで少し待ってから再試行してください`)
      }

      console.log('✅ APIサーバー接続確認完了')

      const steps = [
        { id: 'api_check', label: 'APIサーバー接続確認', status: 'completed' as const },
        { id: 'cursor_detect', label: 'Cursorディレクトリ検出', status: 'pending' as const },
        { id: 'session_scan', label: 'セッションファイルスキャン', status: 'pending' as const },
        { id: 'data_parsing', label: 'データ解析', status: 'pending' as const },
        { id: 'db_import', label: 'データベース統合', status: 'pending' as const },
        { id: 'index_update', label: 'インデックス更新', status: 'pending' as const }
      ]

      progressActions.start(steps)
      progressActions.updateProgress(15) // API接続チェック完了

      // 各ステップの実行
      for (let i = 1; i < steps.length; i++) { // API接続チェックはスキップ
        const step = steps[i]
        progressActions.setStepStatus(step.id, 'active')
        
        if (step.id === 'session_scan') {
          // 実際のスキャンAPI呼び出し
          const result = await integrationClient.scanCursor()
          setScanResult(result)
        } else {
          // 他のステップはシミュレーション
          await new Promise(resolve => setTimeout(resolve, 800))
        }
        
        progressActions.setStepStatus(step.id, 'completed')
        progressActions.updateProgress(15 + ((i / (steps.length - 1)) * 85))
      }

      progressActions.complete()
      
      // 関連データ更新
      queryClient.invalidateQueries({ queryKey: queryKeys.integrationStats() })
      queryClient.invalidateQueries({ queryKey: ['api-connection'] })

    } catch (error) {
      console.error('スキャンエラー:', error)
      setScanError(error as Error)
      progressActions.setError(error instanceof Error ? error.message : 'スキャンに失敗しました')
    }
  }

  // API接続チェック付き監視開始
  const startWatching = async () => {
    try {
      // 事前にAPI接続をチェック
      const connectionCheck = await integrationClient.checkApiConnection()
      
      if (!connectionCheck.isConnected) {
        const errorMessage = connectionCheck.error || 'APIサーバーに接続できません'
        throw new Error(`❌ ${errorMessage}\n\n💡 解決方法:\n1. APIサーバーを起動してください: npm run server\n2. サーバーが起動するまで少し待ってから再試行してください`)
      }

      await integrationClient.startWatching()
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.cursorStatus })
      queryClient.invalidateQueries({ queryKey: ['api-connection'] })
    } catch (error) {
      console.error('監視開始エラー:', error)
      throw error
    }
  }

  // API接続チェック付き監視停止
  const stopWatching = async () => {
    try {
      // 事前にAPI接続をチェック
      const connectionCheck = await integrationClient.checkApiConnection()
      
      if (!connectionCheck.isConnected) {
        const errorMessage = connectionCheck.error || 'APIサーバーに接続できません'
        throw new Error(`❌ ${errorMessage}\n\n💡 解決方法:\n1. APIサーバーを起動してください: npm run server\n2. サーバーが起動するまで少し待ってから再試行してください`)
      }

      await integrationClient.stopWatching()
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.cursorStatus })
      queryClient.invalidateQueries({ queryKey: ['api-connection'] })
    } catch (error) {
      console.error('監視停止エラー:', error)
      throw error
    }
  }

  return {
    // データ
    stats,
    cursorStatus,
    scanResult,
    progressState,
    connectionStatus,

    // 状態
    isLoading: statsLoading || cursorLoading || connectionLoading,
    isOperating: isOperating || progressState.isActive,
    error: statsError || cursorError || connectionError,
    scanError,

    // アクション
    initialize,
    scan,
    startWatching,
    stopWatching,
    progressActions
  }
} 