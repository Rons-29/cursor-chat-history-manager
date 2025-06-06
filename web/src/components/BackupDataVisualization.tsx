import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ChartBarIcon, 
  FolderOpenIcon, 
  DocumentTextIcon,
  SparklesIcon,
  ArrowTrendingUpIcon 
} from '@heroicons/react/24/outline'

interface BackupDataStats {
  success: boolean
  pagination: {
    total: number
    page: number
  }
  sources: {
    traditional: number
    incremental: number
    sqlite: number
    claudeDev: number
    backup: number
    total: number
  }
  enhancement: {
    previousTotal: number
    newTotal: number
    improvement: number
    backupDataValue: number
  }
}

/**
 * 🔍 Phase 2 バックアップデータ統合可視化コンポーネント
 * 
 * ChatFlow Phase 2で統合された12,402セッションのバックアップデータを可視化
 * - データソース別の内訳表示
 * - 改善効果のメトリクス可視化  
 * - バックアップ価値の定量化
 * - 統合前後の比較分析
 */
const BackupDataVisualization: React.FC = () => {
  const [animatedStats, setAnimatedStats] = useState({
    traditional: 0,
    backup: 0,
    total: 0,
    improvement: 0
  })

  // Phase 2統合APIからデータ取得
  const { 
    data: backupStats, 
    isLoading, 
    error 
  } = useQuery<BackupDataStats>({
    queryKey: ['backup-integration-stats'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/api/unified/all-sessions-with-backup?page=1&limit=1')
      if (!response.ok) {
        throw new Error('バックアップ統合データの取得に失敗しました')
      }
      return response.json()
    },
    refetchInterval: 60000, // 1分ごと更新
    retry: 3,
    retryDelay: 2000
  })

  // 数値アニメーション効果
  useEffect(() => {
    if (backupStats && backupStats.success) {
      const duration = 2000 // 2秒間でアニメーション
      const steps = 60
      const stepDuration = duration / steps

      let currentStep = 0
      const interval = setInterval(() => {
        currentStep++
        const progress = currentStep / steps

        setAnimatedStats({
          traditional: Math.floor(backupStats.sources.traditional * progress),
          backup: Math.floor(backupStats.sources.backup * progress),
          total: Math.floor(backupStats.sources.total * progress),
          improvement: Math.floor(backupStats.enhancement.improvement * progress)
        })

        if (currentStep >= steps) {
          clearInterval(interval)
          // 最終値を正確に設定
          setAnimatedStats({
            traditional: backupStats.sources.traditional,
            backup: backupStats.sources.backup,
            total: backupStats.sources.total,
            improvement: backupStats.enhancement.improvement
          })
        }
      }, stepDuration)

      return () => clearInterval(interval)
    }
  }, [backupStats])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded mr-3"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !backupStats?.success) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center">
          <div className="w-6 h-6 text-red-600 dark:text-red-400 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-medium">
              バックアップデータ取得エラー
            </h3>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              Phase 2統合データの読み込みに失敗しました
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { sources, enhancement } = backupStats

  // 改善率の計算
  const improvementPercentage = Math.round(
    ((enhancement.newTotal - enhancement.previousTotal) / enhancement.previousTotal) * 100
  )

  // データソース別のパーセンテージ
  const traditionalPercentage = Math.round((sources.traditional / sources.total) * 100)
  const backupPercentage = Math.round((sources.backup / sources.total) * 100)
  const claudeDevPercentage = Math.round((sources.claudeDev / sources.total) * 100)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* ヘッダー */}
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Phase 2 バックアップ統合成果
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            隠れた12,402セッションの価値開放
          </p>
        </div>
      </div>

      {/* 主要メトリクス */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* 総セッション数 */}
        <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {animatedStats.total.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">総セッション</div>
        </div>

        {/* バックアップ価値 */}
        <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {animatedStats.backup.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">バックアップ</div>
        </div>

        {/* 従来データ */}
        <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {animatedStats.traditional.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">従来データ</div>
        </div>

        {/* 改善効果 */}
        <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <ArrowTrendingUpIcon className="w-6 h-6 mr-1" />
            {animatedStats.improvement}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">改善率</div>
        </div>
      </div>

      {/* データソース詳細 */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center">
          <ChartBarIcon className="w-5 h-5 mr-2" />
          データソース内訳
        </h4>

        {/* 従来データ */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <DocumentTextIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
              <span className="font-medium text-gray-900 dark:text-white">従来データ</span>
            </div>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {sources.traditional.toLocaleString()} ({traditionalPercentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
            <div 
              className="bg-purple-600 h-3 rounded-full transition-all duration-2000 ease-out"
              style={{ width: `${traditionalPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* バックアップデータ */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <FolderOpenIcon className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
              <span className="font-medium text-gray-900 dark:text-white">バックアップ統合</span>
            </div>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              {sources.backup.toLocaleString()} ({backupPercentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
            <div 
              className="bg-green-600 h-3 rounded-full transition-all duration-2000 ease-out"
              style={{ width: `${backupPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Claude Dev */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="font-medium text-gray-900 dark:text-white">Claude Dev</span>
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {sources.claudeDev.toLocaleString()} ({claudeDevPercentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-2000 ease-out"
              style={{ width: `${claudeDevPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 成果サマリー */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            🎉 Phase 2 統合成果
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            統合前 <span className="font-bold">{enhancement.previousTotal.toLocaleString()}</span> セッション 
            → 統合後 <span className="font-bold text-green-600 dark:text-green-400">{enhancement.newTotal.toLocaleString()}</span> セッション
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span className="font-bold text-orange-600 dark:text-orange-400">{improvementPercentage}%改善</span> 
            ・ <span className="font-bold text-green-600 dark:text-green-400">{enhancement.backupDataValue.toLocaleString()}</span>セッションの価値開放
          </div>
        </div>
      </div>
    </div>
  )
}

export default BackupDataVisualization 