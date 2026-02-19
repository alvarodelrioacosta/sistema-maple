import React from 'react';
import { Modal } from '../../components/UI/Modal/Modal';
import { TransactionWithRelations } from '../../types';

interface RegisterPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: TransactionWithRelations;
    onPaymentRegistered: () => void;
}

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({ isOpen, onClose, transaction, onPaymentRegistered }) => {
    // This modal is a placeholder for future payment registration functionality
    // The actual payment logic is handled via PaymentModal in AccountsReceivable

    const handleConfirm = () => {
        onPaymentRegistered();
        onClose();
    };

    return (
        <Modal title="Register Payment" isOpen={isOpen} onClose={onClose}>
            <div style={{ padding: '20px' }}>
                <p>Transaction: {transaction.description}</p>
                <p>Amount: {transaction.amount} {transaction.currency}</p>
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px' }}>Cancel</button>
                    <button onClick={handleConfirm} style={{ padding: '8px 16px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px' }}>
                        Confirm
                    </button>
                </div>
            </div>
        </Modal>
    );
};
