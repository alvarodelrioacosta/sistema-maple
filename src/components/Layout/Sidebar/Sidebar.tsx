// =============================================
// SIDEBAR COMPONENT - Navegación lateral
// =============================================

import React from 'react';
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
            <div className="sidebar__logo">
                <span className="sidebar__logo-icon">📦</span>
                <span className="sidebar__logo-text">Inventory</span>
                {profile && <span className="sidebar__role-tag">{profile.role}</span>}
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
                    to="/daily-checkup"
                    className={`sidebar__link sidebar__link--daily ${location.pathname === '/daily-checkup' ? 'sidebar__link--active' : ''}`}
                >
                    <span className="sidebar__icon">📅</span>
                    <span className="sidebar__label">Daily Check Up</span>
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
