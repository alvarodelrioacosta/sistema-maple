// =============================================
// SIDEBAR COMPONENT - Navegación lateral
// =============================================

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './Sidebar.css';

interface NavItem {
    path: string;
    label: string;
    icon: string;
}

const managementItems: NavItem[] = [
    { path: '/accounts', label: 'Accounts', icon: '👤' },
    { path: '/characters', label: 'Characters', icon: '⚔️' },
    { path: '/mystic-frontier', label: 'Mystic Frontier', icon: '◈' },
    { path: '/items', label: 'Items', icon: '🎒' },
    { path: '/items-db', label: 'Items DB', icon: '📚' },
    { path: '/clients', label: 'Clients', icon: '🤝' },
    { path: '/accounts-receivable', label: 'Accounts Receivable', icon: '📋' },
    { path: '/events', label: 'Events', icon: '📅' },
    { path: '/tasks', label: 'Tasks', icon: '✔️' },
    { path: '/bosses', label: 'Bosses', icon: '💀' },
];

const resourceItems: NavItem[] = [
    { path: '/resources', label: 'Resources', icon: '💎' },
];

const workspaceItems: NavItem[] = [
    { path: '/cubing-sessions', label: 'Cubing Sessions', icon: '🎲' },
    { path: '/cubing-history', label: 'Cubing History', icon: '📜' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export const Sidebar: React.FC = () => {
    const location = useLocation();
    const { profile, signOut } = useAuth();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    const fmt = (date: Date, utc = false) =>
        date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: utc ? 'UTC' : undefined });
    const fmtDate = (date: Date, utc = false) =>
        date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: utc ? 'UTC' : undefined }).replace('.', '');
    const isAdmin = profile?.role === 'admin';

    const renderNavItem = (item: NavItem) => (
        <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
        >
            <span className="sidebar__icon">{item.icon}</span>
            <span className="sidebar__label">{item.label}</span>
        </NavLink>
    );

    return (
        <aside className="sidebar">
            <div className="sidebar__clocks">
                <div className="sidebar__clock">
                    <span className="sidebar__clock-icon">🏠</span>
                    <div className="sidebar__clock-info">
                        <span className="sidebar__clock-date">{fmtDate(now)}</span>
                        <span className="sidebar__clock-time">{fmt(now)}</span>
                    </div>
                </div>
                <div className="sidebar__clock sidebar__clock--game">
                    <span className="sidebar__clock-tag">UTC</span>
                    <div className="sidebar__clock-info">
                        <span className="sidebar__clock-date">{fmtDate(now, true)}</span>
                        <span className="sidebar__clock-time">{fmt(now, true)}</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar__nav">
                {isAdmin && (
                    <NavLink
                        to="/"
                        className={`sidebar__link sidebar__link--dashboard ${location.pathname === '/' ? 'sidebar__link--active' : ''}`}
                    >
                        <span className="sidebar__icon">📊</span>
                        <span className="sidebar__label">Dashboard</span>
                    </NavLink>
                )}

                <NavLink
                    to="/overview"
                    className={`sidebar__link sidebar__link--daily ${location.pathname === '/overview' ? 'sidebar__link--active' : ''}`}
                >
                    <span className="sidebar__icon">📊</span>
                    <span className="sidebar__label">Overview</span>
                </NavLink>

                {isAdmin && (
                    <>
                        <div className="sidebar__section">
                            <span className="sidebar__section-title">Management</span>
                            {managementItems.map(renderNavItem)}
                        </div>

                        <div className="sidebar__section">
                            <span className="sidebar__section-title">Resources</span>
                            {resourceItems.map(renderNavItem)}
                        </div>

                        <div className="sidebar__section">
                            <span className="sidebar__section-title">Workspace</span>
                            {workspaceItems.map(renderNavItem)}
                        </div>
                    </>
                )}
            </nav>

            <div className="sidebar__footer">
                <button className="sidebar__logout" onClick={() => signOut()}>
                    <span className="sidebar__icon">🚪</span>
                    <span className="sidebar__label">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
