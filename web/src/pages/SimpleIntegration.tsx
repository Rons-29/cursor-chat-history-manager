import React from 'react'

const SimpleIntegration: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Cursor統合機能（シンプル版）
      </h1>
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">
          統合機能のシンプルページです。このページが表示されれば、基本的なルーティングは正常に動作しています。
        </p>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900">統計情報</h3>
              <p className="text-blue-700">総セッション数: 1,234</p>
              <p className="text-blue-700">総メッセージ数: 5,678</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900">Cursorステータス</h3>
              <p className="text-green-700">監視: 停止中</p>
              <p className="text-green-700">最終スキャン: 未実行</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-900">操作</h3>
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                スキャン実行
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleIntegration 