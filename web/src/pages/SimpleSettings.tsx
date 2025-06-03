/**
 * シンプル設定ページ（React Query依存なし）
 * 白画面問題のデバッグ用
 */

import React, { useState, useEffect } from 'react';

// シンプルなCursor設定型定義
interface SimpleCursorSettings {
  enabled: boolean;
  monitorPath: string;
  scanInterval: number;
  maxSessions: number;
  autoImport: boolean;
  includeMetadata: boolean;
}

const defaultSettings: SimpleCursorSettings = {
  enabled: true,
  monitorPath: '/Users/shirokki22/Library/Application Support/Cursor/User/workspaceStorage',
  scanInterval: 30,
  maxSessions: 1000,
  autoImport: true,
  includeMetadata: false
};

const SimpleSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cursor' | 'general' | 'security' | 'backup'>('cursor');
  const [cursorSettings, setCursorSettings] = useState<SimpleCursorSettings>(defaultSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  console.log('SimpleSettings コンポーネントがレンダリングされました');

  // 設定変更ハンドラー
  const handleCursorSettingsChange = (key: keyof SimpleCursorSettings, value: any) => {
    setCursorSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 設定保存（ローカル処理のみ）
  const handleSaveSettings = () => {
    console.log('設定保存:', cursorSettings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
    alert('設定を保存しました（ローカル処理）');
  };

  // 設定リセット
  const handleResetSettings = () => {
    if (confirm('設定をデフォルト値にリセットしますか？')) {
      setCursorSettings(defaultSettings);
      alert('設定をリセットしました');
    }
  };

  // パス参照ダイアログ
  const handleBrowsePath = () => {
    const newPath = prompt('監視パスを入力してください:', cursorSettings.monitorPath);
    if (newPath) {
      handleCursorSettingsChange('monitorPath', newPath);
    }
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">シンプル設定管理</h1>
        <p className="text-gray-600">デバッグ用のシンプル設定ページ（API依存なし）</p>
      </div>

      {/* API接続状態 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
          <div>
            <p className="text-sm font-medium text-gray-900">ローカルモード</p>
            <p className="text-xs text-gray-500">API接続なし（デバッグ用）</p>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'cursor', label: 'Cursor設定', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { key: 'general', label: '一般設定', icon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* 設定コンテンツ */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            {/* 自動保存状態表示 */}
            {settingsSaved && (
              <div className="flex items-center space-x-1 text-green-600 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>保存済み</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetSettings}
              className="btn-secondary text-sm"
            >
              リセット
            </button>
            <button
              onClick={handleSaveSettings}
              className="btn-primary text-sm"
            >
              保存
            </button>
          </div>
        </div>

        {/* ローカルモード説明 */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="text-yellow-800 font-medium">ローカルモード</p>
              <p className="text-yellow-700">
                このページはAPI接続なしで動作しています。変更はローカルのみで保存されます。
              </p>
            </div>
          </div>
        </div>

        {/* Cursor設定タブ */}
        {activeTab === 'cursor' && (
          <div className="space-y-6">
            {/* Cursor履歴を有効にする */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="cursor-enabled"
                checked={cursorSettings.enabled}
                onChange={(e) => handleCursorSettingsChange('enabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="cursor-enabled" className="text-sm font-medium text-gray-900">
                Cursor統合を有効にする
              </label>
            </div>

            {/* 監視パス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                監視パス
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={cursorSettings.monitorPath}
                  onChange={(e) => handleCursorSettingsChange('monitorPath', e.target.value)}
                  className="flex-1 input-field text-sm"
                  placeholder="Cursorワークスペースストレージのパス"
                />
                <button
                  onClick={handleBrowsePath}
                  className="btn-secondary text-sm"
                >
                  参照
                </button>
              </div>
            </div>

            {/* スキャン間隔 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スキャン間隔 (秒)
              </label>
              <input
                type="number"
                min="10"
                max="3600"
                value={cursorSettings.scanInterval}
                onChange={(e) => handleCursorSettingsChange('scanInterval', parseInt(e.target.value) || 30)}
                className="input-field w-32 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                10秒〜1時間の範囲で設定してください
              </p>
            </div>

            {/* 最大セッション数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大セッション数
              </label>
              <input
                type="number"
                min="100"
                max="10000"
                value={cursorSettings.maxSessions}
                onChange={(e) => handleCursorSettingsChange('maxSessions', parseInt(e.target.value) || 1000)}
                className="input-field w-32 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                保存する最大セッション数を設定してください
              </p>
            </div>

            {/* 自動インポートを有効にする */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="auto-import"
                checked={cursorSettings.autoImport}
                onChange={(e) => handleCursorSettingsChange('autoImport', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="auto-import" className="text-sm font-medium text-gray-900">
                自動インポートを有効にする
              </label>
            </div>

            {/* メタデータを含める */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="include-metadata"
                checked={cursorSettings.includeMetadata}
                onChange={(e) => handleCursorSettingsChange('includeMetadata', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="include-metadata" className="text-sm font-medium text-gray-900">
                メタデータを含める
              </label>
            </div>
          </div>
        )}

        {/* 一般設定タブ */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <p className="text-gray-600">一般設定は準備中です。</p>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                このタブは将来的に実装予定の機能です。現在はプレースホルダーとして表示されています。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* デバッグ情報 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">デバッグ情報</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p>現在の設定値:</p>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
            {JSON.stringify(cursorSettings, null, 2)}
          </pre>
          <p>アクティブタブ: {activeTab}</p>
          <p>レンダリング時刻: {new Date().toLocaleString('ja-JP')}</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleSettings; 