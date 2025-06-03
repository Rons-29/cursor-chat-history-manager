import React from 'react'

const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🎉 React動作テスト
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          このページが表示されていれば、Reactは正常に動作しています
        </p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ✅ フロントエンド正常動作中
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            現在時刻: {new Date().toLocaleString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default TestPage 