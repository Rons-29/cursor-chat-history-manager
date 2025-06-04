/**
 * Claude Devセッション詳細ページ
 * 
 * Claude Dev拡張機能の特定タスクの詳細情報と会話履歴を表示
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,

  ChatBubbleLeftIcon,
  UserIcon,
  CpuChipIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TagIcon,
  CalendarIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';

// 型定義
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
    environment?: any;
  };
  messages?: Message[];
}

interface Message {
  id?: string;
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
}

const ClaudeDevSessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<ClaudeDevSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (id) {
      loadSessionDetail(id);
    }
  }, [id]);

  // ページタイトルの設定
  useEffect(() => {
    const originalTitle = document.title;
    if (session) {
      document.title = `${session.title} - Claude Dev詳細 - チャット履歴管理`;
    } else {
      document.title = 'Claude Dev詳細 - チャット履歴管理';
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [session]);

  const loadSessionDetail = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/claude-dev/sessions/${sessionId}`);
      
      if (response.status === 404) {
        setError('セッションが見つかりません');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setSession(data.data);
      } else {
        throw new Error('セッションデータの取得に失敗しました');
      }
    } catch (error) {
      console.error('Session detail loading error:', error);
      setError(error instanceof Error ? error.message : 'セッション詳細の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 安全な日付フォーマット
  const formatDate = (timestamp: number | string | undefined): string => {
    if (!timestamp) return '不明';
    
    try {
      const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
      if (isNaN(date.getTime())) return '不明';
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '不明';
    }
  };

  // 安全なメタデータ取得
  const getMetadataValue = (key: keyof ClaudeDevSession['metadata'], defaultValue: any = '不明') => {
    try {
      return session?.metadata?.[key] ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // メッセージ配列の解析
  const parseMessages = (): Message[] => {
    if (!session?.content) return [];
    
    try {
      // JSONパースを試行
      const parsed = JSON.parse(session.content);
      if (Array.isArray(parsed)) {
        return parsed.map((msg, index) => ({
          id: msg.id || `msg-${index}`,
          timestamp: msg.timestamp || session.metadata?.originalTimestamp || '',
          role: msg.role || (index % 2 === 0 ? 'user' : 'assistant'),
          content: msg.content || msg.text || '',
          metadata: msg.metadata || {}
        }));
      }
    } catch {
      // JSONパースに失敗した場合、テキストとして表示
      return [{
        id: 'content-text',
        timestamp: session.metadata?.originalTimestamp || '',
        role: 'user',
        content: session.content,
        metadata: {}
      }];
    }
    
    return [];
  };

  const messages = parseMessages();

  // ローディング状態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <ArrowPathIcon className="h-12 w-12 animate-spin mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              セッション詳細を読み込み中...
            </h3>
          </div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              エラーが発生しました
            </h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <div className="space-x-4">
              <button
                onClick={() => navigate('/claude-dev')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Claude Dev管理に戻る
              </button>
              <button
                onClick={() => id && loadSessionDetail(id)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                再読み込み
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // セッションが見つからない場合
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              セッションが見つかりません
            </h3>
            <p className="text-gray-500 mb-4">
              指定されたClaude Devセッションは存在しないか、削除された可能性があります。
            </p>
            <button
              onClick={() => navigate('/claude-dev')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Claude Dev管理に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => navigate('/claude-dev')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Claude Dev管理に戻る
            </button>
          </div>

          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <CpuChipIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {session.title || 'Claude Dev タスク'}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                <div className="flex items-center">
                  <HashtagIcon className="h-4 w-4 mr-1" />
                  <span>タスクID: {getMetadataValue('taskId', session.id.replace('claude-dev-', ''))}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span>{formatDate(session.timestamp || getMetadataValue('originalTimestamp'))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* セッション統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ChatBubbleLeftIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">総メッセージ数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getMetadataValue('messageCount', getMetadataValue('totalMessages', messages.length))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">ユーザーメッセージ</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getMetadataValue('userMessageCount', messages.filter(m => m.role === 'user').length)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CpuChipIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">AI応答</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getMetadataValue('assistantMessageCount', messages.filter(m => m.role === 'assistant').length)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">文字数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((getMetadataValue('totalCharacters', 0) || 0) / 1000)}K
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* タスク情報 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">タスク情報</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">基本情報</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">セッションID:</dt>
                    <dd className="text-sm font-mono text-gray-900">{session.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">ソース:</dt>
                    <dd className="text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Claude Dev
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">AI応答有無:</dt>
                    <dd className="text-sm text-gray-900">
                      {getMetadataValue('hasAssistantResponses', false) ? 
                        <span className="text-green-600">あり</span> : 
                        <span className="text-gray-500">なし</span>
                      }
                    </dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">タイムスタンプ</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">開始時刻:</dt>
                    <dd className="text-sm text-gray-900">{formatDate(session.startTime || session.timestamp)}</dd>
                  </div>
                  {session.endTime && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">終了時刻:</dt>
                      <dd className="text-sm text-gray-900">{formatDate(session.endTime)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">更新日時:</dt>
                    <dd className="text-sm text-gray-900">{formatDate(getMetadataValue('originalTimestamp'))}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* タグ表示 */}
            {getMetadataValue('tags', []).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <TagIcon className="h-4 w-4 mr-1" />
                  タグ
                </h3>
                <div className="flex flex-wrap gap-2">
                  {getMetadataValue('tags', []).map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 会話履歴 */}
        {messages.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <ChatBubbleLeftIcon className="h-5 w-5 mr-2" />
                会話履歴 ({messages.length}件)
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {messages.map((message, index) => (
                <div key={message.id || index} className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      {message.role === 'user' ? (
                        <UserIcon className={`h-5 w-5 ${message.role === 'user' ? 'text-blue-600' : 'text-purple-600'}`} />
                      ) : (
                        <CpuChipIcon className={`h-5 w-5 text-purple-600`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {message.role === 'user' ? 'ユーザー' : 'Claude Dev'}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {formatDate(message.timestamp)}
                        </span>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                          {message.content}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* コンテンツが会話履歴以外の場合の表示 */}
        {messages.length === 0 && session.content && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <CodeBracketIcon className="h-5 w-5 mr-2" />
                タスク内容
              </h2>
            </div>
            <div className="p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-md p-4 overflow-x-auto">
                {session.content}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaudeDevSessionDetail; 