// =============================================
// KPI CARD COMPONENT - Cards de métricas
// =============================================

import React from 'react';
import { Card } from '../Card';
import './KPICard.css';

interface KPICardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    className?: string;
    style?: React.CSSProperties;
}

export const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    icon,
    trend,
    color = 'primary',
    className = '',
    style
}) => {
    return (
        <Card className={`kpi-card kpi-card--${color} ${className}`} hover style={style}>
            <div className="kpi-card__header">
                {icon && <div className="kpi-card__icon">{icon}</div>}
                <span className="kpi-card__title">{title}</span>
            </div>
            <div className="kpi-card__value">{value}</div>
            {trend && (
                <div className={`kpi-card__trend ${trend.isPositive ? 'kpi-card__trend--positive' : 'kpi-card__trend--negative'}`}>
                    <span>{trend.isPositive ? '↑' : '↓'}</span>
                    <span>{Math.abs(trend.value)}%</span>
                </div>
            )}
        </Card>
    );
};

export default KPICard;
