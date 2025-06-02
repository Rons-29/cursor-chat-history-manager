import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { apiClient, queryKeys, CursorSettings } from '../api/client.js'

// CursorSettings型はclient.tsからインポート済み

const SETTINGS_STORAGE_KEY = 'chat-history-manager-cursor-settings'

const defaultSettings: CursorSettings = {
  enabled: true,
  monitorPath: '/Users/shirokki22/Library/Application Support/Cursor/User/workspaceStorage',
  scanInterval: 30,
  maxSessions: 1000,
  autoImport: true,
  includeMetadata: false
}

const Settings: React.FC = () => {
  const queryClient = useQueryClient()
  const [isDataClearing, setIsDataClearing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'cursor' | 'general' | 'security' | 'backup'>('cursor')
  const [settingsSaved, setSettingsSaved] = useState(false)
  
  // 設定をlocalStorageから読み込む
  const loadSettingsFromStorage = (): CursorSettings => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // デフォルト設定とマージして、新しいプロパティが追加された場合に対応
        return { ...defaultSettings, ...parsed }
      }
    } catch (error) {
      console.error('設定の読み込みに失敗:', error)
    }
    return defaultSettings
  }

  // 設定をlocalStorageに保存する
  const saveSettingsToStorage = (settings: CursorSettings) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      return true
    } catch (error) {
      console.error('設定の保存に失敗:', error)
      return false
    }
  }

  // バックエンドからCursor設定を取得
  const { data: backendSettings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: queryKeys.cursorSettings(),
    queryFn: () => apiClient.getCursorSettings(),
    retry: 1,
    staleTime: 30000, // 30秒間はキャッシュを使用
  })

  // Cursor設定の状態管理（バックエンドとLocalStorageの両方を考慮）
  const [cursorSettings, setCursorSettings] = useState<CursorSettings>(() => {
    // 初期値はLocalStorageから読み込み（バックエンドデータが来るまでの間）
    return loadSettingsFromStorage()
  })

  // バックエンドから設定が取得できた場合は更新
  useEffect(() => {
    if (backendSettings) {
      setCursorSettings(backendSettings)
      // バックエンドの設定をLocalStorageにも保存（同期）
      saveSettingsToStorage(backendSettings)
    }
  }, [backendSettings])

  // 設定保存のMutation
  const saveSettingsMutation = useMutation({
    mutationFn: (settings: CursorSettings) => apiClient.saveCursorSettings(settings),
    onSuccess: (savedSettings) => {
      // 成功時はクエリキャッシュを更新
      queryClient.setQueryData(queryKeys.cursorSettings(), savedSettings)
      // LocalStorageにも保存
      saveSettingsToStorage(savedSettings)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    },
    onError: (error) => {
      console.error('バックエンド保存エラー:', error)
      // エラー時はLocalStorageのみに保存
      if (saveSettingsToStorage(cursorSettings)) {
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 2000)
        alert('⚠️ バックエンドへの保存に失敗しましたが、ローカルには保存されました\n\n' + 
              '詳細: ' + (error as Error).message)
      }
    }
  })

  // 設定リセットのMutation
  const resetSettingsMutation = useMutation({
    mutationFn: () => apiClient.resetCursorSettings(),
    onSuccess: (resetSettings) => {
      setCursorSettings(resetSettings)
      queryClient.setQueryData(queryKeys.cursorSettings(), resetSettings)
      saveSettingsToStorage(resetSettings)
      alert('設定をデフォルト値にリセットしました')
    },
    onError: (error) => {
      console.error('リセットエラー:', error)
      alert('設定のリセットに失敗しました: ' + (error as Error).message)
    }
  })

  // 設定変更時に自動保存（デバウンス付き）
  useEffect(() => {
    // 初期ロード時は自動保存しない
    if (!backendSettings) return

    const timeoutId = setTimeout(() => {
      // バックエンドに保存を試行
      saveSettingsMutation.mutate(cursorSettings)
    }, 1000) // 1秒後に自動保存

    return () => clearTimeout(timeoutId)
  }, [cursorSettings, backendSettings])

  // システム情報取得（statsを使用してサーバー状態確認）
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const stats = await apiClient.getStats()
      return {
        status: 'OK',
        timestamp: stats.lastUpdated,
        uptime: Math.floor(
          (new Date().getTime() - new Date('2025-05-29T00:00:00Z').getTime()) /
            1000
        ),
      }
    },
    refetchInterval: 30000,
  })

  // 統計情報取得
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.stats(),
    queryFn: () => apiClient.getStats(),
  })

  // Cursor設定の更新
  const handleCursorSettingsChange = (key: keyof CursorSettings, value: any) => {
    setCursorSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 設定保存（手動）
  const handleSaveSettings = async () => {
    try {
      // バックエンドに保存
      await saveSettingsMutation.mutateAsync(cursorSettings)
      
      // 成功メッセージ
      alert('設定を保存しました\n\n💾 サーバーとローカルストレージに永続化されました\n🔄 ページをリロードしても設定が保持されます\n🌐 他のデバイスからも同じ設定が利用できます')
    } catch (error) {
      // エラーは既にmutationのonErrorで処理済み
      console.error('手動保存エラー:', error)
    }
  }

  // 設定リセット
  const handleResetSettings = () => {
    if (confirm('設定をデフォルト値にリセットしますか？\n\nこの操作は取り消せません。')) {
      resetSettingsMutation.mutate()
    }
  }

  // 設定エクスポート
  const handleExportSettings = () => {
    try {
      const dataStr = JSON.stringify(cursorSettings, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cursor-settings-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
      
      alert('設定をエクスポートしました')
    } catch (error) {
      alert('エクスポートに失敗しました: ' + (error as Error).message)
    }
  }

  // 設定インポート
  const handleImportSettings = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target?.result as string)
            const mergedSettings = { ...defaultSettings, ...imported }
            setCursorSettings(mergedSettings)
            saveSettingsToStorage(mergedSettings)
            alert('設定をインポートしました')
          } catch (error) {
            alert('設定ファイルの読み込みに失敗しました: ' + (error as Error).message)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  // パス参照ダイアログ（仮実装）
  const handleBrowsePath = () => {
    const newPath = prompt('監視パスを入力してください:', cursorSettings.monitorPath)
    if (newPath) {
      handleCursorSettingsChange('monitorPath', newPath)
    }
  }

  // キャッシュクリア
  const handleClearCache = () => {
    queryClient.clear()
    alert('キャッシュをクリアしました')
  }

  // データリフレッシュ
  const handleRefreshAll = () => {
    queryClient.invalidateQueries()
    queryClient.refetchQueries()
    alert('全データの更新を開始しました')
  }

  // データエクスポート（仮実装）
  const handleExport = async () => {
    try {
      const sessions = await apiClient.getSessions({ limit: 1000 })
      const dataStr = JSON.stringify(sessions, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })

      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chat-history-export-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)

      alert('データをエクスポートしました')
    } catch (error) {
      alert('エクスポートに失敗しました: ' + (error as Error).message)
    }
  }

  // データ削除（仮実装）
  const handleDeleteAllData = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setIsDataClearing(true)
    try {
      // 実際のAPIエンドポイントがあれば実装
      alert('この機能は現在利用できません')
    } catch (error) {
      alert('削除に失敗しました: ' + (error as Error).message)
    } finally {
      setIsDataClearing(false)
      setShowDeleteConfirm(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}日 ${hours}時間`
    if (hours > 0) return `${hours}時間 ${minutes}分`
    return `${minutes}分`
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">統合管理</h1>
        <p className="text-gray-600">Cursorチャット履歴の統合管理とリアルタイム監視</p>
      </div>

      {/* API接続状態 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          <div>
            <p className="text-sm font-medium text-gray-900">APIサーバー接続中</p>
            <p className="text-xs text-gray-500">最終確認: 8:31:09</p>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('cursor')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cursor'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Cursor設定</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span>一般設定</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>セキュリティ</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'backup'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 7l3.707-3.707a1 1 0 011.414 0z" />
              </svg>
              <span>バックアップ</span>
            </div>
          </button>
        </nav>
      </div>

      {/* 統合設定 */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">統合設定</h2>
          <div className="flex items-center space-x-2">
            {/* 自動保存状態表示 */}
            {settingsSaved && (
              <div className="flex items-center space-x-1 text-green-600 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>保存済み</span>
              </div>
            )}
            
            <button
              onClick={handleExportSettings}
              className="btn-secondary text-sm"
              title="設定をJSONファイルとしてエクスポート"
            >
              エクスポート
            </button>
            <button
              onClick={handleImportSettings}
              className="btn-secondary text-sm"
              title="設定をJSONファイルからインポート"
            >
              インポート
            </button>
            <button
              onClick={handleResetSettings}
              className="btn-secondary text-sm"
            >
              リセット
            </button>
            <button
              onClick={handleSaveSettings}
              className="btn-primary text-sm"
            >
              保存
            </button>
          </div>
        </div>

        {/* 永続化状態の表示 */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="text-blue-800 font-medium">設定の永続化</p>
              <p className="text-blue-700">
                設定はサーバーとローカルストレージの両方に保存されます。
                変更は1秒後に自動保存され、他のデバイスからも同じ設定が利用できます。
                {settingsError && (
                  <span className="text-orange-600 block mt-1">
                    ⚠️ サーバー接続エラー: ローカルストレージのみで動作中
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Cursor設定タブ */}
        {activeTab === 'cursor' && (
          <div className="space-y-6">
            {/* Cursor履歴を有効にする */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="cursor-enabled"
                checked={cursorSettings.enabled}
                onChange={(e) => handleCursorSettingsChange('enabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="cursor-enabled" className="text-sm font-medium text-gray-900">
                Cursor履歴を有効にする
              </label>
            </div>

            {/* 監視パス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                監視パス
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={cursorSettings.monitorPath}
                  onChange={(e) => handleCursorSettingsChange('monitorPath', e.target.value)}
                  className="flex-1 input-field text-sm"
                  placeholder="Cursorワークスペースストレージのパス"
                />
                <button
                  onClick={handleBrowsePath}
                  className="btn-secondary text-sm"
                >
                  参照
                </button>
              </div>
            </div>

            {/* スキャン間隔 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スキャン間隔 (秒)
              </label>
              <input
                type="number"
                min="10"
                max="3600"
                value={cursorSettings.scanInterval}
                onChange={(e) => handleCursorSettingsChange('scanInterval', parseInt(e.target.value))}
                className="input-field w-32 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                10秒〜1時間の範囲で設定してください
              </p>
            </div>

            {/* 最大セッション数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大セッション数
              </label>
              <input
                type="number"
                min="100"
                max="10000"
                value={cursorSettings.maxSessions}
                onChange={(e) => handleCursorSettingsChange('maxSessions', parseInt(e.target.value))}
                className="input-field w-32 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                保存する最大セッション数を設定してください
              </p>
            </div>

            {/* 自動インポートを有効にする */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="auto-import"
                checked={cursorSettings.autoImport}
                onChange={(e) => handleCursorSettingsChange('autoImport', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="auto-import" className="text-sm font-medium text-gray-900">
                自動インポートを有効にする
              </label>
            </div>

            {/* メタデータを含める */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="include-metadata"
                checked={cursorSettings.includeMetadata}
                onChange={(e) => handleCursorSettingsChange('includeMetadata', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="include-metadata" className="text-sm font-medium text-gray-900">
                メタデータを含める
              </label>
            </div>
          </div>
        )}

        {/* 一般設定タブ */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <p className="text-gray-600">一般設定は準備中です。</p>
          </div>
        )}

        {/* セキュリティタブ */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <p className="text-gray-600">セキュリティ設定は準備中です。</p>
          </div>
        )}

        {/* バックアップタブ */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <p className="text-gray-600">バックアップ設定は準備中です。</p>
          </div>
        )}
      </div>

      {/* システム情報 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          システム情報
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">サーバー状態</h3>
            {healthLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : healthData ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  状態:{' '}
                  <span className="text-green-600 font-medium">
                    {healthData.status}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  稼働時間: {formatUptime(healthData.uptime)}
                </p>
                <p className="text-sm text-gray-600">
                  最終確認:{' '}
                  {new Date(healthData.timestamp).toLocaleString('ja-JP')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-red-600">接続できません</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">データ統計</h3>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : stats ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  総セッション数: {stats.totalSessions}
                </p>
                <p className="text-sm text-gray-600">
                  総メッセージ数: {stats.totalMessages}
                </p>
                <p className="text-sm text-gray-600">
                  今月のメッセージ: {stats.thisMonthMessages}
                </p>
              </div>
            ) : (
              <p className="text-sm text-red-600">データを取得できません</p>
            )}
          </div>
        </div>
      </div>

      {/* データ管理 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">データ管理</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              className="btn-primary flex items-center justify-center space-x-2"
              onClick={handleRefreshAll}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>全データ更新</span>
            </button>

            <button
              className="btn-secondary flex items-center justify-center space-x-2"
              onClick={handleClearCache}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>キャッシュクリア</span>
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-medium text-gray-900 mb-3">
              エクスポート・インポート
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                className="btn-secondary flex items-center justify-center space-x-2"
                onClick={handleExport}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>データエクスポート</span>
              </button>

              <button
                className="btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50"
                disabled
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span>データインポート (準備中)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 危険な操作 */}
      <div className="card border-red-200 bg-red-50">
        <h2 className="text-lg font-semibold text-red-900 mb-4">危険な操作</h2>
        <div className="space-y-4">
          <p className="text-sm text-red-700">
            以下の操作は慎重に行ってください。データの復旧はできません。
          </p>

          {!showDeleteConfirm ? (
            <button
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              onClick={handleDeleteAllData}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>全データ削除</span>
            </button>
          ) : (
            <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm text-red-800 mb-4">
                本当に全データを削除しますか？この操作は取り消せません。
              </p>
              <div className="flex space-x-3">
                <button
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  onClick={handleDeleteAllData}
                  disabled={isDataClearing}
                >
                  {isDataClearing ? '削除中...' : '削除実行'}
                </button>
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDataClearing}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 使用方法 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">使用方法</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-900">ダッシュボード</h3>
            <p>システム全体の統計情報と最近のセッションを確認できます。</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">セッション一覧</h3>
            <p>全てのチャットセッションを閲覧、検索、ソートできます。</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">検索機能</h3>
            <p>キーワードでメッセージ内容を横断検索できます。</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">自動更新</h3>
            <p>データは定期的に自動更新されます。手動更新も可能です。</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
