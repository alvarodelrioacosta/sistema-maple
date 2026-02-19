import React, { useEffect, useState } from 'react';
import { Modal, Button } from '../../components/UI';
import { transactionsService } from '../../services';
import type { TransactionWithRelations, Client } from '../../types';
import { RegisterPaymentModal } from './RegisterPaymentModal';

interface ClientStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

export const ClientStatementModal: React.FC<ClientStatementModalProps> = ({ isOpen, onClose, client }) => {
    const [debts, setDebts] = useState<TransactionWithRelations[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithRelations | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen && client) {
            loadDebts();
        }
    }, [isOpen, client]);

    const loadDebts = async () => {
        if (!client) return;
        setLoading(true);
        try {
            // We fetch ALL ARs and filter client side for now, or add a method to service
            const allAR = await transactionsService.getAccountsReceivable();
            const clientDebts = allAR.filter(t => t.client_id === client.id);
            setDebts(clientDebts);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterPayment = (transaction: TransactionWithRelations) => {
        setSelectedTransaction(transaction);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSuccess = () => {
        loadDebts(); // Reload to update balances
    };

    // Calculate Totals - grouping by currency
    // Note: Mix of currencies makes simple sum tricky. 
    // Ideally we group by currency.
    const totalsByCurrency = debts.reduce((acc, t) => {
        acc[t.currency] = (acc[t.currency] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);

    return (
        <>
            <Modal
                title={client ? `Statement: ${client.name}` : 'Client Statement'}
                isOpen={isOpen}
                onClose={onClose}
                size="xl"
            >
                <div className="client-statement">
                    {/* Header Summary */}
                    <div className="statement-summary" style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 10px 0', opacity: 0.7 }}>Client Details</h4>
                            <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{client?.name}</div>
                            <div style={{ fontSize: '0.9em', opacity: 0.7 }}>{client?.contact_info || 'No contact info'}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 10px 0', opacity: 0.7 }}>Total Pending</h4>
                            {Object.entries(totalsByCurrency).map(([curr, amount]) => (
                                <div key={curr} style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#f87171' }}>
                                    {amount.toLocaleString()} {curr}
                                </div>
                            ))}
                            {Object.keys(totalsByCurrency).length === 0 && <div style={{ color: '#4ade80' }}>All Paid</div>}
                        </div>
                    </div>

                    {/* Debts Table */}
                    <div className="debts-table-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#eee', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #555', background: 'rgba(0,0,0,0.2)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Detalle</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Item</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Cubes</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Psok</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>}
                                {!loading && debts.length === 0 && <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>No outstanding debts.</td></tr>}

                                {debts.map((debt, index) => {
                                    const bg = index % 2 === 0 ? 'rgba(74, 222, 128, 0.05)' : 'rgba(251, 146, 60, 0.05)';
                                    const cubesCount = (debt.session?.bright_cubes_used || 0) + (debt.session?.bonus_bright_cubes_used || 0);

                                    return (
                                        <tr key={debt.id} style={{ background: bg, borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '12px' }}>{debt.description}</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                {!debt.session && debt.amount.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                {cubesCount > 0 ? cubesCount : ''}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                {debt.session?.psok_used ? debt.session.psok_used : ''}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                                                {debt.amount.toLocaleString()} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>{debt.currency}</span>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                <Button size="sm" onClick={() => handleRegisterPayment(debt)}>Pay</Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Payment History Summary */}
                    <div style={{ marginTop: '30px', padding: '15px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Payment History</h4>
                        <p style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '0.9em' }}>Select a transaction to see specific payment details.</p>
                    </div>
                </div>
            </Modal>

            {selectedTransaction && (
                <RegisterPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    transaction={selectedTransaction}
                    onPaymentRegistered={handlePaymentSuccess}
                />
            )}
        </>
    );
};
