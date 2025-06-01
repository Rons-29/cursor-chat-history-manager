import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, queryKeys } from '../api/client.js'

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // セッション詳細取得
  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.session(id!),
    queryFn: () => apiClient.getSession(id!),
    enabled: !!id,
    retry: 1,
  })

  // データ手動更新
  const handleRefresh = async () => {
    if (id) {
      setIsRefreshing(true)
      try {
        queryClient.invalidateQueries({ queryKey: ['sessions', id] })
        // 強制的にデータを再取得
        await queryClient.refetchQueries({ queryKey: ['sessions', id] })
      } catch (error) {
        console.error('データ更新エラー:', error)
      } finally {
        setIsRefreshing(false)
      }
    }
  }

  // 戻るボタン
  const handleBack = () => {
    navigate('/sessions')
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
        second: '2-digit',
      })
    } catch {
      return '不明'
    }
  }

  // セッション期間計算
  const getSessionDuration = (startTime: string, endTime?: string) => {
    try {
      const start = new Date(startTime)
      const end = endTime ? new Date(endTime) : new Date()
      const diffMs = end.getTime() - start.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))

      if (diffMinutes < 60) return `${diffMinutes}分`
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`
    } catch {
      return '不明'
    }
  }

  // メッセージのロール表示
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'user':
        return 'ユーザー'
      case 'assistant':
        return 'アシスタント'
      case 'system':
        return 'システム'
      default:
        return role
    }
  }

  // メッセージのロール色
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-100 text-blue-800'
      case 'assistant':
        return 'bg-green-100 text-green-800'
      case 'system':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // URLハッシュからメッセージにスクロール
  useEffect(() => {
    if (session?.messages && window.location.hash) {
      const messageId = window.location.hash.replace('#message-', '')
      const messageIndex = parseInt(messageId, 10)
      if (
        !isNaN(messageIndex) &&
        messageIndex >= 0 &&
        messageIndex < session.messages.length
      ) {
        setTimeout(() => {
          const element = document.getElementById(`message-${messageIndex}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.classList.add('bg-yellow-100')
            setTimeout(() => element.classList.remove('bg-yellow-100'), 3000)
          }
        }, 100)
      }
    }
  }, [session])

  if (!id) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">エラー</h1>
        <p className="text-gray-600">セッションIDが指定されていません</p>
        <button className="btn-primary mt-4" onClick={handleBack}>
          セッション一覧に戻る
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center space-x-4">
          <button
            className="btn-secondary flex items-center space-x-2"
            onClick={handleBack}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>戻る</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isLoading
                ? 'セッション詳細'
                : session?.title || `セッション ${id.slice(0, 8)}`}
            </h1>
            <p className="text-gray-600">ID: {id}</p>
          </div>
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
                セッション読み込みエラー
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error?.message || 'セッション詳細を取得できませんでした'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* セッション情報 */}
      {isLoading ? (
        <div className="card">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              <div className="h-4 bg-gray-200 rounded w-1/5"></div>
            </div>
          </div>
        </div>
      ) : session ? (
        <>
          {/* セッション統計 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    メッセージ数
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {session.metadata.totalMessages}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">開始時刻</p>
                  <p className="text-sm font-bold text-gray-900">
                    {formatTime(session.startTime)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">継続時間</p>
                  <p className="text-sm font-bold text-gray-900">
                    {getSessionDuration(session.startTime, session.endTime)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">タグ</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {session.metadata.tags &&
                    session.metadata.tags.length > 0 ? (
                      session.metadata.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">なし</span>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* メッセージ一覧 */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                メッセージ履歴
              </h2>
              <span className="text-sm text-gray-500">
                {session.messages?.length || 0} 件のメッセージ
              </span>
            </div>

            {session.messages && session.messages.length > 0 ? (
              <div className="space-y-4">
                {session.messages.map((message, index) => (
                  <div
                    id={`message-${index}`}
                    key={message.id || index}
                    className="border border-gray-200 rounded-lg p-4 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(message.role)}`}
                        >
                          {getRoleDisplay(message.role)}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{index + 1}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  メッセージがありません
                </h3>
                <p className="text-gray-500">
                  このセッションにはメッセージが記録されていません。
                </p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default SessionDetail
