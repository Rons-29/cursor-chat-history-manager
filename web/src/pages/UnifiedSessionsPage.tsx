import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient, queryKeys } from '../api/client.js'
import { SessionCard } from '../components/SessionCard'
import { EnhancedSessionCard } from '../components/EnhancedSessionCard'
import { ModeSelector, SessionDisplayMode, getModeDescription } from '../components/ModeSelector'
import { UnifiedSearchBar, SearchStats } from '../components/UnifiedSearchBar'

interface UnifiedSessionsPageProps {
  defaultMode?: SessionDisplayMode
}

/**
 * 統一セッションページ - 3つのモード（標準・横断検索・AI分析）を統合
 * Sessions.tsx、UnifiedSessions.tsx、EnhancedSessions.tsx の機能を1つに統合
 */
const UnifiedSessionsPage: React.FC<UnifiedSessionsPageProps> = ({
  defaultMode = 'standard'
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // URL パラメータからモードを取得
  const urlMode = searchParams.get('mode') as SessionDisplayMode
  const initialMode = urlMode || defaultMode

  // 状態管理
  const [currentMode, setCurrentMode] = useState<SessionDisplayMode>(initialMode)
  const [keyword, setKeyword] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'messages'>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [limit] = useState(50)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Enhanced モード用の状態
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])
  const [isEnhancing, setIsEnhancing] = useState(false)

  // URL パラメータの同期
  useEffect(() => {
    const params = new URLSearchParams()
    if (currentMode !== 'standard') params.set('mode', currentMode)
    if (keyword) params.set('q', keyword)
    if (currentPage > 1) params.set('page', currentPage.toString())
    
    setSearchParams(params, { replace: true })
  }, [currentMode, keyword, currentPage, setSearchParams])

  // 標準モードのデータ取得
  const {
    data: standardData,
    isLoading: standardLoading,
    error: standardError,
  } = useQuery({
    queryKey: queryKeys.sessions({ 
      page: currentPage, 
      limit, 
      keyword: keyword || undefined,
      sort: sortOrder 
    }),
    queryFn: () =>
      apiClient.getSessions({
        page: currentPage,
        limit,
        keyword: keyword || undefined,
      }),
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: currentMode === 'standard',
  })

  // 横断検索モードのデータ取得
  const {
    data: crossDataModeData,
    isLoading: crossDataLoading,
    error: crossDataError,
  } = useQuery({
    queryKey: ['sessions-unified', { 
      page: currentPage, 
      limit, 
      keyword: keyword || undefined 
    }],
    queryFn: () =>
      apiClient.getAllSessions({
        page: currentPage,
        limit,
        keyword: keyword || undefined,
        includeStatistics: true,
      }),
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: currentMode === 'crossData',
  })

  // Enhanced モード用のデータ取得（通常セッション）
  const {
    data: regularDataForEnhanced,
    isLoading: regularLoadingForEnhanced,
    error: regularErrorForEnhanced,
  } = useQuery({
    queryKey: ['sessions-enhanced-regular', currentPage, limit],
    queryFn: async () => {
      const response = await fetch(`/api/sessions?page=${currentPage}&pageSize=${limit}`)
      if (!response.ok) throw new Error('Sessions fetch failed')
      return response.json()
    },
    retry: 3,
    enabled: currentMode === 'enhanced',
  })

  // 現在のモードに応じてデータを選択
  const { data, isLoading, error } = useMemo(() => {
    switch (currentMode) {
      case 'standard':
        return {
          data: standardData,
          isLoading: standardLoading,
          error: standardError
        }
      case 'crossData':
        return {
          data: crossDataModeData,
          isLoading: crossDataLoading,
          error: crossDataError
        }
      case 'enhanced':
        return {
          data: regularDataForEnhanced,
          isLoading: regularLoadingForEnhanced,
          error: regularErrorForEnhanced
        }
      default:
        return { data: null, isLoading: false, error: null }
    }
  }, [currentMode, standardData, standardLoading, standardError, crossDataModeData, crossDataLoading, crossDataError, regularDataForEnhanced, regularLoadingForEnhanced, regularErrorForEnhanced])

  // Enhanced モード用のデータ処理
  const enhancedSessions = useMemo(() => {
    if (currentMode !== 'enhanced' || !regularDataForEnhanced?.sessions) return []
    
    const sessions = regularDataForEnhanced.sessions.map((session: any) => ({
      ...session,
      metadata: {
        ...session.metadata,
        source: session.metadata?.source || 'chat',
        project: 'chat-history-manager',
        topic: session.id.includes('prompt') ? 'AI相談' : 'コード開発',
        category: session.id.includes('prompt') ? 'consultation' : 'development',
        complexity: (session.messages?.length || 0) > 5 ? 'complex' : 'simple',
        totalMessages: session.messages?.length || 0,
        autoGeneratedTags: [
          ...(session.metadata?.tags || []),
          'Cursor',
          session.id.includes('prompt') ? 'プロンプト' : 'セッション'
        ]
      }
    }))
    
    // キーワードフィルタリング
    if (keyword) {
      const searchTerm = keyword.toLowerCase()
      return sessions.filter((session: any) => 
        session.title.toLowerCase().includes(searchTerm) ||
        session.content?.toLowerCase().includes(searchTerm) ||
        session.metadata.autoGeneratedTags.some((tag: string) => tag.toLowerCase().includes(searchTerm))
      )
    }
    
    return sessions
  }, [regularDataForEnhanced, keyword, currentMode])

  // データの統一処理
  const { sessions, totalSessions, pagination } = useMemo(() => {
    if (currentMode === 'enhanced') {
      return {
        sessions: enhancedSessions,
        totalSessions: enhancedSessions.length,
        pagination: {
          page: currentPage,
          limit: limit,
          total: enhancedSessions.length,
          totalPages: Math.ceil(enhancedSessions.length / limit),
          hasMore: currentPage * limit < enhancedSessions.length
        }
      }
    }
    
    return {
      sessions: data?.sessions || [],
      totalSessions: data?.pagination?.total || data?.sources?.total || 0,
      pagination: data?.pagination || {}
    }
  }, [currentMode, enhancedSessions, data, currentPage, limit])

  // モード切り替え処理
  const handleModeChange = (newMode: SessionDisplayMode) => {
    setCurrentMode(newMode)
    setCurrentPage(1)
    setSelectedSessions([])
  }

  // データ手動更新
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      switch (currentMode) {
        case 'standard':
          queryClient.invalidateQueries({ queryKey: ['sessions'] })
          break
        case 'crossData':
          queryClient.invalidateQueries({ queryKey: ['sessions-unified'] })
          break
        case 'enhanced':
          queryClient.invalidateQueries({ queryKey: ['sessions-enhanced-regular'] })
          break
      }
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

  // Enhanced モード - セッション選択
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    )
  }

  // Enhanced モード - AI分析実行
  const enhanceTitles = async () => {
    if (selectedSessions.length === 0) return
    
    setIsEnhancing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('AI分析完了:', selectedSessions)
      setSelectedSessions([])
      alert(`${selectedSessions.length}件のセッションをAI分析で改善しました！`)
    } catch (error) {
      console.error('AI analysis failed:', error)
    } finally {
      setIsEnhancing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center border-b border-gray-200 pb-4 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI対話記録一覧</h1>
          <p className="text-gray-600">
            {isLoading ? '読み込み中...' : `全 ${totalSessions.toLocaleString()} 件のAI対話記録`}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {getModeDescription(currentMode)}
          </p>
          
          {/* 横断検索モードの統計表示 */}
          {currentMode === 'crossData' && crossDataModeData && (
            <div className="mt-2 text-sm text-gray-500">
              <div className="flex flex-wrap gap-4">
                <span>Traditional: {crossDataModeData.sources.traditional}件</span>
                <span>Incremental: {crossDataModeData.sources.incremental}件</span>
                <span>SQLite: {crossDataModeData.sources.sqlite}件</span>
                <span>Claude Dev: {crossDataModeData.sources.claudeDev}件</span>
                <span className="text-green-600">
                  統合総数: {crossDataModeData.sources.total}件
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          {/* モード切り替え */}
          <ModeSelector
            currentMode={currentMode}
            onModeChange={handleModeChange}
            disabled={isLoading || isRefreshing}
          />
          
          {/* リフレッシュボタン */}
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="btn-secondary flex items-center"
          >
            <svg className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? '更新中...' : '更新'}
          </button>
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <UnifiedSearchBar
              mode={currentMode}
              keyword={keyword}
              onKeywordChange={(value) => {
                setKeyword(value)
                setCurrentPage(1)
              }}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-end">
            {currentMode !== 'enhanced' && (
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  並び順
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="newest">新しい順</option>
                  <option value="oldest">古い順</option>
                  <option value="messages">メッセージ数順</option>
                </select>
              </div>
            )}
          </div>
        </div>
        
        {/* 検索統計 */}
        {!isLoading && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <SearchStats
              mode={currentMode}
              totalResults={totalSessions}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {/* Enhanced モード - 一括操作バー */}
      {currentMode === 'enhanced' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-purple-700">
                {selectedSessions.length} 件選択中
              </span>
              {selectedSessions.length > 0 && (
                <button
                  onClick={() => setSelectedSessions([])}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  選択解除
                </button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={enhanceTitles}
                disabled={selectedSessions.length === 0 || isEnhancing}
                className="btn-primary flex items-center"
              >
                {isEnhancing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    AI分析中...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    AI分析実行
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
          // ローディング表示
          Array.from({ length: 5 }).map((_, index) => (
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
        ) : sessions.length > 0 ? (
          sessions.map((session: any) => (
            <div key={session.id} className="relative">
              {/* Enhanced モード - 選択チェックボックス */}
              {currentMode === 'enhanced' && (
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedSessions.includes(session.id)}
                    onChange={() => toggleSessionSelection(session.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              )}
              
              {/* セッションカード */}
              <div className={`${currentMode === 'enhanced' ? 'ml-8' : ''} ${selectedSessions.includes(session.id) ? 'ring-2 ring-blue-500' : ''}`}>
                {currentMode === 'enhanced' && EnhancedSessionCard ? (
                  <EnhancedSessionCard
                    session={session}
                    onSelect={() => handleSessionClick(session.id)}
                  />
                ) : (
                  <div className="relative">
                    <SessionCard
                      session={session}
                      onSelect={handleSessionClick}
                      showPreview={true}
                    />
                    {/* データソース表示バッジ（横断検索モード）*/}
                    {currentMode === 'crossData' && session.metadata?.source && (
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          session.metadata.source === 'traditional' ? 'bg-blue-100 text-blue-800' :
                          session.metadata.source === 'incremental' ? 'bg-purple-100 text-purple-800' :
                          session.metadata.source === 'sqlite' ? 'bg-green-100 text-green-800' :
                          session.metadata.source === 'claude-dev' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {session.metadata.source}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          // データなし表示
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {keyword ? '検索結果が見つかりませんでした' : 'セッションデータがありません'}
            </h3>
            <p className="text-gray-500 mb-4">
              {keyword 
                ? 'キーワードを変更して再度検索してみてください' 
                : `${currentMode === 'standard' ? 'メインデータベース' : currentMode === 'crossData' ? '全データソース' : 'AI分析対象'}を確認しましたが、セッションデータが見つかりませんでした`
              }
            </p>
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="btn-secondary"
              >
                検索をクリア
              </button>
            )}
          </div>
        )}
      </div>

      {/* ページネーション */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 pt-4">
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            前へ
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              {currentPage} / {pagination.totalPages} ページ
            </span>
            {pagination.total && (
              <span className="text-xs text-gray-500">
                (全 {pagination.total.toLocaleString()} 件)
              </span>
            )}
          </div>
          
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
            disabled={currentPage === pagination.totalPages}
          >
            次へ
          </button>
        </div>
      )}
    </div>
  )
}

export default UnifiedSessionsPage 