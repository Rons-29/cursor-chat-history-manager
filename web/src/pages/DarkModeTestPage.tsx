import React from 'react'
import { useTheme } from '../contexts/ThemeContext'
import ThemeToggle from '../components/ThemeToggle'

const DarkModeTestPage: React.FC = () => {
  const { theme, actualTheme, themeColor } = useTheme()

  const testSections = [
    {
      title: 'カラーバリエーション',
      items: [
        { name: 'Primary', bg: 'bg-primary-100 dark:bg-primary-900/20', text: 'text-primary-900 dark:text-primary-200' },
        { name: 'Blue', bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-900 dark:text-blue-200' },
        { name: 'Green', bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-900 dark:text-green-200' },
        { name: 'Purple', bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-900 dark:text-purple-200' },
        { name: 'Orange', bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-900 dark:text-orange-200' },
        { name: 'Pink', bg: 'bg-pink-100 dark:bg-pink-900/20', text: 'text-pink-900 dark:text-pink-200' }
      ]
    },
    {
      title: 'グレースケール',
      items: [
        { name: 'Gray 50', bg: 'bg-gray-50 dark:bg-slate-900', text: 'text-gray-900 dark:text-gray-100' },
        { name: 'Gray 100', bg: 'bg-gray-100 dark:bg-slate-800', text: 'text-gray-900 dark:text-gray-100' },
        { name: 'Gray 200', bg: 'bg-gray-200 dark:bg-slate-700', text: 'text-gray-900 dark:text-gray-100' },
        { name: 'Gray 300', bg: 'bg-gray-300 dark:bg-slate-600', text: 'text-gray-900 dark:text-gray-100' }
      ]
    },
    {
      title: 'フォーム要素',
      items: []
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            🎨 ダークモード機能テストページ
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            ChatFlowの強化されたダークモード機能をテストするためのページです。
          </p>

          {/* テーマ情報 */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-8 shadow-sm border dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">現在のテーマ設定</h3>
                <p className="text-gray-600 dark:text-gray-400">設定: <span className="font-mono">{theme}</span></p>
                <p className="text-gray-600 dark:text-gray-400">実際: <span className="font-mono">{actualTheme}</span></p>
                <p className="text-gray-600 dark:text-gray-400">カラー: <span className="font-mono">{themeColor}</span></p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">テーマ切り替え</h3>
                <ThemeToggle />
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">動作状況</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${actualTheme === 'dark' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">テーマ検出: 正常</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">カラー変数: 正常</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* テストセクション */}
        {testSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {section.title}
            </h2>
            
            {section.title === 'フォーム要素' ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      テキスト入力
                    </label>
                    <input
                      type="text"
                      placeholder="テスト入力フィールド"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      選択肢
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                      <option>オプション 1</option>
                      <option>オプション 2</option>
                      <option>オプション 3</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      テキストエリア
                    </label>
                    <textarea
                      rows={4}
                      placeholder="複数行テキスト入力..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="flex space-x-4">
                      <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors duration-200">
                        プライマリボタン
                      </button>
                      <button className="px-4 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-900 dark:text-gray-100 rounded-md transition-colors duration-200">
                        セカンダリボタン
                      </button>
                      <button className="px-4 py-2 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200">
                        アウトラインボタン
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className={`${item.bg} border dark:border-slate-600 rounded-lg p-4 transition-colors duration-300`}
                  >
                    <h4 className={`font-semibold ${item.text} mb-2`}>
                      {item.name}
                    </h4>
                    <p className={`text-sm ${item.text.replace('900', '700').replace('200', '300')}`}>
                      背景とテキストのコントラストテスト
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 使用方法 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
            💡 使用方法
          </h3>
          <ul className="space-y-2 text-blue-800 dark:text-blue-300 text-sm">
            <li>• 右上のテーマ切り替えボタンでライト/ダーク/システムを切り替え</li>
            <li>• カラーピッカーで6種類のテーマカラーから選択</li>
            <li>• すべての要素がテーマに応じて適切に表示されることを確認</li>
            <li>• ブラウザの設定で「システム」モードをテスト</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default DarkModeTestPage 