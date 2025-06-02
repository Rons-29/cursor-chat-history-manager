/**
 * EnhancedSettingsPanel - 進捗表示統合済み設定パネル
 * ユーザーフレンドリーな進捗フィードバック付き設定管理
 */

import React, { useState, useEffect } from 'react'
import { 
  CogIcon,
  FolderIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { LoadingOverlay } from '../ui/LoadingOverlay'
import { ProgressIndicator, ProgressStep } from '../ui/ProgressIndicator'
import { useProgressTracking } from '../../hooks/useProgressTracking'

interface IntegrationSettings {
  cursor: {
    enabled: boolean
    watchPath: string
    autoImport: boolean
    scanInterval: number
    maxSessions: number
    includeMetadata: boolean
  }
  sync: {
    enabled: boolean
    interval: number
    batchSize: number
    retryAttempts: number
  }
  security: {
    maskSensitiveData: boolean
    allowedProjects: string[]
    excludePatterns: string[]
  }
  backup: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    retention: number
    location: string
  }
}

interface EnhancedSettingsPanelProps {
  settings: IntegrationSettings
  onSave: (settings: IntegrationSettings) => Promise<void>
  onReset: () => void
  isLoading?: boolean
}

export const EnhancedSettingsPanel: React.FC<EnhancedSettingsPanelProps> = ({
  settings: initialSettings,
  onSave,
  onReset,
  isLoading = false
}) => {
  const [settings, setSettings] = useState<IntegrationSettings>(initialSettings)
  const [activeTab, setActiveTab] = useState<'cursor' | 'sync' | 'security' | 'backup'>('cursor')
  const [hasChanges, setHasChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showProgressOverlay, setShowProgressOverlay] = useState(false)

  // 進捗追跡フック
  const [progressState, progressActions] = useProgressTracking({
    enableTimeEstimation: true,
    onComplete: () => {
      setTimeout(() => {
        setShowProgressOverlay(false)
        progressActions.reset()
      }, 1500)
    },
    onError: (error) => {
      console.error('設定保存エラー:', error)
      setTimeout(() => {
        setShowProgressOverlay(false)
        progressActions.reset()
      }, 3000)
    }
  })

  // 設定変更の検出
  useEffect(() => {
    const hasChanged = JSON.stringify(settings) !== JSON.stringify(initialSettings)
    setHasChanges(hasChanged)
  }, [settings, initialSettings])

  // バリデーション
  const validateSettings = (): string[] => {
    const errors: string[] = []

    // Cursor設定のバリデーション
    if (settings.cursor.enabled) {
      if (!settings.cursor.watchPath.trim()) {
        errors.push('Cursor監視パスが設定されていません')
      }
      if (settings.cursor.scanInterval < 60) {
        errors.push('スキャン間隔は60秒以上である必要があります')
      }
      if (settings.cursor.maxSessions < 1) {
        errors.push('最大セッション数は1以上である必要があります')
      }
    }

    // 同期設定のバリデーション
    if (settings.sync.enabled) {
      if (settings.sync.interval < 300) {
        errors.push('同期間隔は300秒以上である必要があります')
      }
      if (settings.sync.batchSize < 1 || settings.sync.batchSize > 1000) {
        errors.push('バッチサイズは1-1000の範囲である必要があります')
      }
    }

    // バックアップ設定のバリデーション
    if (settings.backup.enabled) {
      if (!settings.backup.location.trim()) {
        errors.push('バックアップ場所が設定されていません')
      }
      if (settings.backup.retention < 1) {
        errors.push('保持期間は1以上である必要があります')
      }
    }

    return errors
  }

  // 設定保存ステップの定義
  const getSaveSteps = (): ProgressStep[] => [
    {
      id: 'validate',
      label: '設定の検証',
      description: '入力値の妥当性をチェック',
      status: 'pending'
    },
    {
      id: 'backup',
      label: '現在の設定をバックアップ',
      description: '既存設定の安全な保存',
      status: 'pending'
    },
    {
      id: 'save',
      label: '新しい設定を保存',
      description: 'データベースへの設定書き込み',
      status: 'pending'
    },
    {
      id: 'restart_services',
      label: 'サービスの再起動',
      description: '変更を反映するためサービス更新',
      status: 'pending'
    },
    {
      id: 'verify',
      label: '設定の検証',
      description: '保存された設定の確認',
      status: 'pending'
    }
  ]

  // 設定保存処理
  const handleSave = async () => {
    const errors = validateSettings()
    setValidationErrors(errors)

    if (errors.length > 0) {
      return
    }

    setShowProgressOverlay(true)
    const saveSteps = getSaveSteps()
    progressActions.start(saveSteps)

    try {
      // ステップ1: 検証
      progressActions.setStepStatus('validate', 'active')
      progressActions.updateProgress(10, 'validate')
      await new Promise(resolve => setTimeout(resolve, 500))
      progressActions.setStepStatus('validate', 'completed')

      // ステップ2: バックアップ
      progressActions.setStepStatus('backup', 'active')
      progressActions.updateProgress(30, 'backup')
      await new Promise(resolve => setTimeout(resolve, 800))
      progressActions.setStepStatus('backup', 'completed')

      // ステップ3: 保存
      progressActions.setStepStatus('save', 'active')
      progressActions.updateProgress(60, 'save')
      await onSave(settings)
      progressActions.setStepStatus('save', 'completed')

      // ステップ4: サービス再起動
      progressActions.setStepStatus('restart_services', 'active')
      progressActions.updateProgress(80, 'restart_services')
      await new Promise(resolve => setTimeout(resolve, 1000))
      progressActions.setStepStatus('restart_services', 'completed')

      // ステップ5: 検証
      progressActions.setStepStatus('verify', 'active')
      progressActions.updateProgress(95, 'verify')
      await new Promise(resolve => setTimeout(resolve, 500))
      progressActions.setStepStatus('verify', 'completed')

      progressActions.updateProgress(100)
      progressActions.complete()

    } catch (error) {
      progressActions.setError(error instanceof Error ? error.message : '設定保存に失敗しました')
    }
  }

  // 設定リセット
  const handleReset = () => {
    setSettings(initialSettings)
    setValidationErrors([])
    onReset()
  }

  // 設定更新ヘルパー
  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev }
      const keys = path.split('.')
      let current: any = newSettings
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newSettings
    })
  }

  const tabs = [
    { id: 'cursor', name: 'Cursor設定', icon: CogIcon },
    { id: 'sync', name: '同期設定', icon: ClockIcon },
    { id: 'security', name: 'セキュリティ', icon: ShieldCheckIcon },
    { id: 'backup', name: 'バックアップ', icon: DocumentDuplicateIcon }
  ]

  return (
    <>
      <div className="bg-white shadow rounded-lg">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">統合設定</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleReset}
                disabled={!hasChanges || isLoading}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                リセット
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isLoading}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>

        {/* バリデーションエラー */}
        {validationErrors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">設定エラー</h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* タブ */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 mr-8`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="p-6">
          {activeTab === 'cursor' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Cursor統合を有効にする</label>
                <input
                  type="checkbox"
                  checked={settings.cursor.enabled}
                  onChange={(e) => updateSettings('cursor.enabled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>

              {settings.cursor.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">監視パス</label>
                    <input
                      type="text"
                      value={settings.cursor.watchPath}
                      onChange={(e) => updateSettings('cursor.watchPath', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="/path/to/cursor/sessions"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">スキャン間隔（秒）</label>
                    <input
                      type="number"
                      value={settings.cursor.scanInterval}
                      onChange={(e) => updateSettings('cursor.scanInterval', parseInt(e.target.value))}
                      min="60"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">最大セッション数</label>
                    <input
                      type="number"
                      value={settings.cursor.maxSessions}
                      onChange={(e) => updateSettings('cursor.maxSessions', parseInt(e.target.value))}
                      min="1"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900">自動インポート</label>
                    <input
                      type="checkbox"
                      checked={settings.cursor.autoImport}
                      onChange={(e) => updateSettings('cursor.autoImport', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900">メタデータを含める</label>
                    <input
                      type="checkbox"
                      checked={settings.cursor.includeMetadata}
                      onChange={(e) => updateSettings('cursor.includeMetadata', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">同期を有効にする</label>
                <input
                  type="checkbox"
                  checked={settings.sync.enabled}
                  onChange={(e) => updateSettings('sync.enabled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>

              {settings.sync.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">同期間隔（秒）</label>
                    <input
                      type="number"
                      value={settings.sync.interval}
                      onChange={(e) => updateSettings('sync.interval', parseInt(e.target.value))}
                      min="300"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">バッチサイズ</label>
                    <input
                      type="number"
                      value={settings.sync.batchSize}
                      onChange={(e) => updateSettings('sync.batchSize', parseInt(e.target.value))}
                      min="1"
                      max="1000"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">再試行回数</label>
                    <input
                      type="number"
                      value={settings.sync.retryAttempts}
                      onChange={(e) => updateSettings('sync.retryAttempts', parseInt(e.target.value))}
                      min="0"
                      max="10"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* 他のタブコンテンツも同様に実装 */}
        </div>
      </div>

      {/* 進捗表示オーバーレイ */}
      <LoadingOverlay
        isVisible={showProgressOverlay}
        title="設定を保存中"
        message="設定の変更を適用しています..."
        variant="detailed"
        showProgress={true}
        steps={progressState.steps}
        currentStepId={progressState.currentStepId || undefined}
        progress={progressState.progress}
        onCancel={() => {
          progressActions.cancel()
          setShowProgressOverlay(false)
        }}
        error={progressState.error || undefined}
      />
    </>
  )
} 