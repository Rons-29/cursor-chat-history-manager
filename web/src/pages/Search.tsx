import React from 'react'

const Search: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">検索</h1>
        <p className="text-gray-600">チャット履歴を検索</p>
      </div>

      <div className="card">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="キーワードを入力して検索..."
            className="input-field text-lg"
          />
          <button className="btn-primary w-full">検索実行</button>
        </div>
      </div>

      <div className="card">
        <p className="text-gray-500">検索結果を表示します</p>
      </div>
    </div>
  )
}

export default Search
