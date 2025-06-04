import React from 'react'
import { Session, Message } from '../types/Session'

interface DialogueCardProps {
  readonly dialogue: Session // session → dialogue (AI対話)
  readonly onSelect: (id: string) => void
  readonly showPreview?: boolean
  readonly compact?: boolean
}

/**
 * 改善されたAI対話カードコンポーネント
 * - 意味のあるタイトル表示
 * - AI対話の要約
 * - 視覚的な改善
 * - コンパクトモード対応
 * - アクセシビリティ対応
 */
export const DialogueCard: React.FC<DialogueCardProps> = ({ 
  dialogue, 
  onSelect, 
  showPreview = true,
  compact = false
}) => {
  // タイトル生成（簡易版）
  const generateTitle = (dialogue: Session): string => {
    if (dialogue.title && dialogue.title !== 'Cursor Prompt') {
      return dialogue.title
    }

    const firstExchange = dialogue.messages?.[0]?.content || ''
    if (!firstExchange) return 'AI対話'

    // 基本クリーニング
    const cleaned = firstExchange.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
    
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
  const generateSummary = (dialogue: Session): string => {
    const exchangeCount = dialogue.messages?.length || 0
    if (exchangeCount === 0) return '空のAI対話'
    
    const firstExchange = dialogue.messages?.[0]?.content || ''
    if (exchangeCount === 1) {
      return firstExchange.length > 100 
        ? firstExchange.substring(0, 100) + '...'
        : firstExchange
    }

    // 複数やりとりの場合
    const topics = extractTopics(dialogue.messages || [])
    if (topics.length === 0) {
      return `${exchangeCount}回のやりとりを含む対話`
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
  const getEstimatedDuration = (exchangeCount: number): string => {
    if (exchangeCount <= 2) return '短時間'
    if (exchangeCount <= 5) return '5-10分'
    if (exchangeCount <= 10) return '10-20分'
    return '20分以上'
  }

  const title = generateTitle(dialogue)
  const summary = generateSummary(dialogue)
  const exchangeCount = dialogue.messages?.length || 0
  const categoryIcon = getCategoryIcon(title)
  const duration = getEstimatedDuration(exchangeCount)
  const lastActivity = dialogue.timestamp ? new Date(dialogue.timestamp) : new Date()

  // コンパクトモード
  if (compact) {
    return (
      <div 
        className="dialogue-card-compact"
        onClick={() => onSelect(dialogue.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(dialogue.id)}
        aria-label={`AI対話「${title}」を開く`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <span className="text-sm" aria-hidden="true">{categoryIcon}</span>
            <div className="min-w-0 flex-1">
              <h3 className="primary-term truncate">
                {title}
              </h3>
              <div className="flex items-center space-x-2 secondary-term mt-1">
                <span>{exchangeCount}回のやりとり</span>
                <span>•</span>
                <span>{duration}</span>
              </div>
            </div>
          </div>
          <div className="secondary-term text-right ml-2">
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
      className="dialogue-card"
      onClick={() => onSelect(dialogue.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(dialogue.id)}
      aria-label={`AI対話「${title}」を開く`}
    >
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1">
          <span className="text-lg" aria-hidden="true">{categoryIcon}</span>
          <h3 className="primary-term leading-tight">
            {title}
          </h3>
        </div>
        <div className="flex items-center space-x-1 secondary-term">
          <span className="connection-badge">
            cursor-import
          </span>
        </div>
      </div>

      {/* 要約 */}
      {showPreview && (
        <div className="mb-3">
          <p className="secondary-term leading-relaxed">
            {summary}
          </p>
        </div>
      )}

      {/* 詳細情報 */}
      <div className="flex items-center justify-between secondary-term">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span aria-hidden="true">📊</span>
            <span>{exchangeCount}回のやりとり</span>
          </span>
          <span className="flex items-center space-x-1">
            <span aria-hidden="true">⏱️</span>
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
      {dialogue.metadata?.tags && dialogue.metadata.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {dialogue.metadata.tags.slice(0, 3).map((tag: string, index: number) => (
            <span 
              key={index}
              className="tag-item"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// 旧名前でのエクスポート（後方互換性のため段階的移行）
export const SessionCard = DialogueCard
