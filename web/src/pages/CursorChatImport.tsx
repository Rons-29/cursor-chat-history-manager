import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface FileInfo {
  name: string
  size: number
  modified: string
  extension: string
}

interface ImportStats {
  totalImported: number
  totalMessages: number
  latestImport: string | null
  sources: string[]
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
  message: string
}

const CursorChatImport: React.FC = () => {
  const [showGuide, setShowGuide] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const queryClient = useQueryClient()

  // ファイル一覧取得
  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ['cursor-chat-files'],
    queryFn: async () => {
      const response = await fetch('/api/cursor-chat-import/files')
      if (!response.ok) throw new Error('ファイル一覧の取得に失敗しました')
      return response.json()
    }
  })

  // 統計情報取得
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['cursor-chat-stats'],
    queryFn: async () => {
      const response = await fetch('/api/cursor-chat-import/stats')
      if (!response.ok) throw new Error('統計情報の取得に失敗しました')
      return response.json()
    }
  })

  // 使用方法ガイド取得
  const { data: guideData } = useQuery({
    queryKey: ['cursor-chat-guide'],
    queryFn: async () => {
      const response = await fetch('/api/cursor-chat-import/usage-guide')
      if (!response.ok) throw new Error('ガイドの取得に失敗しました')
      return response.json()
    },
    enabled: showGuide
  })

  // 手動リフレッシュ機能
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refetchFiles(),
        refetchStats(),
        queryClient.invalidateQueries({ queryKey: ['sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['claude-dev-sessions'] })
      ])
    } finally {
      setIsRefreshing(false)
    }
  }

  // インポート実行
  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cursor-chat-import/import-all', {
        method: 'POST'
      })
      if (!response.ok) throw new Error('インポートに失敗しました')
      return response.json()
    },
    onSuccess: () => {
      // インポート成功後、すべての関連データを更新
      queryClient.invalidateQueries({ queryKey: ['cursor-chat-stats'] })
      queryClient.invalidateQueries({ queryKey: ['cursor-chat-files'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['claude-dev-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['enhanced-stats'] })
      
      // 少し遅延してから再度リフレッシュ（ファイル移動の完了を待つ）
      setTimeout(() => {
        handleRefresh()
      }, 1000)
    }
  })

  const files: FileInfo[] = filesData?.data?.files || []
  const stats: ImportStats = statsData?.data || { totalImported: 0, totalMessages: 0, latestImport: null, sources: [] }
  const importResult: ImportResult | undefined = importMutation.data?.data

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📤 Cursor Chat インポート</h1>
          <p className="text-gray-600 dark:text-gray-400">Cursorからエクスポートしたチャットファイルを統合データベースに取り込みます</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary"
          >
            {isRefreshing ? '🔄 更新中...' : '🔄 リフレッシュ'}
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="btn-secondary"
          >
            📖 使用方法
          </button>
          <button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || files.length === 0}
            className="btn-primary"
          >
            {importMutation.isPending ? '⏳ インポート中...' : '🚀 一括インポート'}
          </button>
        </div>
      </div>

      {/* 統計ダッシュボード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">インポート済み</h3>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalImported}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">チャット</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h3 className="text-sm font-medium text-green-600 dark:text-green-400">総メッセージ</h3>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.totalMessages}</p>
          <p className="text-xs text-green-600 dark:text-green-400">件</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400">待機ファイル</h3>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{files.length}</p>
          <p className="text-xs text-purple-600 dark:text-purple-400">個</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
          <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400">最終インポート</h3>
          <p className="text-sm font-bold text-orange-900 dark:text-orange-100">
            {stats.latestImport ? formatDate(stats.latestImport).split(' ')[0] : 'なし'}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            {stats.latestImport ? formatDate(stats.latestImport).split(' ')[1] : '-'}
          </p>
        </div>
      </div>

      {/* インポート結果 */}
      {importResult && (
        <div className={`p-4 rounded-lg border ${
          importResult.errors.length > 0 
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{importResult.errors.length > 0 ? '⚠️' : '✅'}</span>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{importResult.message}</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-green-600 dark:text-green-400 font-medium">成功:</span>
              <span className="ml-1 text-gray-900 dark:text-gray-100">{importResult.imported}件</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">スキップ:</span>
              <span className="ml-1 text-gray-900 dark:text-gray-100">{importResult.skipped}件</span>
            </div>
            <div>
              <span className="text-red-600 dark:text-red-400 font-medium">エラー:</span>
              <span className="ml-1 text-gray-900 dark:text-gray-100">{importResult.errors.length}件</span>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">エラー詳細:</h4>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                {importResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 使用方法ガイド */}
      {showGuide && guideData && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-4">{guideData.data.title}</h2>
          <div className="space-y-4">
            {guideData.data.steps.map((step: any, index: number) => (
              <div key={index} className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {step.step}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">{step.title}</h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">{step.description}</p>
                  {step.formats && (
                    <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {step.formats.map((format: string, i: number) => (
                        <li key={i}>• {format}</li>
                      ))}
                    </ul>
                  )}
                  {step.note && (
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 italic">💡 {step.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-700">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 対応形式</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(guideData.data.supportedFormats).map(([key, format]: [string, any]) => (
                <div key={key} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 capitalize">{key}</h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{format.description}</p>
                  <code className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 p-1 rounded block mt-2">
                    {format.example}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ファイル一覧 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📁 エクスポートファイル一覧</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">exportsディレクトリ内のインポート可能ファイル</p>
        </div>
        
        {filesLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">ファイル一覧を読み込み中...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg">📂 ファイルがありません</p>
            <p className="text-sm mt-2">Cursorからエクスポートしたファイルを以下に配置してください:</p>
            <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs">{filesData?.data?.directory}</code>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ファイル名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    形式
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    サイズ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    更新日時
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {files.map((file, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">
                          {file.extension === '.md' ? '📝' : file.extension === '.json' ? '📄' : '📃'}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        file.extension === '.md' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' :
                        file.extension === '.json' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {file.extension.substring(1).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(file.modified)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default CursorChatImport 