/**
 * LoadingOverlay - オーバーレイ型ローディングコンポーネント
 * 画面全体やエリアを覆って処理中であることを明確に示す
 */

import React from 'react'
import { ProgressIndicator, ProgressStep } from './ProgressIndicator'
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export interface LoadingOverlayProps {
  readonly isVisible: boolean
  readonly title?: string
  readonly message?: string
  readonly progress?: number
  readonly steps?: ProgressStep[]
  readonly currentStepId?: string
  readonly showProgress?: boolean
  readonly variant?: 'default' | 'simple' | 'detailed'
  readonly backdrop?: 'blur' | 'dark' | 'light'
  readonly size?: 'small' | 'medium' | 'large'
  readonly onCancel?: () => void
  readonly error?: string | null
}

/**
 * ローディングオーバーレイコンポーネント
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  title = '読み込み中...',
  message,
  progress = 0,
  steps = [],
  currentStepId,
  showProgress = false,
  variant = 'default',
  backdrop = 'blur',
  size = 'medium',
  onCancel,
  error
}) => {
  if (!isVisible) return null

  // バックドロップスタイル
  const getBackdropClass = () => {
    switch (backdrop) {
      case 'blur':
        return 'backdrop-blur-sm bg-white/80'
      case 'dark':
        return 'bg-black/50'
      case 'light':
        return 'bg-white/90'
      default:
        return 'backdrop-blur-sm bg-white/80'
    }
  }

  // サイズクラス
  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'max-w-sm'
      case 'large':
        return 'max-w-2xl'
      default:
        return 'max-w-md'
    }
  }

  // シンプル表示
  if (variant === 'simple') {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${getBackdropClass()}`}>
        <div className="bg-white rounded-lg shadow-xl p-6 mx-4">
          <div className="flex items-center space-x-4">
            <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              {message && (
                <p className="text-sm text-gray-500 mt-1">{message}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 詳細表示（進捗あり）
  if (variant === 'detailed' && showProgress) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${getBackdropClass()}`}>
        <div className={`w-full ${getSizeClass()}`}>
          <ProgressIndicator
            steps={steps}
            currentStepId={currentStepId}
            progress={progress}
            isActive={true}
            showTimeRemaining={true}
            showStepDetails={true}
            onCancel={onCancel}
          />
        </div>
      </div>
    )
  }

  // デフォルト表示
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${getBackdropClass()}`}>
      <div className={`bg-white rounded-xl shadow-2xl p-8 mx-4 w-full ${getSizeClass()}`}>
        {/* エラー表示 */}
        {error ? (
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">エラーが発生しました</h3>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <button
              onClick={onCancel}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
            {/* ヘッダー */}
            <div className="text-center mb-6">
              <div className="relative inline-flex items-center justify-center">
                <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin" />
                <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mt-4">{title}</h3>
              {message && (
                <p className="text-sm text-gray-600 mt-2">{message}</p>
              )}
            </div>

            {/* 進捗表示 */}
            {showProgress && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-700">進捗</span>
                  <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white opacity-20 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {/* 現在のステップ表示 */}
            {currentStepId && steps.length > 0 && (
              <div className="mb-6">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                    <span>
                      {steps.find(step => step.id === currentStepId)?.label || '処理中...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* キャンセルボタン */}
            {onCancel && (
              <div className="text-center">
                <button
                  onClick={onCancel}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  キャンセル
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * 軽量なインラインローディング表示
 */
export interface InlineLoadingProps {
  readonly isLoading: boolean
  readonly text?: string
  readonly size?: 'small' | 'medium' | 'large'
  readonly color?: 'blue' | 'gray' | 'green'
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  isLoading,
  text = '読み込み中...',
  size = 'medium',
  color = 'blue'
}) => {
  if (!isLoading) return null

  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6'
  }

  const colorClasses = {
    blue: 'text-blue-500',
    gray: 'text-gray-500',
    green: 'text-green-500'
  }

  return (
    <div className="flex items-center space-x-2">
      <ArrowPathIcon className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`} />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  )
} 