// =============================================
// CLIENTS PAGE - Gestión de clientes
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Table, Modal, Input, Card } from '../../components/UI';
import { clientsService } from '../../services';
import type { Client, ClientInsert } from '../../types';
import type { Column } from '../../components/UI/Table';
import '../Accounts/Accounts.css'; // Mantenemos para estilos generales de página si es necesario
import './Clients.css'; // El nuevo diseño para el modal

export const Clients: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState<ClientInsert>({
        name: '',
        contact_info: '',
        is_admin: false,
    });

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        try {
            const data = await clientsService.getAll();
            // Sort: Alvaro first, then alphabetical
            data.sort((a, b) => {
                if (a.name === 'Alvaro') return -1;
                if (b.name === 'Alvaro') return 1;
                return a.name.localeCompare(b.name);
            });
            setClients(data);
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (client?: Client) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                name: client.name,
                contact_info: client.contact_info || '',
                is_admin: client.is_admin,
            });
        } else {
            setEditingClient(null);
            setFormData({
                name: '',
                contact_info: '',
                is_admin: false,
            });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingClient(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingClient) {
                await clientsService.update(editingClient.id, formData);
            } else {
                await clientsService.create(formData);
            }
            await loadClients();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving client:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
            try {
                await clientsService.delete(id);
                await loadClients();
                handleCloseModal(); // Close modal if open
            } catch (error) {
                console.error('Error deleting client:', error);
            }
        }
    };

    const columns: Column<Client>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (c) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    {c.is_admin && (
                        <span
                            style={{
                                fontSize: '0.75em',
                                background: '#8b5cf6',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                width: 'fit-content'
                            }}
                        >
                            Admin
                        </span>
                    )}
                </div>
            )
        },
        { key: 'contact_info', header: 'Contact', render: (c) => c.contact_info || '-' },
        {
            key: 'actions',
            header: 'Actions',
            render: (c) => (
                <div className="table-actions">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(c)}>Edit</Button>
                </div>
            )
        }
    ];

    return (
        <div className="accounts-page">
            <Header
                title="Clients"
                subtitle="Manage your customers"
                actions={
                    <Button onClick={() => handleOpenModal()}>+ New Client</Button>
                }
            />

            <div className="page-content">
                <Card padding="none">
                    <Table
                        data={clients}
                        columns={columns}
                        keyExtractor={(c) => c.id}
                        loading={loading}
                        emptyMessage="No clients yet. Add your first one!"
                    />
                </Card>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={editingClient ? 'Edit Client' : 'New Client'}
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="client-modal-container">

                        {/* Section 1: General Info */}
                        <div className="client-form-section">
                            <div className="section-header">
                                <span className="section-icon">👤</span>
                                <span className="section-title">General Information</span>
                            </div>
                            <div className="general-info-grid">
                                <Input
                                    label="Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Name"
                                />
                                <Input
                                    label="Contact Info"
                                    value={formData.contact_info || ''}
                                    onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                                    placeholder="Discord, IGN, etc."
                                />
                            </div>
                        </div>

                        {/* Section 2: Admin Status */}
                        <div className="client-form-section">
                            <div
                                className={`premium-checkbox ${formData.is_admin ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, is_admin: !formData.is_admin })}
                                style={{ margin: 0 }}
                            >
                                <div className="checkbox-content">
                                    <div className="checkbox-mark"></div>
                                    <span className="checkbox-label-text">Administrator Access</span>
                                </div>
                                {formData.is_admin && <span className="admin-badge">ROOT ADMIN</span>}
                            </div>
                        </div>
                    </div>

                    <div className="footer-actions">
                        {editingClient ? (
                            <Button type="button" variant="danger" onClick={() => handleDelete(editingClient.id)}>
                                Delete Client
                            </Button>
                        ) : <div />}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                {editingClient ? 'Save Changes' : 'Create Client'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Clients;
