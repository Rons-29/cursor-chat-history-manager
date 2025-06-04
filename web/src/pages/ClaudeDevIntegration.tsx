/**
 * Claude Dev統合ページ
 * 
 * Claude Dev拡張機能のデータ統合と管理を行うWebUIページ
 */

import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// 型定義
interface ClaudeDevStats {
  totalTasks: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  tasksWithAIResponses: number;
  averageMessagesPerTask: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  totalCharacters: number;
}

interface ClaudeDevSession {
  id: string;
  title: string;
  content?: string;
  startTime?: string;
  endTime?: string;
  timestamp?: number;
  metadata: {
    source?: string;
    taskId?: string;
    originalTimestamp?: string;
    messageCount?: number;
    totalMessages?: number;
    hasAssistantResponses?: boolean;
    userMessageCount?: number;
    assistantMessageCount?: number;
    totalCharacters?: number;
    tags?: string[];
    description?: string;
  };
  messages?: any[];
}

interface IntegrationResult {
  success: number;
  failed: number;
  skipped: number;
  totalProcessed: number;
}

// interface ClaudeDevTask {
//   taskId: string;
//   timestamp: Date;
//   conversations: any[];
//   metadata?: any;
// }

const ClaudeDevIntegration: React.FC = () => {
  const [stats, setStats] = useState<ClaudeDevStats | null>(null);
  const [sessions, setSessions] = useState<ClaudeDevSession[]>([]);
  const [availableTasks, setAvailableTasks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [integrationResult, setIntegrationResult] = useState<IntegrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 初期データの読み込み
  useEffect(() => {
    loadInitialData();
  }, []);

  // ページタイトルの設定
  useEffect(() => {
    // ページタイトルを動的に設定
    const originalTitle = document.title;
    document.title = 'Claude Dev統合管理 - チャット履歴管理';
    
    // クリーンアップ時に元のタイトルに戻す
    return () => {
      document.title = originalTitle;
    };
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadStats(),
        loadSessions(),
        loadAvailableTasks()
      ]);
    } catch (error) {
      console.error('Initial data loading error:', error);
      setError(error instanceof Error ? error.message : '初期データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Claude Dev専用統計APIを使用
      const response = await fetch('/api/claude-dev/status');
      if (!response.ok) {
        throw new Error(`統計API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.stats) {
        setStats(data.data.stats);
      } else {
        // フォールバック: デフォルト統計
        setStats({
          totalTasks: 0,
          totalMessages: 0,
          userMessages: 0,
          assistantMessages: 0,
          tasksWithAIResponses: 0,
          averageMessagesPerTask: 0,
          dateRange: { earliest: '', latest: '' },
          totalCharacters: 0
        });
      }
    } catch (error) {
      console.error('Stats loading error:', error);
      throw new Error('統計情報の取得に失敗しました');
    }
  };

  const loadSessions = async (keyword = '') => {
    try {
      // Claude Dev専用APIエンドポイントを使用
      const params = new URLSearchParams({
        keyword,
        limit: '20',
        offset: '0',
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      const response = await fetch(`/api/claude-dev/sessions?${params}`);
      if (!response.ok) {
        throw new Error(`Claude Dev Sessions API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.sessions && Array.isArray(data.data.sessions)) {
        setSessions(data.data.sessions);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Claude Dev Sessions loading error:', error);
      throw new Error('Claude Devセッション一覧の取得に失敗しました');
    }
  };

  const loadAvailableTasks = async () => {
    try {
      const response = await fetch('/api/claude-dev/tasks?skipExisting=true&limit=50');
      if (!response.ok) {
        console.warn('Available tasks API not accessible, using fallback');
        setAvailableTasks([]);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data && Array.isArray(data.data.tasks)) {
        setAvailableTasks(data.data.tasks);
      } else {
        setAvailableTasks([]);
      }
    } catch (error) {
      console.warn('Tasks loading error:', error);
      setAvailableTasks([]);
    }
  };

  const handleIntegration = async () => {
    setIsIntegrating(true);
    setError(null);
    setIntegrationResult(null);

    try {
      const response = await fetch('/api/claude-dev/integrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          includeEnvironmentData: false,
          skipExisting: true,
          maxTasksToProcess: 50
        })
      });

      if (!response.ok) {
        throw new Error(`Integration API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data && data.data.result) {
        setIntegrationResult(data.data.result);
        // 統合後にデータを再読み込み
        await loadInitialData();
      } else {
        throw new Error(data.error || '統合処理に失敗しました');
      }
    } catch (error) {
      console.error('Integration error:', error);
      setError(error instanceof Error ? error.message : '統合処理でエラーが発生しました');
    } finally {
      setIsIntegrating(false);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      await loadSessions(searchKeyword);
    } catch (error) {
      setError(error instanceof Error ? error.message : '検索に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 安全な日付フォーマット関数
  const formatDate = (timestamp: number | string | undefined): string => {
    if (!timestamp) return '不明';
    
    try {
      // 文字列の場合はそのまま使用
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '不明';
        return date.toLocaleString('ja-JP');
      }
      
      // 数値の場合
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '不明';
      return date.toLocaleString('ja-JP');
    } catch (error) {
      console.warn('Date formatting error:', error);
      return '不明';
    }
  };

  // 安全なファイルサイズフォーマット関数
  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes || bytes === 0) return '0 B';
    
    try {
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    } catch (error) {
      console.warn('File size formatting error:', error);
      return '不明';
    }
  };

  // 安全なメタデータ取得関数
  const getMetadataValue = (session: ClaudeDevSession, key: keyof ClaudeDevSession['metadata'], defaultValue: any = '不明') => {
    try {
      return session.metadata?.[key] ?? defaultValue;
    } catch (error) {
      console.warn(`Metadata access error for key ${key}:`, error);
      return defaultValue;
    }
  };

  // セッション時刻の取得（複数のフィールドから安全に）
  const getSessionTimestamp = (session: ClaudeDevSession): number | string | undefined => {
    return session.timestamp || 
           session.startTime || 
           getMetadataValue(session, 'originalTimestamp', undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Claude Dev統合管理
              </h1>
              <p className="text-gray-600">
                Claude Dev拡張機能のタスク履歴を統合・分析・管理
              </p>
            </div>
          </div>
          
          {/* 統計サマリー */}
          {stats && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-purple-700">統合状況:</span>
                  <span className="text-sm text-gray-600">
                    {stats.totalTasks}タスク • {stats.totalMessages}メッセージ
                  </span>
                  {stats.dateRange.earliest && (
                    <span className="text-sm text-gray-500">
                      最古: {new Date(stats.dateRange.earliest).toLocaleDateString('ja-JP')}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">統合完了</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {/* 統計情報カード */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">総タスク数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTasks || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">総メッセージ数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalMessages || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">AI返答付きタスク</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.tasksWithAIResponses || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">平均メッセージ数</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(stats.averageMessagesPerTask || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 統合コントロール */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">データ統合</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  利用可能な新しいタスク: <span className="font-medium">{availableTasks.length}件</span>
                </p>
                {integrationResult && (
                  <div className="text-sm text-gray-600">
                    前回の統合結果: 成功 {integrationResult.success}件, 
                    失敗 {integrationResult.failed}件, 
                    スキップ {integrationResult.skipped}件
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={loadAvailableTasks}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  更新
                </button>
                <button
                  onClick={handleIntegration}
                  disabled={isIntegrating || availableTasks.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isIntegrating ? (
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlayIcon className="h-4 w-4 mr-2" />
                  )}
                  {isIntegrating ? '統合中...' : '統合実行'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 検索セクション */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Claude Devセッション検索</h2>
          </div>
          <div className="p-6">
            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="キーワードを入力..."
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                検索
              </button>
            </div>
          </div>
        </div>

        {/* セッション一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Claude Devセッション一覧 ({sessions.length}件)
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Claude Dev拡張機能のタスク履歴が表示されます
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="p-6 text-center">
                <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">読み込み中...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center">
                <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">セッションが見つかりませんでした</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {session.title || 'Cursor Prompt'}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-medium">作成日時:</span><br />
                          {formatDate(getSessionTimestamp(session))}
                        </div>
                        <div>
                          <span className="font-medium">メッセージ数:</span><br />
                          {getMetadataValue(session, 'messageCount', getMetadataValue(session, 'totalMessages', 0))}件
                        </div>
                        <div>
                          <span className="font-medium">AI返答:</span><br />
                          {getMetadataValue(session, 'hasAssistantResponses', false) ? 'あり' : 'なし'}
                        </div>
                        <div>
                          <span className="font-medium">文字数:</span><br />
                          {formatFileSize(getMetadataValue(session, 'totalCharacters', 0))}
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Claude Dev
                        </span>
                        {getMetadataValue(session, 'taskId', null) && (
                          <span className="ml-2 text-xs text-gray-500">
                            Task ID: {getMetadataValue(session, 'taskId', '')}
                          </span>
                        )}
                        {/* セッションIDからタスクIDを抽出表示（フォールバック） */}
                        {!getMetadataValue(session, 'taskId', null) && session.id.startsWith('claude-dev-') && (
                          <span className="ml-2 text-xs text-gray-500">
                            Task ID: {session.id.replace('claude-dev-', '')}
                          </span>
                        )}
                        
                        {/* 追加情報タグ */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {getMetadataValue(session, 'hasAssistantResponses', false) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              AI応答あり
                            </span>
                          )}
                          {getMetadataValue(session, 'messageCount', 0) > 10 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              長期タスク
                            </span>
                          )}
                          {getSessionTimestamp(session) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {(() => {
                                const timestamp = getSessionTimestamp(session);
                                const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp || 0);
                                const now = new Date();
                                const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                                
                                if (diffDays === 0) return '今日';
                                if (diffDays === 1) return '昨日';
                                if (diffDays < 7) return `${diffDays}日前`;
                                if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
                                return `${Math.floor(diffDays / 30)}ヶ月前`;
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => {
                          // Claude Dev専用の詳細ページにナビゲート
                          const url = `/claude-dev/session/${session.id}`;
                          window.open(url, '_blank');
                        }}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        詳細表示
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaudeDevIntegration;
