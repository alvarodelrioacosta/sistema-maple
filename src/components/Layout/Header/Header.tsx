// =============================================
// HEADER COMPONENT - Barra superior
// =============================================

import React from 'react';
import './Header.css';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => {
    return (
        <header className="header">
            <div className="header__left">
                <h1 className="header__title">{title}</h1>
                {subtitle && <p className="header__subtitle">{subtitle}</p>}
            </div>
            {actions && (
                <div className="header__right">
                    <div className="header__actions">{actions}</div>
                </div>
            )}
        </header>
    );
};

export default Header;

