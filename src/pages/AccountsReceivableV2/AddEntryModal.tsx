import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, Select } from '../../components/UI';
import { clientLedgerService } from '../../services';
import type { Client, ClientLedgerEntry, ClientLedgerEntryInsert, LedgerEntryType } from '../../types';

const CURRENCIES = [
    { value: 'USD', label: 'USD' },
    { value: 'Mesos (b)', label: 'Mesos (b)' },
];

interface AddEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (entry: ClientLedgerEntry) => void;
    defaultClientId: string | null;
    defaultType: LedgerEntryType;
    clients: Client[];
}

function todayISO(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export const AddEntryModal: React.FC<AddEntryModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    defaultClientId,
    defaultType,
    clients,
}) => {
    const [entryType, setEntryType] = useState<LedgerEntryType>(defaultType);
    const [clientId, setClientId] = useState<string>(defaultClientId || '');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [currency, setCurrency] = useState('Mesos (b)');
    const [entryDate, setEntryDate] = useState(todayISO());
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEntryType(defaultType);
            setClientId(defaultClientId || '');
            setDescription('');
            setAmount('');
            setCurrency('Mesos (b)');
            setEntryDate(todayISO());
            setNotes('');
        }
    }, [isOpen, defaultType, defaultClientId]);

    const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));

    const handleSubmit = async () => {
        const parsedAmount = parseFloat(amount);
        if (!clientId || !description.trim() || !amount || isNaN(parsedAmount) || parsedAmount <= 0) return;
        setLoading(true);
        try {
            const payload: ClientLedgerEntryInsert = {
                client_id: clientId,
                entry_type: entryType,
                description: description.trim(),
                amount: parsedAmount,
                currency,
                entry_date: entryDate,
                notes: notes.trim() || null,
            };
            const entry = await clientLedgerService.addEntry(payload);
            onSuccess(entry);
        } catch (err) {
            console.error('Failed to add entry:', err);
            alert('Failed to save entry. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isValid = !!clientId && !!description.trim() && !!amount && parseFloat(amount) > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Ledger Entry" size="sm">
            <div className="arv2-type-toggle">
                <button
                    className={`arv2-toggle-btn${entryType === 'charge' ? ' arv2-toggle-btn--active-charge' : ''}`}
                    onClick={() => setEntryType('charge')}
                    type="button"
                >
                    Charge (owed to me)
                </button>
                <button
                    className={`arv2-toggle-btn${entryType === 'payment' ? ' arv2-toggle-btn--active-payment' : ''}`}
                    onClick={() => setEntryType('payment')}
                    type="button"
                >
                    Payment (received)
                </button>
            </div>

            <Select
                label="Client"
                value={clientId}
                options={clientOptions}
                onChange={setClientId}
            />

            <Input
                label="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={entryType === 'charge' ? 'e.g. Bright cubes, Gloves' : 'e.g. PayPal payment, Mesos transfer'}
            />

            <div className="arv2-form-row">
                <Input
                    label="Amount"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                />
                <Select
                    label="Currency"
                    value={currency}
                    options={CURRENCIES}
                    onChange={setCurrency}
                />
            </div>

            <Input
                label="Date"
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
            />

            <Input
                label="Notes (optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any extra details..."
            />

            <div className="arv2-modal-actions">
                <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                <Button onClick={handleSubmit} disabled={!isValid || loading} loading={loading}>
                    {entryType === 'charge' ? 'Add Charge' : 'Record Payment'}
                </Button>
            </div>
        </Modal>
    );
};
