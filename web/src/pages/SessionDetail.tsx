import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, queryKeys } from '../api/client.js'
import type { ApiSession, ApiMessage } from '../api/client.js'

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showMetadata, setShowMetadata] = useState(false)

  // セッション詳細取得
  const {
    data: session,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: queryKeys.session(id!),
    queryFn: () => apiClient.getSession(id!),
    enabled: !!id,
    retry: 1
  })

  // メッセージ編集ミューテーション
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      // 実際のAPIエンドポイントが実装されるまでのモック
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.session(id!) })
      setIsEditing(null)
      setEditContent('')
    }
  })

  // メッセージ削除ミューテーション
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      // 実際のAPIエンドポイントが実装されるまでのモック
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.session(id!) })
    }
  })

  // URLハッシュからメッセージにスクロール
  useEffect(() => {
    if (location.hash && session) {
      const messageId = location.hash.replace('#message-', '')
      const messageIndex = parseInt(messageId)
      if (!isNaN(messageIndex) && messageIndex < session.messages.length) {
        setTimeout(() => {
          const element = document.getElementById(`message-${messageIndex}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setSelectedMessage(`message-${messageIndex}`)
          }
        }, 100)
      }
    }
  }, [location.hash, session])

  // 最下部にスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleEditMessage = (messageId: string, currentContent: string) => {
    setIsEditing(messageId)
    setEditContent(currentContent)
  }

  const handleSaveEdit = () => {
    if (isEditing && editContent.trim()) {
      editMessageMutation.mutate({
        messageId: isEditing,
        content: editContent.trim()
      })
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(null)
    setEditContent('')
  }

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('このメッセージを削除しますか？')) {
      deleteMessageMutation.mutate(messageId)
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return '不明'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            U
          </div>
        )
      case 'assistant':
        return (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            AI
          </div>
        )
      case 'system':
        return (
          <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            S
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
            ?
          </div>
        )
    }
  }

  const getRoleLabel = (role: string) => {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // 簡易的な成功通知（実際のプロジェクトではtoastライブラリを使用）
      const notification = document.createElement('div')
      notification.textContent = 'クリップボードにコピーしました'
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
      document.body.appendChild(notification)
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 2000)
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">セッション読み込みエラー</h3>
              <p className="text-sm text-red-700 mt-1">
                {error?.message || 'セッションの読み込みに失敗しました'}
              </p>
              <div className="mt-4">
                <button
                  onClick={() => refetch()}
                  className="btn-secondary text-sm"
                >
                  再試行
                </button>
                <button
                  onClick={() => navigate('/sessions')}
                  className="btn-secondary text-sm ml-2"
                >
                  セッション一覧に戻る
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
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
          <p className="text-gray-500 mb-4">
            指定されたセッションは存在しないか、削除された可能性があります。
          </p>
          <button
            onClick={() => navigate('/sessions')}
            className="btn-primary"
          >
            セッション一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/sessions')}
              className="text-gray-500 hover:text-gray-700 mb-2 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              セッション一覧に戻る
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>開始: {formatTime(session.startTime)}</span>
              {session.endTime && (
                <span>終了: {formatTime(session.endTime)}</span>
              )}
              <span>{session.messages.length} メッセージ</span>
              {session.metadata.tags && session.metadata.tags.length > 0 && (
                <div className="flex space-x-1">
                  {session.metadata.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="btn-secondary"
            >
              {showMetadata ? 'メタデータを隠す' : 'メタデータを表示'}
            </button>
            <button
              onClick={scrollToBottom}
              className="btn-secondary"
            >
              最下部へ
            </button>
          </div>
        </div>
      </div>

      {/* メタデータ表示 */}
      {showMetadata && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">セッションメタデータ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">セッションID</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{session.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ソース</label>
              <p className="mt-1 text-sm text-gray-900">{session.metadata.source || '不明'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">総メッセージ数</label>
              <p className="mt-1 text-sm text-gray-900">{session.metadata.totalMessages}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">説明</label>
              <p className="mt-1 text-sm text-gray-900">{session.metadata.description || 'なし'}</p>
            </div>
          </div>
        </div>
      )}

      {/* メッセージ一覧 */}
      <div className="space-y-4">
        {session.messages.map((message, index) => (
          <div
            key={message.id}
            id={`message-${index}`}
            className={`card transition-all duration-200 ${
              selectedMessage === `message-${index}` 
                ? 'ring-2 ring-primary-500 bg-primary-50' 
                : 'hover:shadow-md'
            }`}
          >
            <div className="flex space-x-3">
              {getRoleIcon(message.role)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {getRoleLabel(message.role)}
                    </span>
                    <span className="text-xs text-gray-500">
                      #{index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title="コピー"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEditMessage(message.id, message.content)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title="編集"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {isEditing === message.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      rows={Math.max(3, editContent.split('\n').length)}
                      placeholder="メッセージ内容を編集..."
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={editMessageMutation.isPending}
                        className="btn-primary text-sm"
                      >
                        {editMessageMutation.isPending ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="btn-secondary text-sm"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-gray-900 leading-relaxed">
                      {message.content}
                    </pre>
                  </div>
                )}
                
                {message.metadata && Object.keys(message.metadata).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      メッセージメタデータ
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(message.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* フローティングアクションボタン */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
        <button
          onClick={scrollToBottom}
          className="w-12 h-12 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
          title="最下部へスクロール"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default SessionDetail
