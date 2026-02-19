import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Card, Table, ResourceHistoryPanel } from '../../components/UI';
import { cubeSessionsService, clientsService, itemsService, accountsService, exchangeRatesService } from '../../services';
import type { Column } from '../../components/UI/Table';
import './CubingHistory.css';

interface SessionRow {
    id: string;
    itemName: string;
    clientName: string;
    accountNumber: number;
    brightCubesUsed: number;
    bonusCubesUsed: number;
    psokUsed: number;
    solidCubesUsed: number;
    total: number;
    currency: string;
    mesoRate: number;
    status: string;
    createdAt: string;
}

export const CubingHistory: React.FC = () => {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(true);
    const [filter, setFilter] = useState<'clients' | 'alvaro'>('clients');

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const [sessionsData, clientsData, itemsData, accountsData, ratesData] = await Promise.all([
                cubeSessionsService.getAll(),
                clientsService.getAll(),
                itemsService.getAll(),
                accountsService.getAll(),
                exchangeRatesService.getAll()
            ]);

            // Get Fallback Rate (USD to Mesos) for sessions without stored rate
            const fallbackRate = ratesData.find(r => r.base_currency === 'Mesos' && r.target_currency === 'USD')?.rate || 0;

            const rows: SessionRow[] = sessionsData.map(session => {
                const client = clientsData.find(c => c.id === session.client_id);
                const item = itemsData.find(i => i.id === session.item_id);
                const account = accountsData.find(a => a.id === session.account_id);

                return {
                    id: session.id,
                    itemName: item?.name || 'Unknown Item',
                    clientName: client?.name || 'No Client',
                    accountNumber: account?.number || 0,
                    brightCubesUsed: session.bright_cubes_used || 0,
                    bonusCubesUsed: session.bonus_bright_cubes_used || 0,
                    psokUsed: session.psok_used || 0,
                    solidCubesUsed: session.solid_cubes_used || 0,
                    total: session.cubing_session_total || 0,
                    currency: session.currency || 'USD',
                    mesoRate: session.meso_rate || fallbackRate,
                    status: session.cubing_session_status || 'unknown',
                    createdAt: session.created_at
                };
            });

            // Sort by date descending
            rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setSessions(rows);
        } catch (error) {
            console.error('Error loading sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            active: '#4ade80',
            finalized: '#60a5fa',
            cancelled: '#f87171'
        };
        return (
            <span
                className="status-badge"
                style={{
                    background: `${colors[status] || '#888'}20`,
                    color: colors[status] || '#888'
                }}
            >
                {status}
            </span>
        );
    };

    const calculateMesos = (row: SessionRow) => {
        if (row.currency === 'Mesos (b)' || row.currency === 'mesos') {
            return row.total;
        }
        // USD -> Mesos (USD / Rate)
        if (row.mesoRate > 0) {
            return row.total / row.mesoRate;
        }
        return 0;
    };

    const calculateUSD = (row: SessionRow) => {
        if (row.currency !== 'Mesos (b)' && row.currency !== 'mesos') {
            return row.total;
        }
        // Mesos -> USD (Mesos * Rate)
        if (row.mesoRate > 0) {
            return row.total * row.mesoRate;
        }
        return 0;
    };

    const columns: Column<SessionRow>[] = [
        {
            key: 'createdAt',
            header: 'Date',
            render: (row) => <span className="date-cell">{formatDate(row.createdAt)}</span>
        },
        {
            key: 'itemName',
            header: 'Item',
            render: (row) => <strong>{row.itemName}</strong>
        },
        {
            key: 'clientName',
            header: 'Client'
        },
        {
            key: 'accountNumber',
            header: 'Account',
            render: (row) => `#${row.accountNumber}`
        },
        {
            key: 'cubes',
            header: 'Cubes (BC/BBC)',
            render: (row) => `${row.brightCubesUsed} / ${row.bonusCubesUsed}`
        },
        {
            key: 'solidCubesUsed',
            header: 'Cubes (Solid)',
            render: (row) => row.solidCubesUsed
        },
        {
            key: 'psokUsed',
            header: 'PSOK'
        },
        {
            key: 'totalUSD',
            header: 'Total USD',
            render: (row) => {
                const val = calculateUSD(row);
                return <span className="total-value" style={{ color: '#4ade80' }}>
                    ${val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
            }
        },
        {
            key: 'totalMesos',
            header: 'Total Mesos',
            render: (row) => {
                const val = calculateMesos(row);
                return <span className="total-value" style={{ color: '#fbbf24' }}>
                    {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} B
                </span>
            }
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => getStatusBadge(row.status)
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
                <Button
                    size="sm"
                    variant={selectedSessionId === row.id ? 'primary' : 'ghost'}
                    onClick={() => {
                        setSelectedSessionId(row.id === selectedSessionId ? null : row.id);
                        setHistoryOpen(true);
                    }}
                >
                    {selectedSessionId === row.id ? 'Hide Details' : 'View Details'}
                </Button>
            )
        }
    ];

    return (
        <div className="cubing-history-page">
            <Header
                title="Cubing History"
                subtitle="View past cubing sessions and resource usage"
            />

            <div className="page-content">
                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <Button
                        variant={filter === 'clients' ? 'primary' : 'secondary'}
                        onClick={() => setFilter('clients')}
                    >
                        Clients History
                    </Button>
                    <Button
                        variant={filter === 'alvaro' ? 'primary' : 'secondary'}
                        onClick={() => setFilter('alvaro')}
                    >
                        My History (Alvaro)
                    </Button>
                </div>

                {/* Sessions Table */}
                <Card padding="none" className="sessions-table-card">
                    <Table
                        data={sessions.filter(s => filter === 'alvaro' ? s.clientName === 'Alvaro' : s.clientName !== 'Alvaro')}
                        columns={columns}
                        keyExtractor={(row) => row.id}
                        loading={loading}
                        emptyMessage="No cubing sessions found"
                    />
                </Card>

                {/* Selected Session Details */}
                {selectedSessionId && (
                    <Card className="session-detail-card">
                        <h3>📜 Resource Usage Details</h3>
                        <p className="detail-subtitle">
                            Session: {sessions.find(s => s.id === selectedSessionId)?.itemName}
                        </p>
                        <ResourceHistoryPanel
                            sessionId={selectedSessionId}
                            isOpen={historyOpen}
                            onToggle={() => setHistoryOpen(!historyOpen)}
                        />
                    </Card>
                )}
            </div>
        </div>
    );
};

export default CubingHistory;
