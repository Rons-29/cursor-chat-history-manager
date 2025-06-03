import React from 'react'

const TestIntegration: React.FC = () => {
  return (
    <div className="p-6 bg-gray-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Cursor統合機能（テスト版）
      </h1>
      <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 border dark:border-slate-700 transition-colors duration-300">
        <p className="text-gray-600 dark:text-gray-400">
          統合機能のテストページです。このページが表示されれば、ルーティングは正常に動作しています。
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-gray-700 dark:text-gray-300"><strong>API テスト:</strong></p>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/integration/stats')
                const data = await response.json()
                console.log('API Response:', data)
                alert('API接続成功！コンソールを確認してください。')
              } catch (error) {
                console.error('API Error:', error)
                alert('API接続エラー: ' + error)
              }
            }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            API接続テスト
          </button>
        </div>
      </div>
    </div>
  )
}

export default TestIntegration 