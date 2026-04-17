import React, { useState } from 'react';
import { Modal, Button } from '../../components/UI';
import { contentUnlocksService } from '../../services';
import type { ContentUnlock } from '../../services';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    unlocks: ContentUnlock[];
    onDeleted: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    boss:   '#f87171',
    system: '#fbbf24',
};

const EditUnlocksModal: React.FC<Props> = ({ isOpen, onClose, unlocks, onDeleted }) => {
    const [deleting, setDeleting] = useState<string | null>(null);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`¿Eliminar "${name}"?`)) return;
        setDeleting(id);
        try {
            await contentUnlocksService.delete(id);
            onDeleted(id);
        } catch (err) {
            console.error('Error deleting unlock:', err);
        } finally {
            setDeleting(null);
        }
    };

    const bosses = unlocks.filter(u => u.category === 'boss');
    const systems = unlocks.filter(u => u.category === 'system');

    const renderGroup = (items: ContentUnlock[]) => items.map(u => (
        <div key={u.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 6
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                    fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                    background: (CATEGORY_COLORS[u.category] ?? '#888') + '20',
                    color: CATEGORY_COLORS[u.category] ?? '#888',
                    textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>
                    {u.unlocks}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{u.name}</span>
            </div>
            <Button
                variant="danger"
                onClick={() => handleDelete(u.id, u.name)}
                disabled={deleting === u.id}
            >
                {deleting === u.id ? '...' : 'Delete'}
            </Button>
        </div>
    ));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Unlocks">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {bosses.length > 0 && (
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Boss
                        </div>
                        {renderGroup(bosses)}
                    </div>
                )}
                {systems.length > 0 && (
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            System
                        </div>
                        {renderGroup(systems)}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
        </Modal>
    );
};

export default EditUnlocksModal;
