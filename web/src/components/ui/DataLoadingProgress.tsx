/**
 * DataLoadingProgress - データ読み込み専用進捗表示
 * API、DB、ファイル処理の進捗を視覚的に表示
 */

import React, { useEffect, useState } from 'react'
import {
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  DocumentMagnifyingGlassIcon,
  ArrowPathIcon,
  ServerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { InlineLoading } from './LoadingOverlay'

export interface DataLoadingStep {
  readonly id: string
  readonly type: 'api' | 'database' | 'file' | 'processing' | 'validation'
  readonly label: string
  readonly description?: string
  readonly estimatedMs?: number
  readonly status: 'pending' | 'active' | 'completed' | 'error' | 'skipped'
  readonly progress?: number // 0-100 for this step
  readonly metadata?: {
    recordCount?: number
    fileSize?: number
    apiEndpoint?: string
    error?: string
  }
}

export interface DataLoadingProgressProps {
  readonly steps: DataLoadingStep[]
  readonly currentStepId?: string
  readonly overallProgress: number
  readonly isActive: boolean
  readonly showStepProgress?: boolean
  readonly showMetadata?: boolean
  readonly variant?: 'inline' | 'card' | 'sidebar'
  readonly onRetry?: (stepId: string) => void
  readonly onSkip?: (stepId: string) => void
}

/**
 * データ読み込み進捗表示コンポーネント
 */
export const DataLoadingProgress: React.FC<DataLoadingProgressProps> = ({
  steps,
  currentStepId,
  overallProgress,
  isActive,
  showStepProgress = true,
  showMetadata = false,
  variant = 'card',
  onRetry,
  onSkip
}) => {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime] = useState(Date.now())

  // 経過時間の更新
  useEffect(() => {
    if (!isActive) {
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, startTime])

  // ステップアイコンの取得
  const getStepIcon = (step: DataLoadingStep) => {
    if (step.status === 'completed') {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    }
    if (step.status === 'error') {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
    }
    if (step.status === 'active') {
      return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />
    }

    // ステップタイプ別のアイコン
    switch (step.type) {
      case 'api':
        return <ServerIcon className="h-5 w-5 text-gray-400" />
      case 'database':
        return <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
      case 'file':
        return <DocumentArrowDownIcon className="h-5 w-5 text-gray-400" />
      case 'processing':
        return <ChartBarIcon className="h-5 w-5 text-gray-400" />
      case 'validation':
        return <DocumentMagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  // ステップの状態色
  const getStepStatusColor = (status: DataLoadingStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'active':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'skipped':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // 時間フォーマット
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }

  // インライン表示
  if (variant === 'inline') {
    const currentStep = steps.find(step => step.id === currentStepId)
    return (
      <div className="flex items-center space-x-3 py-2">
        <InlineLoading isLoading={isActive} size="small" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              {currentStep?.label || 'データを読み込み中...'}
            </span>
            <span className="text-xs text-gray-500">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // サイドバー表示
  if (variant === 'sidebar') {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">データ読み込み状況</h3>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{Math.round(overallProgress)}%</span>
            <span>{formatTime(elapsedTime)}</span>
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={`p-2 rounded-lg border transition-colors ${
                step.id === currentStepId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {getStepIcon(step)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {step.label}
                  </p>
                  {step.status === 'active' && step.progress !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // カード表示（デフォルト）
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <DocumentArrowDownIcon className="h-6 w-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">データ読み込み中</h3>
            <p className="text-sm text-gray-500">
              {steps.filter(s => s.status === 'completed').length}/{steps.length} ステップ完了
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{Math.round(overallProgress)}%</div>
          <div className="text-xs text-gray-500">{formatTime(elapsedTime)}</div>
        </div>
      </div>

      {/* 全体進捗 */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${overallProgress}%` }}
          >
            {isActive && (
              <div className="absolute inset-0 bg-white opacity-20 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* ステップ一覧 */}
      {showStepProgress && (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                step.id === currentStepId 
                  ? 'bg-blue-50 border-blue-200 transform scale-105' 
                  : getStepStatusColor(step.status)
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStepIcon(step)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{step.label}</span>
                      {step.status === 'active' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                          実行中
                        </span>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                    )}
                    
                    {/* メタデータ表示 */}
                    {showMetadata && step.metadata && (
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        {step.metadata.recordCount && (
                          <div>レコード数: {step.metadata.recordCount.toLocaleString()}</div>
                        )}
                        {step.metadata.fileSize && (
                          <div>ファイルサイズ: {(step.metadata.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                        )}
                        {step.metadata.apiEndpoint && (
                          <div>エンドポイント: {step.metadata.apiEndpoint}</div>
                        )}
                        {step.metadata.error && (
                          <div className="text-red-600">エラー: {step.metadata.error}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center space-x-2">
                  {step.status === 'error' && onRetry && (
                    <button
                      onClick={() => onRetry(step.id)}
                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                    >
                      再試行
                    </button>
                  )}
                  {step.status === 'pending' && onSkip && (
                    <button
                      onClick={() => onSkip(step.id)}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      スキップ
                    </button>
                  )}
                  {step.status === 'active' && step.progress !== undefined && (
                    <div className="text-xs text-blue-600 font-medium">
                      {Math.round(step.progress)}%
                    </div>
                  )}
                </div>
              </div>

              {/* ステップ進捗バー */}
              {step.status === 'active' && step.progress !== undefined && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 