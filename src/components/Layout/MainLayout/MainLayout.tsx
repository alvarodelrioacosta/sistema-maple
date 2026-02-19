// =============================================
// MAIN LAYOUT - Layout principal de la app
// =============================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
    return (
        <div className="layout">
            <Sidebar />
            <main className="layout__main">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
