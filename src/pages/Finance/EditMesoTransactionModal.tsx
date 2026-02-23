import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../../components/UI';
import { transactionsService, accountsService } from '../../services';
import type { TransactionMeso, Account } from '../../types';

import { FINANCE_CATEGORIES, CATEGORY_MAP } from '../../utils/categorization';

interface EditMesoTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: TransactionMeso;
    onSuccess: () => void;
}

const TYPE_OPTIONS = [
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
    { value: 'transfer', label: 'Transfer' }
];

export const EditMesoTransactionModal: React.FC<EditMesoTransactionModalProps> = ({
    isOpen,
    onClose,
    transaction,
    onSuccess
}) => {
    const [formData, setFormData] = useState<any>({ ...transaction });
    const [gameAccounts, setGameAccounts] = useState<Account[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({ ...transaction });
            loadOptions();
        }
    }, [isOpen, transaction]);

    const loadOptions = async () => {
        try {
            const accs = await accountsService.getAll();
            setGameAccounts(accs);
        } catch (error) {
            console.error('Error loading game accounts:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);

            // Revert previous impact and apply new one is automatically handled if using specific services, 
            // but for Mesos we use a more direct approach since it's a simple table for now.
            // Actually, we should check if we need to sync meso_b in the account table.

            await transactionsService.updateMeso(transaction.id, {
                type: formData.type,
                amount: formData.amount,
                description: formData.description,
                account_id: formData.account_id,
                category: formData.category,
                subcategory: formData.subcategory
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating meso transaction:', error);
            alert('Error updating meso transaction. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this meso transaction?')) return;

        try {
            setIsSubmitting(true);
            await transactionsService.deleteMeso(transaction.id);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error deleting meso transaction:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Meso (b) Transaction">
            <form onSubmit={handleSubmit} className="modal-form">
                <Select
                    label="Type"
                    value={formData.type}
                    onChange={(val) => setFormData({ ...formData, type: val as any })}
                    options={TYPE_OPTIONS}
                    disabled={transaction.type === 'transfer'}
                />

                <Select
                    label="Game Account"
                    value={formData.account_id || ''}
                    onChange={(val) => setFormData({ ...formData, account_id: val || null })}
                    options={[
                        { value: '', label: 'None / Shared Vault' },
                        ...gameAccounts.map(a => ({ value: a.id, label: `Acc ${a.number} - ${a.email || a.tag || ''}` }))
                    ]}
                />

                <Input
                    label="Amount (b)"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                />

                <Input
                    label="Description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                />

                <div className="form-grid-2">
                    <Select
                        label="Category"
                        value={formData.category || ''}
                        onChange={(val) => setFormData({ ...formData, category: val, subcategory: '' })}
                        options={[
                            { value: '', label: 'Select Category...' },
                            ...Object.values(FINANCE_CATEGORIES).map(c => ({ value: c, label: c }))
                        ]}
                    />
                    <Select
                        label="Subcategory"
                        value={formData.subcategory || ''}
                        onChange={(val) => setFormData({ ...formData, subcategory: val })}
                        options={[
                            { value: '', label: 'Select Subcategory...' },
                            ...(formData.category ? (CATEGORY_MAP[formData.category] || []).map(s => ({ value: s, label: s })) : [])
                        ]}
                        disabled={!formData.category}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <Button type="button" variant="secondary" onClick={handleDelete} disabled={isSubmitting} style={{ color: '#ef4444' }}>
                        Delete
                    </Button>
                    <div style={{ flex: 1 }} />
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
