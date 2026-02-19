import React, { useState, useEffect } from 'react';
import { Button, Modal, Input } from '../../components/UI';
import { clientsService } from '../../services';
import type { Client } from '../../types';

interface AgreementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    client: Client | null;
}

export const AgreementModal: React.FC<AgreementModalProps> = ({ isOpen, onClose, onSuccess, client }) => {
    const [nextPaymentDate, setNextPaymentDate] = useState<string>('');
    const [paymentAgreement, setPaymentAgreement] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && client) {
            setNextPaymentDate(client.next_payment_date || '');
            setPaymentAgreement(client.payment_agreement || '');
        }
    }, [isOpen, client]);

    const handleSubmit = async () => {
        if (!client) return;

        setLoading(true);
        try {
            await clientsService.update(client.id, {
                next_payment_date: nextPaymentDate || null,
                payment_agreement: paymentAgreement || null
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating payment agreement:', error);
            alert('Failed to update agreement.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Payment Agreement: ${client?.name}`}
            size="sm"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Input
                    label="Tentative Next Payment Date"
                    type="date"
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                        Agreement Notes
                    </label>
                    <textarea
                        style={{
                            width: '100%',
                            minHeight: '120px',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '12px',
                            color: '#f8fafc',
                            fontSize: '0.95rem',
                            resize: 'vertical',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        placeholder="Details of what was agreed (amounts, conditions, etc.)"
                        value={paymentAgreement}
                        onChange={(e) => setPaymentAgreement(e.target.value)}
                        onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                        onBlur={(e) => e.target.style.borderColor = '#334155'}
                    />
                </div>

                <div className="modal-actions" style={{ marginTop: '10px' }}>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save Agreement'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
