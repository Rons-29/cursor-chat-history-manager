import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '../api/client';
const SessionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);
    // セッション詳細取得
    const { data: session, isLoading, error, } = useQuery({
        queryKey: queryKeys.session(id),
        queryFn: () => apiClient.getSession(id),
        enabled: !!id,
        retry: 1,
    });
    // データ手動更新
    const handleRefresh = async () => {
        if (id) {
            setIsRefreshing(true);
            try {
                queryClient.invalidateQueries({ queryKey: ['sessions', id] });
                // 強制的にデータを再取得
                await queryClient.refetchQueries({ queryKey: ['sessions', id] });
            }
            catch (error) {
                console.error('データ更新エラー:', error);
            }
            finally {
                setIsRefreshing(false);
            }
        }
    };
    // 戻るボタン
    const handleBack = () => {
        navigate('/sessions');
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
                second: '2-digit',
            });
        }
        catch {
            return '不明';
        }
    };
    // セッション期間計算
    const getSessionDuration = (startTime, endTime) => {
        try {
            const start = new Date(startTime);
            const end = endTime ? new Date(endTime) : new Date();
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            if (diffMinutes < 60)
                return `${diffMinutes}分`;
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;
            return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
        }
        catch {
            return '不明';
        }
    };
    // メッセージのロール表示
    const getRoleDisplay = (role) => {
        switch (role) {
            case 'user':
                return 'ユーザー';
            case 'assistant':
                return 'アシスタント';
            case 'system':
                return 'システム';
            default:
                return role;
        }
    };
    // メッセージのロール色
    const getRoleColor = (role) => {
        switch (role) {
            case 'user':
                return 'bg-blue-100 text-blue-800';
            case 'assistant':
                return 'bg-green-100 text-green-800';
            case 'system':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    // URLハッシュからメッセージにスクロール
    useEffect(() => {
        if (session?.messages && window.location.hash) {
            const messageId = window.location.hash.replace('#message-', '');
            const messageIndex = parseInt(messageId, 10);
            if (!isNaN(messageIndex) &&
                messageIndex >= 0 &&
                messageIndex < session.messages.length) {
                setTimeout(() => {
                    const element = document.getElementById(`message-${messageIndex}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.classList.add('bg-yellow-100');
                        setTimeout(() => element.classList.remove('bg-yellow-100'), 3000);
                    }
                }, 100);
            }
        }
    }, [session]);
    if (!id) {
        return (_jsxs("div", { className: "text-center py-8", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-4", children: "\u30A8\u30E9\u30FC" }), _jsx("p", { className: "text-gray-600", children: "\u30BB\u30C3\u30B7\u30E7\u30F3ID\u304C\u6307\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093" }), _jsx("button", { className: "btn-primary mt-4", onClick: handleBack, children: "\u30BB\u30C3\u30B7\u30E7\u30F3\u4E00\u89A7\u306B\u623B\u308B" })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 pb-4", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsxs("button", { className: "btn-secondary flex items-center space-x-2", onClick: handleBack, children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }), _jsx("span", { children: "\u623B\u308B" })] }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: isLoading
                                            ? 'セッション詳細'
                                            : session?.title || `セッション ${id.slice(0, 8)}` }), _jsxs("p", { className: "text-gray-600", children: ["ID: ", id] })] })] }), _jsxs("button", { className: "btn-primary flex items-center space-x-2", onClick: handleRefresh, disabled: isLoading || isRefreshing, children: [_jsx("svg", { className: `w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" }) }), _jsx("span", { children: isRefreshing ? '更新中...' : isLoading ? '読み込み中...' : '更新' })] })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex", children: [_jsx("svg", { className: "w-5 h-5 text-red-400", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "\u30BB\u30C3\u30B7\u30E7\u30F3\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC" }), _jsx("p", { className: "text-sm text-red-700 mt-1", children: error?.message || 'セッション詳細を取得できませんでした' })] })] }) })), isLoading ? (_jsx("div", { className: "card", children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-6 bg-gray-200 rounded w-1/3 mb-4" }), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-1/4" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-1/6" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-1/5" })] })] }) })) : session ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx("div", { className: "card", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u30E1\u30C3\u30BB\u30FC\u30B8\u6570" }), _jsx("p", { className: "text-xl font-bold text-gray-900", children: session.metadata.totalMessages })] }), _jsx("div", { className: "w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" }) }) })] }) }), _jsx("div", { className: "card", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u958B\u59CB\u6642\u523B" }), _jsx("p", { className: "text-sm font-bold text-gray-900", children: formatTime(session.startTime) })] }), _jsx("div", { className: "w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-green-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" }) }) })] }) }), _jsx("div", { className: "card", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u7D99\u7D9A\u6642\u9593" }), _jsx("p", { className: "text-sm font-bold text-gray-900", children: getSessionDuration(session.startTime, session.endTime) })] }), _jsx("div", { className: "w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-purple-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" }) }) })] }) }), _jsx("div", { className: "card", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u30BF\u30B0" }), _jsx("div", { className: "flex flex-wrap gap-1 mt-1", children: session.metadata.tags &&
                                                        session.metadata.tags.length > 0 ? (session.metadata.tags.slice(0, 2).map((tag, index) => (_jsx("span", { className: "px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full", children: tag }, index)))) : (_jsx("span", { className: "text-xs text-gray-500", children: "\u306A\u3057" })) })] }), _jsx("div", { className: "w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-orange-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" }) }) })] }) })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\u30E1\u30C3\u30BB\u30FC\u30B8\u5C65\u6B74" }), _jsxs("span", { className: "text-sm text-gray-500", children: [session.messages?.length || 0, " \u4EF6\u306E\u30E1\u30C3\u30BB\u30FC\u30B8"] })] }), session.messages && session.messages.length > 0 ? (_jsx("div", { className: "space-y-4", children: session.messages.map((message, index) => (_jsxs("div", { id: `message-${index}`, className: "border border-gray-200 rounded-lg p-4 transition-all duration-300", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(message.role)}`, children: getRoleDisplay(message.role) }), _jsxs("span", { className: "text-xs text-gray-500", children: ["#", index + 1] })] }), _jsx("span", { className: "text-xs text-gray-500", children: formatTime(message.timestamp) })] }), _jsx("div", { className: "prose prose-sm max-w-none", children: _jsx("div", { className: "text-gray-700 leading-relaxed whitespace-pre-wrap", children: message.content }) })] }, message.id || index))) })) : (_jsxs("div", { className: "text-center py-8", children: [_jsx("svg", { className: "w-12 h-12 text-gray-400 mx-auto mb-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" }) }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u3042\u308A\u307E\u305B\u3093" }), _jsx("p", { className: "text-gray-500", children: "\u3053\u306E\u30BB\u30C3\u30B7\u30E7\u30F3\u306B\u306F\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u8A18\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002" })] }))] })] })) : null] }));
};
export default SessionDetail;
