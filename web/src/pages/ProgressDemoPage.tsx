/**
 * ProgressDemoPage - 進捗表示UIコンポーネントのデモページ
 * 各種進捗表示パターンの実装例とテスト用インターフェース
 */

import React, { useState } from 'react'
import { ProgressIndicator, ProgressStep } from '../components/ui/ProgressIndicator'
import { LoadingOverlay } from '../components/ui/LoadingOverlay'
import { DataLoadingProgress, DataLoadingStep } from '../components/ui/DataLoadingProgress'
import { useProgressTracking, useSimpleProgress } from '../hooks/useProgressTracking'
import { PlayIcon, StopIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export const ProgressDemoPage: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null)

  // シンプル進捗デモ用
  const simpleProgress = useSimpleProgress()

  // 詳細進捗デモ用
  const [detailedProgressState, detailedProgressActions] = useProgressTracking({
    enableTimeEstimation: true,
    onComplete: () => {
      console.log('詳細進捗完了')
      setTimeout(() => setActiveDemo(null), 2000)
    },
    onError: (error) => {
      console.error('詳細進捗エラー:', error)
      setTimeout(() => setActiveDemo(null), 3000)
    }
  })

  // データ読み込み進捗デモ用
  const [dataLoadingSteps, setDataLoadingSteps] = useState<DataLoadingStep[]>([])
  const [dataProgress, setDataProgress] = useState(0)
  const [isDataLoading, setIsDataLoading] = useState(false)

  // 設定保存デモ用のステップ
  const getSettingsSteps = (): ProgressStep[] => [
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
      id: 'restart',
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

  // データ読み込みのステップ
  const getDataLoadingSteps = (): DataLoadingStep[] => [
    {
      id: 'api_sessions',
      type: 'api',
      label: 'セッション一覧取得',
      description: 'APIからセッションデータを取得中',
      status: 'pending',
      metadata: { apiEndpoint: '/api/sessions' }
    },
    {
      id: 'db_search',
      type: 'database',
      label: 'データベース検索',
      description: 'SQLiteインデックスから検索中',
      status: 'pending',
      metadata: { recordCount: 0 }
    },
    {
      id: 'file_processing',
      type: 'file',
      label: 'ファイル処理',
      description: 'Cursorセッションファイルを処理中',
      status: 'pending',
      metadata: { fileSize: 0 }
    },
    {
      id: 'data_processing',
      type: 'processing',
      label: 'データ処理',
      description: 'メタデータの解析と整形',
      status: 'pending'
    },
    {
      id: 'validation',
      type: 'validation',
      label: 'データ検証',
      description: '取得データの整合性チェック',
      status: 'pending'
    }
  ]

  // シンプル進捗デモ
  const runSimpleProgressDemo = async () => {
    setActiveDemo('simple')
    simpleProgress.start()

    for (let i = 0; i <= 100; i += 10) {
      simpleProgress.updateProgress(i)
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    simpleProgress.complete()
    setTimeout(() => setActiveDemo(null), 1000)
  }

  // 詳細進捗デモ
  const runDetailedProgressDemo = async () => {
    setActiveDemo('detailed')
    const steps = getSettingsSteps()
    detailedProgressActions.start(steps)

    try {
      // ステップ1: 検証
      detailedProgressActions.setStepStatus('validate', 'active')
      for (let i = 0; i <= 20; i += 5) {
        detailedProgressActions.updateProgress(i, 'validate')
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      detailedProgressActions.setStepStatus('validate', 'completed')

      // ステップ2: バックアップ
      detailedProgressActions.setStepStatus('backup', 'active')
      for (let i = 20; i <= 40; i += 5) {
        detailedProgressActions.updateProgress(i, 'backup')
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      detailedProgressActions.setStepStatus('backup', 'completed')

      // ステップ3: 保存
      detailedProgressActions.setStepStatus('save', 'active')
      for (let i = 40; i <= 70; i += 5) {
        detailedProgressActions.updateProgress(i, 'save')
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      detailedProgressActions.setStepStatus('save', 'completed')

      // ステップ4: 再起動
      detailedProgressActions.setStepStatus('restart', 'active')
      for (let i = 70; i <= 90; i += 5) {
        detailedProgressActions.updateProgress(i, 'restart')
        await new Promise(resolve => setTimeout(resolve, 400))
      }
      detailedProgressActions.setStepStatus('restart', 'completed')

      // ステップ5: 検証
      detailedProgressActions.setStepStatus('verify', 'active')
      for (let i = 90; i <= 100; i += 2) {
        detailedProgressActions.updateProgress(i, 'verify')
        await new Promise(resolve => setTimeout(resolve, 150))
      }
      detailedProgressActions.setStepStatus('verify', 'completed')

      detailedProgressActions.complete()
    } catch (error) {
      detailedProgressActions.setError('デモ実行中にエラーが発生しました')
    }
  }

  // データ読み込み進捗デモ
  const runDataLoadingDemo = async () => {
    setActiveDemo('data')
    setIsDataLoading(true)
    setDataProgress(0)
    
    const steps = getDataLoadingSteps()
    setDataLoadingSteps(steps.map(step => ({ ...step, status: 'pending' })))

    try {
      for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
        const step = steps[stepIndex]
        
        // ステップをアクティブにする
        setDataLoadingSteps(prev => 
          prev.map(s => 
            s.id === step.id 
              ? { ...s, status: 'active', progress: 0 }
              : s
          )
        )

        // ステップ進捗を更新
        for (let progress = 0; progress <= 100; progress += 20) {
          setDataLoadingSteps(prev => 
            prev.map(s => 
              s.id === step.id 
                ? { ...s, progress }
                : s
            )
          )
          
          const overallProgress = ((stepIndex * 100) + progress) / steps.length
          setDataProgress(overallProgress)
          
          await new Promise(resolve => setTimeout(resolve, 150))
        }

        // ステップを完了にする
        setDataLoadingSteps(prev => 
          prev.map(s => 
            s.id === step.id 
              ? { 
                  ...s, 
                  status: 'completed', 
                  progress: 100,
                  metadata: {
                    ...s.metadata,
                    recordCount: Math.floor(Math.random() * 1000) + 100,
                    fileSize: Math.floor(Math.random() * 5000000) + 1000000
                  }
                }
              : s
          )
        )
      }

      setDataProgress(100)
      setTimeout(() => {
        setIsDataLoading(false)
        setActiveDemo(null)
      }, 1500)

    } catch (error) {
      console.error('データ読み込みデモエラー:', error)
      setIsDataLoading(false)
      setActiveDemo(null)
    }
  }

  // エラーデモ
  const runErrorDemo = async () => {
    setActiveDemo('error')
    const steps = getSettingsSteps()
    detailedProgressActions.start(steps)

    try {
      // 最初の数ステップは成功
      detailedProgressActions.setStepStatus('validate', 'active')
      detailedProgressActions.updateProgress(20, 'validate')
      await new Promise(resolve => setTimeout(resolve, 500))
      detailedProgressActions.setStepStatus('validate', 'completed')

      detailedProgressActions.setStepStatus('backup', 'active')
      detailedProgressActions.updateProgress(40, 'backup')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // エラーを発生させる
      throw new Error('デモ用のエラーです')
      
    } catch (error) {
      detailedProgressActions.setStepStatus('backup', 'error')
      detailedProgressActions.setError('設定保存中にエラーが発生しました')
    }
  }

  const stopDemo = () => {
    setActiveDemo(null)
    simpleProgress.cancel()
    detailedProgressActions.cancel()
    setIsDataLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">進捗表示UIデモ</h1>
          <p className="mt-2 text-gray-600">
            Chat History Managerで使用する進捗表示コンポーネントのデモです
          </p>
        </div>

        {/* コントロールパネル */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">デモコントロール</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <button
              onClick={runSimpleProgressDemo}
              disabled={activeDemo !== null}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              シンプル進捗
            </button>
            
            <button
              onClick={runDetailedProgressDemo}
              disabled={activeDemo !== null}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              詳細進捗
            </button>
            
            <button
              onClick={() => {
                setActiveDemo('premium')
                runDetailedProgressDemo()
              }}
              disabled={activeDemo !== null}
              className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              ✨ プレミアム
            </button>
            
            <button
              onClick={runDataLoadingDemo}
              disabled={activeDemo !== null}
              className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              データ読み込み
            </button>
            
            <button
              onClick={runErrorDemo}
              disabled={activeDemo !== null}
              className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              エラーデモ
            </button>
          </div>
          
          {activeDemo && (
            <div className="mt-4">
              <button
                onClick={stopDemo}
                className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <StopIcon className="h-4 w-4 mr-2" />
                デモ停止
              </button>
            </div>
          )}
        </div>

        {/* デモ表示エリア */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 基本進捗表示 */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">基本進捗表示</h2>
            
            {/* コンパクト表示 */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">コンパクト表示</h3>
              <ProgressIndicator
                steps={getSettingsSteps()}
                progress={65}
                isActive={activeDemo === 'simple'}
                variant="compact"
              />
            </div>

            {/* ミニマル表示 */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">ミニマル表示</h3>
              <ProgressIndicator
                steps={getSettingsSteps()}
                progress={simpleProgress.progress}
                isActive={activeDemo === 'simple'}
                variant="minimal"
              />
            </div>

            {/* 詳細表示 */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">詳細表示</h3>
              <ProgressIndicator
                steps={detailedProgressState.steps}
                currentStepId={detailedProgressState.currentStepId || undefined}
                progress={detailedProgressState.progress}
                isActive={detailedProgressState.isActive}
                showTimeRemaining={true}
                showStepDetails={true}
              />
            </div>

            {/* プレミアム表示 */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">プレミアムカード表示</h3>
              <ProgressIndicator
                steps={detailedProgressState.steps}
                currentStepId={detailedProgressState.currentStepId || undefined}
                progress={detailedProgressState.progress}
                isActive={detailedProgressState.isActive}
                variant="premium"
                showTimeRemaining={true}
                showStepDetails={true}
                onCancel={() => {
                  detailedProgressActions.cancel()
                  setActiveDemo(null)
                }}
              />
            </div>
          </div>

          {/* データ読み込み進捗 */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">データ読み込み進捗</h2>
            
            {/* インライン表示 */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">インライン表示</h3>
              <DataLoadingProgress
                steps={dataLoadingSteps}
                overallProgress={dataProgress}
                isActive={isDataLoading}
                variant="inline"
              />
            </div>

            {/* カード表示 */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">カード表示</h3>
              <DataLoadingProgress
                steps={dataLoadingSteps}
                overallProgress={dataProgress}
                isActive={isDataLoading}
                variant="card"
                showStepProgress={true}
                showMetadata={true}
                onRetry={(stepId) => console.log('Retry:', stepId)}
                onSkip={(stepId) => console.log('Skip:', stepId)}
              />
            </div>
          </div>
        </div>

        {/* オーバーレイ表示 */}
        <LoadingOverlay
          isVisible={activeDemo === 'detailed'}
          title="設定を保存中"
          message="設定の変更を適用しています..."
          variant="detailed"
          showProgress={true}
          steps={detailedProgressState.steps}
          currentStepId={detailedProgressState.currentStepId || undefined}
          progress={detailedProgressState.progress}
          onCancel={() => {
            detailedProgressActions.cancel()
            setActiveDemo(null)
          }}
          error={detailedProgressState.error}
        />
      </div>
    </div>
  )
}

export default ProgressDemoPage 