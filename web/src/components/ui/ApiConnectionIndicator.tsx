import React from 'react'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useApiConnection } from '../../hooks/useIntegration'

interface ApiConnectionIndicatorProps {
  /** 表示スタイル */
  variant?: 'default' | 'compact' | 'minimal'
  /** クラス名 */
  className?: string
  /** 詳細表示 */
  showDetails?: boolean
}

/**
 * APIサーバー接続状態インジケーター
 */
export const ApiConnectionIndicator: React.FC<ApiConnectionIndicatorProps> = ({
  variant = 'default',
  className = '',
  showDetails = false
}) => {
  const { data: connectionStatus, isLoading, error } = useApiConnection()

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        {variant !== 'minimal' && (
          <span className="text-sm text-gray-600">接続確認中...</span>
        )}
      </div>
    )
  }

  if (error || !connectionStatus) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
        {variant !== 'minimal' && (
          <span className="text-sm text-yellow-600">接続状態不明</span>
        )}
      </div>
    )
  }

  const isConnected = connectionStatus.isConnected

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center ${className}`}>
        {isConnected ? (
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
        ) : (
          <XCircleIcon className="h-4 w-4 text-red-500" />
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {isConnected ? (
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
        ) : (
          <XCircleIcon className="h-4 w-4 text-red-500" />
        )}
        <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          {isConnected ? 'API接続中' : 'API未接続'}
        </span>
      </div>
    )
  }

  // default variant
  return (
    <div className={`bg-white rounded-lg border p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isConnected ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-500" />
          )}
          <div>
            <h4 className={`text-sm font-medium ${isConnected ? 'text-green-900' : 'text-red-900'}`}>
              {isConnected ? 'APIサーバー接続中' : 'APIサーバー未接続'}
            </h4>
            {showDetails && (
              <p className="text-xs text-gray-500 mt-1">
                最終確認: {connectionStatus.lastChecked.toLocaleTimeString('ja-JP')}
              </p>
            )}
          </div>
        </div>
        
        {!isConnected && (
          <div className="text-right">
            <p className="text-xs text-red-600 font-medium">
              サーバーを起動してください
            </p>
            <p className="text-xs text-gray-500 mt-1">
              npm run server
            </p>
          </div>
        )}
      </div>
      
      {!isConnected && connectionStatus.error && showDetails && (
        <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
          <p className="text-xs text-red-700">
            <strong>エラー詳細:</strong> {connectionStatus.error}
          </p>
        </div>
      )}
    </div>
  )
}

export default ApiConnectionIndicator 