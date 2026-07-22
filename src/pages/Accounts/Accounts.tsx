// =============================================
// ACCOUNTS PAGE - Gestión de cuentas
// =============================================

// This account is always #0 — many features are hardcoded to account 0.
const MAIN_ACCOUNT_EMAIL = 'alvarodelrioacosta@gmail.com';

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Table, Modal, Input, Card } from '../../components/UI';
import { accountsService } from '../../services';
import type { Account, AccountInsert, AccountStatus } from '../../types';
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
        mesos_b: 0,
        status: 'owned'
    });

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const data = await accountsService.getAll({ includeBanned: true });
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
                mesos_b: account.mesos_b || 0,
                status: account.status
            });
        } else {
            setEditingAccount(null);
            const ownedAccounts = accounts.filter(a => a.status === 'owned');
            const maxNumber = ownedAccounts.length > 0 ? Math.max(...ownedAccounts.map(a => a.number)) : 0;
            setFormData({
                number: maxNumber + 1,
                email: '',
                tag: '',
                mesos_b: 0,
                status: 'owned'
            });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingAccount(null);
        setFormData({ number: 0, email: '', tag: '', mesos_b: 0, status: 'owned' });
    };

    const handleStatusChange = (status: AccountStatus) => {
        if (status === 'sold') {
            // Sold: assign a 999+ number
            const soldNumbers = accounts.filter(a => a.status === 'sold').map(a => a.number);
            const nextSoldNumber = soldNumbers.length > 0 ? Math.max(...soldNumbers) + 1 : 999;
            setFormData(prev => ({ ...prev, status, number: nextSoldNumber }));
        } else if (status === 'owned') {
            // Owned: assign next owned number
            const ownedAccounts = accounts.filter(a => a.status === 'owned' && a.id !== editingAccount?.id);
            const maxNumber = ownedAccounts.length > 0 ? Math.max(...ownedAccounts.map(a => a.number)) : 0;
            setFormData(prev => ({ ...prev, status, number: maxNumber + 1 }));
        } else {
            // Banned: keep the current number, just hide it everywhere
            setFormData(prev => ({ ...prev, status }));
        }
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

    const handleReorder = async () => {
        if (!window.confirm('¿Renumerar las cuentas propias (1, 2, 3...)? La cuenta #0 no se modifica.')) return;
        try {
            const mainAccount = accounts.find(a => a.email === MAIN_ACCOUNT_EMAIL);
            if (mainAccount && mainAccount.number !== 0) {
                await accountsService.update(mainAccount.id, { number: 0 });
            }
            const toReorder = accounts
                .filter(a => a.status === 'owned' && a.email !== MAIN_ACCOUNT_EMAIL)
                .sort((a, b) => a.number - b.number);
            for (let i = 0; i < toReorder.length; i++) {
                await accountsService.update(toReorder[i].id, { number: i + 1 });
            }
            await loadAccounts();
        } catch (error) {
            console.error('Error reordering accounts:', error);
        }
    };

    const columns: Column<Account>[] = [
        { key: 'number', header: 'N°' },
        { key: 'email', header: 'Email', render: (a) => a.email || '-' },
        { key: 'tag', header: 'Tag', render: (a) => a.tag ? <span className="tag">{a.tag}</span> : '-' },
        {
            key: 'status',
            header: 'Estado',
            render: (a) => {
                if (a.status === 'owned') return <span className="tag tag--owned">Propia</span>;
                if (a.status === 'sold') return <span className="tag tag--sold">Vendida</span>;
                return <span className="tag tag--banned">Baneada</span>;
            }
        },
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
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="secondary" onClick={handleReorder}>Reordenar propias</Button>
                        <Button onClick={() => handleOpenModal()}>+ New Account</Button>
                    </div>
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
                        rowClassName={(a) => a.status === 'banned' ? 'row--banned' : a.status === 'sold' ? 'row--sold' : ''}
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
                        disabled={editingAccount?.email === MAIN_ACCOUNT_EMAIL}
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
                    <div className="status-field">
                        <label className="status-field__label">
                            <span>Estado</span>
                            <select
                                value={formData.status ?? 'owned'}
                                onChange={(e) => handleStatusChange(e.target.value as AccountStatus)}
                            >
                                <option value="owned">Propia</option>
                                <option value="sold">Vendida</option>
                                <option value="banned">Baneada</option>
                            </select>
                        </label>
                        {formData.status === 'sold' && (
                            <p className="status-field__hint">
                                Cuenta vendida. Se le asignó el número {formData.number}.
                            </p>
                        )}
                        {formData.status === 'banned' && (
                            <p className="status-field__hint status-field__hint--danger">
                                Baneada: se oculta de todo el app (personajes, items, recursos, sesiones)
                                y de todos los totales. No se borra nada — es reversible.
                            </p>
                        )}
                    </div>
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
