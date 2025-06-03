/**
 * 設定ページデバッグ用のシンプルテストページ
 */

import React, { useState } from 'react';

const DebugSettings: React.FC = () => {
  const [testValue, setTestValue] = useState('テスト');

  console.log('DebugSettings コンポーネントがレンダリングされました');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">デバッグ設定ページ</h1>
          <p className="text-gray-600">設定ページの白画面問題をデバッグ中...</p>
        </div>

        {/* 基本的なHTML要素テスト */}
        <div className="card">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">基本要素テスト</h2>
          </div>

          <div className="space-y-6">
            {/* テキスト入力 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                テキスト入力テスト
              </label>
              <input
                type="text"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                className="input-field w-full"
                placeholder="何か入力してください"
              />
              <p className="text-xs text-gray-500 mt-1">
                入力値: {testValue}
              </p>
            </div>

            {/* チェックボックス */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="test-checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
              />
              <label htmlFor="test-checkbox" className="text-sm font-medium text-gray-900">
                テストチェックボックス
              </label>
            </div>

            {/* ボタン */}
            <div className="flex space-x-3">
              <button
                className="btn-primary"
                onClick={() => alert('プライマリボタンクリック')}
              >
                プライマリボタン
              </button>
              <button
                className="btn-secondary"
                onClick={() => alert('セカンダリボタンクリック')}
              >
                セカンダリボタン
              </button>
            </div>

            {/* カラーテスト */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-100 rounded-lg">
                <h3 className="font-medium text-blue-900">ブルーカード</h3>
                <p className="text-sm text-blue-700">ブルー系カラーテスト</p>
              </div>
              <div className="p-4 bg-green-100 rounded-lg">
                <h3 className="font-medium text-green-900">グリーンカード</h3>
                <p className="text-sm text-green-700">グリーン系カラーテスト</p>
              </div>
              <div className="p-4 bg-red-100 rounded-lg">
                <h3 className="font-medium text-red-900">レッドカード</h3>
                <p className="text-sm text-red-700">レッド系カラーテスト</p>
              </div>
            </div>
          </div>
        </div>

        {/* CSSクラステスト */}
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">CSSクラステスト</h2>
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-gray-100 rounded">bg-gray-100: 正常</div>
            <div className="p-2 bg-white border rounded">bg-white + border: 正常</div>
            <div className="p-2 text-blue-600">text-blue-600: 正常</div>
            <div className="p-2 shadow-lg">shadow-lg: 正常</div>
          </div>
        </div>

        {/* JavaScript動作テスト */}
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">JavaScript動作テスト</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              現在時刻: {new Date().toLocaleString('ja-JP')}
            </p>
            <p className="text-sm text-gray-600">
              テスト値変更回数: {testValue.length}文字
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                console.log('コンソールログテスト');
                alert('JavaScriptが正常に動作しています');
              }}
            >
              JavaScript動作確認
            </button>
          </div>
        </div>

        {/* 環境情報 */}
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">環境情報</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>User Agent: {navigator.userAgent}</p>
            <p>画面サイズ: {window.innerWidth} x {window.innerHeight}</p>
            <p>ページURL: {window.location.href}</p>
            <p>開発モード: {import.meta.env.DEV ? 'はい' : 'いいえ'}</p>
            <p>API URL: {import.meta.env.VITE_API_URL || 'デフォルト'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugSettings; 