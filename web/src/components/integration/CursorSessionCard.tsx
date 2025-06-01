/**
 * CursorSessionCard - Cursorから統合されたセッション表示用カード
 * .mdcルール準拠: 再利用可能、型安全、アクセシブル
 */

import React from 'react'
import { 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  TagIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'

interface CursorSession {
  id: string
  title: string
  messageCount: number
  createdAt: string
  updatedAt: string
  metadata?: {
    source?: string
    cursorId?: string
    tags?: string[]
    project?: string
  }
}

interface CursorSessionCardProps {
  session: CursorSession
  onClick?: (session: CursorSession) => void
  className?: string
}

const CursorSessionCard: React.FC<CursorSessionCardProps> = ({
  session,
  onClick,
  className = ''
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(session)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isCursorSession = session.metadata?.source === 'cursor'

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div className="p-6">
        {/* ヘッダー */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              {isCursorSession && (
                <ComputerDesktopIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {session.title || 'タイトルなし'}
              </h3>
            </div>
            
            {/* メタデータ */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                <span>{session.messageCount}件のメッセージ</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <ClockIcon className="h-4 w-4" />
                <span>{formatDate(session.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* タグとプロジェクト情報 */}
        {(session.metadata?.tags || session.metadata?.project) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {session.metadata.project && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                📁 {session.metadata.project}
              </span>
            )}
            
            {session.metadata.tags?.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Cursor固有の情報 */}
        {isCursorSession && session.metadata?.cursorId && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Cursor ID: {session.metadata.cursorId.substring(0, 8)}...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CursorSessionCard 