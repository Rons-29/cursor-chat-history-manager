import React from 'react'

const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center transition-colors duration-300">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          🎉 React動作テスト
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          このページが表示されていれば、Reactは正常に動作しています
        </p>
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded transition-colors duration-300">
          ✅ フロントエンド正常動作中
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            現在時刻: {new Date().toLocaleString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default TestPage 