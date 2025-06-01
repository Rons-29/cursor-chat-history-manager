import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from 'react-router-dom';
const Sidebar = () => {
    const location = useLocation();
    const navigationItems = [
        {
            name: 'ダッシュボード',
            href: '/',
            icon: (_jsxs("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [_jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" }), _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 01-2 2v0H5a2 2 0 00-2 2v0" })] })),
        },
        {
            name: 'セッション一覧',
            href: '/sessions',
            icon: (_jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" }) })),
        },
        {
            name: '検索',
            href: '/search',
            icon: (_jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) })),
        },
        {
            name: '設定',
            href: '/settings',
            icon: (_jsxs("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [_jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }), _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })] })),
        },
    ];
    const isActive = (path) => {
        if (path === '/' && location.pathname === '/')
            return true;
        if (path !== '/' && location.pathname.startsWith(path))
            return true;
        return false;
    };
    return (_jsxs("aside", { className: "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0", children: [_jsx("div", { className: "flex items-center justify-center h-16 px-4 bg-gray-50 border-b border-gray-200", children: _jsx("h2", { className: "text-lg font-medium text-gray-900", children: "\u30CA\u30D3\u30B2\u30FC\u30B7\u30E7\u30F3" }) }), _jsx("nav", { className: "mt-8 px-4", children: _jsx("ul", { className: "space-y-2", children: navigationItems.map(item => (_jsx("li", { children: _jsxs(Link, { to: item.href, className: `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${isActive(item.href)
                                ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`, children: [_jsx("span", { className: isActive(item.href) ? 'text-primary-600' : 'text-gray-400', children: item.icon }), _jsx("span", { className: "font-medium", children: item.name })] }) }, item.name))) }) }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-white text-sm font-medium", children: "CH" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 truncate", children: "Chat History" }), _jsx("p", { className: "text-xs text-gray-500", children: "v1.0.0" })] })] }) })] }));
};
export default Sidebar;
