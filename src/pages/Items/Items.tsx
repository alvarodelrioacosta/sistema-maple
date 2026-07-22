// =============================================
// ITEMS PAGE - Gestión de objetos
// =============================================

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Layout';
import { Button, Modal, Input, Select, ItemCard } from '../../components/UI';
import { itemsService, charactersService, itemsDBService, accountsService, clientsService, clientLedgerService, transactionsService, sharedInventoryService } from '../../services';
import type { ItemWithCharacter, ItemInsert, Character, ItemStatus, PotentialTier, ItemDB, TradeabilityType, Account, Client, SharedInventory } from '../../types';
import { formatCurrencyValue } from '../../utils/format';
import './Items.css';
import { createWorker } from 'tesseract.js';
import { ocrUtil } from '../../utils/ocr';
import { ItemWorkspace } from './ItemWorkspace';
import { UseView } from './UseView';



const STATUS_OPTIONS = [
    { value: 'bulk', label: 'Bulk' },
    { value: 'in_stock', label: 'In Stock' },
    { value: 'for_sale', label: 'For Sale' },
    { value: 'sold', label: 'Sold' },
    { value: 'Service', label: 'Service' },
    { value: 'in_use', label: 'In Use' }
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


export const Items: React.FC = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<ItemWithCharacter[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [itemsDB, setItemsDB] = useState<ItemDB[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccountId, setSelectedAccountId] = useState<string>(''); // New state for Account Filter

    // === ITEM WORKSPACE (reemplaza modal de edición) ===
    const [workspaceItem, setWorkspaceItem] = useState<ItemWithCharacter | null>(null);

    const [filterStatus, setFilterStatus] = useState<ItemStatus | 'all'>('in_stock'); // State for Filter
    const [sharedChest, setSharedChest] = useState<SharedInventory | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ItemWithCharacter | null>(null);



    // Acquisition state (transient for creation)
    const [acquisitionType, setAcquisitionType] = useState<'Drop' | 'Purchase'>('Drop');
    const [purchaseSourceId, setPurchaseSourceId] = useState<string>('');
    const purchaseSourceType = 'mesos';
    const [isSubmitting, setIsSubmitting] = useState(false);
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
        ah_listed_at: null,
        is_favorite: false
    });
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrMessage, setOcrMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // Sell Modal State
    const [clients, setClients] = useState<Client[]>([]);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [sellingItem, setSellingItem] = useState<ItemWithCharacter | null>(null);
    const [saleType, setSaleType] = useState<'AH' | 'Client'>('AH');
    const [salePrice, setSalePrice] = useState(0);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [isSelling, setIsSelling] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [itemsData, charsData, itemsDBData, accountsData, clientsData, sharedData] = await Promise.all([
                itemsService.getAll(),
                charactersService.getAll(),
                itemsDBService.getAll(),
                accountsService.getAll(),
                clientsService.getAll(),
                sharedInventoryService.get().catch(() => null),
            ]);
            setItems(itemsData);
            setCharacters(charsData);
            setItemsDB(itemsDBData);
            setAccounts(accountsData);
            setClients(clientsData);
            setSharedChest(sharedData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleOpenModal = (item?: ItemWithCharacter) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                character_id: item.character_id,
                star_force: item.star_force,
                tradeability: item.tradeability,
                remaining_trade_slots: item.remaining_trade_slots,
                estimated_value: item.estimated_value,
                main_potential_tier: item.main_potential_tier,
                main_potential_1: item.main_potential_1,
                main_potential_2: item.main_potential_2,
                main_potential_3: item.main_potential_3,
                bonus_potential_tier: item.bonus_potential_tier,
                bonus_potential_1: item.bonus_potential_1,
                bonus_potential_2: item.bonus_potential_2,
                bonus_potential_3: item.bonus_potential_3,
                costo_item: item.costo_item || 0,
                costo_cubos: item.costo_cubos || 0,
                costo_psok: item.costo_psok || 0,
                costo_sf: item.costo_sf || 0,
                costo_perfect_innoc: item.costo_perfect_innoc || 0,
                costo_guardian_scroll: item.costo_guardian_scroll || 0,
                costo_replacement: item.costo_replacement || 0,
                costo_total: item.costo_total || 0,
                status: item.status,
                delivered: item.delivered,
                ah_listed_at: item.ah_listed_at || null,
                is_favorite: item.is_favorite || false
            });
            // Auto-set account id if char is selected
            if (item.character_id) {
                const char = characters.find(c => c.id === item.character_id);
                if (char) setSelectedAccountId(char.account_id);
            }
        } else {
            setEditingItem(null);
            setSelectedAccountId(''); // Reset account select
            setAcquisitionType('Drop');
            setPurchaseSourceId('');
            setFormData({
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
                ah_listed_at: null,
                is_favorite: false
            });
        }
        setModalOpen(true);
        setOcrMessage(null); // Clear OCR message on modal open
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingItem(null);
        setOcrMessage(null); // Clear OCR message on modal close
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
        if (isSubmitting) return;

        // --- VALIDATION FOR CHARACTER ASSIGNMENT ---
        if (!formData.character_id) {
            alert('Items must always be assigned to a character.');
            return;
        }

        // --- VALIDATION FOR ITEM COST ---
        if (!formData.costo_item || formData.costo_item <= 0) {
            alert('Item Cost is mandatory and must be greater than 0.');
            return;
        }
        // --------------------------------

        try {
            setIsSubmitting(true);
            const { _character, ...cleanData } = formData as any;
            cleanData.costo_total = calculateTotal(cleanData);
            if (!catalogCanStarforce) cleanData.star_force = 0;
            if (catalogInfiniteTrades) cleanData.remaining_trade_slots = null;
            if (catalogAlwaysTradeable) cleanData.tradeability = 'Tradeable';

            if (editingItem) {
                await itemsService.update(editingItem.id, cleanData);
            } else {
                // Creation flow with acquisition logic
                const createdItem = await itemsService.create(cleanData);

                if (acquisitionType === 'Purchase') {
                    const costToLog = formData.costo_item;
                    if (costToLog > 0) {
                        if (purchaseSourceType === 'mesos') {
                            const isVault = purchaseSourceId === 'shared-vault';

                            await transactionsService.createMeso({
                                account_id: isVault ? null : purchaseSourceId,
                                type: 'expense',
                                amount: costToLog,
                                description: `Purchase: - ${formData.name}`,
                                item_id: createdItem.id,
                                category: 'Maple',
                                subcategory: 'Items / Cubes'
                            });

                            if (isVault) {
                                await sharedInventoryService.updateMesos((sharedChest?.mesos_stock || 0) - costToLog);
                            } else {
                                const acc = accounts.find(a => a.id === purchaseSourceId);
                                if (acc) {
                                    await accountsService.update(acc.id, { mesos_b: (acc.mesos_b || 0) - costToLog });
                                }
                            }
                        }
                    }
                }
            }
            await loadData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving item:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleFavorite = async (item: ItemWithCharacter) => {
        try {
            // Check if we already have 5 favorites (only for For Sale items)
            if (!item.is_favorite) {
                const favoriteCount = items.filter(i => i.is_favorite && i.status === 'for_sale').length;
                if (favoriteCount >= 5) {
                    alert('You can only have a maximum of 5 favorite items in For Sale.');
                    return;
                }
            }

            const newValue = !item.is_favorite;
            await itemsService.update(item.id, { is_favorite: newValue } as any);
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_favorite: newValue } : i));
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const handleReturnToService = async (item: ItemWithCharacter) => {
        try {
            await itemsService.updateDeliveryStatus(item.id, false);
            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, delivered: false } : i
            ));
        } catch (error) {
            console.error('Error returning item to service:', error);
            alert('Failed to return item to service');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este ítem?')) {
            try {
                await itemsService.delete(id);
                await loadData();
                handleCloseModal(); // Close modal after delete
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
    };


    const handleCopy = async (item: ItemWithCharacter) => {
        setEditingItem(null);
        setSelectedAccountId(''); // Reset account select per requirement

        // Base form data from source item
        const baseData: ItemInsert = {
            name: item.name,
            character_id: null, // Must be selected manually
            star_force: item.star_force,
            tradeability: item.tradeability,
            remaining_trade_slots: item.remaining_trade_slots,
            estimated_value: item.estimated_value,
            main_potential_tier: item.main_potential_tier,
            main_potential_1: item.main_potential_1,
            main_potential_2: item.main_potential_2,
            main_potential_3: item.main_potential_3,
            bonus_potential_tier: item.bonus_potential_tier,
            bonus_potential_1: item.bonus_potential_1,
            bonus_potential_2: item.bonus_potential_2,
            bonus_potential_3: item.bonus_potential_3,
            costo_item: item.costo_item || 0,
            costo_cubos: item.costo_cubos || 0,
            costo_psok: item.costo_psok || 0,
            costo_sf: item.costo_sf || 0,
            costo_perfect_innoc: item.costo_perfect_innoc || 0,
            costo_guardian_scroll: item.costo_guardian_scroll || 0,
            costo_replacement: item.costo_replacement || 0,
            costo_total: item.costo_total || 0,
            status: 'bulk', // New items created from bulk filter should be bulk
            delivered: false,
            ah_listed_at: null,
            is_favorite: false
        };

        setFormData(baseData);

        // Try to infer acquisition from meso transactions
        try {
            const mesoTransactions = await transactionsService.getAllMesos();
            const mesoTx = mesoTransactions.find(t => t.item_id === item.id && t.type === 'expense');
            if (mesoTx) {
                setAcquisitionType('Purchase');
                setPurchaseSourceId(mesoTx.account_id || 'shared-vault');
            } else {
                setAcquisitionType('Drop');
            }
        } catch (error) {
            console.error('Error fetching acquisition details for copy:', error);
            setAcquisitionType('Drop');
        }

        setModalOpen(true);
        setOcrMessage(null);
    };

    const handleItemChange = (itemId: string) => {
        const selectedItemDB = itemsDB.find(i => i.id === itemId);
        if (selectedItemDB) {
            setFormData(prev => ({
                ...prev,
                name: selectedItemDB.name,
                remaining_trade_slots: selectedItemDB.infinite_trades ? null : selectedItemDB.slots,
                tradeability: selectedItemDB.always_tradeable ? 'Tradeable' : prev.tradeability,
                star_force: selectedItemDB.can_starforce ? prev.star_force : 0,
            }));
        }
    };

    const formatValue = (value: number) => {
        if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
        return value.toString();
    };

    const getImageUrl = (itemName: string) => {
        const itemDB = itemsDB.find(i => i.name === itemName);
        return itemDB?.image_url;
    };

    const getAccountNumber = (characterId: string | null) => {
        if (!characterId) return null;
        const char = characters.find(c => c.id === characterId);
        if (!char) return null;
        const account = accounts.find(a => a.id === char.account_id);
        return account ? account.number : null;
    };

    const getAccountTag = (characterId: string | null) => {
        if (!characterId) return null;
        const char = characters.find(c => c.id === characterId);
        if (!char) return null;
        const account = accounts.find(a => a.id === char.account_id);
        return account ? account.tag : null;
    };

    const handleReorderItems = async (updates: { id: string; slot_index: number }[]) => {
        setItems(prev => prev.map(i => {
            const u = updates.find(x => x.id === i.id);
            return u ? { ...i, slot_index: u.slot_index } : i;
        }));
        try {
            await itemsService.updateSlotIndexes(updates);
        } catch (error) {
            console.error('Error reordering items:', error);
        }
    };






    // --- OCR LOGIC ---
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
    const selectedCatalogItem = itemsDB.find(i => i.id === currentItemDBId);
    const catalogCanStarforce    = selectedCatalogItem?.can_starforce    ?? true;
    const catalogInfiniteTrades  = selectedCatalogItem?.infinite_trades  ?? false;
    const catalogAlwaysTradeable = selectedCatalogItem?.always_tradeable ?? false;

    // Filter and Sort Logic
    const filteredItems = useMemo(() => {
        const baseFiltered = items.filter(item => {
            if (filterStatus === 'all') return true;

            // Custom logic for Service vs Delivered
            if (filterStatus === 'Service') {
                return item.status === 'Service' && !item.delivered;
            }
            if (filterStatus === 'delivered' as any) {
                return item.status === 'Service' && item.delivered;
            }

            return item.status === filterStatus;
        });

        // Apply custom sorting for In Stock and For Sale
        if (filterStatus === 'in_stock' || filterStatus === 'for_sale') {
            return [...baseFiltered].sort((a, b) => {
                // For Sale: Favorites first
                if (filterStatus === 'for_sale') {
                    if (a.is_favorite && !b.is_favorite) return -1;
                    if (!a.is_favorite && b.is_favorite) return 1;
                }

                // Both: Sort by Account Number (Ascending)
                const numA = getAccountNumber(a.character_id) ?? 999999;
                const numB = getAccountNumber(b.character_id) ?? 999999;

                if (numA !== numB) return numA - numB;

                // Secondary sort by name if account number is same
                return a.name.localeCompare(b.name);
            });
        }

        return baseFiltered;
    }, [items, filterStatus, characters, accounts, getAccountNumber]);

    if (workspaceItem) {
        return <ItemWorkspace item={workspaceItem} onBack={() => {
            setWorkspaceItem(null);
            loadData(); // Refresh list after session/edits
        }} />;
    }

    return (
        <div className="items-page">
            <Header
                title="Items"
                subtitle="Manage your inventory items"
                actions={
                    <>
                        <Button variant="secondary" onClick={() => navigate('/items-db')}>Items DB</Button>
                        <Button onClick={() => handleOpenModal()}>+ New Item</Button>
                    </>
                }
            />

            <div className="status-filters">
                <div className="filter-group" style={{ display: 'flex', width: '100%', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <Button
                        variant={filterStatus === 'all' ? 'primary' : 'secondary'}
                        onClick={() => setFilterStatus('all')}
                    >
                        All
                    </Button>

                    {/* Base Statuses */}
                    {STATUS_OPTIONS.filter(o => ['bulk', 'in_stock', 'for_sale', 'sold'].includes(o.value)).map(option => (
                        <Button
                            key={option.value}
                            variant={filterStatus === option.value ? 'primary' : 'secondary'}
                            onClick={() => setFilterStatus(option.value as ItemStatus)}
                            className={filterStatus === option.value ? `status-btn-${option.value.replace('_', '-')}` : ''}
                        >
                            {option.label}
                        </Button>
                    ))}

                    <div style={{ width: 'var(--spacing-md)' }} /> {/* Separator */}

                    {/* Service & Delivered Group */}
                    <Button
                        variant={filterStatus === 'Service' ? 'primary' : 'secondary'}
                        onClick={() => setFilterStatus('Service')}
                        className={filterStatus === 'Service' ? 'status-btn-service' : ''}
                    >
                        Service
                    </Button>
                    <Button
                        variant={filterStatus === 'delivered' as any ? 'primary' : 'secondary'}
                        onClick={() => setFilterStatus('delivered' as any)}
                        className={filterStatus === 'delivered' as any ? 'status-btn-delivered' : ''}
                    >
                        Delivered
                    </Button>

                    {/* In Use - Justified Right */}
                    <Button
                        variant={filterStatus === 'in_use' ? 'primary' : 'secondary'}
                        onClick={() => setFilterStatus('in_use')}
                        className={filterStatus === 'in_use' ? 'status-btn-in-use' : ''}
                        style={{ marginLeft: 'auto' }}
                    >
                        In Use
                    </Button>
                </div>
            </div>

            <div className="page-content">
                {filterStatus === 'in_use' ? (
                    <UseView
                        items={filteredItems}
                        itemsDB={itemsDB}
                        getImageUrl={getImageUrl}
                        onEdit={(item) => setWorkspaceItem(item)}
                        onReorder={handleReorderItems}
                    />
                ) : loading ? (
                    <div className="items-loading">Loading items…</div>
                ) : filteredItems.length === 0 ? (
                    <div className="items-empty">No items found with this status.</div>
                ) : (
                    <div className="items-card-grid">
                        {filteredItems.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                imageUrl={getImageUrl(item.name)}
                                accountNumber={getAccountNumber(item.character_id)}
                                accountTag={getAccountTag(item.character_id)}
                                charName={item.character?.name}
                                itemsDB={itemsDB}
                                filterStatus={filterStatus}
                                formatValue={formatValue}
                                onEdit={() => setWorkspaceItem(item)}
                                onSell={item.status === 'for_sale' ? () => {
                                    setSellingItem(item);
                                    setSalePrice(item.estimated_value || 0);
                                    setSaleType('AH');
                                    setSelectedClientId('');
                                    setSellModalOpen(true);
                                } : undefined}
                                onListAH={item.status === 'for_sale' ? async () => {
                                    const timestamp = new Date().toISOString();
                                    await itemsService.updateAHListing(item.id, timestamp);
                                    setItems(prev => prev.map(i =>
                                        i.id === item.id ? { ...i, ah_listed_at: timestamp } : i
                                    ));
                                } : undefined}
                                onToggleFavorite={filterStatus === 'for_sale' ? () => handleToggleFavorite(item) : undefined}
                                onCopy={item.status === 'bulk' && filterStatus === 'bulk' ? () => handleCopy(item) : undefined}
                                onReturnToService={item.delivered ? () => handleReturnToService(item) : undefined}
                                onPriceUpdate={item.status === 'for_sale' ? async (id, val) => {
                                    setItems(prev => prev.map(i => i.id === id ? { ...i, estimated_value: val } : i));
                                    await itemsService.update(id, { estimated_value: val });
                                } : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={editingItem ? 'Edit Item' : 'New Item'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="modal-form items-form">
                    {/* --- ROW 1: ACCOUNT & CHARACTER --- */}
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
                                ...accounts.map(a => ({ value: a.id, label: `Acc ${a.number} - ${a.email}` }))
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

                    {/* --- ROW 1.5: ACQUISITION (Only for New Items) --- */}
                    {!editingItem && (
                        <div className="acquisition-section" style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '1.25rem',
                            borderRadius: '12px',
                            margin: '1.5rem 0',
                            border: '1px solid rgba(167, 139, 250, 0.2)', // Purple tint
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <label style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '1.1rem' }}>Acquisition Method:</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button
                                            type="button"
                                            variant={acquisitionType === 'Drop' ? 'primary' : 'secondary'}
                                            onClick={() => setAcquisitionType('Drop')}
                                        >
                                            Drop
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={acquisitionType === 'Purchase' ? 'primary' : 'secondary'}
                                            onClick={() => setAcquisitionType('Purchase')}
                                        >
                                            Purchase
                                        </Button>
                                    </div>
                                </div>

                                {acquisitionType === 'Drop' && (
                                    <div style={{ width: '200px' }}>
                                        <Input
                                            label="Item Cost (Mesos b)"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={formData.costo_item}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setFormData({ ...formData, costo_item: val, estimated_value: val });
                                            }}
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            {acquisitionType === 'Purchase' && (
                                <div className="purchase-details" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
                                    <div style={{ flex: '1.5', minWidth: '250px' }}>
                                        <Select
                                            label="Deduct Mesos From"
                                            value={purchaseSourceId}
                                            onChange={(val) => setPurchaseSourceId(val)}
                                            options={[
                                                { value: '', label: 'Select Account...' },
                                                { value: 'shared-vault', label: `Shared Vault (${formatCurrencyValue(sharedChest?.mesos_stock || 0)} b)` },
                                                ...accounts
                                                    .filter(a => (a.mesos_b || 0) > 0)
                                                    .map(a => ({ value: a.id, label: `Acc ${a.number} (${formatCurrencyValue(a.mesos_b || 0)} b)` }))
                                            ]}
                                            required
                                        />
                                    </div>

                                    <div style={{ flex: '1', minWidth: '150px' }}>
                                        <Input
                                            label="Item Cost (Mesos b)"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={formData.costo_item}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setFormData({ ...formData, costo_item: val, estimated_value: val });
                                            }}
                                            required
                                        />
                                    </div>
                                </div>
                            )}
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
                        {catalogCanStarforce ? (
                            <Input
                                label="Star Force"
                                type="number"
                                min={0}
                                max={25}
                                value={formData.star_force}
                                onChange={(e) => setFormData({ ...formData, star_force: parseInt(e.target.value) || 0 })}
                            />
                        ) : (
                            <div />
                        )}
                        {catalogAlwaysTradeable ? (
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>Tradeability</div>
                                <div style={{ padding: '6px 0', fontSize: '0.875rem' }}>Tradeable <small style={{ opacity: 0.5 }}>(locked)</small></div>
                            </div>
                        ) : (
                            <Select
                                label="Tradeability"
                                value={formData.tradeability}
                                onChange={(value) => setFormData({ ...formData, tradeability: value as TradeabilityType })}
                                options={TRADEABILITY_OPTIONS}
                            />
                        )}
                        {!catalogInfiniteTrades && !catalogAlwaysTradeable ? (
                            <Input
                                label="Slots"
                                type="number"
                                min={0}
                                max={10}
                                value={formData.remaining_trade_slots ?? 0}
                                onChange={(e) => setFormData({ ...formData, remaining_trade_slots: parseInt(e.target.value) || 0 })}
                            />
                        ) : (
                            <div />
                        )}
                        <Select
                            label="Status"
                            value={formData.status}
                            onChange={(value) => setFormData({ ...formData, status: value as ItemStatus })}
                            options={STATUS_OPTIONS.filter(opt => opt.value !== 'delivered')}
                        />
                        {editingItem && (
                            <Input
                                label="Item Cost"
                                type="number"
                                min={0}
                                step="0.01"
                                value={formData.costo_item}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setFormData({ ...formData, costo_item: val, estimated_value: val });
                                }}
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
                                onChange={(e) => setFormData({ ...formData, main_potential_1: e.target.value || null })}
                                placeholder="Potential Line 1"
                            />
                            <Input
                                value={formData.main_potential_2 || ''}
                                onChange={(e) => setFormData({ ...formData, main_potential_2: e.target.value || null })}
                                placeholder="Potential Line 2"
                            />
                            <Input
                                value={formData.main_potential_3 || ''}
                                onChange={(e) => setFormData({ ...formData, main_potential_3: e.target.value || null })}
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
                                onChange={(e) => setFormData({ ...formData, bonus_potential_1: e.target.value || null })}
                                placeholder="Bonus Potential Line 1"
                            />
                            <Input
                                value={formData.bonus_potential_2 || ''}
                                onChange={(e) => setFormData({ ...formData, bonus_potential_2: e.target.value || null })}
                                placeholder="Bonus Potential Line 2"
                            />
                            <Input
                                value={formData.bonus_potential_3 || ''}
                                onChange={(e) => setFormData({ ...formData, bonus_potential_3: e.target.value || null })}
                                placeholder="Bonus Potential Line 3"
                            />
                        </div>
                    </div>

                    <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                        {editingItem ? (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => handleDelete(editingItem.id)}
                            >
                                Delete
                            </Button>
                        ) : <div />}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!selectedAccountId || !formData.character_id || !currentItemDBId || isSubmitting}
                                loading={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Item'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Sell Modal */}
            <Modal
                title={`Sell: ${sellingItem?.name || 'Item'}`}
                isOpen={sellModalOpen}
                onClose={() => setSellModalOpen(false)}
                size="md"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
                    {/* Price Input */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>
                                    Sale Price (b Mesos)
                                </label>
                                <input
                                    type="number"
                                    value={salePrice}
                                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid #444',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        fontSize: '1.25rem',
                                        textAlign: 'right'
                                    }}
                                />
                            </div>
                        </div>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                            Price in billions of Mesos
                        </span>
                    </div>

                    {/* Sale Type Toggle */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>
                            Sale Type
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                                type="button"
                                variant={saleType === 'AH' ? 'primary' : 'secondary'}
                                onClick={() => setSaleType('AH')}
                                style={{ flex: 1 }}
                            >
                                Auction House
                            </Button>
                            <Button
                                type="button"
                                variant={saleType === 'Client' ? 'primary' : 'secondary'}
                                onClick={() => setSaleType('Client')}
                                style={{ flex: 1 }}
                            >
                                Client
                            </Button>
                        </div>
                    </div>

                    {/* Client Selector (only for Client sale) */}
                    {saleType === 'Client' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>
                                Select Client
                            </label>
                            <Select
                                value={selectedClientId}
                                onChange={(value) => setSelectedClientId(value)}
                                options={[
                                    { value: '', label: 'Select a client...' },
                                    ...clients.map(c => ({ value: c.id, label: c.name }))
                                ]}
                            />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <Button type="button" variant="secondary" onClick={() => setSellModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            disabled={(saleType === 'Client' && !selectedClientId) || isSelling}
                            loading={isSelling}
                            onClick={async () => {
                                if (!sellingItem || isSelling) return;

                                try {
                                    setIsSelling(true);
                                    if (saleType === 'AH') {
                                        // AH Sale: Add mesos to item's account and create transaction
                                        const character = characters.find(c => c.id === sellingItem.character_id);
                                        if (character) {
                                            const account = accounts.find(a => a.id === character.account_id);
                                            if (account) {
                                                const fee = salePrice * 0.05;
                                                const netSale = salePrice - fee;

                                                // Update account mesos_b
                                                const newMesos = (account.mesos_b || 0) + netSale;
                                                await accountsService.update(account.id, { mesos_b: newMesos });

                                                // Create income transaction for AH sale in Meso table
                                                await transactionsService.createMeso({
                                                    account_id: account.id,
                                                    type: 'income',
                                                    amount: salePrice,
                                                    description: `AH Sale: ${sellingItem.name}`,
                                                    item_id: sellingItem.id
                                                });

                                                // Create expense transaction for AH Fee
                                                await transactionsService.createMeso({
                                                    account_id: account.id,
                                                    type: 'expense',
                                                    amount: fee,
                                                    description: `Auction House Fee (5%) - ${sellingItem.name}`,
                                                    item_id: sellingItem.id
                                                });
                                            }
                                        }
                                    } else {
                                        // Client Sale: Create AR v2 ledger entry in Mesos (b)
                                        const potentialParts: string[] = [];
                                        if (sellingItem.main_potential_tier) {
                                            const lines = [sellingItem.main_potential_1, sellingItem.main_potential_2, sellingItem.main_potential_3].filter(Boolean).join(' / ');
                                            potentialParts.push(`${sellingItem.main_potential_tier}: ${lines}`);
                                        }
                                        if (sellingItem.bonus_potential_tier) {
                                            const lines = [sellingItem.bonus_potential_1, sellingItem.bonus_potential_2, sellingItem.bonus_potential_3].filter(Boolean).join(' / ');
                                            potentialParts.push(`Bonus ${sellingItem.bonus_potential_tier}: ${lines}`);
                                        }
                                        const today = new Date();
                                        const entryDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                        await clientLedgerService.addEntry({
                                            client_id: selectedClientId,
                                            entry_type: 'charge',
                                            description: sellingItem.name,
                                            amount: salePrice,
                                            currency: 'Mesos (b)',
                                            entry_date: entryDate,
                                            notes: potentialParts.length > 0 ? potentialParts.join(' | ') : null,
                                        });
                                    }

                                    // Update item status to 'sold' and the sale price
                                    await itemsService.update(sellingItem.id, {
                                        status: 'sold',
                                        estimated_value: salePrice
                                    });

                                    // Update local state
                                    setItems(prev => prev.map(item =>
                                        item.id === sellingItem.id ? { ...item, status: 'sold', estimated_value: salePrice } : item
                                    ));

                                    setSellModalOpen(false);
                                    setSellingItem(null);
                                } catch (error) {
                                    console.error('Error processing sale:', error);
                                } finally {
                                    setIsSelling(false);
                                }
                            }}
                        >
                            Confirm Sale
                        </Button>
                    </div>
                </div>
            </Modal>
        </div >
    );
};

export default Items;
