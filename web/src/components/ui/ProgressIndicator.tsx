/**
 * ProgressIndicator - 進捗表示コンポーネント
 * ユーザーにわかりやすい進捗フィードバックを提供
 */

import React, { useEffect, useState } from 'react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export interface ProgressStep {
  readonly id: string
  readonly label: string
  readonly description?: string
  readonly estimatedMs?: number
  readonly status: 'pending' | 'active' | 'completed' | 'error'
  readonly progress?: number // 0-100
}

export interface ProgressIndicatorProps {
  readonly steps: ProgressStep[]
  readonly currentStepId?: string
  readonly progress: number // 0-100
  readonly isActive: boolean
  readonly showTimeRemaining?: boolean
  readonly showStepDetails?: boolean
  readonly variant?: 'default' | 'compact' | 'minimal' | 'premium'
  readonly onCancel?: () => void
}

/**
 * 進捗表示コンポーネント
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStepId,
  progress,
  isActive,
  showTimeRemaining = true,
  showStepDetails = true,
  variant = 'default',
  onCancel
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

  // 現在のステップインデックス
    // const currentStepIndex = currentStepId
  //   ? steps.findIndex(step => step.id === currentStepId)
  //   : -1

  // 完了したステップ数
  const completedSteps = steps.filter(step => step.status === 'completed').length

  // 推定残り時間の計算
  const calculateRemainingTime = (): number | null => {
    if (!isActive || progress === 0) return null

    const remainingProgress = 100 - progress
    const timePerProgress = elapsedTime / progress
    return Math.round((remainingProgress * timePerProgress) / 1000)
  }

  const remainingSeconds = calculateRemainingTime()

  // 時間フォーマット
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }

  // ステップアイコン
  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'active':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  // バリエーション別レンダリング
  const renderVariant = () => {
    switch (variant) {
      case 'compact':
        return renderCompactVariant()
      case 'minimal':
        return renderMinimalVariant()
      case 'premium':
        return renderPremiumVariant()
      default:
        return renderDefaultVariant()
    }
  }

  // コンパクト表示
  const renderCompactVariant = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <ArrowPathIcon className={`h-5 w-5 ${isActive ? 'animate-spin text-blue-500' : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-gray-900">
              {isActive ? '処理中...' : '待機中'}
            </span>
          </div>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  // ミニマル表示
  const renderMinimalVariant = () => {
    return (
      <div className="flex items-center space-x-2">
        <ArrowPathIcon className={`h-4 w-4 ${isActive ? 'animate-spin text-blue-500' : 'text-gray-400'}`} />
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
      </div>
    )
  }

  // デフォルト表示
  const renderDefaultVariant = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
              {isActive && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">処理中</h3>
              <p className="text-sm text-gray-500">
                {completedSteps}/{steps.length} ステップ完了
              </p>
            </div>
          </div>
          
          {onCancel && isActive && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="sr-only">キャンセル</span>
              ✕
            </button>
          )}
        </div>

        {/* 進捗バー */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">進捗状況</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 h-3 rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {isActive && (
                <div className="absolute inset-0 bg-white opacity-30 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* 時間情報 */}
        {showTimeRemaining && (
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500">経過時間</p>
                <p className="font-medium text-gray-900">
                  {formatTime(Math.floor(elapsedTime / 1000))}
                </p>
              </div>
            </div>
            
            {remainingSeconds !== null && (
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-gray-500">残り時間</p>
                  <p className="font-medium text-blue-600">
                    約{formatTime(remainingSeconds)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ステップ詳細 */}
        {showStepDetails && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">処理ステップ</h4>
            <div className="space-y-2">
              {steps.map((step) => (
                <div 
                  key={step.id}
                  className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                    step.id === currentStepId 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {getStepIcon(step)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      step.status === 'active' ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {step.label}
                    </p>
                    {step.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {step.description}
                      </p>
                    )}
                  </div>
                  
                  {step.status === 'active' && (
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // プレミアム表示 - より詳細で美しいカード
  const renderPremiumVariant = () => {
    const completedSteps = steps.filter(step => step.status === 'completed').length
    const totalSteps = steps.length
    const currentStep = steps.find(step => step.id === currentStepId)
    const progressPercent = Math.round(progress)
    
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl shadow-xl p-6 max-w-lg mx-auto">
        {/* ヘッダー部分 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <ArrowPathIcon className={`h-5 w-5 text-blue-600 ${isActive ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">進行中</h3>
              <p className="text-sm text-gray-600">
                ステップ {completedSteps + (currentStep ? 1 : 0)} / {totalSteps}
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white/50 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 全体進捗バー */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">全体進捗</span>
            <span className="text-lg font-bold text-blue-600">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* 時間予測表示 */}
          {showTimeRemaining && remainingSeconds !== null && (
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-gray-600">残り時間</span>
              <span className="font-medium text-indigo-600">{formatTime(remainingSeconds)}</span>
            </div>
          )}
        </div>

        {/* 現在のステップ詳細 */}
        {currentStep && (
          <div className="bg-white/70 rounded-xl p-4 mb-4 border border-white/50">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-full">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{currentStep.label}</h4>
                {currentStep.description && (
                  <p className="text-sm text-gray-600">{currentStep.description}</p>
                )}
              </div>
            </div>
            
            {/* ステップ個別進捗 */}
            {currentStep.progress !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">このステップ</span>
                  <span className="text-xs font-medium text-gray-700">{Math.round(currentStep.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${currentStep.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ステップ一覧（コンパクト） */}
        {showStepDetails && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-gray-700 mb-3">詳細ステップ</h5>
            {steps.map((step) => (
              <div key={step.id} className="flex items-center space-x-3 py-1">
                <div className="flex-shrink-0">
                  {step.status === 'completed' ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : step.status === 'error' ? (
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  ) : step.status === 'active' ? (
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="h-4 w-4 border border-gray-300 rounded-full" />
                  )}
                </div>
                <span className={`text-sm ${
                  step.status === 'completed' ? 'text-green-700 font-medium' :
                  step.status === 'error' ? 'text-red-700' :
                  step.status === 'active' ? 'text-blue-700 font-medium' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return renderVariant()
} 