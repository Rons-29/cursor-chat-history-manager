import React from 'react'
import { Session, Message } from '../types/Session'

interface SessionCardProps {
  readonly session: Session
  readonly onSelect: (id: string) => void
  readonly showPreview?: boolean
  readonly compact?: boolean
}

/**
 * 改善されたセッションカードコンポーネント
 * - 意味のあるタイトル表示
 * - セッション要約
 * - 視覚的な改善
 * - コンパクトモード対応
 */
export const SessionCard: React.FC<SessionCardProps> = ({ 
  session, 
  onSelect, 
  showPreview = true,
  compact = false
}) => {
  // タイトル生成（簡易版）
  const generateTitle = (session: Session): string => {
    if (session.title && session.title !== 'Cursor Prompt') {
      return session.title
    }

    const firstMessage = session.messages?.[0]?.content || ''
    if (!firstMessage) return 'セッション'

    // 基本クリーニング
    const cleaned = firstMessage.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
    
    // キーワード抽出
    const words = cleaned
      .split(/[\s、。！？,.\!?]+/)
      .filter((word: string) => word.length >= 2)
      .filter((word: string) => !['これ', 'それ', 'あれ', 'です', 'ます', 'について'].includes(word))
      .slice(0, 3)

    // パターンマッチング
    if (/[？?]|ですか|でしょうか|どう|なぜ|何/.test(cleaned)) {
      const keyword = words[0] || '質問'
      if (cleaned.includes('どう思う') || cleaned.includes('意見')) {
        return `${keyword}についての意見・相談`
      }
      return `${keyword}について`
    }

    if (/してください|お願い|作って|教えて|確認/.test(cleaned)) {
      const keyword = words[0] || '作業'
      return `${keyword}の依頼・相談`
    }

    if (/エラー|問題|バグ|動かない/.test(cleaned)) {
      const keyword = words[0] || 'システム'
      return `${keyword}の問題・トラブル`
    }

    // デフォルト
    if (words.length >= 2) {
      return `${words[0]}と${words[1]}について`
    }
    if (words.length === 1) {
      return `${words[0]}について`
    }
    
    return cleaned.substring(0, 30) + (cleaned.length > 30 ? '...' : '')
  }

  // 要約生成
  const generateSummary = (session: Session): string => {
    const messageCount = session.messages?.length || 0
    if (messageCount === 0) return '空のセッション'
    
    const firstMessage = session.messages?.[0]?.content || ''
    if (messageCount === 1) {
      return firstMessage.length > 100 
        ? firstMessage.substring(0, 100) + '...'
        : firstMessage
    }

    // 複数メッセージの場合
    const topics = extractTopics(session.messages || [])
    if (topics.length === 0) {
      return `${messageCount}件のメッセージを含む会話`
    }
    
    if (topics.length === 1) {
      return `${topics[0]}について話し合いました`
    }
    
    return `${topics[0]}、${topics[1]}など複数のトピックについて話し合いました`
  }

  // トピック抽出
  const extractTopics = (messages: Message[]): string[] => {
    const allText = messages.map(m => m.content).join(' ')
    const words = allText
      .split(/[\s、。！？,.\!?]+/)
      .filter((word: string) => word.length >= 2)
      .filter((word: string) => !['これ', 'それ', 'あれ', 'です', 'ます'].includes(word))
    
    // 技術用語を優先
    const techTerms = ['React', 'TypeScript', 'JavaScript', 'API', 'エラー', 'バグ']
    const techKeywords = words.filter((word: string) => 
      techTerms.some(term => word.includes(term))
    )
    
    const generalKeywords = words.filter((word: string) => 
      !techKeywords.includes(word) && word.length >= 3
    )
    
    return [...new Set([...techKeywords.slice(0, 2), ...generalKeywords.slice(0, 2)])]
  }

  // カテゴリアイコン
  const getCategoryIcon = (title: string): string => {
    if (title.includes('問題') || title.includes('トラブル') || title.includes('エラー')) return '🔧'
    if (title.includes('依頼') || title.includes('相談') || title.includes('教えて')) return '💬'
    if (title.includes('意見') || title.includes('どう思う')) return '🤔'
    if (title.includes('React') || title.includes('TypeScript') || title.includes('API')) return '⚡'
    return '📝'
  }

  // 推定時間計算
  const getEstimatedDuration = (messageCount: number): string => {
    if (messageCount <= 2) return '短時間'
    if (messageCount <= 5) return '5-10分'
    if (messageCount <= 10) return '10-20分'
    return '20分以上'
  }

  const title = generateTitle(session)
  const summary = generateSummary(session)
  const messageCount = session.messages?.length || 0
  const categoryIcon = getCategoryIcon(title)
  const duration = getEstimatedDuration(messageCount)
  const lastActivity = session.timestamp ? new Date(session.timestamp) : new Date()

  // コンパクトモード
  if (compact) {
    return (
      <div 
        className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200 cursor-pointer p-3"
        onClick={() => onSelect(session.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(session.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <span className="text-sm">{categoryIcon}</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-gray-900 text-sm truncate">
                {title}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                <span>{messageCount}メッセージ</span>
                <span>•</span>
                <span>{duration}</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 text-right ml-2">
            <div>{lastActivity.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</div>
            <div>{lastActivity.toLocaleTimeString('ja-JP', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</div>
          </div>
        </div>
      </div>
    )
  }

  // 通常モード
  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer p-4"
      onClick={() => onSelect(session.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(session.id)}
    >
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1">
          <span className="text-lg">{categoryIcon}</span>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {title}
          </h3>
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            cursor-import
          </span>
        </div>
      </div>

      {/* 要約 */}
      {showPreview && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            {summary}
          </p>
        </div>
      )}

      {/* メタ情報 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span>📊</span>
            <span>{messageCount}メッセージ</span>
          </span>
          <span className="flex items-center space-x-1">
            <span>⏱️</span>
            <span>{duration}</span>
          </span>
        </div>
        <div className="text-right">
          <div>{lastActivity.toLocaleDateString('ja-JP')}</div>
          <div>{lastActivity.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</div>
        </div>
      </div>

      {/* タグ（将来的な拡張） */}
      {session.metadata?.tags && session.metadata.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {session.metadata.tags.slice(0, 3).map((tag: string, index: number) => (
            <span 
              key={index}
              className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
