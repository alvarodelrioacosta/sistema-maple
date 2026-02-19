// =============================================
// TABLE COMPONENT - Tabla genérica
// =============================================

import React from 'react';
import './Table.css';

export interface Column<T> {
    key: keyof T | string;
    header: React.ReactNode;
    render?: (item: T) => React.ReactNode;
    width?: string;
}

interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (item: T) => string;
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
    loading?: boolean;
}

export function Table<T>({
    data,
    columns,
    keyExtractor,
    onRowClick,
    emptyMessage = 'No hay datos disponibles',
    loading = false
}: TableProps<T>) {
    if (loading) {
        return (
            <div className="table-loading">
                <div className="table-loading__spinner" />
                <span>Cargando...</span>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="table-empty">
                <span>📭</span>
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={String(col.key)} style={{ width: col.width }}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr
                            key={keyExtractor(item)}
                            onClick={() => onRowClick?.(item)}
                            className={onRowClick ? 'table__row--clickable' : ''}
                        >
                            {columns.map((col) => (
                                <td key={String(col.key)}>
                                    {col.render
                                        ? col.render(item)
                                        : String((item as Record<string, unknown>)[col.key as string] ?? '-')
                                    }
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default Table;
