import React, { useState, useEffect } from 'react';
import { Button, Modal, Input, Select } from '../../components/UI';
import { CURRENCIES } from '../../constants/currencies';
import { accountsReceivableService, clientsService } from '../../services';
import type { Client } from '../../types';

interface NewARModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const NewARModal: React.FC<NewARModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [amount, setAmount] = useState<number>(0);
    const [currency, setCurrency] = useState<string>('USD');
    const [clientId, setClientId] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    // Interest fields
    const [interestPercent, setInterestPercent] = useState<number>(0);
    const [interestFixed, setInterestFixed] = useState<number>(0);

    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            resetForm();
        }
    }, [isOpen]);

    const fetchData = async () => {
        try {
            const clientsData = await clientsService.getAll();
            setClients(clientsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const resetForm = () => {
        setAmount(0);
        setCurrency('USD');
        setClientId('');
        setDescription('');
        setInterestPercent(0);
        setInterestFixed(0);
    };

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
        if (interestPercent > 0) {
            setInterestFixed(Number(((newAmount * interestPercent) / 100).toFixed(2)));
        }
    };

    const handleSubmit = async () => {
        if (!clientId || amount <= 0) {
            alert('Please fill all required fields.');
            return;
        }

        setLoading(true);
        try {
            const client = clients.find(c => c.id === clientId);
            const clientName = client?.name || 'Unknown';
            const desc = description.trim() || `Loan - ${clientName}`;

            await accountsReceivableService.create({
                client_id: clientId,
                description: desc,
                amount: amount,
                currency: currency,
                category: 'Maple',
                subcategory: 'Items / Cubes'
            });

            if (interestFixed > 0) {
                await accountsReceivableService.create({
                    client_id: clientId,
                    description: `Loan Interest - ${clientName}`,
                    amount: interestFixed,
                    currency: currency,
                    category: 'Maple',
                    subcategory: 'Items / Cubes'
                });
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating AR:', error);
            alert('Failed to create AR.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Account Receivable" size="sm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

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

                <Input
                    label="Description (Optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={`Loan - ${clients.find(c => c.id === clientId)?.name || 'Client'}`}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <Input
                        label="Amount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={amount === 0 ? '' : amount}
                        onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        required
                    />
                    <Select
                        label="Currency"
                        value={currency}
                        onChange={(val) => setCurrency(val)}
                        options={CURRENCIES.filter(c => c.value !== 'Mesos (b)')}
                    />
                </div>

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

                <div className="modal-actions" style={{ marginTop: '10px' }}>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !clientId || amount <= 0}>
                        {loading ? 'Creating...' : 'Create AR'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
