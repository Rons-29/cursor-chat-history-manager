import React from 'react'

const SimpleIntegration: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Cursor統合機能（シンプル版）
      </h1>
      <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 border dark:border-slate-700 transition-colors duration-300">
        <p className="text-gray-600 dark:text-gray-400">
          統合機能のシンプルページです。このページが表示されれば、基本的なルーティングは正常に動作しています。
        </p>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border dark:border-blue-800 p-4 rounded-lg transition-colors duration-300">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">統計情報</h3>
              <p className="text-blue-700 dark:text-blue-300">総セッション数: 1,234</p>
              <p className="text-blue-700 dark:text-blue-300">総メッセージ数: 5,678</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border dark:border-green-800 p-4 rounded-lg transition-colors duration-300">
              <h3 className="font-semibold text-green-900 dark:text-green-200">Cursorステータス</h3>
              <p className="text-green-700 dark:text-green-300">監視: 停止中</p>
              <p className="text-green-700 dark:text-green-300">最終スキャン: 未実行</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 border dark:border-orange-800 p-4 rounded-lg transition-colors duration-300">
              <h3 className="font-semibold text-orange-900 dark:text-orange-200">操作</h3>
              <button className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-3 py-1 rounded text-sm transition-colors duration-200 shadow-sm hover:shadow-md">
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