/**
 * SettingsPanel - Cursor統合の詳細設定コンポーネント
 * .mdcルール準拠: 設定の保存・復元、バリデーション
 */

import React, { useState, useEffect } from 'react'
import { 
  CogIcon,
  FolderIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

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

interface SettingsPanelProps {
  settings: IntegrationSettings
  onSave: (settings: IntegrationSettings) => Promise<void>
  onReset: () => void
  isLoading?: boolean
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings: initialSettings,
  onSave,
  onReset,
  isLoading = false
}) => {
  const [settings, setSettings] = useState<IntegrationSettings>(initialSettings)
  const [activeTab, setActiveTab] = useState<'cursor' | 'sync' | 'security' | 'backup'>('cursor')
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

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

  // 設定保存
  const handleSave = async () => {
    const errors = validateSettings()
    setValidationErrors(errors)

    if (errors.length > 0) {
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    try {
      await onSave(settings)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      setSaveStatus('error')
      console.error('設定保存エラー:', error)
    }
  }

  // 設定リセット
  const handleReset = () => {
    setSettings(initialSettings)
    setValidationErrors([])
    setSaveStatus('idle')
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
    <div className="bg-white shadow rounded-lg">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">統合設定</h2>
          <div className="flex items-center space-x-3">
            {saveStatus === 'success' && (
              <div className="flex items-center text-green-600">
                <CheckCircleIcon className="h-5 w-5 mr-1" />
                <span className="text-sm">保存完了</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center text-red-600">
                <XMarkIcon className="h-5 w-5 mr-1" />
                <span className="text-sm">保存失敗</span>
              </div>
            )}
            <button
              onClick={handleReset}
              disabled={!hasChanges || isLoading}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              リセット
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isLoading || saveStatus === 'saving'}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saveStatus === 'saving' ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>

      {/* バリデーションエラー */}
      {validationErrors.length > 0 && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">設定エラー</h3>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
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

      {/* 設定内容 */}
      <div className="p-6">
        {activeTab === 'cursor' && (
          <div className="space-y-6">
            <div className="flex items-center">
              <input
                id="cursor-enabled"
                type="checkbox"
                checked={settings.cursor.enabled}
                onChange={(e) => updateSettings('cursor.enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="cursor-enabled" className="ml-2 block text-sm text-gray-900">
                Cursor統合を有効にする
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">監視パス</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="relative flex items-stretch flex-grow focus-within:z-10">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FolderIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={settings.cursor.watchPath}
                    onChange={(e) => updateSettings('cursor.watchPath', e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full rounded-none rounded-l-md pl-10 sm:text-sm border-gray-300"
                    placeholder="/path/to/cursor/logs"
                  />
                </div>
                <button
                  type="button"
                  className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  参照
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">スキャン間隔（秒）</label>
                <input
                  type="number"
                  min="60"
                  value={settings.cursor.scanInterval}
                  onChange={(e) => updateSettings('cursor.scanInterval', parseInt(e.target.value))}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">最大セッション数</label>
                <input
                  type="number"
                  min="1"
                  value={settings.cursor.maxSessions}
                  onChange={(e) => updateSettings('cursor.maxSessions', parseInt(e.target.value))}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="auto-import"
                  type="checkbox"
                  checked={settings.cursor.autoImport}
                  onChange={(e) => updateSettings('cursor.autoImport', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto-import" className="ml-2 block text-sm text-gray-900">
                  自動インポートを有効にする
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="include-metadata"
                  type="checkbox"
                  checked={settings.cursor.includeMetadata}
                  onChange={(e) => updateSettings('cursor.includeMetadata', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="include-metadata" className="ml-2 block text-sm text-gray-900">
                  メタデータを含める
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="space-y-6">
            <div className="flex items-center">
              <input
                id="sync-enabled"
                type="checkbox"
                checked={settings.sync.enabled}
                onChange={(e) => updateSettings('sync.enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sync-enabled" className="ml-2 block text-sm text-gray-900">
                自動同期を有効にする
              </label>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">同期間隔（秒）</label>
                <input
                  type="number"
                  min="300"
                  value={settings.sync.interval}
                  onChange={(e) => updateSettings('sync.interval', parseInt(e.target.value))}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">バッチサイズ</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.sync.batchSize}
                  onChange={(e) => updateSettings('sync.batchSize', parseInt(e.target.value))}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">リトライ回数</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={settings.sync.retryAttempts}
                  onChange={(e) => updateSettings('sync.retryAttempts', parseInt(e.target.value))}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-center">
              <input
                id="mask-sensitive"
                type="checkbox"
                checked={settings.security.maskSensitiveData}
                onChange={(e) => updateSettings('security.maskSensitiveData', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="mask-sensitive" className="ml-2 block text-sm text-gray-900">
                機密データをマスクする
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">許可プロジェクト（1行1つ）</label>
              <textarea
                rows={4}
                value={settings.security.allowedProjects.join('\n')}
                onChange={(e) => updateSettings('security.allowedProjects', e.target.value.split('\n').filter(Boolean))}
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="project-name-1&#10;project-name-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">除外パターン（1行1つ）</label>
              <textarea
                rows={4}
                value={settings.security.excludePatterns.join('\n')}
                onChange={(e) => updateSettings('security.excludePatterns', e.target.value.split('\n').filter(Boolean))}
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="*.secret&#10;*password*"
              />
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="flex items-center">
              <input
                id="backup-enabled"
                type="checkbox"
                checked={settings.backup.enabled}
                onChange={(e) => updateSettings('backup.enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="backup-enabled" className="ml-2 block text-sm text-gray-900">
                自動バックアップを有効にする
              </label>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">バックアップ頻度</label>
                <select
                  value={settings.backup.frequency}
                  onChange={(e) => updateSettings('backup.frequency', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="daily">毎日</option>
                  <option value="weekly">毎週</option>
                  <option value="monthly">毎月</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">保持期間（日）</label>
                <input
                  type="number"
                  min="1"
                  value={settings.backup.retention}
                  onChange={(e) => updateSettings('backup.retention', parseInt(e.target.value))}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">バックアップ場所</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="relative flex items-stretch flex-grow focus-within:z-10">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FolderIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={settings.backup.location}
                    onChange={(e) => updateSettings('backup.location', e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full rounded-none rounded-l-md pl-10 sm:text-sm border-gray-300"
                    placeholder="/path/to/backup"
                  />
                </div>
                <button
                  type="button"
                  className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  参照
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPanel 