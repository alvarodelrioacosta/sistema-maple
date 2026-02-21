import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../../components/UI';
import { transactionsService, financialAccountsService } from '../../services';
import type { Transaction, TransactionType, FinancialAccount } from '../../types';

import { FINANCE_CATEGORIES, CATEGORY_MAP } from '../../utils/categorization';

interface EditTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction;
    onSuccess: () => void;
}

const TYPE_OPTIONS = [
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
    { value: 'transfer', label: 'Transfer' }
];

const CURRENCIES = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'ARS', label: 'ARS ($)' },
    { value: 'Soles', label: 'Soles (S/)' },
    { value: 'USDT', label: 'USDT (₮)' }
];

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
    isOpen,
    onClose,
    transaction,
    onSuccess
}) => {
    const [formData, setFormData] = useState<any>({ ...transaction });
    const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({ ...transaction });
            loadOptions();
        }
    }, [isOpen, transaction]);

    const loadOptions = async () => {
        try {
            const accs = await financialAccountsService.getAll();
            setFinancialAccounts(accs);
        } catch (error) {
            console.error('Error loading options:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);

            // 1. Revert previous impact on balance
            if (transaction.financial_account_id) {
                const revertAmount = transaction.type === 'income' ? -transaction.amount : transaction.amount;
                await financialAccountsService.incrementBalance(transaction.financial_account_id, revertAmount);
            }

            // 2. Update Transaction
            await transactionsService.update(transaction.id, {
                type: formData.type,
                amount: formData.amount,
                currency: formData.currency,
                description: formData.description,
                financial_account_id: formData.financial_account_id,
                client_id: formData.client_id,
                item_id: formData.item_id,
                category: formData.category,
                subcategory: formData.subcategory
            });

            // 3. Apply new impact on balance
            if (formData.financial_account_id) {
                const newAmount = formData.type === 'income' ? formData.amount : -formData.amount;
                await financialAccountsService.incrementBalance(formData.financial_account_id, newAmount);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating transaction:', error);
            alert('Error updating transaction. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this transaction? This will also revert its impact on the account balance.')) return;

        try {
            setIsSubmitting(true);

            // 1. Revert impact on balance
            if (transaction.financial_account_id) {
                const revertAmount = transaction.type === 'income' ? -transaction.amount : transaction.amount;
                await financialAccountsService.incrementBalance(transaction.financial_account_id, revertAmount);
            }

            // 2. Delete transaction
            await transactionsService.delete(transaction.id);

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error deleting transaction:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction">
            <form onSubmit={handleSubmit} className="modal-form">
                <Select
                    label="Type"
                    value={formData.type}
                    onChange={(val) => setFormData({ ...formData, type: val as TransactionType })}
                    options={TYPE_OPTIONS}
                    disabled={transaction.type === 'transfer'} // Transfers are complex to edit here
                />

                <Select
                    label="Financial Account"
                    value={formData.financial_account_id || ''}
                    onChange={(val) => setFormData({ ...formData, financial_account_id: val || null })}
                    options={[
                        { value: '', label: 'None / Cash' },
                        ...financialAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))
                    ]}
                />

                <div className="form-grid-2">
                    <Input
                        label="Amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount || ''}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        required
                    />
                    <Select
                        label="Currency"
                        value={formData.currency}
                        onChange={(val) => setFormData({ ...formData, currency: val })}
                        options={CURRENCIES}
                        disabled={!!formData.financial_account_id}
                    />
                </div>

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
