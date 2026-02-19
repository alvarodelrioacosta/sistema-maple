import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Table, Card, Select } from '../../components/UI';
import { PaymentModal } from '../Finance/PaymentModal'; // Using existing Modal
import { NewARModal } from './NewARModal';
import { EditARModal } from './EditARModal';
import { accountsReceivableService, itemsService } from '../../services';
import type { AccountReceivable } from '../../types';
import type { Column } from '../../components/UI/Table';
import '../Finance/Finance.css'; // Use Finance CSS for consistency? Or create AccountsReceivable.css

const formatCurrency = (value: number): string => {
    return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
};

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
        // Use a small epsilon for float comparison
        return activeTab === 'active'
            ? balance > 0.01
            : balance <= 0.01;
    });

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
