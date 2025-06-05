import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

export type SearchNavigationType = 
  | 'current'           // 現在のページで検索実行
  | 'unified-search'    // 専用検索ページに移動
  | 'sessions-crossdata' // セッション一覧の横断検索モードに移動
  | 'sessions-standard' // セッション一覧の標準モードに移動
  | 'sessions-enhanced' // セッション一覧のAI分析モードに移動

/**
 * 統一検索フック - ChatFlow全体で一貫した検索体験を提供
 * 
 * 機能:
 * - 検索キーワードのルーティング統一
 * - URLパラメータの統一管理
 * - 検索履歴の管理
 * - 各ページの検索実行
 */
export const useUnifiedSearch = (currentPage: string) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  /**
   * 統一検索実行ハンドラー
   */
  const handleGlobalSearch = useCallback((
    keyword: string, 
    navigateTo: SearchNavigationType = 'current'
  ) => {
    if (!keyword.trim()) return

    // 検索履歴に追加 (localStorage)
    addToSearchHistory(keyword)

    // URLパラメータを統一
    const params = new URLSearchParams({
      q: keyword,
      timestamp: Date.now().toString()
    })

    switch (navigateTo) {
      case 'unified-search':
        // 専用検索ページ (詳細な結果とフィルタ)
        navigate(`/unified-search?${params}`)
        break
        
      case 'sessions-crossdata':
        // セッション一覧で横断検索
        navigate(`/sessions?mode=crossData&${params}`)
        break
        
      case 'sessions-standard':
        // セッション一覧で標準検索
        navigate(`/sessions?mode=standard&${params}`)
        break
        
      case 'sessions-enhanced':
        // セッション一覧でAI分析検索
        navigate(`/sessions?mode=enhanced&${params}`)
        break
        
      case 'current':
        // 現在のページで検索実行
        executeCurrentPageSearch(keyword)
        break
    }
  }, [navigate, currentPage])

  /**
   * 現在のページで検索実行
   */
  const executeCurrentPageSearch = useCallback((keyword: string) => {
    // URLパラメータに検索キーワードを設定
    const params = new URLSearchParams(searchParams)
    params.set('q', keyword)
    setSearchParams(params, { replace: false })

    // ページ別の検索ロジックを実行
    switch (currentPage) {
      case 'dashboard':
        // ダッシュボードの検索処理
        executeDashboardSearch(keyword)
        break
        
      case 'sessions':
        // セッション一覧の検索処理
        executeSessionsSearch(keyword)
        break
        
      case 'unified-search':
        // 統合検索ページの検索処理
        executeUnifiedSearchPageSearch(keyword)
        break
        
      case 'settings':
        // 設定ページの検索処理
        executeSettingsSearch(keyword)
        break
        
      default:
        // デフォルトは統合検索ページに移動
        navigate(`/unified-search?q=${encodeURIComponent(keyword)}`)
    }
  }, [currentPage, searchParams, setSearchParams, navigate])

  /**
   * 検索履歴管理
   */
  const addToSearchHistory = useCallback((keyword: string) => {
    try {
      const history = getSearchHistory()
      const updatedHistory = [
        keyword,
        ...history.filter(item => item !== keyword) // 重複削除
      ].slice(0, 10) // 最大10件
      
      localStorage.setItem('chatflow-search-history', JSON.stringify(updatedHistory))
    } catch (error) {
      console.warn('検索履歴の保存に失敗:', error)
    }
  }, [])

  const getSearchHistory = useCallback((): string[] => {
    try {
      const history = localStorage.getItem('chatflow-search-history')
      return history ? JSON.parse(history) : []
    } catch {
      return []
    }
  }, [])

  const clearSearchHistory = useCallback(() => {
    try {
      localStorage.removeItem('chatflow-search-history')
    } catch (error) {
      console.warn('検索履歴のクリアに失敗:', error)
    }
  }, [])

  /**
   * 現在のページ別検索実行関数
   */
  const executeDashboardSearch = (keyword: string) => {
    // ダッシュボードの検索は統合検索ページに移動
    navigate(`/unified-search?q=${encodeURIComponent(keyword)}`)
  }

  const executeSessionsSearch = (keyword: string) => {
    // セッション一覧ページでの検索実行
    // 既存のUnifiedSessionsPageの検索機能を使用
    const event = new CustomEvent('unified-search', { 
      detail: { keyword } 
    })
    window.dispatchEvent(event)
  }

  const executeUnifiedSearchPageSearch = (keyword: string) => {
    // 統合検索ページでの検索実行
    const event = new CustomEvent('unified-search-page', { 
      detail: { keyword } 
    })
    window.dispatchEvent(event)
  }

  const executeSettingsSearch = (keyword: string) => {
    // 設定ページでの検索実行
    const event = new CustomEvent('settings-search', { 
      detail: { keyword } 
    })
    window.dispatchEvent(event)
  }

  /**
   * URLから検索キーワードを取得
   */
  const getCurrentSearchKeyword = useCallback((): string => {
    return searchParams.get('q') || ''
  }, [searchParams])

  /**
   * 検索提案取得
   */
  const getSearchSuggestions = useCallback(async (keyword: string): Promise<string[]> => {
    if (!keyword.trim()) return getSearchHistory().slice(0, 5)
    
    try {
      // API から検索提案を取得
      const response = await fetch('/api/search/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.suggestions || []
      }
    } catch (error) {
      console.warn('検索提案の取得に失敗:', error)
    }
    
    // フォールバック: 検索履歴から部分一致
    const history = getSearchHistory()
    return history.filter(item => 
      item.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 5)
  }, [getSearchHistory])

  return {
    // 主要機能
    handleGlobalSearch,
    executeCurrentPageSearch,
    
    // 検索履歴管理
    getSearchHistory,
    addToSearchHistory,
    clearSearchHistory,
    
    // ユーティリティ
    getCurrentSearchKeyword,
    getSearchSuggestions,
    
    // ページ別検索
    executeDashboardSearch,
    executeSessionsSearch,
    executeUnifiedSearchPageSearch,
    executeSettingsSearch
  }
} 