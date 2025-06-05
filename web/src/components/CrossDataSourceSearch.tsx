import React, { useState, useEffect } from 'react'
import { apiClient, type CrossDataSourceSessionsResponse, type ApiSession } from '../api/client'

interface CrossDataSourceSearchProps {
  onSessionSelect?: (session: ApiSession) => void
}

const CrossDataSourceSearch: React.FC<CrossDataSourceSearchProps> = ({
  onSessionSelect
}) => {
  const [data, setData] = useState<CrossDataSourceSessionsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'all' | 'traditional' | 'incremental' | 'sqlite' | 'claudeDev'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // 統合データ取得
  const fetchAllSessions = async (page = 1, keyword = '') => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await apiClient.getAllSessions({
        page,
        limit: 20,
        keyword: keyword || undefined
      })
      
      setData(result)
      console.log('🔍 統合セッションデータ取得成功:', {
        totalSessions: result.sources.total,
        sources: result.sources,
        sessionsReceived: result.sessions.length
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '統合データの取得に失敗しました'
      setError(errorMessage)
      console.error('🔍 統合セッションデータ取得失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  // 初期データ読み込み
  useEffect(() => {
    fetchAllSessions()
  }, [])

  // 検索実行
  const handleSearch = () => {
    setCurrentPage(1)
    fetchAllSessions(1, searchKeyword)
  }

  // ページ変更
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchAllSessions(newPage, searchKeyword)
  }

  // データソース別フィルタリング
  const getFilteredSessions = () => {
    if (!data || selectedTab === 'all') {
      return data?.sessions || []
    }
    
    return data.sessions.filter(session => 
      session.metadata.source === selectedTab
    )
  }

  const filteredSessions = getFilteredSessions()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔍 AI対話横断検索
        </h2>
        <p className="text-gray-600">
          全データソースから統合検索 • 隠れたデータも可視化
        </p>
      </div>

      {/* 検索バー */}
      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="キーワードを入力して全データソースを検索..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '検索中...' : '検索'}
          </button>
        </div>
      </div>

      {/* データソース統計 */}
      {data && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900">{data.sources.total}</div>
            <div className="text-sm text-gray-600">統合総数</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{data.sources.traditional}</div>
            <div className="text-sm text-gray-600">Traditional</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{data.sources.incremental}</div>
            <div className="text-sm text-gray-600">Incremental</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{data.sources.sqlite}</div>
            <div className="text-sm text-gray-600">SQLite</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">{data.sources.claudeDev}</div>
            <div className="text-sm text-gray-600">Claude Dev</div>
          </div>
        </div>
      )}

      {/* データソースタブ */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'all', label: '全て', count: data?.sources.total || 0 },
              { id: 'traditional', label: 'Traditional', count: data?.sources.traditional || 0 },
              { id: 'incremental', label: 'Incremental', count: data?.sources.incremental || 0 },
              { id: 'sqlite', label: 'SQLite', count: data?.sources.sqlite || 0 },
              { id: 'claudeDev', label: 'Claude Dev', count: data?.sources.claudeDev || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>エラー:</strong> {error}
        </div>
      )}

      {/* ローディング表示 */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">データを読み込み中...</p>
        </div>
      )}

      {/* セッション一覧 */}
      {!loading && filteredSessions.length > 0 && (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSessionSelect?.(session)}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 flex-1 mr-4">
                  {session.title}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  session.metadata.source === 'traditional' ? 'bg-blue-100 text-blue-800' :
                  session.metadata.source === 'incremental' ? 'bg-green-100 text-green-800' :
                  session.metadata.source === 'sqlite' ? 'bg-purple-100 text-purple-800' :
                  session.metadata.source === 'claude-dev' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {session.metadata.source}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-2">
                {session.metadata.description || 'No description available'}
              </p>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>メッセージ数: {session.metadata.totalMessages}</span>
                <span>更新: {new Date(session.endTime || session.startTime).toLocaleDateString('ja-JP')}</span>
              </div>
              
              {session.metadata.tags && session.metadata.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {session.metadata.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                  {session.metadata.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{session.metadata.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 空の状態 */}
      {!loading && filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <p className="text-gray-600">
            {searchKeyword ? `"${searchKeyword}" に一致するAI対話が見つかりませんでした` : 'データが見つかりませんでした'}
          </p>
        </div>
      )}

      {/* ページネーション */}
      {data && data.pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            前へ
          </button>
          
          <span className="px-4 py-2 text-sm text-gray-600">
            {currentPage} / {data.pagination.totalPages} ページ (合計 {data.pagination.total} 件)
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= data.pagination.totalPages}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            次へ
          </button>
        </div>
      )}

      {/* メタデータ情報 */}
      {data && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>最終更新: {new Date(data.metadata.timestamp).toLocaleString('ja-JP')}</div>
            <div>アクティブソース: {data.metadata.dataSourcesActive.join(', ')}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CrossDataSourceSearch 