import React from 'react'
import { useParams } from 'react-router-dom'

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">セッション詳細</h1>
        <p className="text-gray-600">ID: {id}</p>
      </div>

      <div className="card">
        <p className="text-gray-500">セッション詳細を読み込み中...</p>
      </div>
    </div>
  )
}

export default SessionDetail
