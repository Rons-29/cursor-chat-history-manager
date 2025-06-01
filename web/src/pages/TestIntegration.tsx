import React from 'react'

const TestIntegration: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Cursor統合機能（テスト版）
      </h1>
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">
          統合機能のテストページです。このページが表示されれば、ルーティングは正常に動作しています。
        </p>
        <div className="mt-4 space-y-2">
          <p><strong>API テスト:</strong></p>
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
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            API接続テスト
          </button>
        </div>
      </div>
    </div>
  )
}

export default TestIntegration 