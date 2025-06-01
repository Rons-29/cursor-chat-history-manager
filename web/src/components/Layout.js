import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Header from './Header.js';
import Sidebar from './Sidebar.js';
const Layout = ({ children }) => {
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(Header, {}), _jsxs("div", { className: "flex", children: [_jsx(Sidebar, {}), _jsx("main", { className: "flex-1 p-6 lg:ml-64", children: _jsx("div", { className: "max-w-7xl mx-auto", children: children }) })] })] }));
};
export default Layout;
