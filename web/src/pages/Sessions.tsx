import React from 'react'

const Sessions: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">セッション一覧</h1>
          <p className="text-gray-600">すべてのチャットセッションを表示</p>
        </div>
        <button className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          更新
        </button>
      </div>

      {/* フィルター・検索 */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">キーワード検索</label>
            <input
              type="text"
              placeholder="セッションを検索..."
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">期間</label>
            <select className="input-field">
              <option>すべて</option>
              <option>今日</option>
              <option>今週</option>
              <option>今月</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ソート</label>
            <select className="input-field">
              <option>最新順</option>
              <option>古い順</option>
              <option>メッセージ数順</option>
            </select>
          </div>
        </div>
      </div>

      {/* セッション一覧 */}
      <div className="space-y-4">
        {/* 読み込み中の表示 */}
        <div className="card-hover">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-semibold text-gray-900">セッション読み込み中...</h3>
                <p className="text-sm text-gray-500">データを取得しています</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-xs text-gray-400">-- メッセージ</span>
                  <span className="text-xs text-gray-400">--</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">--</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* サンプルセッション */}
        <div className="card-hover">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <div>
                <h3 className="font-semibold text-gray-900">サンプルセッション</h3>
                <p className="text-sm text-gray-500">React + TypeScript WebUI実装についての相談</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-xs text-gray-400">42 メッセージ</span>
                  <span className="text-xs text-gray-400">2024/01/15 14:30</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">開発</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ページネーション */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-medium">--</span> 件中 <span className="font-medium">--</span> 件を表示
        </p>
        <div className="flex items-center space-x-2">
          <button className="btn-secondary" disabled>
            前へ
          </button>
          <button className="btn-secondary" disabled>
            次へ
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sessions 