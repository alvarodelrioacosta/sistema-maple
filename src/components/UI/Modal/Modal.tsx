// =============================================
// MODAL COMPONENT
// =============================================

import React, { useEffect } from 'react';
import './Modal.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    hideHeader?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    hideHeader = false
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div
                className={`modal modal--${size}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {hideHeader ? (
                    <button
                        className="modal__close modal__close--absolute"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                ) : (
                    <div className="modal__header">
                        <h3 id="modal-title" className="modal__title">{title}</h3>
                        <button
                            className="modal__close"
                            onClick={onClose}
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <div className="modal__content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
