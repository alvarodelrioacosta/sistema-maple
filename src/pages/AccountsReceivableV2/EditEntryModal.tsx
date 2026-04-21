import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, Select } from '../../components/UI';
import { clientLedgerService } from '../../services';
import type { ClientLedgerEntry, LedgerEntryType } from '../../types';

const CURRENCIES = [
    { value: 'USD', label: 'USD' },
    { value: 'Pesos Arg', label: 'Pesos Arg' },
    { value: 'Soles', label: 'Soles' },
    { value: 'Mesos (b)', label: 'Mesos (b)' },
];

interface EditEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: ClientLedgerEntry | null;
    onSuccess: (updated: ClientLedgerEntry) => void;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
    isOpen,
    onClose,
    entry,
    onSuccess,
}) => {
    const [entryType, setEntryType] = useState<LedgerEntryType>('charge');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [currency, setCurrency] = useState('USD');
    const [entryDate, setEntryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && entry) {
            setEntryType(entry.entry_type);
            setDescription(entry.description);
            setAmount(String(entry.amount));
            setCurrency(entry.currency);
            setEntryDate(entry.entry_date);
            setNotes(entry.notes || '');
        }
    }, [isOpen, entry]);

    const handleSubmit = async () => {
        if (!entry) return;
        const parsedAmount = parseFloat(amount);
        if (!description.trim() || !amount || isNaN(parsedAmount) || parsedAmount <= 0) return;
        setLoading(true);
        try {
            const updated = await clientLedgerService.updateEntry(entry.id, {
                entry_type: entryType,
                description: description.trim(),
                amount: parsedAmount,
                currency,
                entry_date: entryDate,
                notes: notes.trim() || null,
            });
            onSuccess(updated);
        } catch (err) {
            console.error('Update failed:', err);
            alert('Failed to update entry. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isValid = !!description.trim() && !!amount && parseFloat(amount) > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Ledger Entry" size="sm">
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

            <Input
                label="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
            />

            <div className="arv2-form-row">
                <Input
                    label="Amount"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
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
            />

            <div className="arv2-modal-actions">
                <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                <Button onClick={handleSubmit} disabled={!isValid || loading} loading={loading}>
                    Save Changes
                </Button>
            </div>
        </Modal>
    );
};
