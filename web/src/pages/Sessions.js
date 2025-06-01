import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient, queryKeys } from '../api/client.js';
const Sessions = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);
    // フィルター状態
    const [keyword, setKeyword] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    // セッション一覧取得
    const { data: sessionsData, isLoading, error, } = useQuery({
        queryKey: queryKeys.sessions({ page: currentPage, limit, keyword }),
        queryFn: () => apiClient.getSessions({
            page: currentPage,
            limit,
            keyword: keyword || undefined,
        }),
        refetchInterval: 60000, // 1分ごとに更新
    });
    // データ手動更新
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            // 強制的にデータを再取得
            await queryClient.refetchQueries({ queryKey: ['sessions'] });
        }
        catch (error) {
            console.error('データ更新エラー:', error);
        }
        finally {
            setIsRefreshing(false);
        }
    };
    // セッション詳細ページに遷移
    const handleSessionClick = (sessionId) => {
        navigate(`/sessions/${sessionId}`);
    };
    // 時間フォーマット
    const formatTime = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        catch {
            return '不明';
        }
    };
    // フィルタリングされたセッション
    const filteredSessions = sessionsData?.sessions?.filter(session => {
        if (!keyword)
            return true;
        const searchText = `${session.title || ''} ${session.metadata.tags?.join(' ') || ''}`.toLowerCase();
        return searchText.includes(keyword.toLowerCase());
    }) || [];
    // ソートされたセッション
    const sortedSessions = [...filteredSessions].sort((a, b) => {
        switch (sortOrder) {
            case 'newest':
                return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
            case 'oldest':
                return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            case 'messages':
                return b.metadata.totalMessages - a.metadata.totalMessages;
            default:
                return 0;
        }
    });
    const totalSessions = sessionsData?.sessions?.length || 0;
    const totalPages = Math.ceil(sortedSessions.length / limit);
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSessions = sortedSessions.slice(startIndex, endIndex);
    // キーワード変更時の処理
    const handleKeywordChange = (value) => {
        setKeyword(value);
        setCurrentPage(1); // ページを1にリセット
    };
    // ソート変更時の処理
    const handleSortChange = (value) => {
        setSortOrder(value);
        setCurrentPage(1); // ページを1にリセット
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center border-b border-gray-200 pb-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\u30BB\u30C3\u30B7\u30E7\u30F3\u4E00\u89A7" }), _jsx("p", { className: "text-gray-600", children: isLoading ? '読み込み中...' : `全 ${totalSessions} 件のセッション` })] }), _jsxs("button", { className: "btn-primary flex items-center space-x-2", onClick: handleRefresh, disabled: isLoading || isRefreshing, children: [_jsx("svg", { className: `w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" }) }), _jsx("span", { children: isRefreshing ? '更新中...' : isLoading ? '読み込み中...' : '更新' })] })] }), _jsx("div", { className: "card", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u30AD\u30FC\u30EF\u30FC\u30C9\u691C\u7D22" }), _jsx("input", { type: "text", placeholder: "\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u691C\u7D22...", className: "input-field", value: keyword, onChange: e => handleKeywordChange(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u30BD\u30FC\u30C8" }), _jsxs("select", { className: "input-field", value: sortOrder, onChange: e => handleSortChange(e.target.value), children: [_jsx("option", { value: "newest", children: "\u6700\u65B0\u9806" }), _jsx("option", { value: "oldest", children: "\u53E4\u3044\u9806" }), _jsx("option", { value: "messages", children: "\u30E1\u30C3\u30BB\u30FC\u30B8\u6570\u9806" })] })] }), _jsx("div", { className: "flex items-end", children: _jsx("div", { className: "text-sm text-gray-500", children: keyword &&
                                    filteredSessions.length !== totalSessions &&
                                    `${filteredSessions.length} / ${totalSessions} 件表示` }) })] }) }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex", children: [_jsx("svg", { className: "w-5 h-5 text-red-400", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "\u30C7\u30FC\u30BF\u306E\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC" }), _jsx("p", { className: "text-sm text-red-700 mt-1", children: error?.message || 'セッションデータを取得できませんでした' })] })] }) })), _jsx("div", { className: "space-y-4", children: isLoading ? (
                // 読み込み中の表示
                Array.from({ length: 3 }).map((_, index) => (_jsx("div", { className: "card", children: _jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: "w-3 h-3 bg-gray-400 rounded-full animate-pulse" }), _jsxs("div", { children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-48 animate-pulse mb-2" }), _jsx("div", { className: "h-3 bg-gray-200 rounded w-32 animate-pulse" })] })] }) }) }, index)))) : paginatedSessions.length > 0 ? (paginatedSessions.map(session => (_jsx("div", { className: "card-hover", onClick: () => handleSessionClick(session.id), children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: "w-3 h-3 bg-green-400 rounded-full" }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900", children: session.title || `セッション ${session.id.slice(0, 8)}` }), _jsx("p", { className: "text-sm text-gray-500", children: session.metadata.summary || 'セッションの説明なし' }), _jsxs("div", { className: "flex items-center space-x-4 mt-2", children: [_jsxs("span", { className: "text-xs text-gray-400", children: [session.metadata.totalMessages, " \u30E1\u30C3\u30BB\u30FC\u30B8"] }), _jsx("span", { className: "text-xs text-gray-400", children: formatTime(session.startTime) })] })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [session.metadata.tags &&
                                        session.metadata.tags.length > 0 && (_jsx("span", { className: "px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full", children: session.metadata.tags[0] })), _jsx("svg", { className: "w-5 h-5 text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) })] })] }) }, session.id)))) : (_jsxs("div", { className: "card text-center py-8", children: [_jsx("svg", { className: "w-12 h-12 text-gray-400 mx-auto mb-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "\u30BB\u30C3\u30B7\u30E7\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" }), _jsx("p", { className: "text-gray-500", children: keyword
                                ? '検索条件に一致するセッションがありません'
                                : 'セッションデータがありません' })] })) }), !isLoading && sortedSessions.length > limit && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "text-sm text-gray-500", children: [_jsx("span", { className: "font-medium", children: startIndex + 1 }), " -", _jsx("span", { className: "font-medium", children: Math.min(endIndex, sortedSessions.length) }), ' ', "\u4EF6 / \u5168 ", _jsx("span", { className: "font-medium", children: sortedSessions.length }), ' ', "\u4EF6", keyword && ` (検索結果: ${filteredSessions.length} 件)`] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { className: "btn-secondary", disabled: currentPage === 1, onClick: () => setCurrentPage(prev => Math.max(1, prev - 1)), children: "\u524D\u3078" }), _jsxs("span", { className: "text-sm text-gray-600", children: [currentPage, " / ", totalPages] }), _jsx("button", { className: "btn-secondary", disabled: currentPage === totalPages, onClick: () => setCurrentPage(prev => Math.min(totalPages, prev + 1)), children: "\u6B21\u3078" })] })] }))] }));
};
export default Sessions;
