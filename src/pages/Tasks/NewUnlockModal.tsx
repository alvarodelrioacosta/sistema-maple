import React, { useState } from 'react';
import { Modal, Button, Input, Select } from '../../components/UI';
import { contentUnlocksService } from '../../services';
import type { UnlockCategory } from '../../services';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const CATEGORY_OPTIONS = [
    { value: 'boss_access',      label: 'Boss Access' },
    { value: 'area_unlock',      label: 'Area Unlock' },
    { value: 'system_unlock',    label: 'System Unlock' },
    { value: 'character_unlock', label: 'Character Unlock' },
];

const NewUnlockModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [unlocks, setUnlocks] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<UnlockCategory>('boss_access');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !unlocks.trim()) return;
        setSaving(true);
        try {
            await contentUnlocksService.create({ name: name.trim(), unlocks: unlocks.trim(), description: description.trim() || null, category, order_index: null });
            setName(''); setUnlocks(''); setDescription(''); setCategory('boss_access');
            onCreated();
            onClose();
        } catch (err) {
            console.error('Error creating unlock:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Content Unlock">
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="modal-form-grid">
                    <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lotus Pre-Quest" required />
                    <Input label="Unlocks" value={unlocks} onChange={e => setUnlocks(e.target.value)} placeholder="e.g. Lotus (Hard)" required />
                    <Select label="Category" value={category} onChange={v => setCategory(v as UnlockCategory)} options={CATEGORY_OPTIONS} />
                    <Input label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short note" />
                </div>
                <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" loading={saving} disabled={saving}>Create</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NewUnlockModal;
