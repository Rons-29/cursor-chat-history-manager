import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * 🛡️ ChatFlow エラーバウンダリー
 * - React エラーをキャッチして適切に表示
 * - ユーザーフレンドリーなエラーメッセージ
 * - 開発時は詳細エラー情報を表示
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    
    // 本番環境では適切なエラー監視サービスに送信
    if (process.env.NODE_ENV === 'production') {
      console.error('ChatFlow Error:', error, errorInfo)
      // TODO: エラー監視サービス（Sentry等）に送信
    } else {
      console.error('Development Error:', error, errorInfo)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // カスタムエラーUI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // デフォルトエラーUI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                予期しないエラーが発生しました
              </h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              申し訳ございません。ChatFlowで問題が発生しました。
              <br />
              下記の方法をお試しください。
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                ページを更新
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                ホームに戻る
              </button>
            </div>

            {/* 開発環境でのエラー詳細 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                  エラー詳細（開発用）
                </summary>
                <div className="mt-2 text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <br />
                    {this.state.error.stack}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <br />
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              問題が続く場合は、ブラウザのキャッシュをクリアしてください
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 🔄 ローディングスケルトン - 統一パターン
 */
export const LoadingSkeleton: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className = '' 
}) => (
  <div className={`animate-pulse ${className}`}>
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  </div>
)

/**
 * ⚠️ エラーメッセージ - 統一パターン
 */
interface ErrorMessageProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'エラーが発生しました',
  message,
  onRetry,
  retryLabel = '再試行'
}) => (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
    <div className="flex items-start">
      <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
          {title}
        </h3>
        <p className="mt-1 text-sm text-red-700 dark:text-red-300">
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-sm bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded-md hover:bg-red-200 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  </div>
)

/**
 * 📭 空状態 - 統一パターン
 */
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action
}) => (
  <div className="text-center py-12">
    {icon && (
      <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
      {title}
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
      {description}
    </p>
    {action && (
      <button
        onClick={action.onClick}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
) 