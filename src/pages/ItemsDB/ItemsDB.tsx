// =============================================
// ITEMS DB PAGE - Catálogo de ítems base
// =============================================

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Layout';
import { Button, Table, Modal, Input, Card } from '../../components/UI';
import { itemsDBService, itemsService } from '../../services';
import type { ItemDB, ItemDBInsert, ItemType } from '../../types';
import type { Column } from '../../components/UI/Table';
import '../Accounts/Accounts.css';
import './ItemsDB.css';
import { Select } from '../../components/UI';

const ITEM_TYPES: { value: ItemType; label: string }[] = [
    { value: 'Hat', label: 'Hat' },
    { value: 'Top', label: 'Top' },
    { value: 'Bottom', label: 'Bottom' },
    { value: 'Gloves', label: 'Gloves' },
    { value: 'Shoes', label: 'Shoes' },
    { value: 'Cape', label: 'Cape' },
    { value: 'Belt', label: 'Belt' },
    { value: 'Shoulder', label: 'Shoulder' },
    { value: 'Face Acc.', label: 'Face Acc.' },
    { value: 'Eye Acc.', label: 'Eye Acc.' },
    { value: 'Ring', label: 'Ring' },
    { value: 'Earring', label: 'Earring' },
    { value: 'Pendant', label: 'Pendant' },
    { value: 'Weapon', label: 'Weapon' },
    { value: 'Secondary', label: 'Secondary' },
    { value: 'Emblem', label: 'Emblem' },
    { value: 'Heart', label: 'Heart' },
    { value: 'Pocket', label: 'Pocket' },
    { value: 'Badge', label: 'Badge' },
    { value: 'Totem', label: 'Totem' },
    { value: 'Medal', label: 'Medal' },
];

export const ItemsDB: React.FC = () => {
    const [items, setItems] = useState<ItemDB[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ItemDB | null>(null);
    const [formData, setFormData] = useState<ItemDBInsert>({
        name: '',
        type: null,
        item_lv: 0,
        slots: 5,
        can_starforce: true,
        infinite_trades: false,
        always_tradeable: false,
        image_url: null,
        set: null
    });

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const data = await itemsDBService.getAll();
            setItems(data);
        } catch (error) {
            console.error('Error loading items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item?: ItemDB) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                type: item.type,
                item_lv: item.item_lv,
                slots: item.slots,
                can_starforce: item.can_starforce,
                infinite_trades: item.infinite_trades,
                always_tradeable: item.always_tradeable,
                image_url: item.image_url,
                set: item.set
            });
        } else {
            setEditingItem(null);
            setFormData({ name: '', type: null, item_lv: 0, slots: 5, can_starforce: true, infinite_trades: false, always_tradeable: false, image_url: null, set: null });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingItem(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                const oldName = editingItem.name;
                await itemsDBService.update(editingItem.id, formData);
                if (formData.name && formData.name !== oldName) {
                    await itemsService.updateNameBulk(oldName, formData.name);
                }
            } else {
                await itemsDBService.create(formData);
            }
            await loadItems();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving item:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este ítem del catálogo?')) {
            try {
                await itemsDBService.delete(id);
                await loadItems();
                handleCloseModal();
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
    };

    const columns: Column<ItemDB>[] = [
        {
            key: 'image',
            header: 'Image',
            render: (i) => i.image_url ? (
                <img src={i.image_url} alt={i.name} className="item-thumbnail" />
            ) : (
                <div className="item-thumbnail-placeholder">📦</div>
            )
        },
        { key: 'name', header: 'Name' },
        { key: 'type', header: 'Type', render: (i) => i.type || '-' },
        { key: 'item_lv', header: 'Item Lv' },
        { key: 'slots', header: 'Slots' },
        {
            key: 'flags',
            header: 'Flags',
            render: (i) => (
                <span style={{ display: 'flex', gap: '4px', fontSize: '0.75rem' }}>
                    {i.can_starforce && <span title="Can StarForce" style={{ background: '#facc15', color: '#000', borderRadius: '3px', padding: '1px 4px' }}>SF</span>}
                    {i.infinite_trades && <span title="Infinite Trades" style={{ background: '#34d399', color: '#000', borderRadius: '3px', padding: '1px 4px' }}>∞</span>}
                    {i.always_tradeable && <span title="Always Tradeable" style={{ background: '#60a5fa', color: '#000', borderRadius: '3px', padding: '1px 4px' }}>T</span>}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (i) => (
                <div className="table-actions">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(i)}>Edit</Button>
                </div>
            )
        }
    ];

    return (
        <div className="accounts-page">
            <Header
                title="Items DB"
                subtitle="Catalog of base items for your inventory"
                actions={
                    <Button onClick={() => handleOpenModal()}>+ New Item</Button>
                }
            />

            <div className="page-content">
                <Card padding="none">
                    <Table
                        data={items}
                        columns={columns}
                        keyExtractor={(i) => i.id}
                        loading={loading}
                        emptyMessage="No items in catalog. Add your first one!"
                    />
                </Card>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={editingItem ? 'Edit Catalog Item' : 'New Catalog Item'}
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Select
                        label="Type"
                        value={formData.type || ''}
                        onChange={(value) => setFormData({ ...formData, type: value === '' ? null : (value as ItemType) })}
                        options={[{ value: '', label: 'Select Type' }, ...ITEM_TYPES]}
                    />
                    <Input
                        label="Item Level"
                        type="number"
                        min={0}
                        value={formData.item_lv}
                        onChange={(e) => setFormData({ ...formData, item_lv: parseInt(e.target.value) || 0 })}
                    />
                    <Input
                        label="Trade Slots"
                        type="number"
                        min={0}
                        max={10}
                        value={formData.slots}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setFormData({ ...formData, slots: isNaN(val) ? 0 : val });
                        }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.can_starforce}
                                onChange={e => setFormData({ ...formData, can_starforce: e.target.checked })}
                            />
                            Can StarForce
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.infinite_trades}
                                onChange={e => setFormData({ ...formData, infinite_trades: e.target.checked })}
                            />
                            Infinite Trades (no PSOK slot limit)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.always_tradeable}
                                onChange={e => setFormData({ ...formData, always_tradeable: e.target.checked })}
                            />
                            Always Tradeable (locked)
                        </label>
                    </div>
                    <Input
                        label="Image URL (optional)"
                        value={formData.image_url || ''}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value || null })}
                        placeholder="https://..."
                    />
                    <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                        {editingItem ? (
                            <Button type="button" variant="danger" onClick={() => handleDelete(editingItem.id)}>
                                Delete
                            </Button>
                        ) : <div />}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingItem ? 'Save Changes' : 'Add to Catalog'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ItemsDB;
