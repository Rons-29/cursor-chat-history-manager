/**
 * Integration Page - Cursor統合機能のメインダッシュボード
 * .mdcルール準拠: 段階的実装、堅牢性、ドキュメント化
 */

import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  ChartBarIcon, 
  CogIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  DocumentMagnifyingGlassIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline'
import { useIntegration, useIntegrationLogs, useIntegrationSettings, useSaveIntegrationSettings } from '../hooks/useIntegration'
import LogViewer from '../components/integration/LogViewer'
import SettingsPanel from '../components/integration/SettingsPanel'
import { LoadingOverlay } from '../components/ui/LoadingOverlay'
import { DataLoadingProgress, DataLoadingStep } from '../components/ui/DataLoadingProgress'
import { useProgressTracking } from '../hooks/useProgressTracking'
import { ProgressIndicator } from '../components/ui/ProgressIndicator'
import ApiConnectionIndicator from '../components/ui/ApiConnectionIndicator'
import { queryKeys } from '../api/client'

const Integration: React.FC = () => {
  const queryClient = useQueryClient()
  
  const {
    stats,
    cursorStatus,
    isLoading,
    isOperating,
    error,
    initialize,
    scan,
    scanResult,
    scanError,
    startWatching,
    stopWatching,
    progressState,
    progressActions,
    connectionStatus
  } = useIntegration()

  // デバッグログ
  console.log('🎯 Integration Page - stats:', stats)
  console.log('🎯 Integration Page - isLoading:', isLoading)
  console.log('🎯 Integration Page - error:', error)
  console.log('🎯 Integration Page - connectionStatus:', connectionStatus)

  // ログと設定データを取得
  const { data: logs = [] } = useIntegrationLogs()
  const { data: settings } = useIntegrationSettings()
  const saveSettingsMutation = useSaveIntegrationSettings()

  // タブ状態管理
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'settings'>('dashboard')

  // 成功メッセージ状態
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 進捗表示の状態管理
  const [scanProgressSteps, setScanProgressSteps] = useState<DataLoadingStep[]>([])
  const [scanProgress, setScanProgress] = useState(0)
  const [showScanProgress, setShowScanProgress] = useState(false)

  // 進捗追跡は useIntegration から取得

  // スキャン用のステップ定義
  const getScanSteps = (): DataLoadingStep[] => [
    {
      id: 'cursor_detect',
      type: 'file',
      label: 'Cursorディレクトリ検出',
      description: 'Cursorのワークスペースディレクトリを検索中',
      status: 'pending',
      metadata: { apiEndpoint: 'ローカルファイルシステム' }
    },
    {
      id: 'session_scan',
      type: 'file',
      label: 'セッションファイルスキャン',
      description: 'チャット履歴ファイルを検索中',
      status: 'pending',
      metadata: { recordCount: 0 }
    },
    {
      id: 'data_parsing',
      type: 'processing',
      label: 'データ解析',
      description: 'セッションデータの解析と変換',
      status: 'pending'
    },
    {
      id: 'db_import',
      type: 'database',
      label: 'データベース統合',
      description: 'SQLiteデータベースへのインポート',
      status: 'pending',
      metadata: { recordCount: 0 }
    },
    {
      id: 'index_update',
      type: 'database',
      label: 'インデックス更新',
      description: 'FTS5検索インデックスを更新中',
      status: 'pending'
    }
  ]

  // Cursorスキャンを実行（進捗表示付き）
  const handleScan = async () => {
    try {
      setShowScanProgress(true)
      
      // useIntegration内のscan関数が進捗管理も行う
      await scan()
      
      setSuccessMessage('スキャンが正常に完了しました')
      
      setTimeout(() => {
        setShowScanProgress(false)
        setSuccessMessage(null)
      }, 3000)

    } catch (error) {
      console.error('スキャンエラー:', error)
      setTimeout(() => {
        setShowScanProgress(false)
      }, 5000)
    }
  }

  // 統合を初期化（進捗表示付き）
  const handleInitialize = async () => {
    try {
      // useIntegration内のinitialize関数が進捗管理も行う
      await initialize({
        cursor: {
          enabled: true,
          watchPath: '/Users/shirokki22/Library/Application Support/Cursor/User/workspaceStorage',
          autoImport: true
        }
      })

      setSuccessMessage('初期化が正常に完了しました')
      
    } catch (error) {
      console.error('初期化エラー:', error)
      setSuccessMessage('初期化に失敗しました')
    }
  }

  // 監視開始
  const handleStartWatching = async () => {
    try {
      await startWatching()
      setSuccessMessage('監視を開始しました')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      console.error('監視開始エラー:', error)
    }
  }

  // 監視停止
  const handleStopWatching = async () => {
    try {
      await stopWatching()
      setSuccessMessage('監視を停止しました')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      console.error('監視停止エラー:', error)
    }
  }

  // 設定保存
  const handleSaveSettings = async (settings: any) => {
    try {
      await saveSettingsMutation.mutateAsync(settings)
      setSuccessMessage('設定を保存しました')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('設定保存エラー:', error)
    }
  }

  // 設定リセット
  const handleResetSettings = () => {
    console.log('設定をリセット')
    setSuccessMessage('設定をリセットしました')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // ログ更新
  const handleRefreshLogs = () => {
    console.log('ログを更新')
    setSuccessMessage('ログを更新しました')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // 統計情報手動更新
  const handleRefreshStats = async () => {
    try {
      console.log('🔄 統計情報を手動更新中...')
      
      // React Queryのキャッシュを無効化して再取得
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrationStats() })
      await queryClient.refetchQueries({ queryKey: queryKeys.integrationStats() })
      
      setSuccessMessage('統計情報を更新しました')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('統計情報更新エラー:', error)
      setSuccessMessage('統計情報の更新に失敗しました')
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: ChartBarIcon },
    { id: 'logs', name: 'ログ', icon: DocumentMagnifyingGlassIcon },
    { id: 'settings', name: '設定', icon: Cog6ToothIcon }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">統合管理</h1>
          <p className="mt-2 text-gray-600">
            Cursorチャット履歴の統合管理とリアルタイム監視
          </p>
        </div>

        {/* API接続状態表示 */}
        <div className="mb-6">
          <ApiConnectionIndicator 
            variant="default" 
            showDetails={true}
            className="max-w-md"
          />
        </div>

        {/* エラー表示 */}
        {(error || scanError) && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  エラーが発生しました
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <pre className="whitespace-pre-wrap">
                    {(scanError || error)?.message || 'Unknown error'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 進捗表示 */}
        {showScanProgress && progressState.isActive && (
          <div className="mb-6">
            <DataLoadingProgress
              steps={progressState.steps}
              currentProgress={progressState.progress}
              variant="card"
              title="スキャン進行状況"
              onCancel={() => {
                progressActions.cancel()
                setShowScanProgress(false)
              }}
            />
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ダッシュボード
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'logs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ログ
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                設定
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* 統計情報 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-900">総セッション数</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {stats?.totalSessions?.toLocaleString() || '0'}
                    </p>
                    {/* デバッグ情報 */}
                    <p className="text-xs text-gray-500 mt-1">
                      Debug: {stats ? `loaded (${stats.totalSessions})` : 'loading...'}
                    </p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-green-900">総メッセージ数</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {stats?.totalMessages?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Debug: {stats ? `loaded (${stats.totalMessages})` : 'loading...'}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-purple-900">Cursorセッション</h3>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                      {stats?.cursorSessions?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Debug: {stats ? `loaded (${stats.cursorSessions})` : 'loading...'}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-yellow-900">監視状態</h3>
                    <p className="text-lg font-bold text-yellow-600 mt-2">
                      {cursorStatus?.isWatching ? '監視中' : '停止中'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Debug: {cursorStatus ? 'loaded' : 'loading...'}
                    </p>
                  </div>
                </div>

                {/* 操作ボタン */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">操作</h3>
                  <div className="flex space-x-3 flex-wrap gap-2">
                    <button
                      onClick={handleScan}
                      disabled={isOperating || !connectionStatus?.isConnected}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        isOperating || !connectionStatus?.isConnected
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      title={
                        !connectionStatus?.isConnected 
                          ? 'APIサーバーが起動していません' 
                          : isOperating 
                            ? 'スキャン実行中です' 
                            : 'Cursorチャット履歴をスキャンします'
                      }
                    >
                      {isOperating ? (
                        <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      ) : (
                        <MagnifyingGlassIcon className="-ml-1 mr-2 h-4 w-4" />
                      )}
                      {isOperating ? 'スキャン中...' : 'スキャン実行'}
                    </button>
                    
                    <button
                      onClick={handleRefreshStats}
                      disabled={isLoading}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                        isLoading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                      title="統計情報を手動で更新します"
                    >
                      {isLoading ? (
                        <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      ) : (
                        <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4" />
                      )}
                      {isLoading ? '更新中...' : '統計更新'}
                    </button>
                    
                    {/* API接続状態インジケーター（コンパクト版） */}
                    <div className="flex items-center">
                      <ApiConnectionIndicator variant="compact" />
                    </div>
                    
                    {cursorStatus?.isWatching ? (
                      <button
                        onClick={handleStopWatching}
                        disabled={isOperating || !connectionStatus?.isConnected}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                          isOperating || !connectionStatus?.isConnected
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                        title={
                          !connectionStatus?.isConnected 
                            ? 'APIサーバーが起動していません' 
                            : '監視を停止します'
                        }
                      >
                        <StopIcon className="-ml-1 mr-2 h-4 w-4" />
                        監視停止
                      </button>
                    ) : (
                      <button
                        onClick={handleStartWatching}
                        disabled={isOperating || !connectionStatus?.isConnected}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                          isOperating || !connectionStatus?.isConnected
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                        title={
                          !connectionStatus?.isConnected 
                            ? 'APIサーバーが起動していません' 
                            : '監視を開始します'
                        }
                      >
                        <PlayIcon className="-ml-1 mr-2 h-4 w-4" />
                        監視開始
                      </button>
                    )}
                  </div>
                  
                  {/* API未接続時の警告メッセージ */}
                  {!connectionStatus?.isConnected && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800">
                            <strong>APIサーバーが起動していません。</strong>
                            スキャンや監視機能を使用するには、まずAPIサーバーを起動してください。
                          </p>
                          <p className="text-sm text-yellow-700 mt-1">
                            コマンド: <code className="bg-yellow-100 px-1 rounded">npm run server</code>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ステータス情報 */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">システム情報</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">最終同期:</span>
                      <span className="ml-2 text-gray-600">
                        {stats?.lastSync ? new Date(stats.lastSync).toLocaleString('ja-JP') : '未実行'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Cursorパス:</span>
                      <span className="ml-2 text-gray-600 text-xs">
                        {cursorStatus?.cursorPath || '未設定'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">発見セッション数:</span>
                      <span className="ml-2 text-gray-600">
                        {cursorStatus?.sessionsFound?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">最終スキャン:</span>
                      <span className="ml-2 text-gray-600">
                        {cursorStatus?.lastScan ? new Date(cursorStatus.lastScan).toLocaleString('ja-JP') : '未実行'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* スキャン結果 */}
                {scanResult && (
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-green-900 mb-4">最新スキャン結果</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-green-700">発見セッション:</span>
                        <span className="ml-2 text-green-600">{scanResult.sessionsFound}</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">インポートメッセージ:</span>
                        <span className="ml-2 text-green-600">{scanResult.messagesImported}</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">処理時間:</span>
                        <span className="ml-2 text-green-600">{scanResult.duration}ms</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <LogViewer 
                logs={logs}
                isLoading={isLoading}
                onRefresh={handleRefreshLogs}
                autoRefresh={true}
                refreshInterval={5000}
              />
            )}

            {activeTab === 'settings' && (
              settings ? (
                <SettingsPanel 
                  settings={settings}
                  onSave={handleSaveSettings}
                  onReset={handleResetSettings}
                  isLoading={isLoading}
                />
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">設定を読み込み中...</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Integration 