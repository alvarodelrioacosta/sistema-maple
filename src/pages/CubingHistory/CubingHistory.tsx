import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Card, Table, ResourceHistoryPanel, Modal, Input } from '../../components/UI';
import { cubeSessionsService, clientsService, itemsService, accountsService, appSettingsService, accountsReceivableService } from '../../services';
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
    accountReceivableId: string | null;
    clientId: string;
    itemId: string;
    brightPrice: number;
    bonusPrice: number;
    solidPrice: number;
    psokPrice: number;
}

export const CubingHistory: React.FC = () => {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(true);
    const [filter, setFilter] = useState<'clients' | 'alvaro'>('clients');

    // AR Creation Modal State
    const [arModalOpen, setArModalOpen] = useState(false);
    const [arSession, setArSession] = useState<SessionRow | null>(null);
    const [arFormData, setArFormData] = useState({
        amount: 0,
        description: ''
    });
    const [isCreatingAR, setIsCreatingAR] = useState(false);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const [sessionsData, clientsData, itemsData, accountsData, fallbackRate] = await Promise.all([
                cubeSessionsService.getAll(),
                clientsService.getAll(),
                itemsService.getAll(),
                accountsService.getAll(),
                appSettingsService.getMesoUsdRate()
            ]);

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
                    createdAt: session.created_at,
                    accountReceivableId: session.account_receivable_id || null,
                    clientId: session.client_id || '',
                    itemId: session.item_id || '',
                    brightPrice: session.bright_cubes_price || 0,
                    bonusPrice: session.bonus_bright_cubes_price || 0,
                    solidPrice: session.solid_cubes_price || 0,
                    psokPrice: session.psok_price || 0
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
            render: (row) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {getStatusBadge(row.status)}
                    {row.status === 'Finished' && (
                        <span
                            className="status-badge"
                            style={{
                                background: row.accountReceivableId ? 'rgba(34, 197, 94, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                                color: row.accountReceivableId ? '#4ade80' : '#facc15',
                                fontSize: '0.75rem'
                            }}
                        >
                            {row.accountReceivableId ? 'Invoiced' : 'Pending AR'}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                    {row.status === 'Finished' && !row.accountReceivableId && row.clientName !== 'Alvaro' && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenARModal(row)}
                        >
                            Create AR
                        </Button>
                    )}
                </div>
            )
        }
    ];

    const handleOpenARModal = (session: SessionRow) => {
        setArSession(session);
        setArFormData({
            amount: session.total,
            description: `Cubing Session: ${session.itemName}`
        });
        setArModalOpen(true);
    };

    const handleCreateAR = async () => {
        if (!arSession || isCreatingAR) return;

        try {
            setIsCreatingAR(true);
            
            // 1. Create AR
            const ar = await accountsReceivableService.create({
                client_id: arSession.clientId,
                item_id: arSession.itemId,
                amount: arFormData.amount,
                currency: arSession.currency,
                description: arFormData.description
            });

            // 2. Link Session to AR
            await cubeSessionsService.update(arSession.id, {
                account_receivable_id: ar.id
            });

            setArModalOpen(false);
            await loadSessions();
        } catch (error) {
            console.error('Error creating AR:', error);
            alert('Failed to create Account Receivable');
        } finally {
            setIsCreatingAR(false);
        }
    };

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

            {/* AR Creation Modal */}
            <Modal
                isOpen={arModalOpen}
                onClose={() => setArModalOpen(false)}
                title="Create Account Receivable"
                size="md"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#a78bfa' }}>Session Summary</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <span>Bright Cubes: {arSession?.brightCubesUsed}</span>
                            <span>Bonus Bright: {arSession?.bonusCubesUsed}</span>
                            <span>Solid Cubes: {arSession?.solidCubesUsed}</span>
                            <span>PSOKs: {arSession?.psokUsed}</span>
                        </div>
                    </div>

                    <Input
                        label={`Total Amount (${arSession?.currency})`}
                        type="number"
                        value={arFormData.amount}
                        onChange={(e) => setArFormData({ ...arFormData, amount: parseFloat(e.target.value) || 0 })}
                    />

                    <Input
                        label="Description"
                        value={arFormData.description}
                        onChange={(e) => setArFormData({ ...arFormData, description: e.target.value })}
                    />

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setArModalOpen(false)}>Cancel</Button>
                        <Button 
                            variant="primary" 
                            onClick={handleCreateAR} 
                            loading={isCreatingAR}
                            disabled={isCreatingAR || arFormData.amount <= 0}
                        >
                            Confirm & Create Invoice
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CubingHistory;
