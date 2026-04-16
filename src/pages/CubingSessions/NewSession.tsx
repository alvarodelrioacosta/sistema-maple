
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Select, CustomSelect, Input, Modal } from '../../components/UI'; // Added Modal
import { clientsService, itemsService, cubeSessionsService, charactersService, itemsDBService, accountsService, resourcesService, appSettingsService } from '../../services';
import type { Client, Item, ItemDB, Character, Account, PotentialTier, TradeabilityType, ItemInsert } from '../../types'; // Added types
import { CURRENCIES } from '../../constants/currencies'; // Added CURRENCIES
import { createWorker } from 'tesseract.js';
import { ocrUtil } from '../../utils/ocr';



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

export const NewSession: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [itemProvidedByClient, setItemProvidedByClient] = useState<boolean>(false);

    // Pricing State (Editable)
    const [brightCubePrice, setBrightCubePrice] = useState<number>(0);
    const [bonusCubePrice, setBonusCubePrice] = useState<number>(0);
    const [solidCubePrice, setSolidCubePrice] = useState<number>(0); // Added state
    const [clientCurrency, setClientCurrency] = useState<string>(''); // Added currency state
    const [mesoRate, setMesoRate] = useState<number>(0); // Added Meso Rate state

    // Items Lists
    const [stockItems, setStockItems] = useState<Item[]>([]);
    const [serviceItems, setServiceItems] = useState<Item[]>([]); // Items with status 'Service'
    const [selectedItemId, setSelectedItemId] = useState<string>(''); // Single state for selected item (stock OR service)

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalFormData, setModalFormData] = useState<ItemInsert>({
        name: '',
        character_id: null,
        star_force: 0,
        tradeability: 'Tradeable',
        remaining_trade_slots: 0,
        estimated_value: 0,
        main_potential_tier: null,
        main_potential_1: null, main_potential_2: null, main_potential_3: null,
        bonus_potential_tier: null,
        bonus_potential_1: null, bonus_potential_2: null, bonus_potential_3: null,
        costo_item: 0,
        costo_cubos: 0,
        costo_psok: 0,
        costo_sf: 0,
        costo_perfect_innoc: 0,
        costo_guardian_scroll: 0,
        costo_replacement: 0,
        costo_total: 0,
        status: 'Service', // DEFAULT STATUS
        delivered: false,
        ah_listed_at: null
    });

    // Helper Data for Modal
    const [itemDBs, setItemDBs] = useState<ItemDB[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [selectedModalAccountId, setSelectedModalAccountId] = useState<string>(''); // For filtering chars in modal
    const [resourceMetadata, setResourceMetadata] = useState<Record<string, { image: string, rpCost: number, mesoCost: number }>>({}); // Added metadata state

    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [ocrMessage, setOcrMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // Initial Load
    useEffect(() => {
        const loadInitial = async () => {
            try {
                const [clientsData, itemsData, dbData, accountsData, charsData, metaData, mesoUsdRate, activeItemIds] = await Promise.all([
                    clientsService.getAll(),
                    itemsService.getAll(),
                    itemsDBService.getAll(),
                    accountsService.getAll(),
                    charactersService.getAll(),
                    resourcesService.getResourceMetadata(),
                    appSettingsService.getMesoUsdRate(),
                    cubeSessionsService.getItemIdsInActiveSessions()
                ]);
                setClients(clientsData);
                const availableItems = itemsData.filter(i => !activeItemIds.includes(i.id) && !i.delivered);
                setStockItems(availableItems.filter(i => i.status === 'in_stock'));
                setServiceItems(availableItems.filter(i => i.status === 'Service'));

                setItemDBs(dbData);
                setAccounts(accountsData);
                setCharacters(charsData);
                setResourceMetadata(metaData);
                setMesoRate(mesoUsdRate);

            } catch (err) {
                console.error("Error loading initial data", err);
            }
        };
        loadInitial();
    }, []);

    // Update prices when client changes
    useEffect(() => {
        const client = clients.find(c => c.id === selectedClientId);
        if (client) {
            // Check if client has custom prices, otherwise use defaults from metadata
            const defaultBright = resourceMetadata['bright_cubes']?.mesoCost || 0;
            const defaultBonus = resourceMetadata['bonus_bright_cubes']?.mesoCost || 0;
            const defaultSolid = resourceMetadata['solid_cubes']?.mesoCost || 0.05;

            if (client.bright_cube_price > 0 || client.bonus_bright_cube_price > 0 || client.solid_cubes_price > 0) {
                setBrightCubePrice(client.bright_cube_price);
                setBonusCubePrice(client.bonus_bright_cube_price);
                setSolidCubePrice(client.solid_cubes_price > 0 ? client.solid_cubes_price : defaultSolid);
                setClientCurrency(client.currency || 'Mesos (b)');
            } else {
                setBrightCubePrice(defaultBright);
                setBonusCubePrice(defaultBonus);
                setSolidCubePrice(defaultSolid);
                setClientCurrency('Mesos (b)'); // Force Mesos for defaults
            }
        } else {
            setBrightCubePrice(0);
            setBonusCubePrice(0);
            setSolidCubePrice(0);
            setClientCurrency('');
        }
    }, [selectedClientId, clients, resourceMetadata]);

    const isAlvaro = clients.find(c => c.id === selectedClientId)?.name === 'Alvaro';

    // Enforce "Our Stock" for Alvaro
    useEffect(() => {
        if (isAlvaro) {
            setItemProvidedByClient(false);
            setSelectedItemId(''); // Reset selection if switching
        }
    }, [isAlvaro]);


    // --- MODAL LOGIC (Replicated from Items.tsx) ---

    const handleOpenCreateModal = () => {
        // Reset form
        setModalFormData({
            name: '',
            character_id: null,
            star_force: 0,
            tradeability: 'Tradeable',
            remaining_trade_slots: 0,
            estimated_value: 0,
            main_potential_tier: null,
            main_potential_1: null, main_potential_2: null, main_potential_3: null,
            bonus_potential_tier: null,
            bonus_potential_1: null, bonus_potential_2: null, bonus_potential_3: null,
            costo_item: 0, costo_cubos: 0, costo_psok: 0, costo_sf: 0,
            costo_perfect_innoc: 0, costo_guardian_scroll: 0, costo_replacement: 0, costo_total: 0,
            status: 'Service', // Force Service
            delivered: false,
            ah_listed_at: null
        });
        setSelectedModalAccountId('');
        setModalOpen(true);
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!modalFormData.character_id) {
            alert('Items must always be assigned to a character.');
            return;
        }

        try {
            const newItem = await itemsService.create(modalFormData as ItemInsert);

            // Reload Items to get the new one in list
            const allItems = await itemsService.getAll();
            setStockItems(allItems.filter(i => i.status === 'in_stock'));
            const newServiceItems = allItems.filter(i => i.status === 'Service');
            setServiceItems(newServiceItems);

            // AUTO SELECT
            setSelectedItemId(newItem.id);
            setItemProvidedByClient(true); // Ensure tab is correct

            setModalOpen(false);
            setMessage({ type: 'success', text: 'Item created and selected!' });

        } catch (error) {
            console.error('Error creating item:', error);
            alert('Failed to create item');
        }
    };

    // --- OCR LOGIC (Replicated) ---
    const processImageText = (text: string) => {
        const result = ocrUtil.processItemImageText(text, itemDBs);

        if (!result.success) {
            setOcrMessage({ type: 'error', text: result.error || 'Failed to scan item.' });
            return;
        }

        const { success, error, ...updates } = result;
        setModalFormData(prev => ({ ...prev, ...updates }));
        setOcrMessage({ type: 'success', text: 'Scanned item info!' });
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        let blob: Blob | null = null;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) { blob = items[i].getAsFile(); break; }
        }
        if (blob) {
            setOcrLoading(true);
            setOcrMessage(null); // Clear previous message
            setOcrMessage({ type: 'info', text: 'Analyzing...' });
            try {
                const worker = await createWorker('eng');
                const ret = await worker.recognize(blob);
                processImageText(ret.data.text);
                await worker.terminate();
            } catch (err) {
                console.error(err);
                setOcrMessage({ type: 'error', text: 'Failed to process.' });
            } finally {
                setOcrLoading(false);
            }
        }
    };

    const handleBeginSession = async () => {
        if (!selectedClientId) {
            setMessage({ type: 'error', text: 'Please select a Client.' });
            return;
        }
        if (!selectedItemId) {
            setMessage({ type: 'error', text: 'Please select an Item.' });
            return;
        }

        setLoading(true);
        try {
            // Check existing session
            const existing = await cubeSessionsService.getActiveSessionByItemId(selectedItemId);

            // Should redirect... 
            // We need to pass the EDITED prices too?
            // UpgradeWorkspaceV2 currently reads Client prices from DB client object.
            // If I want to override prices for THIS session, I need to create the session with these prices.
            // If session exists, we use existing.
            // If new session, we create with these prices.

            let sessionId = existing?.id;
            // Get item to find account
            const allItems = [...stockItems, ...serviceItems];
            const item = allItems.find(i => i.id === selectedItemId);
            let accountId = '';
            if (item && item.character_id) {
                const char = characters.find(c => c.id === item.character_id);
                if (char) accountId = char.account_id;
            }

            if (!existing) {

                // Check if prices changed and update client if needed
                const client = clients.find(c => c.id === selectedClientId);
                if (client) {
                    const priceChanged = client.bright_cube_price !== Number(brightCubePrice) ||
                        client.bonus_bright_cube_price !== Number(bonusCubePrice) ||
                        client.solid_cubes_price !== Number(solidCubePrice);
                    const currencyChanged = client.currency !== clientCurrency;

                    if (priceChanged || currencyChanged) {
                        await clientsService.update(client.id, {
                            bright_cube_price: Number(brightCubePrice),
                            bonus_bright_cube_price: Number(bonusCubePrice),
                            solid_cubes_price: Number(solidCubePrice),
                            currency: clientCurrency
                        });
                        console.log('Client pricing/currency info updated');
                    }
                }

                const newSession = await cubeSessionsService.create({
                    item_id: selectedItemId,
                    client_id: selectedClientId,
                    account_id: accountId, // Required field
                    psok_used: 0,
                    bright_cubes_used: 0,
                    bonus_bright_cubes_used: 0,
                    solid_cubes_used: 0,
                    perfect_innoc_used: 0,
                    gaurdian_scroll_used: 0,
                    psok_price: 0, // Should be customizable? User asked for Cube px.
                    bright_cubes_price: brightCubePrice, // USE EDITED PRICE
                    bonus_bright_cubes_price: bonusCubePrice, // USE EDITED PRICE
                    solid_cubes_price: solidCubePrice, // USE EDITED PRICE
                    perfect_innoc_price: 0,
                    gaurdian_scroll_price: 0,
                    cubing_session_total: 0,
                    cubing_session_status: 'Ongoing',
                    currency: clientCurrency, // Added currency field
                    meso_rate: mesoRate // Added Meso Rate
                });
                sessionId = newSession.id;
            }

            navigate('/upgrade-workspace-v2', { state: { itemId: selectedItemId, sessionId: sessionId, accountId: accountId } });
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Error creating session' });
        } finally {
            setLoading(false);
        }
    };

    // Derived values
    const renderItemOption = (item: Item) => {
        const mLines = [item.main_potential_1, item.main_potential_2, item.main_potential_3]
            .filter(Boolean)
            .join(', ');

        const bLines = [item.bonus_potential_1, item.bonus_potential_2, item.bonus_potential_3]
            .filter(Boolean)
            .join(', ');

        const mTierClass = item.main_potential_tier ? `text-${item.main_potential_tier.toLowerCase()}` : '';
        const bTierClass = item.bonus_potential_tier ? `text-${item.bonus_potential_tier.toLowerCase()}` : '';

        return (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline', flexWrap: 'nowrap' }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span style={{ color: 'var(--color-text-secondary)', marginLeft: '4px' }}>(</span>
                {mLines && (
                    <span className={mTierClass} style={{ fontWeight: 500 }}>
                        {mLines}
                    </span>
                )}
                {mLines && bLines && <span style={{ color: 'var(--color-text-secondary)', margin: '0 4px' }}>/</span>}
                {bLines && (
                    <span className={bTierClass} style={{ fontWeight: 500 }}>
                        {bLines}
                    </span>
                )}
                {!mLines && !bLines && <span style={{ color: 'var(--color-text-tertiary)' }}>No Potentials</span>}
                <span style={{ color: 'var(--color-text-secondary)' }}>)</span>
            </div>
        );
    };

    const itemOptions = itemProvidedByClient
        ? serviceItems.map(i => ({
            value: i.id,
            label: `${i.name} ${i.main_potential_tier || ''} ${i.bonus_potential_tier || ''}`,
            render: renderItemOption(i)
        }))
        : stockItems.map(i => ({
            value: i.id,
            label: `${i.name} ${i.main_potential_tier || ''} ${i.bonus_potential_tier || ''}`,
            render: renderItemOption(i)
        }));

    return (
        <Card className="new-session-container">
            {message && <div className={`workspace-message workspace-message--${message.type}`} style={{ marginBottom: '1rem' }}>{message.text}</div>}

            {/* STEP 1: CLIENT & PRICING */}
            <div className="new-session-step">
                <h3>1. Select Client & Pricing</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <Select
                            label="Client"
                            value={selectedClientId}
                            onChange={setSelectedClientId}
                            options={[{ value: '', label: 'Select...' }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
                        />
                    </div>
                    {selectedClientId && (
                        <>
                            <div style={{ width: '150px' }}>
                                <Input
                                    label="Bright Cube Price"
                                    type="number"
                                    value={brightCubePrice}
                                    onChange={(e) => setBrightCubePrice(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div style={{ width: '150px' }}>
                                <Input
                                    label="Bonus Cube Price"
                                    type="number"
                                    value={bonusCubePrice}
                                    onChange={(e) => setBonusCubePrice(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div style={{ width: '150px' }}>
                                <Input
                                    label="Solid Cube Price"
                                    type="number"
                                    value={solidCubePrice}
                                    onChange={(e) => setSolidCubePrice(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div style={{ width: '150px' }}>
                                <Select
                                    label="Currency"
                                    value={clientCurrency}
                                    onChange={setClientCurrency}
                                    options={CURRENCIES}
                                />
                            </div>
                            <div style={{ width: '150px' }}>
                                <Input
                                    label="Meso Rate (USD/B)"
                                    type="number"
                                    step={0.01}
                                    value={mesoRate}
                                    onChange={(e) => setMesoRate(parseFloat(e.target.value) || 0)}
                                    placeholder="e.g. 2.3"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* STEP 2: ITEM */}
            {selectedClientId && (
                <div className="new-session-step">
                    <h3>2. Select Item</h3>

                    <div className="client-item-toggle">
                        <span style={{ marginRight: '1rem' }}>Item provided by client?</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {!isAlvaro && (
                                <Button size="sm" variant={itemProvidedByClient ? 'primary' : 'secondary'} onClick={() => { setItemProvidedByClient(true); setSelectedItemId(''); }}>
                                    Yes (Create New)
                                </Button>
                            )}
                            <Button size="sm" variant={!itemProvidedByClient ? 'primary' : 'secondary'} onClick={() => { setItemProvidedByClient(false); setSelectedItemId(''); }}>
                                No (Our Stock)
                            </Button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                        <div style={{ flex: 1 }}>
                            <CustomSelect
                                label={`Select Item (${itemProvidedByClient ? 'Service' : 'Stock'})`}
                                value={selectedItemId}
                                onChange={setSelectedItemId}
                                options={[{ value: '', label: 'Select item...' }, ...itemOptions]}
                            />
                        </div>
                        {itemProvidedByClient && (
                            <Button onClick={handleOpenCreateModal}>+ Create New Service Item</Button>
                        )}
                    </div>
                </div>
            )}

            {/* ACTIONS */}
            <div className="new-session-step" style={{ marginTop: '2rem', textAlign: 'right' }}>
                <Button
                    variant="primary" size="lg"
                    onClick={handleBeginSession} loading={loading}
                    disabled={!selectedClientId || !selectedItemId}
                >
                    Begin Session
                </Button>
            </div>

            {/* --- MODAL FOR NEW ITEM --- */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Service Item" size="xl">
                <form onSubmit={handleModalSubmit} className="modal-form items-form">
                    {/* Simplified Reused Form Layout */}
                    <div className="form-grid-2">
                        <Select label="Account" value={selectedModalAccountId} onChange={(v) => { setSelectedModalAccountId(v); setModalFormData({ ...modalFormData, character_id: null }); }}
                            options={[{ value: '', label: 'Select Account' }, ...accounts.map(a => ({ value: a.id, label: `Acc ${a.number} - ${a.email || a.id}` }))]} />
                        <Select label="Character (Required)" value={modalFormData.character_id || ''} onChange={(v) => setModalFormData({ ...modalFormData, character_id: v })}
                            options={[{ value: '', label: 'Select...' }, ...characters.filter(c => !selectedModalAccountId || c.account_id === selectedModalAccountId).map(c => ({ value: c.id, label: c.name }))]} />
                    </div>

                    <div className="form-row-item-selection" style={{ marginTop: '1rem' }}>
                        <CustomSelect label="Name (Catalog)" value={itemDBs.find(d => d.name === modalFormData.name)?.id || ''}
                            onChange={(v) => { const db = itemDBs.find(d => d.id === v); if (db) setModalFormData({ ...modalFormData, name: db.name, remaining_trade_slots: db.slots }); }}
                            options={[{ value: '', label: 'Select...' }, ...itemDBs.map(d => ({ value: d.id, label: d.name }))]} />

                        <div className={`paste-zone-compact ${ocrLoading ? 'processing' : ''}`} onPaste={handlePaste} tabIndex={0} style={{ width: '200px' }}>
                            {ocrLoading ? 'Scanning...' : '📋 Paste (OCR)'}
                            {ocrMessage && <div style={{ fontSize: '0.8em', color: ocrMessage.type === 'error' ? 'red' : 'green' }}>{ocrMessage.text}</div>}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px', gap: '1rem', marginTop: '1rem' }}>
                        <Input label="Star Force" type="number" value={modalFormData.star_force} onChange={e => setModalFormData({ ...modalFormData, star_force: parseInt(e.target.value) || 0 })} />
                        <Select label="Tradeability" value={modalFormData.tradeability} onChange={v => setModalFormData({ ...modalFormData, tradeability: v as TradeabilityType })} options={TRADEABILITY_OPTIONS} />
                        <Input label="Slots" type="number" value={modalFormData.remaining_trade_slots} onChange={e => setModalFormData({ ...modalFormData, remaining_trade_slots: parseInt(e.target.value) || 0 })} />
                    </div>

                    <div className="form-grid-potentials" style={{ marginTop: '1rem' }}>
                        <div className="potential-card">
                            <h4>Main Potential</h4>
                            <Select label="" value={modalFormData.main_potential_tier || ''} onChange={v => setModalFormData({ ...modalFormData, main_potential_tier: v as PotentialTier })} options={TIER_OPTIONS} />
                            <Input value={modalFormData.main_potential_1 || ''} onChange={e => setModalFormData({ ...modalFormData, main_potential_1: e.target.value })} placeholder="Potential Line 1" />
                            <Input value={modalFormData.main_potential_2 || ''} onChange={e => setModalFormData({ ...modalFormData, main_potential_2: e.target.value })} placeholder="Potential Line 2" />
                            <Input value={modalFormData.main_potential_3 || ''} onChange={e => setModalFormData({ ...modalFormData, main_potential_3: e.target.value })} placeholder="Potential Line 3" />
                        </div>
                        <div className="potential-card">
                            <h4>Bonus Potential</h4>
                            <Select label="" value={modalFormData.bonus_potential_tier || ''} onChange={v => setModalFormData({ ...modalFormData, bonus_potential_tier: v as PotentialTier })} options={TIER_OPTIONS} />
                            <Input value={modalFormData.bonus_potential_1 || ''} onChange={e => setModalFormData({ ...modalFormData, bonus_potential_1: e.target.value })} placeholder="Bonus Potential Line 1" />
                            <Input value={modalFormData.bonus_potential_2 || ''} onChange={e => setModalFormData({ ...modalFormData, bonus_potential_2: e.target.value })} placeholder="Bonus Potential Line 2" />
                            <Input value={modalFormData.bonus_potential_3 || ''} onChange={e => setModalFormData({ ...modalFormData, bonus_potential_3: e.target.value })} placeholder="Bonus Potential Line 3" />
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                        <Button type="submit" variant="primary">Create & Select</Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
};
