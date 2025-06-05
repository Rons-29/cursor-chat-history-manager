import React from 'react'
import { Session, Message } from '../types/Session'
import '../styles/dialogue-card.css'

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
        className="dialogue-card dialogue-card-compact"
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
              <h3 className="dialogue-card-title primary-term truncate">
                {title}
              </h3>
              <div className="dialogue-card-meta flex items-center space-x-2 secondary-term mt-1">
                <span>{exchangeCount}回のやりとり</span>
                <span>•</span>
                <span className="dialogue-card-date">{duration}</span>
              </div>
            </div>
          </div>
          <div className="dialogue-card-date secondary-term text-right ml-2">
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
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(dialogue.id)
        }
      }}
      aria-label={`AI対話「${title}」を開く。${exchangeCount}回のやりとり、推定時間${duration}`}
      aria-describedby={`dialogue-summary-${dialogue.id}`}
      aria-expanded="false"
    >
      {/* ヘッダー */}
      <header className="dialogue-header" role="group" aria-labelledby={`dialogue-title-${dialogue.id}`}>
        <div className="dialogue-title-section">
          <span className="dialogue-category-icon" aria-hidden="true" role="img" aria-label={`カテゴリ: ${categoryIcon}`}>
            {categoryIcon}
          </span>
          <h3 
            id={`dialogue-title-${dialogue.id}`}
            className="dialogue-card-title dialogue-title"
          >
            {title}
          </h3>
        </div>
        <div className="dialogue-badge-section">
          <span 
            className="dialogue-source-badge"
            role="status"
            aria-label="Cursorからインポートされた対話"
          >
            cursor-import
          </span>
        </div>
      </header>

      {/* 要約 */}
      {showPreview && (
        <section className="dialogue-summary-section" aria-labelledby={`dialogue-summary-${dialogue.id}`}>
          <p 
            id={`dialogue-summary-${dialogue.id}`}
            className="dialogue-card-preview dialogue-summary"
            role="contentinfo"
          >
            {summary}
          </p>
        </section>
      )}

      {/* 詳細情報 */}
      <footer className="dialogue-footer" role="contentinfo">
        <div className="dialogue-card-meta dialogue-metrics">
          <div className="dialogue-metric-item" role="group" aria-label="対話統計">
            <span className="dialogue-metric-icon" aria-hidden="true" role="img" aria-label="統計">📊</span>
            <span className="dialogue-metric-text">{exchangeCount}回のやりとり</span>
          </div>
          <div className="dialogue-metric-item" role="group" aria-label="推定時間">
            <span className="dialogue-metric-icon" aria-hidden="true" role="img" aria-label="時間">⏱️</span>
            <span className="dialogue-metric-text">{duration}</span>
          </div>
        </div>
        <div className="dialogue-card-date dialogue-timestamp" role="group" aria-label="最終更新時刻">
          <time 
            dateTime={lastActivity.toISOString()}
            className="dialogue-date"
            aria-label={`最終更新日: ${lastActivity.toLocaleDateString('ja-JP')}`}
          >
            {lastActivity.toLocaleDateString('ja-JP')}
          </time>
          <time 
            dateTime={lastActivity.toISOString()}
            className="dialogue-time"
            aria-label={`最終更新時刻: ${lastActivity.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
          >
            {lastActivity.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
      </footer>

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
