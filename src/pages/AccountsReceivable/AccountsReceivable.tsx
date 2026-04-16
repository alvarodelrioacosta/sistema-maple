import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '../../components/Layout';
import { Button, Table, Card, Select } from '../../components/UI';
import { PaymentModal } from './PaymentModal';
import { NewARModal } from './NewARModal';
import { EditARModal } from './EditARModal';
import { accountsReceivableService, itemsService } from '../../services';
import type { AccountReceivable } from '../../types';
import type { Column } from '../../components/UI/Table';

const formatCurrency = (value: number): string => {
    return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
};

const formatMesos = (value: number): string => {
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}B`;
};

interface ClientDebtSummary {
    clientId: string;
    clientName: string;
    pendingUSD: number;
    pendingMesos: number;
    recordCount: number;
}

export const AccountsReceivable: React.FC = () => {
    const [arList, setArList] = useState<AccountReceivable[]>([]);
    const [selectedAr, setSelectedAr] = useState<AccountReceivable | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isNewARModalOpen, setIsNewARModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const data = await accountsReceivableService.getAll();
            setArList(data);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handlePayClick = (ar: AccountReceivable) => {
        setSelectedAr(ar);
        setIsPaymentModalOpen(true);
    };

    const handleEditClick = (ar: AccountReceivable) => {
        setSelectedAr(ar);
        setIsEditModalOpen(true);
    };

    const filteredList = arList.filter(ar => {
        const balance = ar.amount - (ar.paid || 0);
        return activeTab === 'active'
            ? balance > 0.01
            : balance <= 0.01;
    });

    const clientDebtSummary = useMemo<ClientDebtSummary[]>(() => {
        const map = new Map<string, ClientDebtSummary>();

        for (const ar of arList) {
            const balance = ar.amount - (ar.paid || 0);
            if (balance <= 0.01) continue;

            const clientId = ar.client_id || 'unknown';
            const clientName = ar.client?.name || 'Unknown';
            const isMesos = ar.currency === 'Mesos (b)' || ar.currency === 'mesos' || ar.currency === 'Mesos';

            if (!map.has(clientId)) {
                map.set(clientId, { clientId, clientName, pendingUSD: 0, pendingMesos: 0, recordCount: 0 });
            }

            const entry = map.get(clientId)!;
            if (isMesos) entry.pendingMesos += balance;
            else entry.pendingUSD += balance;
            entry.recordCount += 1;
        }

        return [...map.values()].sort((a, b) => b.pendingUSD - a.pendingUSD || b.pendingMesos - a.pendingMesos);
    }, [arList]);

    const handleDeliveryChange = async (ar: AccountReceivable, value: string) => {
        const isDelivered = value === 'delivered';
        if (isDelivered === ar.is_delivered) return; // No change

        // 1. If trying to mark as Delivered, ask for confirmation
        if (isDelivered) {
            const confirmed = window.confirm('¿Estás seguro de marcar como entregado? Esta acción no se puede deshacer.');
            if (!confirmed) return;
        } else {
            // Already delivered cannot go back to pending?
            if (ar.is_delivered) {
                alert('Once delivered, items cannot be reverted to pending.');
                return;
            }
        }

        setIsProcessing(ar.id);

        try {
            const updates: Promise<any>[] = [
                accountsReceivableService.updateDeliveryStatus(ar.id, isDelivered)
            ];

            if (ar.item_id) {
                // Fetch current item to check status
                const item = await itemsService.getById(ar.item_id);
                if (item) {
                    updates.push(itemsService.updateDeliveryStatus(ar.item_id, isDelivered));

                    // Logic: If status is 'for_sale' -> update to 'sold'
                    // If status is 'Service' -> keep as 'Service'
                    if (isDelivered && item.status === 'for_sale') {
                        updates.push(itemsService.update(ar.item_id, { status: 'sold' }));
                    } else if (!isDelivered) {
                        // Revert logic (though UI might block it, good to have)
                        updates.push(itemsService.update(ar.item_id, { status: 'for_sale' }));
                    }
                }
            }

            // Run updates in parallel
            await Promise.all(updates);

            // Refresh data to ensure sync with server
            await loadData(false);
        } catch (error) {
            console.error('Error updating delivery status:', error);
            alert('Fallo al actualizar el estado de entrega.');
        } finally {
            setIsProcessing(null);
        }
    };

    const columns = React.useMemo<Column<AccountReceivable>[]>(() => [
        {
            key: 'created_at',
            header: 'Date',
            render: (ar) => {
                const date = new Date(ar.created_at);
                const day = date.getDate().toString().padStart(2, '0');
                const month = date.toLocaleString('default', { month: 'short' }).toLowerCase();
                const year = date.getFullYear();
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2', fontSize: '0.9em', opacity: 0.8 }}>
                        <span>{day} {month}</span>
                        <span>{year}</span>
                    </div>
                );
            }
        },
        { key: 'description', header: 'Item', render: (ar) => <strong>{ar.description}</strong> },
        {
            key: 'client',
            header: 'Client',
            render: (ar) => ar.client?.name || 'Unknown'
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (ar) => <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{formatCurrency(ar.amount)}</span>
        },
        {
            key: 'paid',
            header: 'Paid',
            render: (ar) => <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{formatCurrency(ar.paid)}</span>
        },
        {
            key: 'balance',
            header: 'Balance',
            render: (ar) => {
                const bal = ar.amount - ar.paid;
                return <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{formatCurrency(bal)}</span>
            }
        },
        { key: 'currency', header: 'Currency' },
        {
            key: 'is_delivered',
            header: 'Delivery Status',
            render: (ar) => {
                if (!ar.item_id) return <span style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '0.85rem' }}>No Item</span>;
                const processing = isProcessing === ar.id;

                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                        <Select
                            value={ar.is_delivered ? 'delivered' : 'pending'}
                            disabled={processing || ar.is_delivered}
                            onChange={(val) => handleDeliveryChange(ar, val)}
                            options={[
                                { value: 'pending', label: 'Pending', color: '#ef4444' },
                                { value: 'delivered', label: 'Delivered', color: '#4ade80' }
                            ]}
                            style={{
                                padding: '4px 30px 4px 8px', // Ajustado para un ancho más compacto de 110px
                                fontSize: '0.8rem',
                                border: `1px solid ${ar.is_delivered ? '#22c55e' : '#ef4444'}`,
                                background: ar.is_delivered ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '4px',
                                color: ar.is_delivered ? '#4ade80' : '#ef4444',
                                fontWeight: 'bold',
                                width: '110px' // Ancho exacto solicitado
                            }}
                        />
                    </div>
                );
            }
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (ar) => {
                const balance = ar.amount - (ar.paid || 0);
                if (balance <= 0.01) {
                    return <span className="badge badge-success">Paid</span>;
                }
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                            size="sm"
                            onClick={() => handleEditClick(ar)}
                            style={{
                                background: '#374151',
                                color: 'white',
                                fontWeight: 'bold',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none'
                            }}
                        >
                            Edit
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => handlePayClick(ar)}
                            disabled={balance <= 0.01}
                            style={{
                                background: 'white',
                                color: 'black',
                                fontWeight: 'bold',
                                padding: '6px 20px',
                                borderRadius: '6px',
                                border: 'none',
                                opacity: balance <= 0.01 ? 0.5 : 1
                            }}
                        >
                            Pay
                        </Button>
                    </div>
                );
            }
        }
    ], [isProcessing, handleDeliveryChange, handlePayClick, handleEditClick]);

    return (
        <div className="accounts-page">
            <Header
                title="Accounts Receivable"
                subtitle="Track pending payments from credit sales"
            />

            {/* Client Debt Summary */}
            {clientDebtSummary.length > 0 && (
                <div style={{ padding: '0 2rem 1.5rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                        Outstanding by Client
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {clientDebtSummary.map(s => (
                            <div key={s.clientId} style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px',
                                padding: '14px 18px',
                                minWidth: '180px',
                                flex: '1 1 180px',
                                maxWidth: '260px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>{s.clientName}</span>
                                    <span style={{
                                        fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px',
                                        borderRadius: '20px', background: 'rgba(239,68,68,0.15)', color: '#f87171'
                                    }}>
                                        {s.recordCount} pending
                                    </span>
                                </div>
                                {s.pendingUSD > 0 && (
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80' }}>
                                        {formatCurrency(s.pendingUSD)}
                                    </div>
                                )}
                                {s.pendingMesos > 0 && (
                                    <div style={{ fontSize: '1.0rem', fontWeight: 700, color: '#fbbf24' }}>
                                        {formatMesos(s.pendingMesos)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', padding: '0 2rem', borderBottom: '1px solid #374151', marginBottom: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setActiveTab('active')}
                        style={{
                            padding: '10px 20px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'active' ? '2px solid #6366f1' : '2px solid transparent',
                            color: activeTab === 'active' ? '#6366f1' : '#9ca3af',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        style={{
                            padding: '10px 20px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'completed' ? '2px solid #6366f1' : '2px solid transparent',
                            color: activeTab === 'completed' ? '#6366f1' : '#9ca3af',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    >
                        Completed
                    </button>
                </div>
                <Button onClick={() => setIsNewARModalOpen(true)}>+ New AR</Button>
            </div>

            <NewARModal
                isOpen={isNewARModalOpen}
                onClose={() => setIsNewARModalOpen(false)}
                onSuccess={() => {
                    loadData();
                    setIsNewARModalOpen(false);
                }}
            />

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                ar={selectedAr}
                onPaymentSuccess={() => {
                    loadData();
                    setIsPaymentModalOpen(false);
                }}
            />

            <EditARModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                ar={selectedAr}
                onSuccess={() => {
                    loadData();
                    setIsEditModalOpen(false);
                }}
            />

            <div className="page-content">
                <Card padding="none">
                    <Table
                        data={filteredList}
                        columns={columns}
                        keyExtractor={(t) => t.id}
                        loading={loading}
                        emptyMessage={activeTab === 'active' ? "No pending receivables." : "No completed payments."}
                    />
                </Card>
            </div>
        </div>
    );
};

export default AccountsReceivable;
