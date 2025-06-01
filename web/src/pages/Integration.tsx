/**
 * Integration Page - Cursor統合機能のメインダッシュボード
 * .mdcルール準拠: 段階的実装、堅牢性、ドキュメント化
 */

import React, { useState } from 'react'
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

const Integration: React.FC = () => {
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
    stopWatching
  } = useIntegration()

  // ログと設定データを取得
  const { data: logs = [] } = useIntegrationLogs()
  const { data: settings } = useIntegrationSettings()
  const saveSettingsMutation = useSaveIntegrationSettings()

  // タブ状態管理
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'settings'>('dashboard')

  // 成功メッセージ状態
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Cursorスキャンを実行
  const handleScan = async () => {
    try {
      await scan()
      setSuccessMessage('スキャンが正常に完了しました')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      console.error('スキャンエラー:', error)
    }
  }

  // 統合を初期化
  const handleInitialize = async () => {
    try {
      await initialize({
        cursor: {
          enabled: true,
          watchPath: '/Users/shirokki22/Library/Application Support/Cursor/User/workspaceStorage',
          autoImport: true
        }
      })
      setSuccessMessage('初期化が正常に完了しました')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      console.error('初期化エラー:', error)
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
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cursor統合機能</h1>
            <p className="text-gray-600 mt-1">
              Cursorのチャット履歴をChat History Managerに統合・管理
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleScan}
              disabled={isOperating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isOperating ? (
                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
              ) : (
                <MagnifyingGlassIcon className="-ml-1 mr-2 h-4 w-4" />
              )}
              {isOperating ? 'スキャン中...' : 'スキャン実行'}
            </button>
            
            {cursorStatus?.isWatching ? (
              <button
                onClick={handleStopWatching}
                disabled={isOperating}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <StopIcon className="-ml-1 mr-2 h-4 w-4" />
                監視停止
              </button>
            ) : (
              <button
                onClick={handleStartWatching}
                disabled={isOperating}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <PlayIcon className="-ml-1 mr-2 h-4 w-4" />
                監視開始
              </button>
            )}
            
            <button
              onClick={handleInitialize}
              disabled={isOperating}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <CogIcon className="-ml-1 mr-2 h-4 w-4" />
              初期化
            </button>
          </div>
        </div>
      </div>

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {(error || scanError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
              <p className="text-sm text-red-700 mt-1">
                {error?.message || scanError?.message || String(error || scanError)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 統計情報カード */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600">総セッション数</p>
                      <p className="text-2xl font-semibold text-blue-900">
                        {stats?.totalSessions?.toLocaleString() || '---'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartBarIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-600">総メッセージ数</p>
                      <p className="text-2xl font-semibold text-green-900">
                        {stats?.totalMessages?.toLocaleString() || '---'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CogIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-600">Cursorセッション</p>
                      <p className="text-2xl font-semibold text-purple-900">
                        {stats?.cursorSessions?.toLocaleString() || '---'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-6 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-yellow-600">監視ステータス</p>
                      <p className="text-lg font-semibold text-yellow-900">
                        {cursorStatus?.isWatching ? '監視中' : '停止中'}
                      </p>
                    </div>
                  </div>
                </div>
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
  )
}

export default Integration 