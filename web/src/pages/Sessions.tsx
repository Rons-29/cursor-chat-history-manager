import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient, queryKeys } from '../api/client'

const Sessions: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // フィルター状態
  const [keyword, setKeyword] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'messages'>(
    'newest'
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [limit] = useState(10)

  // セッション一覧取得
  const {
    data: sessionsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.sessions({ page: currentPage, limit, keyword }),
    queryFn: () =>
      apiClient.getSessions({
        page: currentPage,
        limit,
        keyword: keyword || undefined,
      }),
    refetchInterval: 60000, // 1分ごとに更新
  })

  // データ手動更新
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      // 強制的にデータを再取得
      await queryClient.refetchQueries({ queryKey: ['sessions'] })
    } catch (error) {
      console.error('データ更新エラー:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // セッション詳細ページに遷移
  const handleSessionClick = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`)
  }

  // 時間フォーマット
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '不明'
    }
  }

  // フィルタリングされたセッション
  const filteredSessions =
    sessionsData?.sessions?.filter(session => {
      if (!keyword) return true
      const searchText =
        `${session.title || ''} ${session.metadata.tags?.join(' ') || ''}`.toLowerCase()
      return searchText.includes(keyword.toLowerCase())
    }) || []

  // ソートされたセッション
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sortOrder) {
      case 'newest':
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      case 'oldest':
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      case 'messages':
        return b.metadata.totalMessages - a.metadata.totalMessages
      default:
        return 0
    }
  })

  const totalSessions = sessionsData?.sessions?.length || 0
  const totalPages = Math.ceil(sortedSessions.length / limit)
  const startIndex = (currentPage - 1) * limit
  const endIndex = startIndex + limit
  const paginatedSessions = sortedSessions.slice(startIndex, endIndex)

  // キーワード変更時の処理
  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    setCurrentPage(1) // ページを1にリセット
  }

  // ソート変更時の処理
  const handleSortChange = (value: typeof sortOrder) => {
    setSortOrder(value)
    setCurrentPage(1) // ページを1にリセット
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">セッション一覧</h1>
          <p className="text-gray-600">
            {isLoading ? '読み込み中...' : `全 ${totalSessions} 件のセッション`}
          </p>
        </div>
        <button
          className="btn-primary flex items-center space-x-2"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
        >
          <svg
            className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>
            {isRefreshing ? '更新中...' : isLoading ? '読み込み中...' : '更新'}
          </span>
        </button>
      </div>

      {/* フィルター・検索 */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キーワード検索
            </label>
            <input
              type="text"
              placeholder="セッションを検索..."
              className="input-field"
              value={keyword}
              onChange={e => handleKeywordChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ソート
            </label>
            <select
              className="input-field"
              value={sortOrder}
              onChange={e =>
                handleSortChange(e.target.value as typeof sortOrder)
              }
            >
              <option value="newest">最新順</option>
              <option value="oldest">古い順</option>
              <option value="messages">メッセージ数順</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-500">
              {keyword &&
                filteredSessions.length !== totalSessions &&
                `${filteredSessions.length} / ${totalSessions} 件表示`}
            </div>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="w-5 h-5 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                データの読み込みエラー
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error?.message || 'セッションデータを取得できませんでした'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* セッション一覧 */}
      <div className="space-y-4">
        {isLoading ? (
          // 読み込み中の表示
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : paginatedSessions.length > 0 ? (
          paginatedSessions.map(session => (
            <div
              key={session.id}
              className="card-hover"
              onClick={() => handleSessionClick(session.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {session.title || `セッション ${session.id.slice(0, 8)}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {session.metadata.summary || 'セッションの説明なし'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-gray-400">
                        {session.metadata.totalMessages} メッセージ
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(session.startTime)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {session.metadata.tags &&
                    session.metadata.tags.length > 0 && (
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                        {session.metadata.tags[0]}
                      </span>
                    )}
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-8">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              セッションが見つかりません
            </h3>
            <p className="text-gray-500">
              {keyword
                ? '検索条件に一致するセッションがありません'
                : 'セッションデータがありません'}
            </p>
          </div>
        )}
      </div>

      {/* ページネーション */}
      {!isLoading && sortedSessions.length > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-medium">{startIndex + 1}</span> -
            <span className="font-medium">
              {Math.min(endIndex, sortedSessions.length)}
            </span>{' '}
            件 / 全 <span className="font-medium">{sortedSessions.length}</span>{' '}
            件{keyword && ` (検索結果: ${filteredSessions.length} 件)`}
          </p>
          <div className="flex items-center space-x-2">
            <button
              className="btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              前へ
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <button
              className="btn-secondary"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage(prev => Math.min(totalPages, prev + 1))
              }
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sessions
