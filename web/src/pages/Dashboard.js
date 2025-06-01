import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient, queryKeys } from '../api/client.js';
const Dashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);
    // 統計データ取得
    const { data: stats, isLoading: statsLoading, error: statsError, } = useQuery({
        queryKey: queryKeys.stats(),
        queryFn: () => apiClient.getStats(),
        refetchInterval: 30000, // 30秒ごとに更新
    });
    // セッション一覧取得（最近の5件）
    const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError, } = useQuery({
        queryKey: queryKeys.sessions({ limit: 5 }),
        queryFn: () => apiClient.getSessions({ limit: 5 }),
        refetchInterval: 30000,
    });
    // データ手動更新
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            // 強制的にデータを再取得
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ['stats'] }),
                queryClient.refetchQueries({ queryKey: ['sessions'] }),
            ]);
        }
        catch (error) {
            console.error('データ更新エラー:', error);
        }
        finally {
            setIsRefreshing(false);
        }
    };
    // ページ遷移ハンドラー
    const handleNavigateToSessions = () => navigate('/sessions');
    const handleNavigateToSearch = () => navigate('/search');
    // エクスポート機能（仮実装）
    const handleExport = () => {
        alert('エクスポート機能は準備中です');
    };
    // 設定画面
    const handleSettings = () => {
        navigate('/settings');
    };
    // セッション詳細ページに遷移
    const handleSessionClick = (sessionId) => {
        navigate(`/sessions/${sessionId}`);
    };
    const formatLastUpdated = (dateString) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours < 1)
                return '1時間未満';
            if (diffHours < 24)
                return `${diffHours}時間前`;
            return `${Math.floor(diffHours / 24)}日前`;
        }
        catch {
            return '--';
        }
    };
    const formatSessionTime = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        catch {
            return '--';
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9" }), _jsx("p", { className: "text-gray-600", children: "Chat History Manager - \u30B7\u30B9\u30C6\u30E0\u6982\u8981" })] }), _jsxs("button", { className: "btn-primary flex items-center space-x-2", onClick: handleRefresh, disabled: statsLoading || sessionsLoading || isRefreshing, children: [_jsx("svg", { className: `w-4 h-4 ${statsLoading || sessionsLoading || isRefreshing ? 'animate-spin' : ''}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" }) }), _jsx("span", { children: isRefreshing
                                    ? '更新中...'
                                    : statsLoading || sessionsLoading
                                        ? '読み込み中...'
                                        : 'データ更新' })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsx("div", { className: "card", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u7DCF\u30BB\u30C3\u30B7\u30E7\u30F3\u6570" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: statsLoading ? '...' : (stats?.totalSessions ?? '--') })] }), _jsx("div", { className: "w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" }) }) })] }) }), _jsx("div", { className: "card", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u4ECA\u6708\u306E\u30E1\u30C3\u30BB\u30FC\u30B8" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: statsLoading ? '...' : (stats?.thisMonthMessages ?? '--') })] }), _jsx("div", { className: "w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-green-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" }) }) })] }) }), _jsx("div", { className: "card", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: statsLoading ? '...' : (stats?.activeProjects ?? '--') })] }), _jsx("div", { className: "w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-purple-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" }) }) })] }) }), _jsx("div", { className: "card", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u6700\u7D42\u66F4\u65B0" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: statsLoading
                                                ? '...'
                                                : stats?.lastUpdated
                                                    ? formatLastUpdated(stats.lastUpdated)
                                                    : '--' })] }), _jsx("div", { className: "w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-orange-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" }) }) })] }) })] }), (statsError || sessionsError) && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex", children: [_jsx("svg", { className: "w-5 h-5 text-red-400", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "\u30C7\u30FC\u30BF\u306E\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC" }), _jsx("p", { className: "text-sm text-red-700 mt-1", children: statsError?.message ||
                                        sessionsError?.message ||
                                        'APIサーバーに接続できませんでした' })] })] }) })), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\u6700\u8FD1\u306E\u30BB\u30C3\u30B7\u30E7\u30F3" }), _jsx("button", { className: "btn-secondary", onClick: handleNavigateToSessions, children: "\u3059\u3079\u3066\u898B\u308B" })] }), _jsx("div", { className: "space-y-3", children: sessionsLoading ? (_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-2 h-2 bg-blue-400 rounded-full animate-pulse" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900", children: "\u30BB\u30C3\u30B7\u30E7\u30F3\u8AAD\u307F\u8FBC\u307F\u4E2D..." }), _jsx("p", { className: "text-sm text-gray-500", children: "\u30C7\u30FC\u30BF\u3092\u53D6\u5F97\u3057\u3066\u3044\u307E\u3059" })] })] }), _jsx("span", { className: "text-sm text-gray-400", children: "--" })] })) : sessionsData?.sessions && sessionsData.sessions.length > 0 ? (sessionsData.sessions.map(session => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer", onClick: () => handleSessionClick(session.id), children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-2 h-2 bg-green-400 rounded-full" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900", children: session.title || `セッション ${session.id.slice(0, 8)}` }), _jsxs("p", { className: "text-sm text-gray-500", children: [session.metadata.totalMessages, "\u4EF6\u306E\u30E1\u30C3\u30BB\u30FC\u30B8", session.metadata.tags &&
                                                            session.metadata.tags.length > 0 &&
                                                            ` • ${session.metadata.tags.slice(0, 2).join(', ')}`] })] })] }), _jsx("span", { className: "text-sm text-gray-400", children: formatSessionTime(session.startTime) })] }, session.id)))) : (_jsx("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-2 h-2 bg-gray-400 rounded-full" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900", children: "\u30BB\u30C3\u30B7\u30E7\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" }), _jsx("p", { className: "text-sm text-gray-500", children: "\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093" })] })] }) })) })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u30AF\u30A4\u30C3\u30AF\u30A2\u30AF\u30B7\u30E7\u30F3" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("button", { className: "btn-primary", onClick: handleNavigateToSearch, children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) }), "\u691C\u7D22\u958B\u59CB"] }), _jsxs("button", { className: "btn-secondary", onClick: handleExport, children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" }) }), "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8"] }), _jsxs("button", { className: "btn-secondary", onClick: handleSettings, children: [_jsxs("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [_jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }), _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })] }), "\u8A2D\u5B9A"] })] })] })] }));
};
export default Dashboard;
