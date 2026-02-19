// =============================================
// HEADER COMPONENT - Barra superior
// =============================================

import React, { useState, useEffect } from 'react';
import './Header.css';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
    title,
    subtitle,
    actions
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date, isUTC: boolean = false) => {
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: isUTC ? 'UTC' : undefined
        };
        const formatted = date.toLocaleDateString('es-ES', options);
        // Asegurar que el formato sea "lun, 9 feb" (quitando puntos si los hay por el locale)
        return formatted.replace('.', '');
    };


    const formatTime = (date: Date, isUTC: boolean = false) => {
        const options: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: isUTC ? 'UTC' : undefined
        };
        return date.toLocaleTimeString('es-ES', options);
    };


    return (
        <header className="header">
            <div className="header__left">
                <h1 className="header__title">{title}</h1>
                {subtitle && <p className="header__subtitle">{subtitle}</p>}
            </div>
            <div className="header__right">
                <div className="header__time-group">
                    {/* Local Time */}
                    <div className="header__date">
                        <span className="header__date-icon">🏠</span>
                        <div className="header__datetime-container">
                            <span className="header__date-text">{formatDate(currentTime)}</span>
                            <span className="header__time-text">{formatTime(currentTime)}</span>
                        </div>
                    </div>

                    {/* Game Time (UTC) */}
                    <div className="header__date game-time">
                        <span className="header__tag">GAME TIME</span>
                        <div className="header__datetime-container">
                            <span className="header__date-text">{formatDate(currentTime, true)}</span>
                            <span className="header__time-text">{formatTime(currentTime, true)}</span>
                        </div>
                    </div>
                </div>
                {actions && <div className="header__actions">{actions}</div>}
            </div>
        </header>
    );
};

export default Header;

