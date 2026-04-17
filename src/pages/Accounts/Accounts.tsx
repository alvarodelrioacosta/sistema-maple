// =============================================
// ACCOUNTS PAGE - Gestión de cuentas
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Table, Modal, Input, Card } from '../../components/UI';
import { accountsService } from '../../services';
import type { Account, AccountInsert } from '../../types';
import type { Column } from '../../components/UI/Table';
import './Accounts.css';

export const Accounts: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [formData, setFormData] = useState<AccountInsert>({
        number: 0,
        email: '',
        tag: '',
        mesos_b: 0
    });

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const data = await accountsService.getAll();
            setAccounts(data);
        } catch (error) {
            console.error('Error loading accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (account?: Account) => {
        if (account) {
            setEditingAccount(account);
            setFormData({
                number: account.number,
                email: account.email || '',
                tag: account.tag || '',
                mesos_b: account.mesos_b || 0
            });
        } else {
            setEditingAccount(null);
            const maxNumber = accounts.length > 0 ? Math.max(...accounts.map(a => a.number)) : 0;
            setFormData({
                number: maxNumber + 1,
                email: '',
                tag: '',
                mesos_b: 0
            });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingAccount(null);
        setFormData({ number: 0, email: '', tag: '', mesos_b: 0 });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingAccount) {
                await accountsService.update(editingAccount.id, formData);
            } else {
                await accountsService.create(formData);
            }
            await loadAccounts();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving account:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar esta cuenta?')) {
            try {
                await accountsService.delete(id);
                await loadAccounts();
                handleCloseModal();
            } catch (error) {
                console.error('Error deleting account:', error);
            }
        }
    };

    const columns: Column<Account>[] = [
        { key: 'number', header: 'N°' },
        { key: 'email', header: 'Email', render: (a) => a.email || '-' },
        { key: 'tag', header: 'Tag', render: (a) => a.tag ? <span className="tag">{a.tag}</span> : '-' },
        {
            key: 'created_at',
            header: 'Created',
            render: (a) => new Date(a.created_at).toLocaleDateString()
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (a) => (
                <div className="table-actions">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(a)}>Edit</Button>
                </div>
            )
        }
    ];

    return (
        <div className="accounts-page">
            <Header
                title="Accounts"
                subtitle="Manage your game accounts"
                actions={
                    <Button onClick={() => handleOpenModal()}>+ New Account</Button>
                }
            />

            <div className="page-content">
                <Card padding="none">
                    <Table
                        data={accounts}
                        columns={columns}
                        keyExtractor={(a) => a.id}
                        loading={loading}
                        emptyMessage="No accounts yet. Create your first one!"
                    />
                </Card>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={editingAccount ? 'Edit Account' : 'New Account'}
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <Input
                        label="N°"
                        type="number"
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 0 })}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        label="Tag"
                        value={formData.tag || ''}
                        onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                        placeholder="e.g. Main, Alt, Mule"
                    />
                    <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                        {editingAccount ? (
                            <Button type="button" variant="danger" onClick={() => handleDelete(editingAccount.id)}>
                                Delete
                            </Button>
                        ) : <div />}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingAccount ? 'Save Changes' : 'Create Account'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Accounts;
