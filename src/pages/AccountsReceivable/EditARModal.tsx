import React, { useState, useEffect } from 'react';
import { Button, Modal, Input, Select } from '../../components/UI';
import { accountsReceivableService, clientsService } from '../../services';
import type { Client, AccountReceivable } from '../../types';

interface EditARModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    ar: AccountReceivable | null;
}

export const EditARModal: React.FC<EditARModalProps> = ({ isOpen, onClose, onSuccess, ar }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number>(0);
    const [clientId, setClientId] = useState<string>('');
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && ar) {
            setDescription(ar.description || '');
            setAmount(ar.amount);
            setClientId(ar.client_id || '');
            fetchClients();
        }
    }, [isOpen, ar]);

    const fetchClients = async () => {
        try {
            const data = await clientsService.getAll();
            setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const handleSubmit = async () => {
        if (!ar || !clientId || amount <= 0) {
            alert('Please fill all required fields.');
            return;
        }

        setLoading(true);
        try {
            // Calculate new status based on paid amount
            let status = ar.status;
            const paid = ar.paid || 0;
            if (paid >= amount) {
                status = 'paid';
            } else if (paid > 0) {
                status = 'partial';
            } else {
                status = 'pending';
            }

            await accountsReceivableService.update(ar.id, {
                description,
                amount,
                client_id: clientId,
                status
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating AR:', error);
            alert('Failed to update AR.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!ar) return;
        if (window.confirm('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
            setLoading(true);
            try {
                await accountsReceivableService.delete(ar.id);
                onSuccess();
                onClose();
            } catch (error) {
                console.error('Error deleting AR:', error);
                alert('Fallo al eliminar el registro.');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Account Receivable"
            size="sm"
        >
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
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />

                <Input
                    label="Amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    required
                />

                <div
                    style={{
                        fontSize: '0.85rem',
                        color: '#9ca3af',
                        background: '#1f2937',
                        padding: '10px',
                        borderRadius: '6px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Paid amount:</span>
                        <span style={{ color: '#4ade80', fontWeight: 'bold' }}>${ar?.paid.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>New Balance:</span>
                        <span style={{ fontWeight: 'bold' }}>${(amount - (ar?.paid || 0)).toFixed(2)}</span>
                    </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete
                    </Button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
