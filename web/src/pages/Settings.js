import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '../api/client';
const Settings = () => {
    const queryClient = useQueryClient();
    const [isDataClearing, setIsDataClearing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    // システム情報取得（statsを使用してサーバー状態確認）
    const { data: healthData, isLoading: healthLoading } = useQuery({
        queryKey: ['health'],
        queryFn: async () => {
            const stats = await apiClient.getStats();
            return {
                status: 'OK',
                timestamp: stats.lastUpdated,
                uptime: Math.floor((new Date().getTime() - new Date('2025-05-29T00:00:00Z').getTime()) /
                    1000),
            };
        },
        refetchInterval: 30000,
    });
    // 統計情報取得
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: queryKeys.stats(),
        queryFn: () => apiClient.getStats(),
    });
    // キャッシュクリア
    const handleClearCache = () => {
        queryClient.clear();
        alert('キャッシュをクリアしました');
    };
    // データリフレッシュ
    const handleRefreshAll = () => {
        queryClient.invalidateQueries();
        queryClient.refetchQueries();
        alert('全データの更新を開始しました');
    };
    // データエクスポート（仮実装）
    const handleExport = async () => {
        try {
            const sessions = await apiClient.getSessions({ limit: 1000 });
            const dataStr = JSON.stringify(sessions, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `chat-history-export-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            alert('データをエクスポートしました');
        }
        catch (error) {
            alert('エクスポートに失敗しました: ' + error.message);
        }
    };
    // データ削除（仮実装）
    const handleDeleteAllData = async () => {
        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            return;
        }
        setIsDataClearing(true);
        try {
            // 実際のAPIエンドポイントがあれば実装
            alert('この機能は現在利用できません');
        }
        catch (error) {
            alert('削除に失敗しました: ' + error.message);
        }
        finally {
            setIsDataClearing(false);
            setShowDeleteConfirm(false);
        }
    };
    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days > 0)
            return `${days}日 ${hours}時間`;
        if (hours > 0)
            return `${hours}時間 ${minutes}分`;
        return `${minutes}分`;
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "border-b border-gray-200 pb-4", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\u8A2D\u5B9A" }), _jsx("p", { className: "text-gray-600", children: "\u30B7\u30B9\u30C6\u30E0\u8A2D\u5B9A\u3068\u30C7\u30FC\u30BF\u7BA1\u7406" })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u30B7\u30B9\u30C6\u30E0\u60C5\u5831" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "font-medium text-gray-900 mb-2", children: "\u30B5\u30FC\u30D0\u30FC\u72B6\u614B" }), healthLoading ? (_jsx("div", { className: "animate-pulse", children: _jsx("div", { className: "h-4 bg-gray-200 rounded w-1/2" }) })) : healthData ? (_jsxs("div", { className: "space-y-1", children: [_jsxs("p", { className: "text-sm text-gray-600", children: ["\u72B6\u614B:", ' ', _jsx("span", { className: "text-green-600 font-medium", children: healthData.status })] }), _jsxs("p", { className: "text-sm text-gray-600", children: ["\u7A3C\u50CD\u6642\u9593: ", formatUptime(healthData.uptime)] }), _jsxs("p", { className: "text-sm text-gray-600", children: ["\u6700\u7D42\u78BA\u8A8D:", ' ', new Date(healthData.timestamp).toLocaleString('ja-JP')] })] })) : (_jsx("p", { className: "text-sm text-red-600", children: "\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093" }))] }), _jsxs("div", { className: "p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "font-medium text-gray-900 mb-2", children: "\u30C7\u30FC\u30BF\u7D71\u8A08" }), statsLoading ? (_jsx("div", { className: "animate-pulse", children: _jsx("div", { className: "h-4 bg-gray-200 rounded w-1/2" }) })) : stats ? (_jsxs("div", { className: "space-y-1", children: [_jsxs("p", { className: "text-sm text-gray-600", children: ["\u7DCF\u30BB\u30C3\u30B7\u30E7\u30F3\u6570: ", stats.totalSessions] }), _jsxs("p", { className: "text-sm text-gray-600", children: ["\u7DCF\u30E1\u30C3\u30BB\u30FC\u30B8\u6570: ", stats.totalMessages] }), _jsxs("p", { className: "text-sm text-gray-600", children: ["\u4ECA\u6708\u306E\u30E1\u30C3\u30BB\u30FC\u30B8: ", stats.thisMonthMessages] })] })) : (_jsx("p", { className: "text-sm text-red-600", children: "\u30C7\u30FC\u30BF\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093" }))] })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u30C7\u30FC\u30BF\u7BA1\u7406" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("button", { className: "btn-primary flex items-center justify-center space-x-2", onClick: handleRefreshAll, children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" }) }), _jsx("span", { children: "\u5168\u30C7\u30FC\u30BF\u66F4\u65B0" })] }), _jsxs("button", { className: "btn-secondary flex items-center justify-center space-x-2", onClick: handleClearCache, children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }), _jsx("span", { children: "\u30AD\u30E3\u30C3\u30B7\u30E5\u30AF\u30EA\u30A2" })] })] }), _jsxs("div", { className: "border-t border-gray-200 pt-4", children: [_jsx("h3", { className: "font-medium text-gray-900 mb-3", children: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30FB\u30A4\u30F3\u30DD\u30FC\u30C8" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("button", { className: "btn-secondary flex items-center justify-center space-x-2", onClick: handleExport, children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" }) }), _jsx("span", { children: "\u30C7\u30FC\u30BF\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8" })] }), _jsxs("button", { className: "btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50", disabled: true, children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" }) }), _jsx("span", { children: "\u30C7\u30FC\u30BF\u30A4\u30F3\u30DD\u30FC\u30C8 (\u6E96\u5099\u4E2D)" })] })] })] })] })] }), _jsxs("div", { className: "card border-red-200 bg-red-50", children: [_jsx("h2", { className: "text-lg font-semibold text-red-900 mb-4", children: "\u5371\u967A\u306A\u64CD\u4F5C" }), _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-red-700", children: "\u4EE5\u4E0B\u306E\u64CD\u4F5C\u306F\u614E\u91CD\u306B\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002\u30C7\u30FC\u30BF\u306E\u5FA9\u65E7\u306F\u3067\u304D\u307E\u305B\u3093\u3002" }), !showDeleteConfirm ? (_jsxs("button", { className: "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors", onClick: handleDeleteAllData, children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }), _jsx("span", { children: "\u5168\u30C7\u30FC\u30BF\u524A\u9664" })] })) : (_jsxs("div", { className: "p-4 bg-red-100 border border-red-300 rounded-lg", children: [_jsx("p", { className: "text-sm text-red-800 mb-4", children: "\u672C\u5F53\u306B\u5168\u30C7\u30FC\u30BF\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F\u3053\u306E\u64CD\u4F5C\u306F\u53D6\u308A\u6D88\u305B\u307E\u305B\u3093\u3002" }), _jsxs("div", { className: "flex space-x-3", children: [_jsx("button", { className: "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50", onClick: handleDeleteAllData, disabled: isDataClearing, children: isDataClearing ? '削除中...' : '削除実行' }), _jsx("button", { className: "bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-sm", onClick: () => setShowDeleteConfirm(false), disabled: isDataClearing, children: "\u30AD\u30E3\u30F3\u30BB\u30EB" })] })] }))] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u4F7F\u7528\u65B9\u6CD5" }), _jsxs("div", { className: "space-y-3 text-sm text-gray-600", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900", children: "\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9" }), _jsx("p", { children: "\u30B7\u30B9\u30C6\u30E0\u5168\u4F53\u306E\u7D71\u8A08\u60C5\u5831\u3068\u6700\u8FD1\u306E\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002" })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900", children: "\u30BB\u30C3\u30B7\u30E7\u30F3\u4E00\u89A7" }), _jsx("p", { children: "\u5168\u3066\u306E\u30C1\u30E3\u30C3\u30C8\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u95B2\u89A7\u3001\u691C\u7D22\u3001\u30BD\u30FC\u30C8\u3067\u304D\u307E\u3059\u3002" })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900", children: "\u691C\u7D22\u6A5F\u80FD" }), _jsx("p", { children: "\u30AD\u30FC\u30EF\u30FC\u30C9\u3067\u30E1\u30C3\u30BB\u30FC\u30B8\u5185\u5BB9\u3092\u6A2A\u65AD\u691C\u7D22\u3067\u304D\u307E\u3059\u3002" })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900", children: "\u81EA\u52D5\u66F4\u65B0" }), _jsx("p", { children: "\u30C7\u30FC\u30BF\u306F\u5B9A\u671F\u7684\u306B\u81EA\u52D5\u66F4\u65B0\u3055\u308C\u307E\u3059\u3002\u624B\u52D5\u66F4\u65B0\u3082\u53EF\u80FD\u3067\u3059\u3002" })] })] })] })] }));
};
export default Settings;
