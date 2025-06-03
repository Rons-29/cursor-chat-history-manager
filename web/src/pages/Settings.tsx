import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { apiClient, CursorSettings } from '../api/client'
import { GeneralSettings, SecuritySettings, BackupSettings, defaultGeneralSettings, defaultSecuritySettings, defaultBackupSettings } from '../types/settings'
import { useTheme } from '../contexts/ThemeContext'
import { ModernCard, SettingSection, SettingField } from '../components/ModernCard'
import { ModernSelect, ModernInput, ModernCheckbox, ModernRange } from '../components/ModernInput'

// インポート直後のAPIクライアント確認
console.log('🔍 インポート直後のAPIクライアント（関数ベース）:', {
  apiClient,
  type: typeof apiClient,
  hasApiClient: !!apiClient,
  isObject: typeof apiClient === 'object',
  getCursorSettings: apiClient?.getCursorSettings,
  saveCursorSettings: apiClient?.saveCursorSettings,
  getCursorSettingsType: typeof apiClient?.getCursorSettings,
  saveCursorSettingsType: typeof apiClient?.saveCursorSettings,
  allKeys: Object.keys(apiClient)
})

// CursorSettings型はclient.tsからインポート済み

// queryKeys.cursorSettings関数の問題を回避するため、直接クエリキーを指定

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
  const { theme, setTheme } = useTheme()
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
  const { data: backendSettings, error: settingsError } = useQuery({
    queryKey: ['settings', 'cursor'] as const, // 直接指定でバックアップ
    queryFn: async () => {
      console.log('🔍 useQuery実行時のAPIクライアント（関数ベース）:', { 
        apiClient, 
        getCursorSettings: apiClient.getCursorSettings,
        getCursorSettingsType: typeof apiClient.getCursorSettings,
        allKeys: Object.keys(apiClient),
        hasMethod: 'getCursorSettings' in apiClient
      })
      
      // フォールバック: メソッドが見つからない場合の直接実装
      if (typeof apiClient.getCursorSettings !== 'function') {
        console.warn('⚠️ getCursorSettingsメソッドが見つからない。直接fetch実行します。')
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/settings/cursor`)
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
        }
        
        const result = await response.json()
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Cursor設定の取得に失敗しました')
        }
        
        console.log('✅ 直接fetch取得成功:', result.data)
        return result.data
      }
      
      return apiClient.getCursorSettings()
    },
    retry: 1,
    staleTime: 30000, // 30秒間はキャッシュを使用
  })

  // Cursor設定の状態管理（バックエンドとLocalStorageの両方を考慮）
  const [cursorSettings, setCursorSettings] = useState<CursorSettings>(() => {
    // 初期値はLocalStorageから読み込み（バックエンドデータが来るまでの間）
    return loadSettingsFromStorage()
  })

  // バックエンドから一般設定を取得
  const { data: backendGeneralSettings } = useQuery({
    queryKey: ['settings', 'general'] as const,
    queryFn: async () => {
      try {
        if (typeof apiClient.getGeneralSettings !== 'function') {
          console.warn('⚠️ getGeneralSettingsメソッドが見つからない。デフォルト設定を使用します。')
          return defaultGeneralSettings
        }
        return await apiClient.getGeneralSettings()
      } catch (error) {
        console.warn('一般設定の取得に失敗:', error)
        return defaultGeneralSettings
      }
    },
    retry: 1,
    staleTime: 30000,
  })

  // 一般設定の状態管理（バックエンドとテーマContextを同期）
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(() => ({
    ...defaultGeneralSettings,
    theme: theme
  }))

  // バックエンドから一般設定が取得できた場合は更新
  useEffect(() => {
    if (backendGeneralSettings) {
      setGeneralSettings(prev => ({
        ...prev,
        ...backendGeneralSettings,
        theme: theme // テーマContextの値を優先
      }))
    }
  }, [backendGeneralSettings, theme])

  // セキュリティ設定の状態管理  
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(defaultSecuritySettings)

  // バックアップ設定の状態管理
  const [backupSettings, setBackupSettings] = useState<BackupSettings>(defaultBackupSettings)

  // バックエンドから設定が取得できた場合は更新
  useEffect(() => {
    if (backendSettings) {
      setCursorSettings(backendSettings)
      // バックエンドの設定をLocalStorageにも保存（同期）
      saveSettingsToStorage(backendSettings)
    }
  }, [backendSettings])

  // デバッグ: APIクライアント確認
  useEffect(() => {
    console.log('🔍 初期ロード時のAPIクライアント確認:', {
      apiClient,
      hasApiClient: !!apiClient,
      saveCursorSettings: apiClient?.saveCursorSettings,
      saveCursorSettingsType: typeof apiClient?.saveCursorSettings,
      getCursorSettings: apiClient?.getCursorSettings,
      getCursorSettingsType: typeof apiClient?.getCursorSettings,
      baseUrl: (apiClient as any)?.baseUrl,
      // APIクライアントの全メソッドを確認
      allMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(apiClient)).filter(name => typeof (apiClient as any)[name] === 'function'),
      // APIクライアントの構造確認
      apiClientKeys: Object.keys(apiClient),
      apiClientPrototype: Object.getPrototypeOf(apiClient),
      apiClientConstructor: apiClient.constructor.name
    })
    
    // 開発用: windowオブジェクトにAPIクライアントを公開
    if (typeof window !== 'undefined') {
      (window as any).debugApiClient = apiClient
      console.log('🔍 APIクライアントをwindow.debugApiClientに公開しました')
    }
    
    // より詳細なテスト: APIクライアントの baseUrl と request メソッドも確認
    const testApiStructure = () => {
      console.log('🔍 APIクライアント構造詳細:', {
        apiClientType: typeof apiClient,
        instanceOf: apiClient.constructor.name,
        hasRequest: typeof (apiClient as any).request,
        hasBaseUrl: (apiClient as any).baseUrl,
        proto: apiClient.constructor.prototype,
        protoMethods: Object.getOwnPropertyNames(apiClient.constructor.prototype)
      })
    }
    
    testApiStructure()
    
    // 単純なfetch直接テスト
    const testDirectFetch = async () => {
      try {
        console.log('🔍 直接fetch テスト開始...')
        const response = await fetch('http://localhost:3001/api/settings/cursor')
        const data = await response.json()
        console.log('✅ 直接fetch成功:', data)
      } catch (error) {
        console.error('❌ 直接fetch失敗:', error)
      }
    }
    
    testDirectFetch()
  }, [])

  // 設定保存のMutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: CursorSettings) => {
      console.log('🔍 Mutation実行時のAPIクライアント（関数ベース）:', { 
        apiClient, 
        saveCursorSettings: apiClient.saveCursorSettings,
        type: typeof apiClient.saveCursorSettings,
        allKeys: Object.keys(apiClient),
        hasMethod: 'saveCursorSettings' in apiClient,
        directAccess: apiClient['saveCursorSettings']
      })
      
      // フォールバック: メソッドが見つからない場合の直接実装
      if (typeof apiClient.saveCursorSettings !== 'function') {
        console.warn('⚠️ saveCursorSettingsメソッドが見つからない。直接fetch実行します。')
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/settings/cursor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        })
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
        }
        
        const result = await response.json()
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Cursor設定の保存に失敗しました')
        }
        
        console.log('✅ 直接fetch保存成功:', result.data)
        return result.data
      }
      
      return apiClient.saveCursorSettings(settings)
    },
    onSuccess: (savedSettings) => {
      // 成功時はクエリキャッシュを更新
      queryClient.setQueryData(['settings', 'cursor'] as const, savedSettings)
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

  // 一般設定保存のMutation
  const saveGeneralMutation = useMutation({
    mutationFn: async (settings: GeneralSettings) => {
      if (typeof apiClient.saveGeneralSettings !== 'function') {
        console.warn('⚠️ saveGeneralSettingsメソッドが見つからない。スキップします。')
        return settings
      }
      return apiClient.saveGeneralSettings(settings)
    },
    onSuccess: (savedSettings) => {
      queryClient.setQueryData(['settings', 'general'] as const, savedSettings)
      console.log('✅ 一般設定をバックエンドに保存しました:', savedSettings)
    },
    onError: (error) => {
      console.error('一般設定保存エラー:', error)
    }
  })

  // 設定リセットのMutation
  const resetSettingsMutation = useMutation({
    mutationFn: async () => {
      // フォールバック: メソッドが見つからない場合の直接実装
      if (typeof apiClient.resetCursorSettings !== 'function') {
        console.warn('⚠️ resetCursorSettingsメソッドが見つからない。直接fetch実行します。')
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/settings/cursor/reset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
        }
        
        const result = await response.json()
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Cursor設定のリセットに失敗しました')
        }
        
        console.log('✅ 直接fetchリセット成功:', result.data)
        return result.data
      }
      
      return apiClient.resetCursorSettings()
    },
    onSuccess: (resetSettings) => {
      setCursorSettings(resetSettings)
      queryClient.setQueryData(['settings', 'cursor'] as const, resetSettings)
      saveSettingsToStorage(resetSettings)
      alert('設定をデフォルト値にリセットしました')
    },
    onError: (error) => {
      console.error('リセットエラー:', error)
      alert('設定のリセットに失敗しました: ' + (error as Error).message)
    }
  })

  // Cursor設定変更時に自動保存（デバウンス付き）
  useEffect(() => {
    // 初期ロード時は自動保存しない
    if (!backendSettings) return

    const timeoutId = setTimeout(() => {
      // バックエンドに保存を試行
      saveSettingsMutation.mutate(cursorSettings)
    }, 1000) // 1秒後に自動保存

    return () => clearTimeout(timeoutId)
  }, [cursorSettings, backendSettings])

  // 一般設定変更時に自動保存（デバウンス付き）
  useEffect(() => {
    // 初期ロード時は自動保存しない
    if (!backendGeneralSettings) return

    const timeoutId = setTimeout(() => {
      // バックエンドに保存を試行
      saveGeneralMutation.mutate(generalSettings)
    }, 1000) // 1秒後に自動保存

    return () => clearTimeout(timeoutId)
  }, [generalSettings, backendGeneralSettings])

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
    queryKey: ['stats'] as const,
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
      // デバッグ: APIクライアントの確認
      console.log('🔍 APIクライアントデバッグ:', {
        apiClient,
        saveCursorSettings: apiClient.saveCursorSettings,
        saveCursorSettingsType: typeof apiClient.saveCursorSettings
      })
      
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

      {/* 設定コンテンツ */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
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
          </div>
          <div className="flex items-center space-x-2">
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
            <button
              onClick={() => {
                console.log('🔍 テスト保存開始:', cursorSettings)
                saveSettingsMutation.mutate(cursorSettings)
              }}
              className="btn-secondary text-sm"
            >
              テスト保存
            </button>
            <button
              onClick={() => {
                console.log('📋 現在の設定値確認:', {
                  cursorSettings,
                  generalSettings,
                  securitySettings,
                  backupSettings,
                  backendSettings,
                  settingsError
                })
                alert('設定値をコンソールに出力しました。F12で開発者ツールを確認してください。')
              }}
              className="btn-secondary text-sm"
            >
              設定確認
            </button>
            <button
              onClick={async () => {
                console.log('🔍 詳細デバッグ実行...')
                
                // APIクライアント詳細確認
                console.log('APIクライアント詳細:', {
                  apiClient,
                  type: typeof apiClient,
                  constructor: apiClient.constructor.name,
                  prototype: Object.getPrototypeOf(apiClient),
                  ownProps: Object.getOwnPropertyNames(apiClient),
                  prototypeMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(apiClient))
                })
                
                // 手動でAPIクライアントメソッド実行テスト
                try {
                  if (typeof (apiClient as any).getCursorSettings === 'function') {
                    const result = await (apiClient as any).getCursorSettings()
                    console.log('✅ 手動getCursorSettings成功:', result)
                  } else {
                    console.error('❌ getCursorSettingsがfunctionではありません')
                  }
                } catch (error) {
                  console.error('❌ 手動getCursorSettings失敗:', error)
                }
                
                alert('詳細デバッグをコンソールに出力しました。')
              }}
              className="btn-secondary text-sm"
            >
              詳細デバッグ
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
            {/* 基本設定カード */}
            <ModernCard
              title="基本設定"
              description="Cursor履歴監視の有効化とメタデータ設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="space-y-4">
                <ModernCheckbox
                checked={cursorSettings.enabled}
                  onChange={(checked) => handleCursorSettingsChange('enabled', checked)}
                  label="Cursor履歴を有効にする"
                  description="Cursorワークスペースの履歴監視を開始します"
                />

                <ModernCheckbox
                  checked={cursorSettings.autoImport}
                  onChange={(checked) => handleCursorSettingsChange('autoImport', checked)}
                  label="自動インポートを有効にする"
                  description="新しいセッションを自動的に検出・インポートします"
                />

                <ModernCheckbox
                  checked={cursorSettings.includeMetadata}
                  onChange={(checked) => handleCursorSettingsChange('includeMetadata', checked)}
                  label="メタデータを含める"
                  description="プロジェクト情報やタイムスタンプなどの詳細情報を保存"
                />
            </div>
            </ModernCard>

            {/* 監視設定カード */}
            <ModernCard
              title="監視設定"
              description="Cursorワークスペースの監視パスとスキャン設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              }
            >
              <div className="space-y-6">
                <SettingField
                  label="監視パス"
                  description="Cursorワークスペースストレージの場所"
                >
              <div className="flex space-x-2">
                    <ModernInput
                  value={cursorSettings.monitorPath}
                      onChange={(value) => handleCursorSettingsChange('monitorPath', value)}
                  placeholder="Cursorワークスペースストレージのパス"
                      className="flex-1"
                />
                <button
                  onClick={handleBrowsePath}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                >
                  参照
                </button>
              </div>
                </SettingField>

                <SettingField
                  label="スキャン間隔"
                  description="新しいセッションをチェックする頻度（10秒-1時間）"
                >
                  <ModernRange
                value={cursorSettings.scanInterval}
                    onChange={(value) => handleCursorSettingsChange('scanInterval', value)}
                    min={10}
                    max={3600}
                    step={10}
                    label="秒"
                    showValue
                  />
                </SettingField>

                <SettingField
                  label="最大セッション数"
                  description="保存する最大セッション数（100-10000）"
                >
                  <ModernRange
                value={cursorSettings.maxSessions}
                    onChange={(value) => handleCursorSettingsChange('maxSessions', value)}
                    min={100}
                    max={10000}
                    step={100}
                    showValue
                  />
                </SettingField>
            </div>
            </ModernCard>
          </div>
        )}

        {/* 一般設定タブ */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* テーマ・言語設定カード */}
            <ModernCard
              title="外観設定"
              description="テーマとインターフェース言語の設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SettingField
                  label="テーマ設定"
                  description="変更は即座に反映されます"
                >
                  <ModernSelect
                    value={theme}
                    onChange={(value) => {
                      const newTheme = value as GeneralSettings['theme']
                      setTheme(newTheme)
                      setGeneralSettings(prev => ({
                        ...prev,
                        theme: newTheme
                      }))
                      console.log('🎨 ユーザーがテーマを変更:', newTheme)
                    }}
                    options={[
                      { value: 'system', label: 'システム設定に従う' },
                      { value: 'light', label: 'ライトモード' },
                      { value: 'dark', label: 'ダークモード' }
                    ]}
                  />
                </SettingField>

                <SettingField
                  label="言語設定"
                  description="インターフェース言語を変更"
                >
                  <ModernSelect
                    value={generalSettings.language}
                    onChange={(value) => setGeneralSettings(prev => ({
                      ...prev,
                      language: value as GeneralSettings['language']
                    }))}
                    options={[
                      { value: 'ja', label: '日本語' },
                      { value: 'en', label: 'English' }
                    ]}
                  />
                </SettingField>
            </div>
            </ModernCard>

            {/* 表示設定カード */}
            <ModernCard
              title="表示設定"
              description="セッション一覧と日時表示の設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SettingField
                  label="セッション表示件数"
                  description="一覧ページでの表示件数"
                >
                  <ModernSelect
                    value={generalSettings.sessionsPerPage}
                    onChange={(value) => setGeneralSettings(prev => ({
                      ...prev,
                      sessionsPerPage: parseInt(value) as GeneralSettings['sessionsPerPage']
                    }))}
                    options={[
                      { value: 10, label: '10件' },
                      { value: 25, label: '25件' },
                      { value: 50, label: '50件' },
                      { value: 100, label: '100件' }
                    ]}
                  />
                </SettingField>

                <SettingField
                  label="日時表示形式"
                  description="時刻の表示方法"
                >
                  <ModernSelect
                    value={generalSettings.dateFormat}
                    onChange={(value) => setGeneralSettings(prev => ({
                      ...prev,
                      dateFormat: value as GeneralSettings['dateFormat']
                    }))}
                    options={[
                      { value: '24h', label: '24時間表示' },
                      { value: '12h', label: '12時間表示' }
                    ]}
                  />
                </SettingField>

                <SettingField
                  label="タイムゾーン"
                  description="表示する時間帯"
                >
                  <ModernSelect
                    value={generalSettings.timezone}
                    onChange={(value) => setGeneralSettings(prev => ({
                      ...prev,
                      timezone: value
                    }))}
                    options={[
                      { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
                      { value: 'UTC', label: 'UTC' },
                      { value: 'America/New_York', label: 'America/New_York (EST)' },
                      { value: 'Europe/London', label: 'Europe/London (GMT)' }
                    ]}
                  />
                </SettingField>
            </div>
            </ModernCard>

            {/* 通知設定カード */}
            <ModernCard
              title="通知設定"
              description="デスクトップ通知とアラートの設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              }
            >
              <div className="space-y-4">
                <ModernCheckbox
                  checked={generalSettings.notifications.desktop}
                  onChange={(checked) => setGeneralSettings(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      desktop: checked
                    }
                  }))}
                  label="デスクトップ通知を有効にする"
                  description="システムの通知機能を使用してお知らせを表示"
                />

                <ModernCheckbox
                  checked={generalSettings.notifications.newSession}
                  onChange={(checked) => setGeneralSettings(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      newSession: checked
                    }
                  }))}
                  label="新セッション検出時に通知"
                  description="新しいチャットセッションが見つかった時に通知"
                />

                <ModernCheckbox
                  checked={generalSettings.notifications.errors}
                  onChange={(checked) => setGeneralSettings(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      errors: checked
                    }
                  }))}
                  label="エラー発生時に通知"
                  description="システムエラーや同期エラーが発生した時に通知"
                />
          </div>
            </ModernCard>

            {/* パフォーマンス設定カード */}
            <ModernCard
              title="パフォーマンス設定"
              description="メモリ使用量と接続数の最適化設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SettingField
                  label="キャッシュサイズ"
                  description="50-1000MBの範囲で設定"
                >
                  <ModernRange
                    value={generalSettings.performance.cacheSize}
                    onChange={(value) => setGeneralSettings(prev => ({
                      ...prev,
                      performance: {
                        ...prev.performance,
                        cacheSize: value
                      }
                    }))}
                    min={50}
                    max={1000}
                    step={50}
                    label="MB"
                    showValue
                  />
                </SettingField>

                <SettingField
                  label="最大同時接続数"
                  description="1-50接続の範囲で設定"
                >
                  <ModernRange
                    value={generalSettings.performance.maxConnections}
                    onChange={(value) => setGeneralSettings(prev => ({
                      ...prev,
                      performance: {
                        ...prev.performance,
                        maxConnections: value
                      }
                    }))}
                    min={1}
                    max={50}
                    step={1}
                    showValue
                  />
                </SettingField>

                <SettingField
                  label="自動更新間隔"
                  description="10-300秒の範囲で設定"
                >
                  <ModernRange
                    value={generalSettings.performance.autoUpdateInterval}
                    onChange={(value) => setGeneralSettings(prev => ({
                      ...prev,
                      performance: {
                        ...prev.performance,
                        autoUpdateInterval: value
                      }
                    }))}
                    min={10}
                    max={300}
                    step={10}
                    label="秒"
                    showValue
                  />
                </SettingField>
              </div>
            </ModernCard>
          </div>
        )}

        {/* セキュリティタブ */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* データ暗号化カード */}
            <ModernCard
              title="データ暗号化"
              description="ローカルデータの暗号化とキー管理設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="space-y-6">
                <ModernCheckbox
                  checked={securitySettings.encryption.enabled}
                  onChange={(checked) => setSecuritySettings(prev => ({
                    ...prev,
                    encryption: {
                      ...prev.encryption,
                      enabled: checked
                    }
                  }))}
                  label="ローカルデータ暗号化を有効にする"
                  description="SQLiteデータベースとローカルファイルを暗号化して保護"
                />

                {securitySettings.encryption.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-6 border-l-2 border-slate-200 dark:border-slate-600">
                    <SettingField
                      label="暗号化アルゴリズム"
                      description="データ暗号化に使用するアルゴリズム"
                    >
                      <ModernSelect
                        value={securitySettings.encryption.algorithm}
                        onChange={(value) => setSecuritySettings(prev => ({
                          ...prev,
                          encryption: {
                            ...prev.encryption,
                            algorithm: value as SecuritySettings['encryption']['algorithm']
                          }
                        }))}
                        options={[
                          { value: 'AES-256', label: 'AES-256 (推奨)' },
                          { value: 'ChaCha20', label: 'ChaCha20' }
                        ]}
                      />
                    </SettingField>

                    <SettingField
                      label="キーローテーション"
                      description="暗号化キーを更新する間隔（1-365日）"
                    >
                      <ModernRange
                        value={securitySettings.encryption.keyRotationDays}
                        onChange={(value) => setSecuritySettings(prev => ({
                          ...prev,
                          encryption: {
                            ...prev.encryption,
                            keyRotationDays: value
                          }
                        }))}
                        min={1}
                        max={365}
                        step={1}
                        label="日"
                        showValue
                      />
                    </SettingField>
                  </div>
                )}
              </div>
            </ModernCard>

            {/* プライバシー保護カード */}
            <ModernCard
              title="プライバシー保護"
              description="機密情報マスキングとデータ保持期間の設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              }
            >
              <div className="space-y-6">
                <ModernCheckbox
                  checked={securitySettings.privacy.autoMasking}
                  onChange={(checked) => setSecuritySettings(prev => ({
                    ...prev,
                    privacy: {
                      ...prev.privacy,
                      autoMasking: checked
                    }
                  }))}
                  label="機密情報の自動マスキング"
                  description="APIキー、パスワード、個人情報を自動的に隠します"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SettingField
                    label="ログ記録レベル"
                    description="システムログの詳細レベル"
                  >
                    <ModernSelect
                      value={securitySettings.privacy.logLevel}
                      onChange={(value) => setSecuritySettings(prev => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          logLevel: value as SecuritySettings['privacy']['logLevel']
                        }
                      }))}
                      options={[
                        { value: 'error', label: 'エラーのみ' },
                        { value: 'warn', label: '警告以上' },
                        { value: 'info', label: '情報以上' },
                        { value: 'debug', label: 'デバッグ' }
                      ]}
                    />
                  </SettingField>

                  <SettingField
                    label="データ保持期間"
                    description="古いデータを自動削除する期間（1-3650日）"
                  >
                    <ModernRange
                      value={securitySettings.privacy.dataRetentionDays}
                      onChange={(value) => setSecuritySettings(prev => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          dataRetentionDays: value
                        }
                      }))}
                      min={1}
                      max={3650}
                      step={30}
                      label="日"
                      showValue
                    />
                  </SettingField>
                </div>
              </div>
            </ModernCard>

            {/* 監査ログカード */}
            <ModernCard
              title="監査ログ"
              description="システムアクセスと操作の記録・監視設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 002 2h8a2 2 0 002-2V3a2 2 0 012 2v6h-3a3 3 0 00-3 3v3H6a2 2 0 01-2-2V5zM15 17v-3a1 1 0 011-1h3a1 1 0 01.707 1.707l-1.414 1.414a1 1 0 01-1.414 0L15 17z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="space-y-4">
                <ModernCheckbox
                  checked={securitySettings.audit.enabled}
                  onChange={(checked) => setSecuritySettings(prev => ({
                    ...prev,
                    audit: {
                      ...prev.audit,
                      enabled: checked
                    }
                  }))}
                  label="監査ログを有効にする"
                  description="システムへのアクセスと操作を記録・監視します"
                />

                {securitySettings.audit.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-slate-200 dark:border-slate-600">
                    <ModernCheckbox
                      checked={securitySettings.audit.accessLog}
                      onChange={(checked) => setSecuritySettings(prev => ({
                        ...prev,
                        audit: {
                          ...prev.audit,
                          accessLog: checked
                        }
                      }))}
                      label="アクセスログ記録"
                      description="ログイン・ログアウト・画面遷移を記録"
                    />

                    <ModernCheckbox
                      checked={securitySettings.audit.operationLog}
                      onChange={(checked) => setSecuritySettings(prev => ({
                        ...prev,
                        audit: {
                          ...prev.audit,
                          operationLog: checked
                        }
                      }))}
                      label="操作ログ記録"
                      description="データ変更・設定変更・検索操作を記録"
                    />
                  </div>
                )}
              </div>
            </ModernCard>

            {/* セキュリティアクションカード */}
            <ModernCard
              title="セキュリティアクション"
              description="セキュリティスキャンと監査ログの確認・管理"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => alert('セキュリティスキャン機能は実装中です')}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>セキュリティスキャン実行</span>
                </button>

                <button
                  onClick={() => alert('監査ログ確認機能は実装中です')}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors duration-200 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>監査ログ確認</span>
                </button>
              </div>
            </ModernCard>

            {/* 注意事項カード */}
            <ModernCard
              title="セキュリティ機能について"
              description=""
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              }
              className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700"
            >
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-2">実装状況</p>
                <p>
                  高度なセキュリティ機能は将来のアップデートで実装予定です。
                  現在は基本的な設定のみ利用可能です。最新の進捗については、
                  <a href="/docs" className="underline hover:text-amber-900 dark:hover:text-amber-100">
                    ドキュメント
                  </a>
                  をご確認ください。
                </p>
              </div>
            </ModernCard>
          </div>
        )}

        {/* バックアップタブ */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            {/* 自動バックアップ設定カード */}
            <ModernCard
              title="自動バックアップ"
              description="定期的なバックアップのスケジュールと保持期間設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 7l3.707-3.707a1 1 0 011.414 0z" />
                </svg>
              }
            >
              <div className="space-y-6">
                <ModernCheckbox
                  checked={backupSettings.auto.enabled}
                  onChange={(checked) => setBackupSettings(prev => ({
                    ...prev,
                    auto: {
                      ...prev.auto,
                      enabled: checked
                    }
                  }))}
                  label="自動バックアップを有効にする"
                  description="設定されたスケジュールに従って自動的にデータをバックアップ"
                />

                {backupSettings.auto.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-6 border-l-2 border-slate-200 dark:border-slate-600">
                    <SettingField
                      label="バックアップ間隔"
                      description="自動バックアップの実行頻度"
                    >
                      <ModernSelect
                        value={backupSettings.auto.interval}
                        onChange={(value) => setBackupSettings(prev => ({
                          ...prev,
                          auto: {
                            ...prev.auto,
                            interval: value as BackupSettings['auto']['interval']
                          }
                        }))}
                        options={[
                          { value: 'hourly', label: '毎時' },
                          { value: 'daily', label: '毎日' },
                          { value: 'weekly', label: '毎週' }
                        ]}
                      />
                    </SettingField>

                    <SettingField
                      label="保持期間"
                      description="古いバックアップを削除するまでの期間（1-365日）"
                    >
                      <ModernRange
                        value={backupSettings.auto.retentionDays}
                        onChange={(value) => setBackupSettings(prev => ({
                          ...prev,
                          auto: {
                            ...prev.auto,
                            retentionDays: value
                          }
                        }))}
                        min={1}
                        max={365}
                        step={1}
                        label="日"
                        showValue
                      />
                    </SettingField>
                  </div>
                )}
              </div>
            </ModernCard>

            {/* バックアップ先設定カード */}
            <ModernCard
              title="バックアップ先"
              description="ローカルとクラウドのバックアップ保存先設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="space-y-6">
                {/* ローカルバックアップ */}
                <div className="space-y-4">
                  <ModernCheckbox
                    checked={backupSettings.destinations.local.enabled}
                    onChange={(checked) => setBackupSettings(prev => ({
                      ...prev,
                      destinations: {
                        ...prev.destinations,
                        local: {
                          ...prev.destinations.local,
                          enabled: checked
                        }
                      }
                    }))}
                    label="ローカルバックアップ"
                    description="ローカルストレージにバックアップファイルを保存"
                  />

                  {backupSettings.destinations.local.enabled && (
                    <div className="pl-6 border-l-2 border-slate-200 dark:border-slate-600">
                      <SettingField
                        label="保存パス"
                        description="バックアップファイルの保存場所"
                      >
                        <div className="flex space-x-2">
                          <ModernInput
                            value={backupSettings.destinations.local.path}
                            onChange={(value) => setBackupSettings(prev => ({
                              ...prev,
                              destinations: {
                                ...prev.destinations,
                                local: {
                                  ...prev.destinations.local,
                                  path: value
                                }
                              }
                            }))}
                            placeholder="バックアップファイルの保存パス"
                            className="flex-1"
                          />
                          <button
                            onClick={() => {
                              const path = prompt('バックアップ保存パスを入力:', backupSettings.destinations.local.path)
                              if (path) {
                                setBackupSettings(prev => ({
                                  ...prev,
                                  destinations: {
                                    ...prev.destinations,
                                    local: {
                                      ...prev.destinations.local,
                                      path
                                    }
                                  }
                                }))
                              }
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                          >
                            参照
                          </button>
                        </div>
                      </SettingField>
                    </div>
                  )}
                </div>

                {/* クラウドバックアップ */}
                <div className="space-y-4">
                  <ModernCheckbox
                    checked={backupSettings.destinations.cloud.enabled}
                    onChange={(checked) => setBackupSettings(prev => ({
                      ...prev,
                      destinations: {
                        ...prev.destinations,
                        cloud: {
                          ...prev.destinations.cloud,
                          enabled: checked
                        }
                      }
                    }))}
                    label="クラウドバックアップ"
                    description="クラウドストレージサービスにバックアップを保存"
                  />

                  {backupSettings.destinations.cloud.enabled && (
                    <div className="pl-6 border-l-2 border-slate-200 dark:border-slate-600">
                      <SettingField
                        label="プロバイダー"
                        description="クラウドバックアップは将来のアップデートで実装予定"
                      >
                        <ModernSelect
                          value={backupSettings.destinations.cloud.provider}
                          onChange={(value) => setBackupSettings(prev => ({
                            ...prev,
                            destinations: {
                              ...prev.destinations,
                              cloud: {
                                ...prev.destinations.cloud,
                                provider: value as BackupSettings['destinations']['cloud']['provider']
                              }
                            }
                          }))}
                          options={[
                            { value: 'none', label: '選択してください' },
                            { value: 'aws', label: 'Amazon S3' },
                            { value: 'gcp', label: 'Google Cloud Storage' },
                            { value: 'azure', label: 'Azure Blob Storage' }
                          ]}
                          disabled
                        />
                      </SettingField>
                    </div>
                  )}
                </div>
              </div>
            </ModernCard>

            {/* バックアップ対象カード */}
            <ModernCard
              title="バックアップ対象"
              description="バックアップに含めるデータの種類を選択"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13V12a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModernCheckbox
                  checked={backupSettings.include.sessions}
                  onChange={(checked) => setBackupSettings(prev => ({
                    ...prev,
                    include: {
                      ...prev.include,
                      sessions: checked
                    }
                  }))}
                  label="セッションデータ"
                  description="チャット履歴とメッセージの全データ"
                />

                <ModernCheckbox
                  checked={backupSettings.include.settings}
                  onChange={(checked) => setBackupSettings(prev => ({
                    ...prev,
                    include: {
                      ...prev.include,
                      settings: checked
                    }
                  }))}
                  label="設定ファイル"
                  description="アプリケーションの設定と構成情報"
                />

                <ModernCheckbox
                  checked={backupSettings.include.indexes}
                  onChange={(checked) => setBackupSettings(prev => ({
                    ...prev,
                    include: {
                      ...prev.include,
                      indexes: checked
                    }
                  }))}
                  label="インデックス・キャッシュ"
                  description="検索インデックスとキャッシュファイル"
                />

                <ModernCheckbox
                  checked={backupSettings.include.logs}
                  onChange={(checked) => setBackupSettings(prev => ({
                    ...prev,
                    include: {
                      ...prev.include,
                      logs: checked
                    }
                  }))}
                  label="ログファイル"
                  description="システムログと操作履歴"
                />
              </div>
            </ModernCard>

            {/* バックアップ健全性カード */}
            <ModernCard
              title="バックアップ健全性"
              description="データ整合性と圧縮設定"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModernCheckbox
                    checked={backupSettings.integrity.checksumValidation}
                    onChange={(checked) => setBackupSettings(prev => ({
                      ...prev,
                      integrity: {
                        ...prev.integrity,
                        checksumValidation: checked
                      }
                    }))}
                    label="チェックサム検証を有効にする"
                    description="バックアップファイルの整合性を検証"
                  />

                  <ModernCheckbox
                    checked={backupSettings.integrity.encryptBackups}
                    onChange={(checked) => setBackupSettings(prev => ({
                      ...prev,
                      integrity: {
                        ...prev.integrity,
                        encryptBackups: checked
                      }
                    }))}
                    label="バックアップを暗号化する"
                    description="バックアップファイルを暗号化して保護"
                  />
                </div>

                <SettingField
                  label="圧縮レベル"
                  description="バックアップファイルの圧縮率（0：高速、9：高圧縮）"
                >
                  <ModernRange
                    value={backupSettings.integrity.compressionLevel}
                    onChange={(value) => setBackupSettings(prev => ({
                      ...prev,
                      integrity: {
                        ...prev.integrity,
                        compressionLevel: value
                      }
                    }))}
                    min={0}
                    max={9}
                    step={1}
                    showValue
                  />
                </SettingField>
              </div>
            </ModernCard>

            {/* 手動操作カード */}
            <ModernCard
              title="手動操作"
              description="今すぐバックアップやバックアップ一覧の確認"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => alert('手動バックアップ機能は実装中です')}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span>今すぐバックアップ</span>
                </button>

                <button
                  onClick={() => alert('バックアップ一覧機能は実装中です')}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors duration-200 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>バックアップ一覧</span>
                </button>
              </div>
            </ModernCard>
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
