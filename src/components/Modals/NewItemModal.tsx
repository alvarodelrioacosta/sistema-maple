import React, { useEffect, useState } from 'react';
import { Button, Modal, Input, Select } from '../UI';
import { itemsService, charactersService, itemsDBService, accountsService } from '../../services';
import type { ItemInsert, Character, ItemStatus, PotentialTier, ItemDB, TradeabilityType, Account, ItemWithCharacter } from '../../types';
import { createWorker } from 'tesseract.js';
import { ocrUtil } from '../../utils/ocr';
import '../../pages/Items/Items.css';

const STATUS_OPTIONS = [
    { value: 'bulk', label: 'Bulk' },
    { value: 'in_stock', label: 'In Stock' },
    { value: 'for_sale', label: 'For Sale' },
    { value: 'sold', label: 'Sold' },
    { value: 'Service', label: 'Service' }
];

const TIER_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'Rare', label: 'Rare' },
    { value: 'Epic', label: 'Epic' },
    { value: 'Unique', label: 'Unique' },
    { value: 'Legendary', label: 'Legendary' }
];

const TRADEABILITY_OPTIONS = [
    { value: 'Tradeable', label: 'Tradeable' },
    { value: 'Tradeable Once', label: 'Tradeable Once' },
    { value: 'Untradeable', label: 'Untradeable' }
];

interface NewItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newItem: any) => void;
    editingItem?: ItemWithCharacter | null;
    initialData?: ItemInsert | null;
    isBarterMode?: boolean;
    defaultAccountId?: string;
    defaultCharacterId?: string;
    hideCostInput?: boolean;
}

export const NewItemModal: React.FC<NewItemModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    editingItem,
    initialData,
    isBarterMode = false,
    hideCostInput = false,
    defaultAccountId,
    defaultCharacterId
}) => {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [itemsDB, setItemsDB] = useState<ItemDB[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrMessage, setOcrMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    const [formData, setFormData] = useState<ItemInsert>({
        name: '',
        character_id: null,
        star_force: 0,
        tradeability: 'Tradeable',
        remaining_trade_slots: 5,
        estimated_value: 0,
        main_potential_tier: null,
        main_potential_1: null,
        main_potential_2: null,
        main_potential_3: null,
        bonus_potential_tier: null,
        bonus_potential_1: null,
        bonus_potential_2: null,
        bonus_potential_3: null,
        costo_item: 0,
        costo_cubos: 0,
        costo_psok: 0,
        costo_sf: 0,
        costo_perfect_innoc: 0,
        costo_guardian_scroll: 0,
        costo_replacement: 0,
        costo_total: 0,
        status: 'in_stock',
        delivered: false,
        ah_listed_at: null
    });

    useEffect(() => {
        if (isOpen) {
            loadData();
            if (editingItem) {
                // ... same logic as before ...
                setFormData({
                    name: editingItem.name,
                    character_id: editingItem.character_id,
                    star_force: editingItem.star_force,
                    tradeability: editingItem.tradeability,
                    remaining_trade_slots: editingItem.remaining_trade_slots,
                    estimated_value: editingItem.estimated_value,
                    main_potential_tier: editingItem.main_potential_tier,
                    main_potential_1: editingItem.main_potential_1,
                    main_potential_2: editingItem.main_potential_2,
                    main_potential_3: editingItem.main_potential_3,
                    bonus_potential_tier: editingItem.bonus_potential_tier,
                    bonus_potential_1: editingItem.bonus_potential_1,
                    bonus_potential_2: editingItem.bonus_potential_2,
                    bonus_potential_3: editingItem.bonus_potential_3,
                    costo_item: editingItem.costo_item || 0,
                    costo_cubos: editingItem.costo_cubos || 0,
                    costo_psok: editingItem.costo_psok || 0,
                    costo_sf: editingItem.costo_sf || 0,
                    costo_perfect_innoc: editingItem.costo_perfect_innoc || 0,
                    costo_guardian_scroll: editingItem.costo_guardian_scroll || 0,
                    costo_replacement: editingItem.costo_replacement || 0,
                    costo_total: editingItem.costo_total || 0,
                    status: editingItem.status,
                    delivered: editingItem.delivered,
                    ah_listed_at: editingItem.ah_listed_at || null
                });
            } else if (initialData) {
                setFormData(initialData);
                if (initialData.character_id) {
                    // Logic to set account will be handled in loadData if needed,
                    // but for Barter we usually have character_id from PaymentModal.
                }
            } else {
                setFormData({
                    name: '',
                    character_id: defaultCharacterId || null,
                    star_force: 0,
                    tradeability: 'Tradeable',
                    remaining_trade_slots: 5,
                    estimated_value: 0,
                    main_potential_tier: null,
                    main_potential_1: null,
                    main_potential_2: null,
                    main_potential_3: null,
                    bonus_potential_tier: null,
                    bonus_potential_1: null,
                    bonus_potential_2: null,
                    bonus_potential_3: null,
                    costo_item: 0,
                    costo_cubos: 0,
                    costo_psok: 0,
                    costo_sf: 0,
                    costo_perfect_innoc: 0,
                    costo_guardian_scroll: 0,
                    costo_replacement: 0,
                    costo_total: 0,
                    status: 'in_stock',
                    delivered: false,
                    ah_listed_at: null
                });
                setSelectedAccountId(defaultAccountId || '');
            }
            setOcrMessage(null);
        }
    }, [isOpen, editingItem, initialData, defaultAccountId, defaultCharacterId]);

    const loadData = async () => {
        try {
            const [charsData, itemsDBData, accountsData] = await Promise.all([
                charactersService.getAll(),
                itemsDBService.getAll(),
                accountsService.getAll()
            ]);
            setCharacters(charsData);
            setItemsDB(itemsDBData);
            setAccounts(accountsData);

            if (editingItem && editingItem.character_id) {
                const char = charsData.find(c => c.id === editingItem.character_id);
                if (char) setSelectedAccountId(char.account_id);
            } else if (initialData && initialData.character_id) {
                const char = charsData.find(c => c.id === initialData.character_id);
                if (char) setSelectedAccountId(char.account_id);
            }
        } catch (error) {
            console.error('Error loading modal data:', error);
        }
    };

    const calculateTotal = (data: ItemInsert) => {
        return (data.costo_item || 0) +
            (data.costo_cubos || 0) +
            (data.costo_psok || 0) +
            (data.costo_sf || 0) +
            (data.costo_perfect_innoc || 0) +
            (data.costo_guardian_scroll || 0) +
            (data.costo_replacement || 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // --- VALIDATION FOR CHARACTER ASSIGNMENT ---
        if (!formData.character_id) {
            alert('Items must always be assigned to a character.');
            return;
        }

        // --- VALIDATION FOR ITEM COST ---
        if ((!formData.costo_item || formData.costo_item <= 0) && !hideCostInput) {
            alert('Item Cost is mandatory and must be greater than 0.');
            return;
        }
        // --------------------------------
        // -------------------------------------------

        try {
            const { character, ...cleanData } = formData as any;
            cleanData.costo_total = calculateTotal(cleanData);

            if (isBarterMode) {
                // Return data without DB call
                onSuccess({ ...cleanData, costo_total: calculateTotal(cleanData) });
            } else {
                let resultItem: ItemWithCharacter;
                if (editingItem) {
                    resultItem = await itemsService.update(editingItem.id, cleanData);
                } else {
                    resultItem = await itemsService.create(cleanData);
                }
                onSuccess(resultItem);
            }
            onClose();
        } catch (error) {
            console.error('Error saving item:', error);
        }
    };

    const handleItemChange = (itemId: string) => {
        const selectedItemDB = itemsDB.find(i => i.id === itemId);
        if (selectedItemDB) {
            setFormData({
                ...formData,
                name: selectedItemDB.name,
                remaining_trade_slots: selectedItemDB.slots
            });
        }
    };

    // --- OCR Logic ---
    const processImageText = (text: string) => {
        const result = ocrUtil.processItemImageText(text, itemsDB);

        if (!result.success) {
            setOcrMessage({ type: 'error', text: result.error || 'Failed to scan item.' });
            return;
        }

        const { success, error, ...updates } = result;

        // Apply updates
        setFormData(prev => ({ ...prev, ...updates }));
        setOcrMessage({ type: 'success', text: 'Scanned item successfully! Please verify.' });
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        let blob: Blob | null = null;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                blob = items[i].getAsFile();
                break;
            }
        }

        if (blob) {
            setOcrLoading(true);
            setOcrMessage(null); // Clear previous message
            setOcrMessage({ type: 'info', text: 'Analyzing image...' });
            try {
                const worker = await createWorker('eng');
                const ret = await worker.recognize(blob);
                processImageText(ret.data.text);
                await worker.terminate();
            } catch (err) {
                console.error("OCR Error", err);
                setOcrMessage({ type: 'error', text: 'Failed to process image.' });
            } finally {
                setOcrLoading(false);
            }
        }
    };

    const currentItemDBId = itemsDB.find(i => i.name === formData.name)?.id || '';


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isBarterMode ? 'Add Payment Item' : (editingItem ? 'Edit Item' : 'New Item')}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="modal-form items-form">
                {/* --- ROW 1: ACCOUNT & CHARACTER --- */}
                {/* Only show if not provided via props (e.g. from PaymentModal) */}
                {!defaultCharacterId && (
                    <div className="form-grid-2">
                        <Select
                            label="Account"
                            value={selectedAccountId}
                            onChange={(value) => {
                                setSelectedAccountId(value);
                                setFormData({ ...formData, character_id: null }); // Reset character when account changes
                            }}
                            options={[
                                { value: '', label: 'All Accounts' },
                                ...accounts.map(a => ({ value: a.id, label: `${a.email}` }))
                            ]}
                        />
                        <Select
                            label="Character"
                            value={formData.character_id || ''}
                            onChange={(value) => {
                                setFormData({ ...formData, character_id: value || null });
                                // Auto-select account if not already selected
                                if (value) {
                                    const char = characters.find(c => c.id === value);
                                    if (char) setSelectedAccountId(char.account_id);
                                }
                            }}
                            options={[
                                { value: '', label: 'Select Character (Required)' },
                                ...characters
                                    .filter(c => !selectedAccountId || c.account_id === selectedAccountId)
                                    .map(c => ({ value: c.id, label: c.name }))
                            ]}
                        />
                    </div>
                )}

                {/* --- ROW 2: NAME, IMAGE & PASTE ZONE --- */}
                <div className="form-row-item-selection">
                    <Select
                        label="Name (Catalog)"
                        value={currentItemDBId}
                        onChange={(value) => handleItemChange(value)}
                        options={[
                            { value: '', label: 'Select an Item...' },
                            ...itemsDB
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(i => ({ value: i.id, label: i.name }))
                        ]}
                    />

                    {/* Item Preview Image */}
                    <div className={`item-preview-box ${!currentItemDBId ? 'empty' : ''}`}>
                        {(() => {
                            const selectedItem = itemsDB.find(i => i.id === currentItemDBId);
                            if (selectedItem && selectedItem.image_url) {
                                return <img src={selectedItem.image_url} alt={selectedItem.name} />;
                            }
                            return <span style={{ fontSize: '2rem', opacity: 0.2 }}>🖼️</span>;
                        })()}
                    </div>

                    {/* Detect Paste Zone */}
                    <div
                        className={`paste-zone-compact ${ocrLoading ? 'processing' : ''}`}
                        onPaste={handlePaste}
                        tabIndex={0}
                        style={{ width: '200px' }}
                    >
                        {ocrLoading ? (
                            <span>Scanning...</span>
                        ) : (
                            <>
                                <span style={{ fontSize: '1.2em' }}>📋</span>
                                <span>Click & Paste (Ctrl+V)</span>
                            </>
                        )}
                        {ocrMessage && <span style={{ fontSize: '0.7em', color: ocrMessage.type === 'error' ? 'red' : 'green' }}>{ocrMessage.type === 'success' ? 'Scanned!' : 'Error'}</span>}
                    </div>
                </div>


                {/* --- ROW 3: STATS --- */}
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 70px 1fr 80px', gap: 'var(--spacing-md)', alignItems: 'end' }}>
                    <Input
                        label="Star Force"
                        type="number"
                        min={0}
                        max={25}
                        value={formData.star_force}
                        onChange={(e) => setFormData({ ...formData, star_force: parseInt(e.target.value) || 0 })}
                    />
                    <Select
                        label="Tradeability"
                        value={formData.tradeability}
                        onChange={(value) => setFormData({ ...formData, tradeability: value as TradeabilityType })}
                        options={TRADEABILITY_OPTIONS}
                    />
                    <Input
                        label="Slots"
                        type="number"
                        min={0}
                        max={10}
                        value={formData.remaining_trade_slots}
                        onChange={(e) => setFormData({ ...formData, remaining_trade_slots: parseInt(e.target.value) || 0 })}
                    />
                    <Select
                        label="Status"
                        value={formData.status}
                        onChange={(value) => setFormData({ ...formData, status: value as ItemStatus })}
                        options={STATUS_OPTIONS}
                    />
                    {!hideCostInput && (
                        <Input
                            label="Item Cost"
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.costo_item}
                            onChange={(e) => setFormData({ ...formData, costo_item: parseFloat(e.target.value) || 0 })}
                        />
                    )}
                </div>

                {/* --- ROW 4: POTENTIALS (SPLIT) --- */}
                <div className="form-grid-potentials">
                    {/* MAIN POTENTIAL */}
                    <div className="potential-card">
                        <h4>Main Potential</h4>
                        <Select
                            label=""
                            value={formData.main_potential_tier || ''}
                            onChange={(value) => setFormData({ ...formData, main_potential_tier: value as PotentialTier || null })}
                            options={TIER_OPTIONS}
                            className={formData.main_potential_tier ? `text-${formData.main_potential_tier.toLowerCase()}` : ''}
                        />
                        <Input
                            value={formData.main_potential_1 || ''}
                            onChange={(e) => setFormData({ ...formData, main_potential_1: e.target.value })}
                            placeholder="Potential Line 1"
                        />
                        <Input
                            value={formData.main_potential_2 || ''}
                            onChange={(e) => setFormData({ ...formData, main_potential_2: e.target.value })}
                            placeholder="Potential Line 2"
                        />
                        <Input
                            value={formData.main_potential_3 || ''}
                            onChange={(e) => setFormData({ ...formData, main_potential_3: e.target.value })}
                            placeholder="Potential Line 3"
                        />
                    </div>

                    {/* BONUS POTENTIAL */}
                    <div className="potential-card">
                        <h4>Bonus Potential</h4>
                        <Select
                            label=""
                            value={formData.bonus_potential_tier || ''}
                            onChange={(value) => setFormData({ ...formData, bonus_potential_tier: value as PotentialTier || null })}
                            options={TIER_OPTIONS}
                            className={formData.bonus_potential_tier ? `text-${formData.bonus_potential_tier.toLowerCase()}` : ''}
                        />
                        <Input
                            value={formData.bonus_potential_1 || ''}
                            onChange={(e) => setFormData({ ...formData, bonus_potential_1: e.target.value })}
                            placeholder="Bonus Potential Line 1"
                        />
                        <Input
                            value={formData.bonus_potential_2 || ''}
                            onChange={(e) => setFormData({ ...formData, bonus_potential_2: e.target.value })}
                            placeholder="Bonus Potential Line 2"
                        />
                        <Input
                            value={formData.bonus_potential_3 || ''}
                            onChange={(e) => setFormData({ ...formData, bonus_potential_3: e.target.value })}
                            placeholder="Bonus Potential Line 3"
                        />
                    </div>
                </div>

                <div className="modal-actions">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">{isBarterMode ? 'Add Item' : (editingItem ? 'Update Item' : 'Create Item')}</Button>
                </div>
            </form>
        </Modal>
    );
};
