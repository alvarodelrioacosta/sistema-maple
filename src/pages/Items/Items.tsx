// =============================================
// ITEMS PAGE - Gestión de objetos
// =============================================

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '../../components/Layout';
import { Button, Table, Modal, Input, Select, Card } from '../../components/UI';
import { itemsService, charactersService, itemsDBService, accountsService, clientsService, accountsReceivableService, transactionsService, financialAccountsService, sharedInventoryService, exchangeRatesService, potentialsService } from '../../services';
import type { ItemWithCharacter, ItemInsert, Character, ItemStatus, PotentialTier, ItemDB, TradeabilityType, Account, Client, FinancialAccount, SharedInventory, ExchangeRate, Potential } from '../../types';
import { formatCurrencyValue } from '../../utils/format';
import type { Column } from '../../components/UI/Table';
import './Items.css';
import { createWorker } from 'tesseract.js';
import { ocrUtil } from '../../utils/ocr';



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

const getStatusClass = (status: ItemStatus) => {
    const classes: Record<ItemStatus, string> = {
        bulk: 'status-bulk',
        in_progress: 'status-in-progress',
        in_stock: 'status-in-stock',
        for_sale: 'status-for-sale',
        sold: 'status-sold',
        Service: 'status-service',
        in_use: 'status-in-use'
    };
    return classes[status];
};

// --- SUB-COMPONENT FOR EDITABLE PRICE ---
interface EditablePriceCellProps {
    item: ItemWithCharacter;
    onUpdate: (id: string, value: number) => Promise<void>;
}

const EditablePriceCell: React.FC<EditablePriceCellProps> = ({ item, onUpdate }) => {
    const [localValue, setLocalValue] = useState<string>(item.estimated_value?.toString() || '0');
    const [isSaving, setIsSaving] = useState(false);

    // Sync with external changes (e.g. if items are reloaded)
    useEffect(() => {
        setLocalValue(item.estimated_value?.toString() || '0');
    }, [item.estimated_value]);

    const handleBlur = async () => {
        const newValue = parseFloat(localValue) || 0;
        if (newValue === item.estimated_value) return;

        setIsSaving(true);
        try {
            await onUpdate(item.id, newValue);
        } catch (error) {
            console.error('Error updating price:', error);
            // Revert on error
            setLocalValue(item.estimated_value?.toString() || '0');
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <input
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
                width: '60px',
                padding: '6px 10px',
                background: isSaving ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                border: isSaving ? '1px solid #666' : '1px solid #444',
                borderRadius: '4px',
                color: isSaving ? '#888' : '#fff',
                textAlign: 'center',
                fontSize: '1rem',
                transition: 'all 0.2s'
            }}
            disabled={isSaving}
        />
    );
};

export const Items: React.FC = () => {
    const [items, setItems] = useState<ItemWithCharacter[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [itemsDB, setItemsDB] = useState<ItemDB[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccountId, setSelectedAccountId] = useState<string>(''); // New state for Account Filter

    const [filterStatus, setFilterStatus] = useState<ItemStatus | 'all'>('in_stock'); // State for Filter
    const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
    const [sharedChest, setSharedChest] = useState<SharedInventory | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ItemWithCharacter | null>(null);
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
    const [mainPotentials, setMainPotentials] = useState<Potential[]>([]);
    const [bonusPotentials, setBonusPotentials] = useState<Potential[]>([]);

    const potentialRankMap = useMemo(() => {
        const map = new Map<string, string>();
        mainPotentials.forEach(p => map.set(p.potential_name, p.rank));
        bonusPotentials.forEach(p => map.set(p.potential_name, p.rank));
        return map;
    }, [mainPotentials, bonusPotentials]);



    // Acquisition state (transient for creation)
    const [acquisitionType, setAcquisitionType] = useState<'Drop' | 'Purchase'>('Drop');
    const [purchaseSourceId, setPurchaseSourceId] = useState<string>(''); // Can be financial account ID, game account ID, or 'shared-vault'
    const [purchaseSourceType, setPurchaseSourceType] = useState<'financial' | 'mesos'>('mesos');
    const [realAmountPaid, setRealAmountPaid] = useState<number>(0);
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
    const [saleRate, setSaleRate] = useState(0);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [isSelling, setIsSelling] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [itemsData, charsData, itemsDBData, accountsData, clientsData, finData, sharedData, ratesData, mainPots, bonusPots] = await Promise.all([
                itemsService.getAll(),
                charactersService.getAll(),
                itemsDBService.getAll(),
                accountsService.getAll(),
                clientsService.getAll(),
                financialAccountsService.getAll(),
                sharedInventoryService.get().catch(() => null),
                exchangeRatesService.getAll(),
                potentialsService.getMainPotentials(),
                potentialsService.getBonusPotentials()
            ]);
            setItems(itemsData);
            setCharacters(charsData);
            setItemsDB(itemsDBData);
            setAccounts(accountsData);
            setClients(clientsData);
            setFinancialAccounts(finData);
            setSharedChest(sharedData);
            setExchangeRates(ratesData);
            setMainPotentials(mainPots);
            setBonusPotentials(bonusPots);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-calculate Item Cost when paying in real money
    useEffect(() => {
        if (acquisitionType === 'Purchase' && purchaseSourceType === 'financial' && purchaseSourceId && realAmountPaid > 0) {
            const finAcc = financialAccounts.find(a => a.id === purchaseSourceId);
            if (finAcc) {
                // Try case-insensitive comparison
                const rateObj = exchangeRates.find(r =>
                    r.base_currency.toLowerCase() === finAcc.currency.toLowerCase() &&
                    r.target_currency.toLowerCase().includes('mesos')
                );

                if (rateObj) {
                    const result = realAmountPaid * rateObj.rate;
                    setFormData(prev => ({ ...prev, costo_item: result, estimated_value: result }));
                } else {
                    console.log('No exchange rate found for:', finAcc.currency, 'to mesos');
                }
            }
        }
    }, [realAmountPaid, purchaseSourceId, purchaseSourceType, acquisitionType, financialAccounts, exchangeRates]);

    // Auto-set Sale Rate when Sale Type is Client
    useEffect(() => {
        if (saleType === 'Client') {
            const rateObj = exchangeRates.find(r =>
                r.base_currency === 'Mesos (b)' && r.target_currency === 'USD'
            );
            if (rateObj) {
                setSaleRate(rateObj.rate);
            }
        }
    }, [saleType, exchangeRates]);

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
            setPurchaseSourceType('mesos');
            setRealAmountPaid(0);
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

                            // 1. Log meso transaction
                            await transactionsService.createMeso({
                                account_id: isVault ? null : purchaseSourceId,
                                type: 'expense',
                                amount: costToLog,
                                description: `Purchase: - ${formData.name}`,
                                item_id: createdItem.id,
                                category: 'Mesos',
                                subcategory: 'Items / Cubes'
                            });

                            // 2. Update balance
                            if (isVault) {
                                const current = sharedChest?.mesos_stock || 0;
                                await sharedInventoryService.updateMesos(current - costToLog);
                            } else {
                                const acc = accounts.find(a => a.id === purchaseSourceId);
                                if (acc) {
                                    await accountsService.update(acc.id, { mesos_b: (acc.mesos_b || 0) - costToLog });
                                }
                            }
                        } else if (purchaseSourceType === 'financial') {
                            const finAcc = financialAccounts.find(a => a.id === purchaseSourceId);
                            // 1. Log financial transaction
                            await transactionsService.create({
                                financial_account_id: purchaseSourceId,
                                type: 'expense',
                                amount: realAmountPaid,
                                currency: finAcc?.currency || 'USD',
                                description: `Purchase Item: ${formData.name} (${costToLog} b)`,
                                item_id: createdItem.id,
                                is_paid: true
                            } as any);

                            // 2. Update balance
                            if (finAcc) {
                                await financialAccountsService.update(finAcc.id, { balance: (finAcc.balance || 0) - realAmountPaid });
                            }

                            // 3. Log meso income (since we "bought" it with real money, it's like a meso expense for the item)
                            // But wait, if it's a purchase from a financial account, we only log the financial transaction.
                            // The item itself tracks costo_item.
                            //- **Personalización de Tabla**: En la pestaña "In Use", la columna "Email" cambia automáticamente a "Char" y se simplifica para mostrar solo el nombre del personaje.
                            //- **Columna Value Editable**: Los ítems "In Use" ahora muestran la columna **Value**, que permite editar el valor estimado directamente en la tabla.
                            //- **Desglose de Costos (Hover)**: Al pasar el ratón sobre el costo total de cualquier ítem, se muestra una ventana emergente con el desglose detallado (Item, Cubes, SF, etc.), ocultando automáticamente los valores en cero.
                            // But if it's a direct money purchase, the item is just added with that cost.
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

        // Try to fetch acquisition details from transactions
        try {
            // Find transactions associated with this item
            const allTransactions = await transactionsService.getAll();
            const itemTransaction = allTransactions.find(t => t.item_id === item.id && t.type === 'expense');

            if (itemTransaction) {
                setAcquisitionType('Purchase');
                if (itemTransaction.financial_account_id) {
                    setPurchaseSourceType('financial');
                    setPurchaseSourceId(itemTransaction.financial_account_id);
                    setRealAmountPaid(itemTransaction.amount);
                } else {
                    // Check meso transactions if not financial
                    const mesoTransactions = await transactionsService.getAllMesos();
                    const mesoTx = mesoTransactions.find(t => t.item_id === item.id && t.type === 'expense');

                    if (mesoTx) {
                        setPurchaseSourceType('mesos');
                        setPurchaseSourceId(mesoTx.account_id || 'shared-vault');
                    }
                }
            } else {
                setAcquisitionType('Drop');
            }
        } catch (error) {
            console.error('Error fetching acquisition details for copy:', error);
            setAcquisitionType('Drop'); // Fallback
        }

        setModalOpen(true);
        setOcrMessage(null);
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

    const getAccountEmail = (characterId: string | null) => {
        if (!characterId) return '-';
        const char = characters.find(c => c.id === characterId);
        if (!char) return '-';
        const account = accounts.find(a => a.id === char.account_id);
        return account ? account.email : '-';
    };

    const getAccountNumber = (characterId: string | null) => {
        if (!characterId) return null;
        const char = characters.find(c => c.id === characterId);
        if (!char) return null;
        const account = accounts.find(a => a.id === char.account_id);
        return account ? account.number : null;
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

    const columns: Column<ItemWithCharacter>[] = [
        {
            key: 'image_url', // Virtual key for rendering
            header: '',
            render: (i) => {
                const url = getImageUrl(i.name);
                return url ? <img src={url} alt={i.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} /> : null;
            }
        },
        {
            key: 'name',
            header: 'Name',
            render: (i) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>{i.name}</span>
                    {i.star_force > 0 && (
                        <span style={{ fontSize: '0.85em', color: '#facc15' }}>
                            ⭐ {i.star_force}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'email',
            header: filterStatus === 'in_use' ? 'Char' : 'Email',
            width: filterStatus === 'in_use' ? '120px' : '220px',
            render: (i) => {
                if (filterStatus === 'in_use') {
                    return <span style={{ fontWeight: 500 }}>{i.character?.name || '-'}</span>;
                }
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '100%' }}>
                        <span style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.95rem'
                        }} title={(i.character ? getAccountEmail(i.character.id) : '') || undefined}>
                            {i.character ? getAccountEmail(i.character.id) : '-'}
                        </span>
                        {i.character && (
                            <span style={{ fontSize: '0.85em', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {getAccountNumber(i.character.id)} - {i.character.name}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'main_potential_tier',
            header: 'Main Pot',
            width: '180px',
            render: (i) => {
                if (!i.main_potential_tier) return '-';
                const lines = [i.main_potential_1, i.main_potential_2, i.main_potential_3]
                    .filter((l): l is string => typeof l === 'string' && l.trim() !== '');

                if (lines.length === 0) return <span className={`text-${i.main_potential_tier.toLowerCase()}`}>{i.main_potential_tier}</span>;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {lines.map((line, idx) => {
                            const rank = potentialRankMap.get(line) || i.main_potential_tier;
                            return (
                                <span key={idx} className={`potential-line text-${rank?.toLowerCase()}`}>
                                    {line}
                                </span>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            key: 'bonus_potential_tier',
            header: 'Bonus Pot',
            width: '180px',
            render: (i) => {
                if (!i.bonus_potential_tier) return '-';
                const lines = [i.bonus_potential_1, i.bonus_potential_2, i.bonus_potential_3]
                    .filter((l): l is string => typeof l === 'string' && l.trim() !== '');

                if (lines.length === 0) return <span className={`text-${i.bonus_potential_tier.toLowerCase()}`}>{i.bonus_potential_tier}</span>;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {lines.map((line, idx) => {
                            const rank = potentialRankMap.get(line) || i.bonus_potential_tier;
                            return (
                                <span key={idx} className={`potential-line text-${rank?.toLowerCase()}`}>
                                    {line}
                                </span>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            key: 'tradeability',
            header: <div style={{ textAlign: 'center', width: '100%' }}>Tradeability</div>,
            width: '150px',
            render: (i) => {
                const tradeability = i.tradeability || 'Tradeable';
                // Check if this item type has finite slots (slots > 0 in itemsDB)
                const itemDBEntry = itemsDB.find(db => db.name === i.name);
                const hasFiniteSlots = itemDBEntry && itemDBEntry.slots > 0;
                // Show slots only if the item type has finite slots
                const showSlots = hasFiniteSlots && i.remaining_trade_slots !== null && i.remaining_trade_slots !== undefined;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem' }}>{tradeability}</span>
                        {showSlots && (
                            <span style={{ fontSize: '0.85em', color: '#9ca3af' }}>
                                {i.remaining_trade_slots} slots
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'costo_total',
            header: 'Cost',
            width: '40px',
            render: (i) => {
                const breakdown = [
                    { label: 'Item', value: i.costo_item },
                    { label: 'Cubes', value: i.costo_cubos },
                    { label: 'SF', value: i.costo_sf },
                    { label: 'PSOK', value: i.costo_psok },
                    { label: 'Perfect Innocence', value: i.costo_perfect_innoc },
                    { label: 'Guardian Scroll', value: i.costo_guardian_scroll },
                    { label: 'Replacement', value: i.costo_replacement }
                ].filter(b => b.value > 0);

                const tooltip = breakdown.length > 0
                    ? breakdown.map(b => `${b.label}: ${formatValue(b.value)}`).join('\n')
                    : undefined;

                return (
                    <div
                        style={{ textAlign: 'center', width: '100%', cursor: tooltip ? 'help' : 'default' }}
                        title={tooltip}
                    >
                        {formatValue(i.costo_total || 0)}
                    </div>
                );
            }
        },
        // Price/Value column shows for for_sale, sold, and in_use items
        ...((filterStatus === 'for_sale' || filterStatus === 'sold' || filterStatus === 'in_use') ? [{
            key: 'estimated_value' as keyof ItemWithCharacter,
            header: (filterStatus === 'in_use' || filterStatus === 'for_sale') ? 'Value' : 'Price (b)',
            width: '60px',
            render: (i: ItemWithCharacter) => (
                (filterStatus === 'for_sale' || filterStatus === 'in_use') ? (
                    <EditablePriceCell
                        item={i}
                        onUpdate={async (id, newValue) => {
                            await itemsService.updateEstimatedValue(id, newValue);
                            setItems(prev => prev.map(item =>
                                item.id === id ? { ...item, estimated_value: newValue } : item
                            ));
                        }}
                    />
                ) : (
                    <div style={{ textAlign: 'center', width: '100%' }}>
                        <span style={{ fontSize: '1rem' }}>{i.estimated_value || 0}</span>
                    </div>
                )
            )
        }] : []),
        // AH Timer column only shows for for_sale items
        ...(filterStatus === 'for_sale' ? [{
            key: 'ah_listed_at' as keyof ItemWithCharacter,
            header: <div style={{ textAlign: 'center', width: '100%' }}>AH Timer</div>,
            width: '35px',
            render: (i: ItemWithCharacter) => {
                if (!i.ah_listed_at) return (
                    <div style={{ textAlign: 'center', width: '100%' }}>
                        <span style={{ color: '#6b7280' }}>-</span>
                    </div>
                );

                const listedAt = new Date(i.ah_listed_at);
                const now = new Date();
                const diffMs = now.getTime() - listedAt.getTime();
                const hoursElapsed = diffMs / (1000 * 60 * 60);

                if (hoursElapsed >= 48) {
                    return (
                        <div style={{ textAlign: 'center', width: '100%' }}>
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Expired</span>
                        </div>
                    );
                }

                const remainingMs = (48 * 60 * 60 * 1000) - diffMs;
                const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
                const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

                return (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        lineHeight: '1.2'
                    }}>
                        <span style={{ color: remainingHours < 6 ? '#facc15' : '#4ade80' }}>
                            {remainingHours}h
                        </span>
                        <span style={{ color: remainingHours < 6 ? '#facc15' : '#4ade80', fontSize: '0.85em' }}>
                            {remainingMinutes}m
                        </span>
                    </div>
                );
            }
        }] : []),
        // Status column only shows when filter is 'all'
        // - [x] Personalizar columnas de la tabla para el filtro `In Use`
        // - [x] Añadir columna `Value` editable y desglose de `Cost` en hover
        ...(filterStatus === 'all' ? [{
            key: 'status' as keyof ItemWithCharacter,
            header: 'Status',
            render: (i: ItemWithCharacter) => (
                <span className={`status-badge ${getStatusClass(i.status)}`}>
                    {i.status.replace('_', ' ')}
                </span>
            )
        }] : []),
        // Favorite Star column - only for For Sale
        ...(filterStatus === 'for_sale' ? [{
            key: 'is_favorite' as keyof ItemWithCharacter,
            header: <div style={{ textAlign: 'center' }}>★</div>,
            width: '30px',
            render: (i: ItemWithCharacter) => (
                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(i);
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.25rem',
                            color: i.is_favorite ? '#facc15' : 'rgba(255,255,255,0.15)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%'
                        }}
                    >
                        {i.is_favorite ? '★' : '☆'}
                    </button>
                </div>
            )
        }] : []),
        {
            key: 'actions',
            header: 'Actions',
            render: (i) => {
                const isTradeable = i.tradeability === 'Tradeable' || i.tradeability === 'Tradeable Once';

                return (
                    <div className="table-actions">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenModal(i)}>Edit</Button>
                        {i.status === 'for_sale' ? (
                            isTradeable ? (
                                <>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={async () => {
                                            try {
                                                const timestamp = new Date().toISOString();
                                                await itemsService.updateAHListing(i.id, timestamp);
                                                setItems(prev => prev.map(item =>
                                                    item.id === i.id ? { ...item, ah_listed_at: timestamp } : item
                                                ));
                                            } catch (error) {
                                                console.error('Error listing on AH:', error);
                                            }
                                        }}
                                    >
                                        List AH
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => {
                                            setSellingItem(i);
                                            setSalePrice(i.estimated_value || 0);
                                            setSaleType('AH');
                                            setSelectedClientId('');
                                            setSellModalOpen(true);
                                        }}
                                    >
                                        Sold
                                    </Button>
                                </>
                            ) : (
                                <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>
                                    Use PSOK to sell
                                </span>
                            )
                        ) : i.status === 'bulk' && filterStatus === 'bulk' ? (
                            <Button size="sm" variant="secondary" onClick={() => handleCopy(i)}>Copy</Button>
                        ) : i.delivered ? (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleReturnToService(i)}
                                style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.2)' }}
                            >
                                Return to Service
                            </Button>
                        ) : null}
                    </div>
                );
            }
        }
    ];

    const currentItemDBId = itemsDB.find(i => i.name === formData.name)?.id || '';

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

    return (
        <div className="items-page">
            <Header
                title="Items"
                subtitle="Manage your inventory items"
                actions={
                    <Button onClick={() => handleOpenModal()}>+ New Item</Button>
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
                <Card padding="none">
                    <Table
                        data={filteredItems}
                        columns={columns}
                        keyExtractor={(i) => i.id}
                        loading={loading}
                        emptyMessage="No items found with this status."
                    />
                </Card>
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
                                    <div style={{ flex: '1', minWidth: '200px' }}>
                                        <Select
                                            label="Payment"
                                            value={purchaseSourceType}
                                            onChange={(val) => {
                                                setPurchaseSourceType(val as any);
                                                setPurchaseSourceId('');
                                                setRealAmountPaid(0);
                                            }}
                                            options={[
                                                { value: 'mesos', label: 'Mesos' },
                                                { value: 'financial', label: 'Real Money' }
                                            ]}
                                        />
                                    </div>

                                    <div style={{ flex: '1.5', minWidth: '250px' }}>
                                        <Select
                                            label="Deduct from Account"
                                            value={purchaseSourceId}
                                            onChange={(val) => setPurchaseSourceId(val)}
                                            options={[
                                                { value: '', label: 'Select Account...' },
                                                ...(purchaseSourceType === 'mesos' ? [
                                                    { value: 'shared-vault', label: `Shared Vault (${formatCurrencyValue(sharedChest?.mesos_stock || 0)} b)` },
                                                    ...accounts
                                                        .filter(a => (a.mesos_b || 0) > 0)
                                                        .map(a => ({ value: a.id, label: `Acc ${a.number} (${formatCurrencyValue(a.mesos_b || 0)} b)` }))
                                                ] : [
                                                    ...financialAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency} ${formatCurrencyValue(a.balance || 0)})` }))
                                                ])
                                            ]}
                                            required
                                        />
                                    </div>

                                    {purchaseSourceType === 'financial' && (
                                        <div style={{ flex: '1', minWidth: '150px' }}>
                                            <Input
                                                label={`Amount [${financialAccounts.find(a => a.id === purchaseSourceId)?.currency || ''}]`}
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={realAmountPaid}
                                                onChange={(e) => setRealAmountPaid(parseFloat(e.target.value) || 0)}
                                                required
                                            />
                                        </div>
                                    )}

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
                                            disabled={purchaseSourceType === 'financial'}
                                        />
                                        {purchaseSourceType === 'financial' && realAmountPaid > 0 && purchaseSourceId && (
                                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginTop: '4px' }}>
                                                Auto-calculated from rate
                                            </span>
                                        )}
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
                        <div style={{ display: 'grid', gridTemplateColumns: saleType === 'Client' ? '2fr 1fr' : '1fr', gap: '10px' }}>
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
                            {saleType === 'Client' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>
                                        Rate (USD)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={saleRate}
                                        onChange={(e) => setSaleRate(parseFloat(e.target.value) || 0)}
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
                            )}
                        </div>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                            {saleType === 'Client'
                                ? `Total AR: ${(salePrice * saleRate).toFixed(2)} USD`
                                : 'Price is in billions of Mesos'}
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
                                        // Client Sale: Create AR in USD
                                        const arAmountUSD = salePrice * saleRate;
                                        await accountsReceivableService.create({
                                            client_id: selectedClientId,
                                            description: `Item Sale: ${sellingItem.name}`,
                                            amount: Number(arAmountUSD.toFixed(2)),
                                            currency: 'USD',
                                            item_id: sellingItem.id
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
