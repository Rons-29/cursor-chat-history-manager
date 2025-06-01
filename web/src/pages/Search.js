import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '../api/client.js';
const Search = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchExecuted, setSearchExecuted] = useState(false);
    // 検索実行
    const { data: searchResults, isLoading: searchLoading, error: searchError, refetch: executeSearch, } = useQuery({
        queryKey: queryKeys.search(searchQuery),
        queryFn: async () => {
            if (!searchQuery.trim())
                return [];
            // 実際の検索APIがない場合のモック実装
            // 実装時にはapiClient.search(searchQuery)を呼び出す
            const sessions = await apiClient.getSessions({ limit: 100 });
            const results = [];
            sessions.sessions.forEach(session => {
                session.messages?.forEach((message, index) => {
                    if (message.content.toLowerCase().includes(searchQuery.toLowerCase())) {
                        results.push({
                            sessionId: session.id,
                            sessionTitle: session.title || `セッション ${session.id.slice(0, 8)}`,
                            messageIndex: index,
                            content: message.content,
                            timestamp: message.timestamp,
                            score: searchQuery
                                .toLowerCase()
                                .split(' ')
                                .reduce((score, word) => {
                                const matches = (message.content
                                    .toLowerCase()
                                    .match(new RegExp(word, 'g')) || []).length;
                                return score + matches;
                            }, 0),
                        });
                    }
                });
            });
            return results.sort((a, b) => b.score - a.score).slice(0, 50);
        },
        enabled: false, // 手動実行
        retry: 1,
    });
    const handleSearch = () => {
        if (searchQuery.trim()) {
            setSearchExecuted(true);
            executeSearch();
        }
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };
    const handleResultClick = (sessionId, messageIndex) => {
        navigate(`/sessions/${sessionId}#message-${messageIndex}`);
    };
    const highlightText = (text, query) => {
        if (!query)
            return text;
        const words = query
            .toLowerCase()
            .split(' ')
            .filter(word => word.length > 0);
        let highlightedText = text;
        words.forEach(word => {
            const regex = new RegExp(`(${word})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
        });
        return highlightedText;
    };
    const truncateText = (text, maxLength = 200) => {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength) + '...';
    };
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
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "border-b border-gray-200 pb-4", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\u691C\u7D22" }), _jsx("p", { className: "text-gray-600", children: "\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u304B\u3089\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u691C\u7D22" })] }), _jsx("div", { className: "card", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex space-x-4", children: [_jsx("input", { type: "text", placeholder: "\u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u691C\u7D22... (\u4F8B: React TypeScript \u30A8\u30E9\u30FC)", className: "input-field text-lg flex-1", value: searchQuery, onChange: e => setSearchQuery(e.target.value), onKeyPress: handleKeyPress }), _jsxs("button", { className: "btn-primary px-6", onClick: handleSearch, disabled: !searchQuery.trim() || searchLoading, children: [searchLoading ? (_jsx("svg", { className: "w-4 h-4 animate-spin", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" }) })) : (_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) })), _jsx("span", { className: "ml-2", children: "\u691C\u7D22" })] })] }), _jsxs("div", { className: "text-sm text-gray-500", children: [_jsx("p", { children: "\uD83D\uDCA1 \u691C\u7D22\u306E\u30B3\u30C4:" }), _jsxs("ul", { className: "list-disc list-inside mt-1 space-y-1", children: [_jsx("li", { children: "\u8907\u6570\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u30B9\u30DA\u30FC\u30B9\u3067\u533A\u5207\u3063\u3066\u5165\u529B" }), _jsx("li", { children: "\u82F1\u8A9E\u30FB\u65E5\u672C\u8A9E\u4E21\u65B9\u306B\u5BFE\u5FDC" }), _jsx("li", { children: "\u90E8\u5206\u4E00\u81F4\u3067\u691C\u7D22\u3055\u308C\u307E\u3059" })] })] })] }) }), searchError && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex", children: [_jsx("svg", { className: "w-5 h-5 text-red-400", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "\u691C\u7D22\u30A8\u30E9\u30FC" }), _jsx("p", { className: "text-sm text-red-700 mt-1", children: searchError?.message || '検索中にエラーが発生しました' })] })] }) })), searchExecuted && (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\u691C\u7D22\u7D50\u679C" }), searchResults && (_jsxs("span", { className: "text-sm text-gray-500", children: [searchResults.length, " \u4EF6\u898B\u3064\u304B\u308A\u307E\u3057\u305F"] }))] }), searchLoading ? (_jsx("div", { className: "space-y-4", children: Array.from({ length: 3 }).map((_, index) => (_jsx("div", { className: "border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-3/4 mb-2" }), _jsx("div", { className: "h-3 bg-gray-200 rounded w-1/2 mb-3" }), _jsx("div", { className: "h-3 bg-gray-200 rounded w-full" })] }) }, index))) })) : searchResults && searchResults.length > 0 ? (_jsx("div", { className: "space-y-4", children: searchResults.map((result, index) => (_jsxs("div", { className: "border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer", onClick: () => handleResultClick(result.sessionId, result.messageIndex), children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("h3", { className: "font-medium text-gray-900", children: result.sessionTitle }), _jsx("span", { className: "text-xs text-gray-500", children: formatTime(result.timestamp) })] }), _jsx("div", { className: "text-sm text-gray-700 leading-relaxed", dangerouslySetInnerHTML: {
                                        __html: highlightText(truncateText(result.content), searchQuery),
                                    } }), _jsxs("div", { className: "flex items-center justify-between mt-3 pt-2 border-t border-gray-100", children: [_jsxs("span", { className: "text-xs text-gray-500", children: ["\u30E1\u30C3\u30BB\u30FC\u30B8 #", result.messageIndex + 1] }), _jsxs("div", { className: "flex items-center space-x-1", children: [Array.from({ length: Math.min(5, result.score) }).map((_, i) => (_jsx("div", { className: "w-1 h-1 bg-yellow-400 rounded-full" }, i))), _jsxs("span", { className: "text-xs text-gray-400 ml-2", children: ["\u95A2\u9023\u5EA6 ", result.score] })] })] })] }, `${result.sessionId}-${result.messageIndex}`))) })) : searchExecuted ? (_jsxs("div", { className: "text-center py-8", children: [_jsx("svg", { className: "w-12 h-12 text-gray-400 mx-auto mb-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "\u691C\u7D22\u7D50\u679C\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F" }), _jsxs("p", { className: "text-gray-500", children: ["\u300C", searchQuery, "\u300D\u306B\u4E00\u81F4\u3059\u308B\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u3042\u308A\u307E\u305B\u3093\u3002", _jsx("br", {}), "\u5225\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u3067\u8A66\u3057\u3066\u307F\u3066\u304F\u3060\u3055\u3044\u3002"] })] })) : (_jsxs("div", { className: "text-center py-8", children: [_jsx("svg", { className: "w-12 h-12 text-gray-400 mx-auto mb-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "\u691C\u7D22\u3092\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044" }), _jsx("p", { className: "text-gray-500", children: "\u4E0A\u306E\u691C\u7D22\u30DC\u30C3\u30AF\u30B9\u306B\u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u3001\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u3092\u691C\u7D22\u3067\u304D\u307E\u3059\u3002" })] }))] }))] }));
};
export default Search;
