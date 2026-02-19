// =============================================
// CARD COMPONENT - Componente de tarjeta glassmorphism
// =============================================

import React from 'react';
import './Card.css';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    padding = 'md',
    hover = false,
    onClick,
    style
}) => {
    const paddingClass = padding !== 'none' ? `card--padding-${padding}` : '';
    const hoverClass = hover ? 'card--hover' : '';
    const clickableClass = onClick ? 'card--clickable' : '';

    return (
        <div
            className={`card ${paddingClass} ${hoverClass} ${clickableClass} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={style}
        >
            {children}
        </div>
    );
};

export default Card;
