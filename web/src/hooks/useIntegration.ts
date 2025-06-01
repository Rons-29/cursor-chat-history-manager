/**
 * useIntegration - 統合機能のカスタムフック
 * .mdcルール準拠: React Query活用、型安全、エラーハンドリング
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getIntegrationStats,
  getCursorStatus,
  initializeIntegration,
  scanCursor,
  startWatching,
  stopWatching,
  getCursorSessions,
  getIntegrationLogs,
  saveIntegrationSettings,
  getIntegrationSettings,
  type IntegrationStats,
  type CursorStatus,
  type IntegrationConfig,
  type ScanResult
} from '../api/integration'

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
    queryKey: INTEGRATION_QUERY_KEYS.stats,
    queryFn: getIntegrationStats,
    staleTime: 30000, // 30秒間はキャッシュを使用
    refetchInterval: 60000, // 1分ごとに自動更新
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
    queryFn: getCursorStatus,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Cursorセッション一覧を取得するフック
 */
export const useCursorSessions = (limit?: number, offset?: number) => {
  return useQuery({
    queryKey: [...INTEGRATION_QUERY_KEYS.cursorSessions, { limit, offset }],
    queryFn: () => getCursorSessions(limit, offset),
    staleTime: 60000, // 1分間はキャッシュを使用
    retry: 3
  })
}

/**
 * 統合ログを取得するフック
 */
export const useIntegrationLogs = (limit: number = 100) => {
  return useQuery({
    queryKey: [...INTEGRATION_QUERY_KEYS.logs, { limit }],
    queryFn: () => getIntegrationLogs(limit),
    staleTime: 30000,
    retry: 3
  })
}

/**
 * 統合設定を取得するフック
 */
export const useIntegrationSettings = () => {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.settings,
    queryFn: getIntegrationSettings,
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
    mutationFn: saveIntegrationSettings,
    onSuccess: () => {
      // 設定保存後、設定データを再取得
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.settings })
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.stats })
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.cursorStatus })
    },
    onError: (error) => {
      console.error('設定保存エラー:', error)
    }
  })
}

/**
 * 統合機能を初期化するフック
 */
export const useInitializeIntegration = () => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, IntegrationConfig>({
    mutationFn: initializeIntegration,
    onSuccess: () => {
      // 初期化成功後、関連データを再取得
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.stats })
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.cursorStatus })
    },
    onError: (error) => {
      console.error('初期化エラー:', error)
    }
  })
}

/**
 * Cursorスキャンを実行するフック
 */
export const useScanCursor = () => {
  const queryClient = useQueryClient()

  return useMutation<ScanResult, Error, void>({
    mutationFn: scanCursor,
    onSuccess: (data) => {
      console.log('スキャン完了:', data)
      // スキャン成功後、関連データを再取得
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.stats })
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.cursorStatus })
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.cursorSessions })
    },
    onError: (error) => {
      console.error('スキャンエラー:', error)
    }
  })
}

/**
 * 監視を開始するフック
 */
export const useStartWatching = () => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: startWatching,
    onSuccess: () => {
      // 監視開始後、ステータスを更新
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.cursorStatus })
    },
    onError: (error) => {
      console.error('監視開始エラー:', error)
    }
  })
}

/**
 * 監視を停止するフック
 */
export const useStopWatching = () => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: stopWatching,
    onSuccess: () => {
      // 監視停止後、ステータスを更新
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.cursorStatus })
    },
    onError: (error) => {
      console.error('監視停止エラー:', error)
    }
  })
}

/**
 * 統合機能の包括的なフック
 * 複数のクエリとミューテーションを組み合わせて使いやすくする
 */
export const useIntegration = () => {
  const stats = useIntegrationStats()
  const cursorStatus = useCursorStatus()
  const initializeMutation = useInitializeIntegration()
  const scanMutation = useScanCursor()
  const startWatchingMutation = useStartWatching()
  const stopWatchingMutation = useStopWatching()

  // 全体的なローディング状態
  const isLoading = stats.isLoading || cursorStatus.isLoading

  // 全体的なエラー状態
  const error = stats.error || cursorStatus.error

  // 操作中の状態
  const isOperating = 
    initializeMutation.isPending ||
    scanMutation.isPending ||
    startWatchingMutation.isPending ||
    stopWatchingMutation.isPending

  return {
    // データ
    stats: stats.data,
    cursorStatus: cursorStatus.data,
    
    // 状態
    isLoading,
    isOperating,
    error,
    
    // 操作
    initialize: initializeMutation.mutate,
    scan: scanMutation.mutate,
    startWatching: startWatchingMutation.mutate,
    stopWatching: stopWatchingMutation.mutate,
    
    // 再取得
    refetchStats: stats.refetch,
    refetchCursorStatus: cursorStatus.refetch,
    
    // ミューテーション結果
    scanResult: scanMutation.data,
    initializeError: initializeMutation.error,
    scanError: scanMutation.error
  }
} 