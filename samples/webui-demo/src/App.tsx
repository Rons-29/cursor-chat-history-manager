import { DiscordSearch } from './DiscordSearch'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                ChatFlow 検索UIデモ
              </h1>
              <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Demo
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Zenn・Discord風検索体験
            </div>
          </div>
        </div>
      </header>

      <main className="py-8">
        <DiscordSearch />
      </main>

      <footer className="mt-16 py-6 text-center text-sm text-gray-500 border-t">
        <p>
          ChatFlow - AI開発者向けチャット履歴管理プラットフォーム
        </p>
        <p className="mt-1">
          Discord風リアルタイム検索 • キーボードナビゲーション • 検索履歴
        </p>
      </footer>
    </div>
  )
}

export default App
