import React from 'react'
import { Link } from 'react-router-dom'

const NotFound: React.FC = () => {
  return (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900">ページが見つかりません</h2>
        <p className="text-gray-600">お探しのページは存在しないか、移動された可能性があります。</p>
      </div>
      
      <Link to="/" className="btn-primary inline-flex items-center">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        ホームに戻る
      </Link>
    </div>
  )
}

export default NotFound 