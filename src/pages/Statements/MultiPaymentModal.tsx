import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select } from '../../components/UI';
import { financialAccountsService, accountsReceivableService, transactionsService } from '../../services';
import { Client, FinancialAccount } from '../../types';
import { formatCurrencyValue } from '../../utils/format';

interface MultiPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    onSuccess: () => void;
}

interface ARPayment {
    id: string;
    description: string;
    pending: number;
    payment: number;
    currency: string;
}

export const MultiPaymentModal: React.FC<MultiPaymentModalProps> = ({ isOpen, onClose, client, onSuccess }) => {
    const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [totalAmountReceived, setTotalAmountReceived] = useState<number>(0);
    const [arPayments, setArPayments] = useState<ARPayment[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && client) {
            loadData();
        }
    }, [isOpen, client]);

    const loadData = async () => {
        if (!client) return;
        setLoading(true);
        try {
            const [accounts, receivables] = await Promise.all([
                financialAccountsService.getAll(),
                accountsReceivableService.getByClient(client.id)
            ]);

            setFinancialAccounts(accounts.filter(acc => acc.currency === 'USD' || acc.currency === '$'));

            // Only pending or partial receivables
            const pendingARs = receivables
                .filter(ar => ar.status !== 'paid')
                .map(ar => ({
                    id: ar.id,
                    description: ar.description,
                    pending: ar.amount - (ar.paid || 0),
                    payment: 0,
                    currency: ar.currency
                }));

            setArPayments(pendingARs.map((ar: ARPayment) => ({
                ...ar,
                payment: 0
            })));
            setTotalAmountReceived(0);
            setSelectedAccountId('');
        } catch (error) {
            console.error('Error loading data for multi-payment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoDistribute = () => {
        let remaining = totalAmountReceived;
        const updatedPayments = arPayments.map((ar: ARPayment) => {
            const payment = Math.min(remaining, ar.pending);
            remaining -= payment;
            return { ...ar, payment: Number(payment.toFixed(2)) };
        });
        setArPayments(updatedPayments);
    };

    const handleManualPaymentChange = (id: string, value: number) => {
        setArPayments((prev: ARPayment[]) => prev.map((ar: ARPayment) =>
            ar.id === id ? { ...ar, payment: value } : ar
        ));
    };

    const totalDistributed = arPayments.reduce((sum: number, ar: ARPayment) => sum + ar.payment, 0);
    const isValid = selectedAccountId && totalAmountReceived > 0 && Math.abs(totalDistributed - totalAmountReceived) < 0.01;

    const handleSave = async () => {
        if (!client || !selectedAccountId) return;
        setSaving(true);
        try {
            const account = financialAccounts.find(a => a.id === selectedAccountId);

            // 1. Create a single transaction for the total amount
            const paidARDescriptions = arPayments
                .filter(ar => ar.payment > 0)
                .map(ar => `${ar.description} ($${ar.payment})`)
                .join(', ');

            await transactionsService.create({
                financial_account_id: selectedAccountId,
                type: 'income',
                amount: totalAmountReceived,
                currency: account?.currency || 'USD',
                description: `Bulk Payment from ${client.name}: ${paidARDescriptions}`,
                client_id: client.id,
                is_paid: true,
                category: 'Client Payment',
                subcategory: 'Multi-AR Settlement'
            });

            // 2. Update each affected AR
            const updatePromises = arPayments
                .filter((ar: ARPayment) => ar.payment > 0)
                .map((ar: ARPayment) => accountsReceivableService.updatePayment(ar.id, ar.payment));

            await Promise.all(updatePromises);

            // 3. Update financial account balance
            if (account) {
                await financialAccountsService.update(account.id, {
                    balance: (account.balance || 0) + totalAmountReceived
                });
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error processing bulk payment:', error);
            alert('Failed to process payment');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Register Bulk Payment: ${client?.name}`} size="md">
            <div style={{ padding: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <Select
                        label="Destination Account"
                        value={selectedAccountId}
                        onChange={setSelectedAccountId}
                        options={[
                            { value: '', label: 'Select Account...' },
                            ...financialAccounts.map((a: FinancialAccount) => ({ value: a.id, label: `${a.name} (${a.currency})` }))
                        ]}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                label="Total Amount Received (USD)"
                                type="number"
                                value={totalAmountReceived || ''}
                                onChange={(e) => setTotalAmountReceived(Number(e.target.value))}
                                placeholder="0.00"
                            />
                        </div>
                        <Button variant="secondary" onClick={handleAutoDistribute} disabled={totalAmountReceived <= 0}>
                            Auto-Distribute
                        </Button>
                    </div>
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #334155', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #334155' }}>Receivable Description</th>
                                <th style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid #334155' }}>Pending</th>
                                <th style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid #334155', width: '150px' }}>This Payment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>Loading receivables...</td></tr>
                            ) : arPayments.length === 0 ? (
                                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>No pending receivables.</td></tr>
                            ) : (
                                arPayments.map((ar: ARPayment) => (
                                    <tr key={ar.id}>
                                        <td style={{ padding: '12px', borderBottom: '1px solid #334155' }}>{ar.description}</td>
                                        <td style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                                            ${formatCurrencyValue(ar.pending)}
                                        </td>
                                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #334155' }}>
                                            <Input
                                                type="number"
                                                value={ar.payment === 0 ? '' : ar.payment}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleManualPaymentChange(ar.id, Number(e.target.value))}
                                                placeholder="0.00"
                                                style={{ textAlign: 'right' }}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px' }}>
                    <div>
                        <span style={{ color: '#94a3b8', marginRight: '8px' }}>Total Distributed:</span>
                        <strong style={{ color: Math.abs(totalDistributed - totalAmountReceived) < 0.01 ? '#4ade80' : '#ef4444' }}>
                            ${formatCurrencyValue(totalDistributed)}
                        </strong>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!isValid || saving}>
                            {saving ? 'Processing...' : 'Confirm Total Payment'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
