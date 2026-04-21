import React, { useEffect, useState } from 'react';
import { clientLedgerService } from '../../services';
import { Header } from '../../components/Layout';
import { Button, Card, Table, ResourceHistoryPanel, Modal, Input, Select } from '../../components/UI';
import { cubeSessionsService, clientsService, itemsService, accountsService, accountsReceivableService, resourcesService } from '../../services';
import type { Column } from '../../components/UI/Table';
import type { Client } from '../../types';
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
    perfectInnocUsed: number;
    gScrollUsed: number;
    status: string;
    createdAt: string;
    accountReceivableId: string | null;
    clientId: string;
    itemId: string;
}

interface ARPricing {
    clientId: string;
    currency: string;
    brightPrice: number;
    bonusPrice: number;
    solidPrice: number;
    psokPrice: number;
    pInnocPrice: number;
    gScrollPrice: number;
    description: string;
}

const DEFAULT_AR_PRICING: ARPricing = {
    clientId: '',
    currency: 'USD',
    brightPrice: 0,
    bonusPrice: 0,
    solidPrice: 0,
    psokPrice: 0,
    pInnocPrice: 0,
    gScrollPrice: 0,
    description: '',
};

export const CubingHistory: React.FC = () => {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(true);
    const [filter, setFilter] = useState<'clients' | 'alvaro'>('clients');

    // AR Creation Modal State
    const [arModalOpen, setArModalOpen] = useState(false);
    const [arSession, setArSession] = useState<SessionRow | null>(null);
    const [arFormData, setArFormData] = useState<ARPricing>(DEFAULT_AR_PRICING);
    const [isCreatingAR, setIsCreatingAR] = useState(false);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const [sessionsData, clientsData, itemsData, accountsData] = await Promise.all([
                cubeSessionsService.getAll(),
                clientsService.getAll(),
                itemsService.getAll(),
                accountsService.getAll(),
            ]);

            setClients(clientsData);

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
                    perfectInnocUsed: session.perfect_innoc_used || 0,
                    gScrollUsed: session.gaurdian_scroll_used || 0,
                    status: session.cubing_session_status || 'unknown',
                    createdAt: session.created_at,
                    accountReceivableId: session.account_receivable_id || null,
                    clientId: session.client_id || '',
                    itemId: session.item_id || '',
                };
            });

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

    const handleOpenARModal = async (session: SessionRow) => {
        let resourceMeta: Record<string, { mesoCost: number }> = {};
        try {
            resourceMeta = await resourcesService.getResourceMetadata();
        } catch {
            // non-critical, leave defaults
        }

        setArSession(session);
        setArFormData({
            clientId: session.clientId,
            currency: 'USD',
            brightPrice: 0,
            bonusPrice: 0,
            solidPrice: 0,
            psokPrice: resourceMeta['psok']?.mesoCost || 0,
            pInnocPrice: resourceMeta['perfect_innoc']?.mesoCost || 0,
            gScrollPrice: resourceMeta['guardian_scroll']?.mesoCost || 0,
            description: `Cubing Session: ${session.itemName}`,
        });
        setArModalOpen(true);
    };

    const calcARTotal = () => {
        if (!arSession) return 0;
        return (
            arSession.brightCubesUsed * arFormData.brightPrice +
            arSession.bonusCubesUsed * arFormData.bonusPrice +
            arSession.solidCubesUsed * arFormData.solidPrice +
            arSession.psokUsed * arFormData.psokPrice +
            arSession.perfectInnocUsed * arFormData.pInnocPrice +
            arSession.gScrollUsed * arFormData.gScrollPrice
        );
    };

    const handleClientChange = (clientId: string) => {
        setArFormData(prev => ({ ...prev, clientId }));
    };

    const handleCreateAR = async () => {
        if (!arSession || isCreatingAR) return;
        const total = calcARTotal();
        if (total <= 0) { alert('El total debe ser mayor a 0'); return; }

        try {
            setIsCreatingAR(true);

            const ar = await accountsReceivableService.create({
                client_id: arFormData.clientId,
                item_id: arSession.itemId,
                amount: total,
                currency: arFormData.currency,
                description: arFormData.description,
            });

            await cubeSessionsService.update(arSession.id, {
                account_receivable_id: ar.id,
            });

            await clientLedgerService.addEntry({
                client_id: arFormData.clientId,
                entry_type: 'charge',
                description: arFormData.description,
                amount: total,
                currency: arFormData.currency,
                entry_date: new Date().toISOString().split('T')[0],
                cube_session_id: arSession.id,
                source_metadata: {
                    item_name: arSession.itemName,
                    account_number: arSession.accountNumber,
                    bright_cubes_used: arSession.brightCubesUsed,
                    bonus_bright_cubes_used: arSession.bonusCubesUsed,
                    solid_cubes_used: arSession.solidCubesUsed,
                    psok_used: arSession.psokUsed,
                    perfect_innoc_used: arSession.perfectInnocUsed,
                    guardian_scroll_used: arSession.gScrollUsed,
                    bright_price: arFormData.brightPrice,
                    bonus_price: arFormData.bonusPrice,
                    solid_price: arFormData.solidPrice,
                    psok_price: arFormData.psokPrice,
                    p_innoc_price: arFormData.pInnocPrice,
                    g_scroll_price: arFormData.gScrollPrice,
                },
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

    const arTotal = calcARTotal();

    const resourceRows = arSession ? [
        { label: 'Bright Cubes', qty: arSession.brightCubesUsed, field: 'brightPrice' as const },
        { label: 'Bonus Bright', qty: arSession.bonusCubesUsed, field: 'bonusPrice' as const },
        { label: 'Solid Cubes', qty: arSession.solidCubesUsed, field: 'solidPrice' as const },
        { label: 'PSOK', qty: arSession.psokUsed, field: 'psokPrice' as const },
        { label: 'Perfect Innoc.', qty: arSession.perfectInnocUsed, field: 'pInnocPrice' as const },
        { label: 'Guardian Scroll', qty: arSession.gScrollUsed, field: 'gScrollPrice' as const },
    ].filter(r => r.qty > 0) : [];

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem' }}>

                    {/* Billing Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <Select
                            label="Client"
                            value={arFormData.clientId}
                            onChange={handleClientChange}
                            options={clients.map(c => ({ value: c.id, label: c.name }))}
                        />
                        <Select
                            label="Currency"
                            value={arFormData.currency}
                            onChange={(v) => setArFormData(prev => ({ ...prev, currency: v }))}
                            options={[
                                { value: 'USD', label: 'USD' },
                                { value: 'Mesos (b)', label: 'Mesos (b)' },
                            ]}
                        />
                    </div>

                    {/* Per-resource pricing table */}
                    {resourceRows.length > 0 ? (
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', overflow: 'hidden' }}>
                            {/* Header */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 120px 100px', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.06)', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
                                <span>Resource</span>
                                <span style={{ textAlign: 'center' }}>Used</span>
                                <span style={{ textAlign: 'center' }}>Price / unit</span>
                                <span style={{ textAlign: 'right' }}>Subtotal</span>
                            </div>
                            {resourceRows.map(r => {
                                const subtotal = r.qty * arFormData[r.field];
                                return (
                                    <div key={r.field} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 120px 100px', gap: '0.5rem', padding: '0.4rem 0.75rem', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ fontSize: '0.9rem' }}>{r.label}</span>
                                        <span style={{ textAlign: 'center', fontWeight: 600 }}>{r.qty}</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step="any"
                                            value={arFormData[r.field]}
                                            onChange={e => setArFormData(prev => ({ ...prev, [r.field]: parseFloat(e.target.value) || 0 }))}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '0.25rem 0.4rem', color: 'inherit', fontSize: '0.9rem', textAlign: 'center' }}
                                        />
                                        <span style={{ textAlign: 'right', color: subtotal > 0 ? '#4ade80' : 'var(--color-text-tertiary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                            {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                );
                            })}
                            {/* Total row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 120px 100px', gap: '0.5rem', padding: '0.5rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}>
                                <span style={{ fontWeight: 700, gridColumn: '1 / 4' }}>Total</span>
                                <span style={{ textAlign: 'right', fontWeight: 700, color: '#4ade80', fontSize: '1rem' }}>
                                    {arTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {arFormData.currency}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', fontSize: '0.9rem' }}>
                            No resources recorded for this session.
                        </p>
                    )}

                    <Input
                        label="Description"
                        value={arFormData.description}
                        onChange={(e) => setArFormData(prev => ({ ...prev, description: e.target.value }))}
                    />

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button variant="secondary" onClick={() => setArModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={handleCreateAR}
                            loading={isCreatingAR}
                            disabled={isCreatingAR || arTotal <= 0 || !arFormData.clientId}
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
