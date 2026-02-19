import React, { useState, useEffect } from 'react';
import { Button, Modal, Input, Select } from '../../components/UI';
import { CURRENCIES } from '../../constants/currencies';
import { accountsReceivableService, transactionsService, clientsService, financialAccountsService } from '../../services';
import type { Client, FinancialAccount, Transaction } from '../../types';
import { FINANCE_CATEGORIES, FINANCE_SUBCATEGORIES } from '../../utils/categorization';

interface NewARModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AR_TYPES = [
    { value: 'loan', label: 'Loan' }
];

export const NewARModal: React.FC<NewARModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [arType, setArType] = useState<string>('loan');
    const [amount, setAmount] = useState<number>(0);
    const [currency, setCurrency] = useState<string>('USD');
    const [clientId, setClientId] = useState<string>('');
    const [sourceAccountId, setSourceAccountId] = useState<string>('');
    const [category, setCategory] = useState<string>('');
    const [subcategory, setSubcategory] = useState<string>('');

    // Interest fields
    const [interestPercent, setInterestPercent] = useState<number>(0);
    const [interestFixed, setInterestFixed] = useState<number>(0);

    // Data
    const [clients, setClients] = useState<Client[]>([]);
    const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            resetForm();
        }
    }, [isOpen]);

    const fetchData = async () => {
        try {
            const [clientsData, accountsData, transactionsData] = await Promise.all([
                clientsService.getAll(),
                financialAccountsService.getAll(),
                transactionsService.getAll()
            ]);
            setClients(clientsData);
            setFinancialAccounts(accountsData);
            setTransactions(transactionsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const resetForm = () => {
        setArType('loan');
        setAmount(0);
        setCurrency('USD');
        setClientId('');
        setSourceAccountId('');
        setInterestPercent(0);
        setInterestFixed(0);
        setCategory('');
        setSubcategory('');
    };

    // Auto-calculate interest
    const handlePercentChange = (percent: number) => {
        setInterestPercent(percent);
        if (amount > 0) {
            setInterestFixed(Number(((amount * percent) / 100).toFixed(2)));
        }
    };

    const handleFixedChange = (fixed: number) => {
        setInterestFixed(fixed);
        if (amount > 0) {
            setInterestPercent(Number(((fixed / amount) * 100).toFixed(2)));
        }
    };

    const handleAmountChange = (newAmount: number) => {
        setAmount(newAmount);
        // Recalculate fixed interest based on current percent
        if (interestPercent > 0) {
            setInterestFixed(Number(((newAmount * interestPercent) / 100).toFixed(2)));
        }
    };

    const handleSourceAccountChange = (accountId: string) => {
        setSourceAccountId(accountId);
        // Auto-set currency from selected account
        const account = financialAccounts.find(a => a.id === accountId);
        if (account) {
            setCurrency(account.currency);
        }
    };

    const handleSubmit = async () => {
        if (!clientId || !sourceAccountId || amount <= 0) {
            alert('Please fill all required fields.');
            return;
        }

        // Validate balance
        const availableBalance = getAccountBalance(sourceAccountId);
        if (amount > availableBalance) {
            alert(`Insufficient funds. Available: ${availableBalance.toFixed(2)} ${currency}`);
            return;
        }

        setLoading(true);
        try {
            const client = clients.find(c => c.id === clientId);
            const clientName = client?.name || 'Unknown';

            // 1. Create AR for principal
            await accountsReceivableService.create({
                client_id: clientId,
                description: `Loan - ${clientName}`,
                amount: amount,
                currency: currency,
                category: category || null,
                subcategory: subcategory || null
            });

            // 2. If interest > 0, create second AR for interest
            if (interestFixed > 0) {
                await accountsReceivableService.create({
                    client_id: clientId,
                    description: `Loan Interest - ${clientName}`,
                    amount: interestFixed,
                    currency: currency,
                    category: category || null, // Inherit or it will auto-categorize to Financial/Interest
                    subcategory: subcategory || null
                });
            }

            // 3. Create expense transaction for principal (money leaving)
            await transactionsService.create({
                type: 'expense',
                amount: amount,
                currency: currency,
                description: `Loan to ${clientName}`,
                client_id: clientId,
                is_credit_sale: false,
                is_paid: true,
                financial_account_id: sourceAccountId
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating AR:', error);
            alert('Failed to create AR.');
        } finally {
            setLoading(false);
        }
    };

    // Calculate account balance from transactions
    const getAccountBalance = (accountId: string): number => {
        return transactions
            .filter(t => t.financial_account_id === accountId)
            .reduce((sum, t) => {
                if (t.type === 'income') return sum + t.amount;
                if (t.type === 'expense') return sum - t.amount;
                return sum;
            }, 0);
    };

    // Filter accounts to exclude Mesos
    const cashAccounts = financialAccounts.filter(a => a.currency !== 'Mesos (b)');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="New Account Receivable"
            size="sm"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* AR Type */}
                <Select
                    label="AR Type"
                    value={arType}
                    onChange={(val) => setArType(val)}
                    options={AR_TYPES}
                />

                {/* Client */}
                <Select
                    label="Client"
                    value={clientId}
                    onChange={(val) => setClientId(val)}
                    required
                    options={[
                        { value: '', label: 'Select Client' },
                        ...clients.map(c => ({ value: c.id, label: c.name }))
                    ]}
                />

                {/* Source Account */}
                <Select
                    label="Source Account"
                    value={sourceAccountId}
                    onChange={handleSourceAccountChange}
                    required
                    options={[
                        { value: '', label: 'Select Account' },
                        ...cashAccounts.map(a => ({
                            value: a.id,
                            label: `${a.name} - ${getAccountBalance(a.id).toFixed(2)} ${a.currency}`
                        }))
                    ]}
                />

                {/* Amount & Currency */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <Input
                        label="Amount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={amount}
                        onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                        required
                    />
                    <Select
                        label="Currency"
                        value={currency}
                        onChange={(val) => setCurrency(val)}
                        options={CURRENCIES.filter(c => c.value !== 'Mesos (b)')}
                        disabled={!!sourceAccountId} // Lock when account selected
                    />
                </div>

                {/* Interest */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 120px', gap: '15px' }}>
                    <Input
                        label="Interest %"
                        type="number"
                        min={0}
                        step="0.1"
                        value={interestPercent}
                        onChange={(e) => handlePercentChange(parseFloat(e.target.value) || 0)}
                    />
                    <Input
                        label="Fixed"
                        type="number"
                        min={0}
                        step="0.01"
                        value={interestFixed}
                        onChange={(e) => handleFixedChange(parseFloat(e.target.value) || 0)}
                    />
                </div>

                {/* Category Selection */}
                <div className="form-grid-2">
                    <Select
                        label="Category (Optional)"
                        value={category}
                        onChange={(val) => {
                            setCategory(val);
                            setSubcategory('');
                        }}
                        options={[
                            { value: '', label: 'Auto-categorize' },
                            ...Object.values(FINANCE_CATEGORIES).map(c => ({ value: c, label: c }))
                        ]}
                    />
                    <Select
                        label="Subcategory"
                        value={subcategory}
                        onChange={(val) => setSubcategory(val)}
                        options={[
                            { value: '', label: 'Select Subcategory' },
                            ...Object.entries(FINANCE_SUBCATEGORIES)
                                .filter(([key]) => {
                                    if (!category) return false;
                                    const catKey = Object.entries(FINANCE_CATEGORIES).find(([_, v]) => v === category)?.[0];
                                    if (!catKey) return false;
                                    if (catKey === 'VIVIENDA') return ['ALQUILER', 'SERVICIOS', 'MANTENIMIENTO'].includes(key);
                                    if (catKey === 'VIDA_DIARIA') return ['ALIMENTACION', 'SALUD', 'CUIDADO_PERSONAL', 'ROPA', 'VARIOS'].includes(key);
                                    if (catKey === 'TRANSPORTE') return ['TRANSPORTE_PUBLICO', 'VEHICULO'].includes(key);
                                    if (catKey === 'ENTRETENIMIENTO') return ['SALIDAS', 'OCIO_DIGITAL', 'VIAJES', 'EDUCACION'].includes(key);
                                    if (catKey === 'FINANCIERO') return ['INVERSIONES', 'COMISIONES', 'PRESTAMOS'].includes(key);
                                    if (catKey === 'MAPLE') return ['ITEMS_CUBOS', 'MESOS', 'GASTOS_OPERATIVOS', 'POWERLEVELING'].includes(key);
                                    if (catKey === 'TRABAJO') return ['SUELDO', 'OTROS_INGRESOS'].includes(key);
                                    return false;
                                })
                                .map(([_, v]) => ({ value: v, label: v }))
                        ]}
                        disabled={!category}
                    />
                </div>

                {/* Summary */}
                {amount > 0 && (
                    <div style={{
                        background: '#1e1b4b',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #312e81',
                        fontSize: '0.9em'
                    }}>
                        <div style={{ marginBottom: '5px' }}>
                            <span style={{ color: '#a5b4fc' }}>Principal: </span>
                            <strong>{amount.toFixed(2)} {currency}</strong>
                        </div>
                        {interestFixed > 0 && (
                            <div style={{ marginBottom: '5px' }}>
                                <span style={{ color: '#a5b4fc' }}>Interest: </span>
                                <strong>{interestFixed.toFixed(2)} {currency}</strong>
                            </div>
                        )}
                        <div style={{ borderTop: '1px solid #312e81', paddingTop: '5px', marginTop: '5px' }}>
                            <span style={{ color: '#a5b4fc' }}>Total to Collect: </span>
                            <strong style={{ color: '#4ade80' }}>{(amount + interestFixed).toFixed(2)} {currency}</strong>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="modal-actions" style={{ marginTop: '10px' }}>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !clientId || !sourceAccountId || amount <= 0}
                    >
                        {loading ? 'Creating...' : 'Create Loan'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
