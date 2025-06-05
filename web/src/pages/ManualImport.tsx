import React, { useState, useRef, useCallback } from 'react'

interface ImportJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: {
    total: number
    processed: number
    errors: number
  }
  startTime: string
  endTime?: string
  results?: {
    imported: number
    skipped: number
    errors: string[]
  }
  files: Array<{
    originalName: string
    size: number
    processed: boolean
    error?: string
  }>
}

interface UploadResponse {
  success: boolean
  data?: {
    jobId: string
    files: Array<{
      originalName: string
      size: number
    }>
  }
  error?: string
}

const ManualImport: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null)
  const [recentJobs, setRecentJobs] = useState<ImportJob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ドラッグ&ドロップハンドラー
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  // ファイル選択ハンドラー
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }, [])

  // ファイル処理
  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    // ファイル形式チェック
    const supportedExtensions = ['.json', '.md', '.txt']
    const validFiles = files.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      return supportedExtensions.includes(ext)
    })

    if (validFiles.length === 0) {
      setUploadError('サポートされていないファイル形式です。.json、.md、.txt ファイルのみアップロード可能です。')
      return
    }

    if (validFiles.length !== files.length) {
      setUploadError(`${files.length - validFiles.length}個のファイルがスキップされました（未サポート形式）`)
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      validFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch('/api/manual-import/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`アップロードに失敗しました: ${response.status}`)
      }

      const data: UploadResponse = await response.json()

      if (data.success && data.data) {
        // インポートジョブの監視開始
        await startJobMonitoring(data.data.jobId)
      } else {
        throw new Error(data.error || 'アップロードに失敗しました')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'アップロード中にエラーが発生しました'
      setUploadError(errorMessage)
      console.error('Manual import error:', error)
    } finally {
      setIsUploading(false)
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [])

  // ジョブ監視
  const startJobMonitoring = useCallback(async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/manual-import/status/${jobId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setCurrentJob(data.data)
            
            // ジョブ完了またはエラー時は監視停止
            if (data.data.status === 'completed' || data.data.status === 'failed') {
              clearInterval(pollInterval)
              // 最近のジョブリストを更新
              loadRecentJobs()
            }
          }
        }
      } catch (error) {
        console.error('Job monitoring error:', error)
      }
    }, 1000)

    // 30秒後にタイムアウト
    setTimeout(() => {
      clearInterval(pollInterval)
    }, 30000)
  }, [])

  // 最近のジョブ読み込み
  const loadRecentJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/manual-import/jobs')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRecentJobs(data.data.jobs)
        }
      }
    } catch (error) {
      console.error('Recent jobs loading error:', error)
    }
  }, [])

  // コンポーネントマウント時に最近のジョブを読み込み
  React.useEffect(() => {
    loadRecentJobs()
  }, [loadRecentJobs])

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusDisplayName = (status: string): string => {
    switch (status) {
      case 'completed': return '完了'
      case 'failed': return '失敗'
      case 'processing': return '処理中'
      case 'pending': return '待機中'
      default: return status
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              📁 手動インポート
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              AI対話ファイルを手動でアップロードして取り込みます
            </p>
          </div>
        </div>

        {/* ファイルアップロードエリア */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".json,.md,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isUploading ? (
            <div className="space-y-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-300">アップロード中...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  ファイルをドラッグ&ドロップ
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
                >
                  またはファイルを選択
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                .json、.md、.txt ファイルのみサポート（最大10MB）
              </p>
            </div>
          )}
        </div>

        {/* エラー表示 */}
        {uploadError && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 dark:text-red-200">{uploadError}</span>
            </div>
          </div>
        )}
      </div>

      {/* 現在のジョブ状況 */}
      {currentJob && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            インポート進捗
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ステータス
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(currentJob.status)}`}>
                {getStatusDisplayName(currentJob.status)}
              </span>
            </div>

            {currentJob.status === 'processing' && (
              <div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <span>進捗</span>
                  <span>{currentJob.progress.processed} / {currentJob.progress.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(currentJob.progress.processed / currentJob.progress.total) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            )}

            {currentJob.results && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="font-semibold text-green-800 dark:text-green-200">
                    {currentJob.results.imported}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-300">
                    インポート成功
                  </div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="font-semibold text-yellow-800 dark:text-yellow-200">
                    {currentJob.results.skipped}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-300">
                    スキップ
                  </div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="font-semibold text-red-800 dark:text-red-200">
                    {currentJob.results.errors.length}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-300">
                    エラー
                  </div>
                </div>
              </div>
            )}

                         {currentJob.results?.errors && currentJob.results.errors.length > 0 && (
               <div className="mt-4">
                 <h4 className="font-medium text-gray-900 dark:text-white mb-2">エラー詳細:</h4>
                 <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 max-h-32 overflow-y-auto">
                   {currentJob.results.errors.map((error, index) => (
                     <div key={index} className="text-sm text-red-800 dark:text-red-200 mb-1">
                       {error}
                     </div>
                   ))}
                 </div>
               </div>
             )}
          </div>
        </div>
      )}

      {/* 最近のインポート履歴 */}
      {recentJobs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            インポート履歴
          </h2>
          
          <div className="space-y-3">
            {recentJobs.slice(0, 10).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {job.files.length}個のファイル
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(job.startTime).toLocaleString('ja-JP')}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(job.status)}`}>
                    {getStatusDisplayName(job.status)}
                  </span>
                  {job.results && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      成功: {job.results.imported} / スキップ: {job.results.skipped}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ヘルプセクション */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
          📚 サポートされているファイル形式
        </h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <div><strong>.json</strong> - JSON形式のチャットエクスポート</div>
          <div><strong>.md</strong> - Markdown形式の対話記録</div>
          <div><strong>.txt</strong> - プレーンテキスト形式の対話記録</div>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
          💡 ファイルは自動的に重複チェックされ、既存のAI対話との重複は自動的にスキップされます。
        </p>
      </div>
    </div>
  )
}

export default ManualImport 