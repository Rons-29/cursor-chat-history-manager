import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.js';
import Dashboard from './pages/Dashboard.js';
import Sessions from './pages/Sessions.js';
import SessionDetail from './pages/SessionDetail.js';
import Search from './pages/Search.js';
import Settings from './pages/Settings.js';
import NotFound from './pages/NotFound.js';
function App() {
    return (_jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/sessions", element: _jsx(Sessions, {}) }), _jsx(Route, { path: "/sessions/:id", element: _jsx(SessionDetail, {}) }), _jsx(Route, { path: "/search", element: _jsx(Search, {}) }), _jsx(Route, { path: "/settings", element: _jsx(Settings, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) }));
}
export default App;
