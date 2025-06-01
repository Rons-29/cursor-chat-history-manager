/**
 * useProgressTracking - 進捗追跡カスタムフック
 * リアルタイム進捗更新、時間予測、ステップ管理
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { ProgressStep } from '../components/ui/ProgressIndicator'

export interface ProgressTrackingOptions {
  readonly enableTimeEstimation?: boolean
  readonly enableWebSocket?: boolean
  readonly pollingInterval?: number
  readonly estimationSampleSize?: number
  readonly onStepChange?: (stepId: string) => void
  readonly onComplete?: () => void
  readonly onError?: (error: string) => void
}

export interface ProgressState {
  readonly isActive: boolean
  readonly progress: number
  readonly currentStepId: string | null
  readonly steps: ProgressStep[]
  readonly estimatedTimeRemaining: number | null
  readonly elapsedTime: number
  readonly error: string | null
}

export interface ProgressActions {
  readonly start: (steps: ProgressStep[]) => void
  readonly updateProgress: (progress: number, stepId?: string) => void
  readonly setStepStatus: (stepId: string, status: ProgressStep['status']) => void
  readonly addStep: (step: ProgressStep) => void
  readonly complete: () => void
  readonly cancel: () => void
  readonly reset: () => void
  readonly setError: (error: string) => void
}

/**
 * 進捗追跡フック
 */
export const useProgressTracking = (
  options: ProgressTrackingOptions = {}
): [ProgressState, ProgressActions] => {
  const {
    enableTimeEstimation = true,
    enableWebSocket = false,
    pollingInterval = 1000,
    estimationSampleSize = 10,
    onStepChange,
    onComplete,
    onError
  } = options

  // 状態管理
  const [isActive, setIsActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStepId, setCurrentStepId] = useState<string | null>(null)
  const [steps, setSteps] = useState<ProgressStep[]>([])
  const [error, setErrorState] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // 時間予測用の状態
  const [progressHistory, setProgressHistory] = useState<Array<{ progress: number; timestamp: number }>>([])
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  
  // 参照値
  const startTimeRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const webSocketRef = useRef<WebSocket | null>(null)

  // 経過時間の更新
  useEffect(() => {
    if (!isActive) {
      setElapsedTime(0)
      return
    }

    const updateElapsedTime = () => {
      const now = Date.now()
      const elapsed = now - startTimeRef.current
      setElapsedTime(elapsed)
      
      // 進捗履歴の更新（時間予測用）
      if (enableTimeEstimation && progress > 0) {
        setProgressHistory(prev => {
          const newHistory = [...prev, { progress, timestamp: now }]
          return newHistory.slice(-estimationSampleSize)
        })
      }
    }

    intervalRef.current = setInterval(updateElapsedTime, 1000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, progress, enableTimeEstimation, estimationSampleSize])

  // 推定残り時間の計算
  useEffect(() => {
    if (!enableTimeEstimation || !isActive || progress === 0 || progressHistory.length < 2) {
      setEstimatedTimeRemaining(null)
      return
    }

    const now = Date.now()
    const recentHistory = progressHistory.slice(-Math.min(5, progressHistory.length))
    
    if (recentHistory.length < 2) return

    // 線形回帰で進捗率を計算
    const progressRate = calculateProgressRate(recentHistory)
    
    if (progressRate > 0) {
      const remainingProgress = 100 - progress
      const estimatedMs = remainingProgress / progressRate
      setEstimatedTimeRemaining(Math.round(estimatedMs / 1000))
    }
  }, [progressHistory, progress, enableTimeEstimation, isActive])

  // WebSocket接続（オプション）
  useEffect(() => {
    if (!enableWebSocket || !isActive) return

    const connectWebSocket = () => {
      try {
        const wsUrl = `ws://localhost:3001/ws/progress`
        webSocketRef.current = new WebSocket(wsUrl)

        webSocketRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'progress') {
              setProgress(data.progress)
              if (data.stepId) {
                setCurrentStepId(data.stepId)
              }
            } else if (data.type === 'step_update') {
              setSteps(prev => 
                prev.map(step => 
                  step.id === data.stepId 
                    ? { ...step, status: data.status }
                    : step
                )
              )
            } else if (data.type === 'complete') {
              complete()
            } else if (data.type === 'error') {
              setError(data.message)
            }
          } catch (error) {
            console.error('WebSocket メッセージ解析エラー:', error)
          }
        }

        webSocketRef.current.onerror = (error) => {
          console.error('WebSocket エラー:', error)
          setError('リアルタイム更新の接続に失敗しました')
        }

        webSocketRef.current.onclose = () => {
          console.log('WebSocket 接続が閉じられました')
        }
      } catch (error) {
        console.error('WebSocket 接続エラー:', error)
      }
    }

    connectWebSocket()

    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close()
      }
    }
  }, [enableWebSocket, isActive])

  // 進捗率計算
  const calculateProgressRate = useCallback((history: Array<{ progress: number; timestamp: number }>) => {
    if (history.length < 2) return 0

    const first = history[0]
    const last = history[history.length - 1]
    
    const progressDiff = last.progress - first.progress
    const timeDiff = last.timestamp - first.timestamp
    
    return timeDiff > 0 ? progressDiff / timeDiff : 0
  }, [])

  // アクション関数
  const start = useCallback((initialSteps: ProgressStep[]) => {
    setIsActive(true)
    setProgress(0)
    setSteps(initialSteps)
    setCurrentStepId(initialSteps[0]?.id || null)
    setErrorState(null)
    setProgressHistory([])
    setEstimatedTimeRemaining(null)
    startTimeRef.current = Date.now()
  }, [])

  const updateProgress = useCallback((newProgress: number, stepId?: string) => {
    setProgress(Math.min(100, Math.max(0, newProgress)))
    
    if (stepId) {
      setCurrentStepId(stepId)
      onStepChange?.(stepId)
    }
  }, [onStepChange])

  const setStepStatus = useCallback((stepId: string, status: ProgressStep['status']) => {
    setSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { ...step, status }
          : step
      )
    )

    if (status === 'active') {
      setCurrentStepId(stepId)
      onStepChange?.(stepId)
    }
  }, [onStepChange])

  const addStep = useCallback((step: ProgressStep) => {
    setSteps(prev => [...prev, step])
  }, [])

  const complete = useCallback(() => {
    setIsActive(false)
    setProgress(100)
    setCurrentStepId(null)
    setSteps(prev => 
      prev.map(step => 
        step.status !== 'completed' && step.status !== 'error'
          ? { ...step, status: 'completed' }
          : step
      )
    )
    onComplete?.()
  }, [onComplete])

  const cancel = useCallback(() => {
    setIsActive(false)
    setCurrentStepId(null)
    if (webSocketRef.current) {
      webSocketRef.current.close()
    }
  }, [])

  const reset = useCallback(() => {
    setIsActive(false)
    setProgress(0)
    setCurrentStepId(null)
    setSteps([])
    setErrorState(null)
    setProgressHistory([])
    setEstimatedTimeRemaining(null)
    setElapsedTime(0)
  }, [])

  const setError = useCallback((errorMessage: string) => {
    setErrorState(errorMessage)
    setIsActive(false)
    onError?.(errorMessage)
  }, [onError])

  // 状態とアクションを返す
  const state: ProgressState = {
    isActive,
    progress,
    currentStepId,
    steps,
    estimatedTimeRemaining,
    elapsedTime,
    error
  }

  const actions: ProgressActions = {
    start,
    updateProgress,
    setStepStatus,
    addStep,
    complete,
    cancel,
    reset,
    setError
  }

  return [state, actions]
}

/**
 * シンプルな進捗追跡フック（ローディング状態のみ）
 */
export const useSimpleProgress = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const start = useCallback(() => {
    setIsLoading(true)
    setProgress(0)
  }, [])

  const updateProgress = useCallback((newProgress: number) => {
    setProgress(Math.min(100, Math.max(0, newProgress)))
  }, [])

  const complete = useCallback(() => {
    setProgress(100)
    setTimeout(() => {
      setIsLoading(false)
      setProgress(0)
    }, 500)
  }, [])

  const cancel = useCallback(() => {
    setIsLoading(false)
    setProgress(0)
  }, [])

  return {
    isLoading,
    progress,
    start,
    updateProgress,
    complete,
    cancel
  }
} 