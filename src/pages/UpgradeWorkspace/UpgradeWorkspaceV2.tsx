import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createWorker } from 'tesseract.js';
import { ocrUtil } from '../../utils/ocr';
import { Header } from '../../components/Layout';
import { Button, Card, Select, Input, ItemTooltip, ResourceHistoryPanel } from '../../components/UI';
import { itemsService, clientsService, accountsService, accountsReceivableService, resourcesService, charactersService, itemsDBService, cubeSessionsService, sharedInventoryService, resourceHistoryService, exchangeRatesService, transactionsService } from '../../services';
import type { Item, Client, Account, ResourceType, PotentialTier, Character, ItemDB, CubeSession, SharedInventory } from '../../types';
import './UpgradeWorkspaceV2.css';

const TIER_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'Rare', label: 'Rare' },
    { value: 'Epic', label: 'Epic' },
    { value: 'Unique', label: 'Unique' },
    { value: 'Legendary', label: 'Legendary' }
];



export const UpgradeWorkspaceV2: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [items, setItems] = useState<Item[]>([]);
    const [itemDBs, setItemDBs] = useState<ItemDB[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);

    // Potentials Data


    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');

    // Cube Usage
    const [brightCubesUsed, setBrightCubesUsed] = useState<number>(0);
    const [bonusCubesUsed, setBonusCubesUsed] = useState<number>(0);
    const [solidCubesUsed, setSolidCubesUsed] = useState<number>(0);
    // Removed unused Legacy state variables (rewardPointsUsed, etc.)

    // Resource Details State
    const [psokConfig, setPsokConfig] = useState({ payment: '', covered: false, price: 0 });
    const [pInnocConfig, setPInnocConfig] = useState({ payment: '', covered: false, price: 0 });
    const [gScrollConfig, setGScrollConfig] = useState({ payment: '', covered: false, price: 0 });

    const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // V2 New State
    const [activeSession, setActiveSession] = useState<CubeSession | null>(null);
    const [showTransferConfirm, setShowTransferConfirm] = useState<{ accountId: string, accountName: string } | null>(null);

    // OCR State
    const [ocrLoading, setOcrLoading] = useState(false);

    // Resource Modal State
    const [showResourceModal, setShowResourceModal] = useState(false);
    const [selectedResourceForUsage, setSelectedResourceForUsage] = useState<{ type: ResourceType | string, label: string, currentQty: number } | null>(null);
    const [resourceMetadata, setResourceMetadata] = useState<Record<string, { image: string, rpCost: number, mesoCost: number }>>({});

    // Toggle for Total Value Display (USD vs Mesos)
    const [showTotalInUSD, setShowTotalInUSD] = useState(true);

    // Fast Cubing State
    const [isFastCubingActive, setIsFastCubingActive] = useState(false);
    const [fastCubingSelection, setFastCubingSelection] = useState<Record<string, { bright_cubes?: boolean, bonus_bright_cubes?: boolean, solid_cubes?: boolean }>>({});

    useEffect(() => {
        const state = location.state as { itemId?: string; accountId?: string } | null;
        if (state) {
            const { itemId, accountId } = state;
            if (itemId) setSelectedItemId(itemId);
            if (accountId) setSelectedAccountId(accountId);
        }
    }, [location]);

    useEffect(() => {
        loadData();
    }, []);

    // Shared Inventory State
    const [sharedChest, setSharedChest] = useState<SharedInventory | null>(null);

    // History Panel State
    const [historyPanelOpen, setHistoryPanelOpen] = useState(false);

    // Exchange Rate State (USD to Mesos rate)
    const [usdToMesosRate, setUsdToMesosRate] = useState<number>(0);

    // Sync editingItem when selectedItemId changes
    useEffect(() => {
        if (selectedItemId && items.length > 0) {
            const item = items.find(i => i.id === selectedItemId);
            if (item) {
                setEditingItem(item);
            }
        } else if (!selectedItemId) {
            setEditingItem(null);
        }
    }, [selectedItemId, items]);

    const loadData = async () => {
        try {
            const [inStockItems, serviceItems, inProgressItems, charsData, clientsData, accountsData, itemsDBData, metaData, sharedData, exchangeRatesData] = await Promise.all([
                itemsService.getByStatus('in_stock'),
                itemsService.getByStatus('Service'),
                itemsService.getByStatus('in_progress'),
                charactersService.getAll(),
                clientsService.getAll(),
                accountsService.getAll(),
                itemsDBService.getAll(),
                resourcesService.getResourceMetadata(),
                sharedInventoryService.get().catch(() => null), // Handle if not initialized yet
                exchangeRatesService.getAll().catch(() => []) // Fetch exchange rates
            ]);

            const bulkItems = await itemsService.getByStatus('bulk');
            setItems([...inStockItems, ...serviceItems, ...inProgressItems, ...bulkItems]);
            setCharacters(charsData);
            setClients(clientsData);
            setAccounts(accountsData);
            setItemDBs(itemsDBData);
            setResourceMetadata(metaData);
            console.log('Shared Data Fetched:', sharedData); // DEBUG
            if (sharedData) {
                setSharedChest(sharedData);
            } else {
                console.warn('Shared Chest data is null');
            }

            // Set exchange rate (USD to Mesos)
            const usdRate = exchangeRatesData.find((r: any) => r.base_currency === 'USD' && r.target_currency === 'Mesos');
            if (usdRate) {
                setUsdToMesosRate(usdRate.rate || 0);
            }

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Set default prices from resource metadata when loaded
    useEffect(() => {
        if (Object.keys(resourceMetadata).length > 0) {
            setPsokConfig(prev => ({ ...prev, price: prev.price || resourceMetadata['psok']?.mesoCost || 0 }));
            setPInnocConfig(prev => ({ ...prev, price: prev.price || resourceMetadata['perfect_innoc']?.mesoCost || 0 }));
            setGScrollConfig(prev => ({ ...prev, price: prev.price || resourceMetadata['guardian_scroll']?.mesoCost || 0 }));
        }
    }, [resourceMetadata]);

    const handleOpenResourceModal = (type: ResourceType | string, label: string, currentUsed: number) => {
        if (!selectedAccountId) {
            setMessage({ type: 'error', text: 'Select an account first.' });
            return;
        }
        setSelectedResourceForUsage({ type, label, currentQty: currentUsed });
        setShowResourceModal(true);
    };

    const handleConfirmResourceUsage = async (method: 'Stock' | 'Mesos' | 'RP' | 'Gift') => {
        if (!selectedResourceForUsage || !selectedAccountId) return;
        const { type, label } = selectedResourceForUsage;
        const account = accounts.find(a => a.id === selectedAccountId);
        if (!account) return;

        setSaving(true);
        try {
            // Prices from Config
            // Prices from Config
            let mesoPrice = 0;
            const dbInfo = editingItem ? getItemDBInfo(editingItem.name) : { slots: undefined };
            const isInfiniteSlots = dbInfo.slots === 0;

            if (type === 'psok') {
                if (!editingItem) throw new Error('No item selected');
                // Allow if infinite slots OR slots > 0
                if (!isInfiniteSlots && (editingItem.remaining_trade_slots || 0) <= 0) {
                    throw new Error('Cannot use PSOK. Slots are 0. Use Perfect Innocence first.');
                }
                mesoPrice = psokConfig.price;
            }
            else if (type === 'perfect_innoc') {
                if (isInfiniteSlots) throw new Error('Cannot use Perfect Innocence on this item (Infinite Slots).');
                mesoPrice = pInnocConfig.price;
            }
            else if (type === 'guardian_scroll') {
                if (isInfiniteSlots) throw new Error('Cannot use Guardian Scroll on this item (Infinite Slots).');
                mesoPrice = gScrollConfig.price;
            }

            const rpPrice = resourceMetadata[type]?.rpCost || 0;

            // 1. Calculate Cost / Check Availability
            if (method === 'Stock') {
                // If item has stock in account
                const stock = (account as any)[type] || 0;
                // Special case for Perfect Innocence coming from Shared Chest
                if (type === 'perfect_innoc') {
                    const vaultStock = sharedChest?.perfect_innocence_stock || 0;
                    if (vaultStock < 1) throw new Error(`Insufficient Shared Stock for ${label}.`);
                    await sharedInventoryService.updatePerfectInnocence(vaultStock - 1);
                } else {
                    if (stock < 1) throw new Error(`Insufficient Stock for ${label}. Available: ${stock}`);
                    await resourcesService.deductCubes(selectedAccountId, type as ResourceType, 1);
                }
            } else if (method === 'RP') {
                if (rpPrice > 0) {
                    if (account.reward_points < rpPrice) {
                        throw new Error(`Insufficient Reward Points. Cost: ${rpPrice}, Available: ${account.reward_points}`);
                    }
                    await resourcesService.deductCubes(selectedAccountId, 'reward_points', rpPrice);
                }
            } else if (method === 'Mesos') {
                if (mesoPrice > 0) {
                    const accountMesos = (account as any).mesos_b || 0;
                    const vaultMesos = sharedChest?.mesos_stock || 0;
                    const totalFunds = accountMesos + vaultMesos;

                    if (totalFunds < mesoPrice) {
                        throw new Error(`Insufficient funds. Cost: ${mesoPrice}B, Available: ${totalFunds}B`);
                    }

                    // Deduct Logic
                    let deductedFromAccount = 0;
                    let deductedFromVault = 0;

                    if (accountMesos >= mesoPrice) {
                        deductedFromAccount = mesoPrice;
                    } else {
                        deductedFromAccount = accountMesos;
                        deductedFromVault = mesoPrice - accountMesos;
                    }

                    const updatePromises = [];
                    if (deductedFromAccount > 0) updatePromises.push(accountsService.update(account.id, { mesos_b: accountMesos - deductedFromAccount }));
                    if (deductedFromVault > 0) updatePromises.push(sharedInventoryService.updateMesos(vaultMesos - deductedFromVault));
                    await Promise.all(updatePromises);

                    // Create Expense Transaction in Meso Table
                    if (activeSession) {
                        await transactionsService.createMeso({
                            account_id: selectedAccountId,
                            type: 'expense',
                            amount: mesoPrice,
                            description: `Used ${label} in cubing session for ${activeSession.client_id ? 'Client' : 'Unknown'}`,
                            item_id: selectedItemId || null,
                            client_id: activeSession.client_id,
                            session_id: activeSession.id
                        });
                    }
                }
            }

            // Determine Covered Status
            let isCovered = false;
            if (type === 'psok') isCovered = psokConfig.covered;
            else if (type === 'perfect_innoc') isCovered = pInnocConfig.covered;
            else if (type === 'guardian_scroll') isCovered = gScrollConfig.covered;

            // 2. Log to History
            // FIX: Always record meso_cost regardless of method
            await resourceHistoryService.add({
                session_id: activeSession?.id || null,
                account_id: selectedAccountId,
                item_id: selectedItemId || null,
                resource_type: type,
                action_type: 'use',
                quantity: 1,
                payment_method: method.toLowerCase() as 'stock' | 'mesos' | 'rp' | 'gift',
                meso_cost: mesoPrice, // Always record price history
                rp_cost: method === 'RP' ? rpPrice : 0,
                covered_by_me: isCovered, // Use actual status
                target_account_id: null,
                notes: null
            });

            // 3. Update Session Totals Immediately
            if (activeSession) {
                // Calculate session added value
                let sessionAddedValue = 0;

                // Only add value if NOT covered by me
                if (!isCovered) {
                    const client = clients.find(c => c.id === activeSession.client_id);
                    const clientCurrency = client?.currency || 'USD';

                    // Value Logic: Value matches Config Price logic (Mesos based) converted to Session Currency
                    const valueInMesos = mesoPrice;

                    if (clientCurrency === 'Mesos (b)') {
                        sessionAddedValue = valueInMesos;
                    } else {
                        // Client Currency is USD
                        // ValueInMesos (e.g. 0.5B) * Rate (e.g. 2.3 USD/B) = ValueInUSD
                        // Fallback to activeSession rate or global
                        const rate = activeSession.meso_rate || usdToMesosRate || 0;
                        sessionAddedValue = valueInMesos * rate;
                    }
                }

                const sessionUpdates: any = {};
                if (type === 'psok') sessionUpdates.psok_used = (activeSession.psok_used || 0) + 1;
                else if (type === 'perfect_innoc') sessionUpdates.perfect_innoc_used = (activeSession.perfect_innoc_used || 0) + 1;
                else if (type === 'guardian_scroll') sessionUpdates.gaurdian_scroll_used = (activeSession.gaurdian_scroll_used || 0) + 1;
                else if (type === 'solid_cubes') {
                    sessionUpdates.solid_cubes_used = (activeSession.solid_cubes_used || 0) + 1;
                }

                sessionUpdates.cubing_session_total = (activeSession.cubing_session_total || 0) + sessionAddedValue;

                await cubeSessionsService.update(activeSession.id, sessionUpdates);
                setActiveSession({ ...activeSession, ...sessionUpdates });
            }

            // 4. Update Local Display State (for consistency, mostly cosmetic now as we don't save these via handleSave anymore)
            // Actually, we DO NOT want to update these if handleSave uses them for deduction.
            // By NOT updating setPsokUsed etc, handleSave won't see them and won't double deduct.
            // Only 'refresh' data to show new stock.

            await refreshAccountData();
            await refreshSharedData();

            // 5. Apply Item Effects (PSOK / Perfect Innocence)
            if (editingItem) {
                const itemUpdates: any = {};
                const dbInfo = getItemDBInfo(editingItem.name);
                const isInfiniteSlots = dbInfo.slots === 0;

                if (type === 'psok') {
                    itemUpdates.tradeability = 'Tradeable Once';
                    // Only decrement slots if NOT infinite slots
                    if (!isInfiniteSlots) {
                        itemUpdates.remaining_trade_slots = Math.max(0, (editingItem.remaining_trade_slots || 0) - 1);
                    }
                } else if (type === 'perfect_innoc') {
                    if (isInfiniteSlots) {
                        // Should be blocked before, but safe guard
                    } else {
                        // Reset to max slots from DB
                        if (dbInfo.slots !== undefined) {
                            itemUpdates.remaining_trade_slots = dbInfo.slots;
                        }
                    }
                }

                if (Object.keys(itemUpdates).length > 0) {
                    await itemsService.update(selectedItemId, itemUpdates);
                    // Update local item state
                    setEditingItem(prev => prev ? ({ ...prev, ...itemUpdates }) : null);
                    // Update specific item in list
                    setItems(prev => prev.map(i => i.id === selectedItemId ? { ...i, ...itemUpdates } : i));
                }
            }

            // --- ALVARO COST LOGIC ---
            // If Client is Alvaro, update item costs with resource usage value (Mesos)
            if (activeSession && selectedItemId) {
                const client = clients.find(c => c.id === activeSession.client_id);
                if (client?.name === 'Alvaro') {
                    const item = items.find(i => i.id === selectedItemId);
                    if (item) {
                        const costUpdates: any = {};
                        const usageCost = mesoPrice;

                        if (usageCost > 0) {
                            if (type === 'psok') costUpdates.costo_psok = (item.costo_psok || 0) + usageCost;
                            else if (type === 'perfect_innoc') costUpdates.costo_perfect_innoc = (item.costo_perfect_innoc || 0) + usageCost;
                            else if (type === 'guardian_scroll') costUpdates.costo_guardian_scroll = (item.costo_guardian_scroll || 0) + usageCost;
                            else if (type === 'solid_cubes') {
                                // For Alvaro, Solid Cubes cost is internalized in total cost
                            }

                            costUpdates.costo_total = (item.costo_total || 0) + usageCost;

                            await itemsService.update(selectedItemId, costUpdates);

                            // Update local state
                            setEditingItem(prev => prev ? ({ ...prev, ...costUpdates, costo_total: (prev.costo_total || 0) + usageCost }) : null);
                            setItems(prev => prev.map(i => i.id === selectedItemId ? { ...i, ...costUpdates, costo_total: (i.costo_total || 0) + usageCost } : i));
                        }
                    }
                }
            }
            // -------------------------

            setMessage({ type: 'success', text: `Used 1 ${label} via ${method}` });
            setShowResourceModal(false);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setSaving(false);
        }
    };

    const refreshAccountData = async () => {
        const accountsData = await accountsService.getAll();
        setAccounts(accountsData);
    };

    const refreshSharedData = async () => {
        try {
            const data = await sharedInventoryService.get();
            setSharedChest(data);
        } catch (err) {
            console.error("Error refreshing shared data", err);
        }
    };

    // Load active session
    useEffect(() => {
        const loadSession = async () => {
            if (selectedItemId) {
                try {
                    const session = await cubeSessionsService.getActiveSessionByItemId(selectedItemId);
                    setActiveSession(session);
                } catch (error) {
                    console.error('Error loading session:', error);
                }
            } else {
                setActiveSession(null);
            }
        };
        loadSession();
    }, [selectedItemId]);

    // Sync Resource Coverage from Client Settings (Initial Load)
    useEffect(() => {
        if (activeSession && clients.length > 0) {
            const client = clients.find(c => c.id === activeSession.client_id);
            if (client) {
                // Only set if not already manually interacted with? 
                // The requirement is "Loads at start". 
                // Since this runs when activeSession changes (initial load), it overwrites defaults.
                // Assuming "new session" means activeSession reference changes.
                setPsokConfig(prev => ({ ...prev, covered: client.covers_psok }));
                setPInnocConfig(prev => ({ ...prev, covered: client.covers_perfect_innoc }));
                setGScrollConfig(prev => ({ ...prev, covered: client.covers_guardian_scroll }));
            }
        }
    }, [activeSession, clients]);

    // Helper to get available resource from account
    const getAvailableResource = (type: ResourceType): number => {
        if (!selectedAccountId) return 0;
        const account = accounts.find(a => a.id === selectedAccountId);
        if (!account) return 0;
        return (account as any)[type] || 0;
    };

    const handleUpdatePotential = (field: keyof Item, value: string | null) => {
        if (editingItem) {
            setEditingItem(prev => ({ ...prev!, [field]: value || null }));
        }
    };

    const handleTransferConfirm = async () => {
        if (!showTransferConfirm || !selectedItemId || !editingItem) return;

        // Tradeability Check
        if (editingItem.tradeability === 'Untradeable') {
            setMessage({ type: 'error', text: 'Cannot transfer Untradeable item. Use PSOK first.' });
            return;
        }

        try {
            setSaving(true);
            const { accountId } = showTransferConfirm;

            // Find a character for this account to assign the item to
            const accountChars = characters.filter(c => c.account_id === accountId);
            const targetCharId = accountChars.length > 0 ? accountChars[0].id : null;

            // If no character, we should ideally warn, but item schema requires character_id? 
            // Checking schema: Item.character_id is nullable (string | null). 
            // So we can set it to null if needed, but 'UpgradeWorkspace' implies Items with Characters usually.
            // Let's try to assign to first character, or null if strictly Account transfer. 
            // User said "Update account in which item is found".

            // Determine new properties
            const updates: any = {
                character_id: targetCharId
            };

            if (editingItem.tradeability === 'Tradeable Once') {
                updates.tradeability = 'Untradeable';
            }

            await itemsService.update(selectedItemId, updates);

            // Refresh data
            await loadData();

            // Update selection state
            setSelectedAccountId(accountId);
            setShowTransferConfirm(null);
            setMessage({ type: 'success', text: `Item transferred to ${showTransferConfirm.accountName}` });

            // If active session exists, update it? 
            // Session tracks usage. If we switch accounts, we might want to update the account_id in session
            // to reflect current holder, or keep original?
            // "Session doesn't end...". I'll update the account_id of the session so it's traceable.
            if (activeSession) {
                await cubeSessionsService.update(activeSession.id, {
                    account_id: accountId
                });
                const updatedSession = await cubeSessionsService.getActiveSessionByItemId(selectedItemId);
                setActiveSession(updatedSession);
            }

            // Log transfer to history
            await resourceHistoryService.add({
                session_id: activeSession?.id || null,
                account_id: selectedAccountId, // Source account
                item_id: selectedItemId,
                resource_type: 'item_transfer',
                action_type: 'transfer',
                quantity: 1,
                payment_method: null,
                meso_cost: 0,
                rp_cost: 0,
                covered_by_me: false,
                target_account_id: accountId, // Target account
                notes: `Transferred to ${showTransferConfirm.accountName}`
            });

        } catch (error) {
            console.error('Transfer error:', error);
            setMessage({ type: 'error', text: 'Failed to transfer item.' });
        } finally {
            setSaving(false);
        }
    };

    const handleFinalizeSession = async () => {
        if (!activeSession) return;

        const isStockItem = editingItem?.status === 'in_stock';
        const itemCostMesos = isStockItem ? (editingItem?.costo_total || 0) : 0;
        const totalResources = activeSession.cubing_session_total || 0;
        const isSelf = clients.find(c => c.id === activeSession.client_id)?.name === 'Alvaro';

        let confirmMsg = 'Are you sure you want to finalize this cubing session?';

        if (isSelf) {
            confirmMsg += '\n(Session for Alvaro: No Account Receivable will be created)';
        } else if (totalResources > 0 || (isStockItem && itemCostMesos > 0)) {
            confirmMsg += '\nThis will create an Account Receivable for the client.';
        } else {
            confirmMsg += '\nWarning: No resources used and no item cost. No Account Receivable will be created.';
        }

        if (!window.confirm(confirmMsg)) {
            return;
        }

        try {
            setSaving(true);
            console.log('Finalizing Session:', activeSession);

            // 1. Create Account Receivable Transaction
            const client = clients.find(c => c.id === activeSession.client_id);

            if (client?.name === 'Alvaro') {
                console.log('Finalizing for Alvaro (Self). Skipping Account Receivable creation as costs are internalized.');
            } else if (activeSession.cubing_session_total > 0 || (editingItem?.status === 'in_stock' && (editingItem?.costo_total || 0) > 0)) {
                const itemName = editingItem?.name || 'Unknown Item';

                // Check if item is from "Our Stock" (in_stock status)
                const isStockItem = editingItem?.status === 'in_stock';
                const itemCostMesos = isStockItem ? (editingItem?.costo_total || 0) : 0;

                // Meso Rate: 1b Mesos × mesoRate = USD
                const mesoRate = activeSession.meso_rate || 1;

                // 1. Calculate Session Total in USD
                let sessionTotalUSD = activeSession.cubing_session_total;
                if (activeSession.currency !== 'USD') {
                    // If session is in Mesos (b), convert to USD
                    sessionTotalUSD = activeSession.cubing_session_total * mesoRate;
                }

                // 2. Calculate Item Cost in USD
                const itemCostUSD = itemCostMesos * mesoRate;

                // 3. Final Total AR in USD
                const arAmountUSD = sessionTotalUSD + itemCostUSD;

                // Set description based on whether item cost is included
                const description = isStockItem && itemCostMesos > 0
                    ? `Cubing Session + Item - ${itemName}`
                    : `Cubing Session - ${itemName}`;

                console.log('Creating AR for:', itemName);
                console.log('Session Total (USD):', sessionTotalUSD.toFixed(2));
                console.log('Item Cost (USD):', itemCostUSD.toFixed(2));
                console.log('Total AR (USD):', arAmountUSD.toFixed(2), '(Rate:', mesoRate, ')');

                // Use Accounts Receivable Service instead of creating a transaction directly
                await accountsReceivableService.create({
                    client_id: activeSession.client_id || '', // Ensure not null
                    session_id: activeSession.id,
                    item_id: activeSession.item_id,
                    description: description,
                    amount: Number(arAmountUSD.toFixed(2)), // Round to 2 decimals
                    currency: 'USD',
                    category: 'Mesos',
                    subcategory: 'Items / Cubes'
                });
            } else {
                console.warn('Session Total is 0 and no item cost, skipping AR creation.');
            }

            // 2. Finalize Session
            await cubeSessionsService.finalize(activeSession.id);

            // 3. Automate Item Status: In Stock -> For Sale
            if (editingItem?.status === 'in_stock') {
                await itemsService.update(activeSession.item_id, { status: 'for_sale' });
                console.log('Item status updated from in_stock to for_sale');
            }

            setActiveSession(null);
            setMessage({ type: 'success', text: 'Session finalized and Account Receivable created.' });

            // Optional: Navigate away or reset?
            // navigate('/cubing-sessions'); // Or stay here? User might want to stay.

        } catch (error: any) {
            console.error('Error finalizing:', error);
            setMessage({ type: 'error', text: 'Failed to finalize session: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelSession = async () => {
        if (!activeSession) return;

        const hasUsage = (activeSession.bright_cubes_used || 0) > 0 ||
            (activeSession.bonus_bright_cubes_used || 0) > 0 ||
            (activeSession.solid_cubes_used || 0) > 0 ||
            (activeSession.psok_used || 0) > 0;

        const confirmMsg = hasUsage
            ? 'This session has resource usage recorded. Canceling will NOT revert the deducted cubes from inventory. Are you sure you want to PERMANENTLY DELETE this session?'
            : 'Are you sure you want to cancel this session? It will be permanently deleted.';

        if (!window.confirm(confirmMsg)) {
            return;
        }

        try {
            setSaving(true);
            await cubeSessionsService.delete(activeSession.id);
            setActiveSession(null);
            setMessage({ type: 'success', text: 'Session cancelled and deleted.' });
            navigate('/cubing-sessions');
        } catch (error: any) {
            console.error('Error cancelling session:', error);
            setMessage({ type: 'error', text: 'Failed to cancel session: ' + error.message });
        } finally {
            setSaving(false);
        }
    };





    // --- OCR Logic ---

    const processImageText = (text: string) => {
        if (!editingItem) return;

        const result = ocrUtil.processItemImageText(text, itemDBs, {
            expectedName: editingItem.name
        });

        if (!result.success) {
            setMessage({ type: 'error', text: result.error || 'Failed to scan item.' });
            return;
        }

        const { success, error, ...updates } = result;

        // Apply updates
        setEditingItem(prev => prev ? ({ ...prev, ...updates }) : null);

        // Also update in list
        if (selectedItemId) {
            setItems(prev => prev.map(i => i.id === selectedItemId ? { ...i, ...updates } : i));
        }

        setMessage({ type: 'success', text: 'Item updated from screenshot!' });
    };

    const toggleFastCubingSelection = (accountId: string, type: 'bright_cubes' | 'bonus_bright_cubes' | 'solid_cubes') => {
        setFastCubingSelection(prev => {
            const currentAcc = prev[accountId] || {};
            return {
                ...prev,
                [accountId]: {
                    ...currentAcc,
                    [type]: !currentAcc[type]
                }
            };
        });
    };

    const getFastCubingTotals = () => {
        let bc = 0;
        let bbc = 0;
        let sc = 0;

        Object.entries(fastCubingSelection).forEach(([accId, selection]) => {
            const acc = accounts.find(a => a.id === accId);
            if (!acc) return;
            if (selection.bright_cubes) bc += (acc.bright_cubes || 0);
            if (selection.bonus_bright_cubes) bbc += (acc.bonus_bright_cubes || 0);
            if (selection.solid_cubes) sc += (acc.solid_cubes || 0);
        });

        return { bc, bbc, sc };
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
            setMessage(null); // Clear previous message
            setMessage({ type: 'info', text: 'Analyzing image...' });
            try {
                const worker = await createWorker('eng'); // English model for OCR
                const ret = await worker.recognize(blob);
                console.log("OCR Result Text:", ret.data.text);
                processImageText(ret.data.text);
                await worker.terminate();
            } catch (err) {
                console.error("OCR Error", err);
                setMessage({ type: 'error', text: 'Failed to process image.' });
            } finally {
                setOcrLoading(false);
            }
        }
    };

    const handleSave = async () => {
        if (!editingItem || !selectedItemId || (!selectedAccountId && !isFastCubingActive)) {
            setMessage({ type: 'error', text: 'Please select an item and account' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            // 1. Save Potentials (Existing logic)
            await itemsService.update(selectedItemId, {
                main_potential_tier: editingItem.main_potential_tier,
                main_potential_1: editingItem.main_potential_1,
                main_potential_2: editingItem.main_potential_2,
                main_potential_3: editingItem.main_potential_3,
                bonus_potential_tier: editingItem.bonus_potential_tier,
                bonus_potential_1: editingItem.bonus_potential_1,
                bonus_potential_2: editingItem.bonus_potential_2,
                bonus_potential_3: editingItem.bonus_potential_3,
            });

            const client = activeSession ? clients.find(c => c.id === activeSession.client_id) : null;
            const bbcMesoCost = resourceMetadata['bonus_bright_cubes']?.mesoCost || 0;
            const bcMesoCost = resourceMetadata['bright_cubes']?.mesoCost || 0;
            const scMesoCost = resourceMetadata['solid_cubes']?.mesoCost || 0.05;

            // 2. Handle Deductions
            if (isFastCubingActive) {
                // --- FAST CUBING LOGIC ---
                const deductions: { accId: string, type: ResourceType, qty: number }[] = [];
                Object.entries(fastCubingSelection).forEach(([accId, selection]) => {
                    const acc = accounts.find(a => a.id === accId);
                    if (!acc) return;
                    if (selection.bright_cubes && (acc.bright_cubes || 0) > 0) deductions.push({ accId, type: 'bright_cubes', qty: acc.bright_cubes! });
                    if (selection.bonus_bright_cubes && (acc.bonus_bright_cubes || 0) > 0) deductions.push({ accId, type: 'bonus_bright_cubes', qty: acc.bonus_bright_cubes! });
                    if (selection.solid_cubes && (acc.solid_cubes || 0) > 0) deductions.push({ accId, type: 'solid_cubes', qty: acc.solid_cubes! });
                });

                if (deductions.length > 0) {
                    let totalMesoCostForAlvaro = 0;
                    let totalValueForSession = 0;

                    const bcPrice = client?.bright_cube_price || 0;
                    const bbcPrice = client?.bonus_bright_cube_price || 0;
                    const scPrice = client?.solid_cubes_price || 0;

                    const sessionUpdates: any = {
                        bright_cubes_used: activeSession?.bright_cubes_used || 0,
                        bonus_bright_cubes_used: activeSession?.bonus_bright_cubes_used || 0,
                        solid_cubes_used: activeSession?.solid_cubes_used || 0,
                    };

                    for (const d of deductions) {
                        // API Deduct
                        await resourcesService.deductCubes(d.accId, d.type, d.qty);

                        // History Log
                        await resourceHistoryService.add({
                            session_id: activeSession?.id || null,
                            account_id: d.accId,
                            item_id: selectedItemId,
                            resource_type: d.type,
                            action_type: 'deduct',
                            quantity: d.qty,
                            payment_method: 'stock',
                            meso_cost: 0,
                            rp_cost: 0,
                            covered_by_me: false,
                            target_account_id: null,
                            notes: 'Fast Cubing deduction'
                        });

                        // Calculation for session
                        if (d.type === 'bright_cubes') {
                            sessionUpdates.bright_cubes_used += d.qty;
                            totalValueForSession += (d.qty * bcPrice);
                            totalMesoCostForAlvaro += (d.qty * bcMesoCost);
                        } else if (d.type === 'bonus_bright_cubes') {
                            sessionUpdates.bonus_bright_cubes_used += d.qty;
                            totalValueForSession += (d.qty * bbcPrice);
                            totalMesoCostForAlvaro += (d.qty * bbcMesoCost);
                        } else if (d.type === 'solid_cubes') {
                            sessionUpdates.solid_cubes_used += d.qty;
                            totalValueForSession += (d.qty * scPrice);
                            totalMesoCostForAlvaro += (d.qty * scMesoCost);
                        }
                    }

                    // Update Session
                    if (activeSession) {
                        const newTotal = (activeSession.cubing_session_total || 0) + totalValueForSession;
                        await cubeSessionsService.update(activeSession.id, {
                            ...sessionUpdates,
                            cubing_session_total: newTotal
                        });
                        setActiveSession({ ...activeSession, ...sessionUpdates, cubing_session_total: newTotal });
                    }

                    // Update Alvaro Cost if applicable
                    if (client?.name === 'Alvaro' && totalMesoCostForAlvaro > 0) {
                        const item = items.find(i => i.id === selectedItemId);
                        if (item) {
                            const costUpdates = {
                                costo_cubos: (item.costo_cubos || 0) + totalMesoCostForAlvaro,
                                costo_total: (item.costo_total || 0) + totalMesoCostForAlvaro
                            };
                            await itemsService.update(selectedItemId, costUpdates);
                            setEditingItem(prev => prev ? ({ ...prev, ...costUpdates }) : null);
                        }
                    }

                    setFastCubingSelection({}); // Reset selection
                }
            } else {
                // --- MANUAL DEDUCTION LOGIC (Existing) ---
                const totalCubesUsed = brightCubesUsed + bonusCubesUsed + solidCubesUsed;

                if (totalCubesUsed > 0) {
                    const availableBright = getAvailableResource('bright_cubes');
                    const availableBonus = getAvailableResource('bonus_bright_cubes');
                    const availableSolid = getAvailableResource('solid_cubes');

                    if (brightCubesUsed > availableBright) throw new Error(`Insufficient Bright Cubes. Available: ${availableBright}`);
                    if (bonusCubesUsed > availableBonus) throw new Error(`Insufficient Bonus Bright Cubes. Available: ${availableBonus}`);
                    if (solidCubesUsed > availableSolid) throw new Error(`Insufficient Solid Cubes. Available: ${availableSolid}`);

                    const deductionPromises = [];
                    if (brightCubesUsed > 0) deductionPromises.push(resourcesService.deductCubes(selectedAccountId, 'bright_cubes', brightCubesUsed));
                    if (bonusCubesUsed > 0) deductionPromises.push(resourcesService.deductCubes(selectedAccountId, 'bonus_bright_cubes', bonusCubesUsed));
                    if (solidCubesUsed > 0) deductionPromises.push(resourcesService.deductCubes(selectedAccountId, 'solid_cubes', solidCubesUsed));
                    await Promise.all(deductionPromises);

                    // History and Session updates (keeping existing logic flow but cleaned up)
                    let totalMesoCostForAlvaro = 0;
                    let totalValueForSession = (brightCubesUsed * (client?.bright_cube_price || 0)) +
                        (bonusCubesUsed * (client?.bonus_bright_cube_price || 0)) +
                        (solidCubesUsed * (client?.solid_cubes_price || 0));

                    const historyData = [
                        { type: 'bright_cubes', qty: brightCubesUsed, meso: bcMesoCost },
                        { type: 'bonus_bright_cubes', qty: bonusCubesUsed, meso: bbcMesoCost },
                        { type: 'solid_cubes', qty: solidCubesUsed, meso: scMesoCost }
                    ].filter(d => d.qty > 0);

                    for (const d of historyData) {
                        await resourceHistoryService.add({
                            session_id: activeSession?.id || null,
                            account_id: selectedAccountId,
                            item_id: selectedItemId,
                            resource_type: d.type as ResourceType,
                            action_type: 'deduct',
                            quantity: d.qty,
                            payment_method: 'stock',
                            meso_cost: 0,
                            rp_cost: 0,
                            covered_by_me: false,
                            target_account_id: null,
                            notes: null
                        });
                        totalMesoCostForAlvaro += (d.qty * d.meso);
                    }

                    if (activeSession) {
                        const sessionUpdates = {
                            bright_cubes_used: (activeSession.bright_cubes_used || 0) + brightCubesUsed,
                            bonus_bright_cubes_used: (activeSession.bonus_bright_cubes_used || 0) + bonusCubesUsed,
                            solid_cubes_used: (activeSession.solid_cubes_used || 0) + solidCubesUsed,
                            cubing_session_total: (activeSession.cubing_session_total || 0) + totalValueForSession
                        };
                        await cubeSessionsService.update(activeSession.id, sessionUpdates);
                        setActiveSession({ ...activeSession, ...sessionUpdates });
                    }

                    if (client?.name === 'Alvaro' && totalMesoCostForAlvaro > 0) {
                        const item = items.find(i => i.id === selectedItemId);
                        if (item) {
                            const costUpdates = {
                                costo_cubos: (item.costo_cubos || 0) + totalMesoCostForAlvaro,
                                costo_total: (item.costo_total || 0) + totalMesoCostForAlvaro
                            };
                            await itemsService.update(selectedItemId, costUpdates);
                            setEditingItem(prev => prev ? ({ ...prev, ...costUpdates }) : null);
                        }
                    }

                    setBrightCubesUsed(0);
                    setBonusCubesUsed(0);
                    setSolidCubesUsed(0);
                }
            }

            await loadData();
            setMessage({ type: 'success', text: 'Changes saved successfully!' });
        } catch (error: any) {
            console.error('Error saving:', error);
            setMessage({ type: 'error', text: `Error: ${error.message || 'Unknown error'}` });
        } finally {
            setSaving(false);
        }
    };

    // Helper to get ItemDB info
    const getItemDBInfo = (itemName?: string) => {
        if (!itemName) return { image: null, slots: undefined };
        const matching = itemDBs.find(db => db.name === itemName);
        return {
            image: matching?.image_url,
            slots: matching?.slots
        };
    };

    if (loading) {
        return (
            <div className="upgrade-workspace">
                <Header title="Upgrade Workspace V2" subtitle="Loading..." />
            </div>
        );
    }

    // --- RENDER HELPERS ---

    const getMainName = (accountId: string) => {
        const mainChar = characters.find(c => c.account_id === accountId && c.main === 'Main');
        return mainChar ? mainChar.name : null;
    };

    // --- RENDER HELPERS ---

    const renderSessionHeader = () => {
        if (!activeSession) return null;

        const client = clients.find(c => c.id === activeSession.client_id);
        const clientName = client?.name || 'Unknown Client';
        const isMesoSession = client?.currency === 'Mesos (b)';

        // Calculate Totals for Display
        let totalUSD = 0;
        let totalMesos = 0;
        const currentTotal = activeSession.cubing_session_total || 0;
        // Rate: 1 Meso(b) = X USD (e.g. 2.3)
        // Check types: if meso_rate is missing (legacy), fallback to global usdToMesosRate
        const sessionRate = activeSession.meso_rate || usdToMesosRate || 0;

        if (isMesoSession) {
            // Session Total is in Mesos
            totalMesos = currentTotal;
            // Convert Mesos -> USD: Mesos * Rate
            totalUSD = totalMesos * sessionRate;
        } else {
            // Session Total is in USD
            totalUSD = currentTotal;
            // Convert USD -> Mesos: USD / Rate
            totalMesos = sessionRate > 0 ? totalUSD / sessionRate : 0;
        }

        return (
            <Card className="session-header-card">
                <div className="session-header-top">
                    <h3>Cubing Session Log</h3>
                    <div className="session-status">
                        <span className="client-info">Client: <strong style={{ color: 'var(--color-text-primary)' }}>{clientName}</strong></span>
                        <span className="separator">|</span>
                        <span>Status: <span className="status-badge" style={{ color: '#4ade80' }}>{activeSession.cubing_session_status}</span></span>
                        <span className="separator">|</span>
                        <span>Started: {new Date(activeSession.created_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="session-metrics-grid">
                    <div className="metric-item">
                        <label>Bright</label>
                        <span>{activeSession.bright_cubes_used || 0}</span>
                    </div>
                    <div className="metric-item">
                        <label>Bonus</label>
                        <span>{activeSession.bonus_bright_cubes_used || 0}</span>
                    </div>
                    <div className="metric-item">
                        <label>Solid</label>
                        <span>{activeSession.solid_cubes_used || 0}</span>
                    </div>
                    <div className="metric-item">
                        <label>Psok</label>
                        <span>{activeSession.psok_used || 0}</span>
                    </div>
                    <div className="metric-item">
                        <label>Perfect Innoc</label>
                        <span>{activeSession.perfect_innoc_used || 0}</span>
                    </div>
                    <div className="metric-item">
                        <label>Guardian Scroll</label>
                        <span>{activeSession.gaurdian_scroll_used || 0}</span>
                    </div>

                    {/* Consolidated Total Value Box */}
                    <div
                        className={`metric-item metric-value ${!showTotalInUSD ? 'metric-mesos' : ''}`}
                        onClick={() => setShowTotalInUSD(!showTotalInUSD)}
                        style={{ cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s ease', minWidth: '120px' }}
                        title="Click to switch currency"
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <label style={{ cursor: 'pointer' }}>Total Value ({showTotalInUSD ? 'USD' : 'Mesos B'})</label>
                            <span style={{ fontSize: '0.8em', opacity: 0.7 }}>⟳</span>
                        </div>
                        <span className={showTotalInUSD ? 'value-usd' : 'value-mesos'}>
                            {showTotalInUSD
                                ? `$${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `${totalMesos.toFixed(2)}B`
                            }
                        </span>
                    </div>
                    <div className="session-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="secondary" onClick={handleCancelSession}>Cancel Session</Button>
                        <Button variant="danger" onClick={handleFinalizeSession}>Finalize Session</Button>
                    </div>
                </div>
            </Card>
        );
    };

    const renderAccountColumn = () => {
        const currentAccount = accounts.find(a => a.id === selectedAccountId);

        const renderCubeRow = (label: string, value: number, setter: (val: number) => void, max: number) => (
            <div className="account-row cube-row">
                <span className="row-label">{label} <span className="metric-purple">({max})</span></span>
                <div className="stepper-group">
                    <button onClick={() => setter(Math.max(0, value - 1))}>-</button>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setter(Math.max(0, val)); // Allow going above max? Usually allow, but maybe warn? User said "allow manual". Let's clamp at max or just allow?
                            // User said "allow me to enter manually". 
                            // Usually inventory items are limited by max. 
                            // But maybe they want to plan? 
                            // I'll clamp to max to be safe for now, as logic deducts.
                            // Actually, let's strictly clamp for deduction logic safety, or setter logic elsewhere handles it.
                            setter(Math.min(max, Math.max(0, val)));
                        }}
                        className="cube-input"
                    />
                    <button onClick={() => setter(Math.min(max, value + 1))}>+</button>
                </div>
            </div>
        );

        const renderResourceUsageRow = (
            label: string,
            qty: number,
            config: { covered: boolean, price: number },
            setConfig: (cfg: any) => void,
            resourceType: ResourceType
        ) => (
            <div className="account-row resource-usage-row">
                <div className="usage-left">
                    <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={config.covered}
                        onChange={e => setConfig({ ...config, covered: e.target.checked })}
                    />
                    <span className="row-label">{label} <strong>{qty}</strong></span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleOpenResourceModal(resourceType, label, qty)}>Use</Button>
            </div>
        );

        const renderResourceConfigRow = (
            label: string,
            config: { payment: string, price: number },
            setConfig: (cfg: any) => void
        ) => (
            <div className="account-row resource-config-row">
                <span className="config-label">{label}</span>
                {/* Spacer to push input to right */}
                <div className="payment-toggles"></div>
                <input
                    type="number"
                    className="small-price-input"
                    value={config.price}
                    onChange={e => setConfig({ ...config, price: parseFloat(e.target.value) || 0 })}
                />
            </div>
        );

        return (
            <Card className="workspace-column col-account">
                {/* Section 1: Top Info */}
                <div className="account-header-simple" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className="email-text" style={{ fontWeight: '600' }}>
                        <span style={{ color: 'var(--color-primary)', marginRight: '8px' }}>#{currentAccount?.number}</span>
                        {currentAccount?.email || 'No Selection'}
                    </span>
                    {selectedAccountId && (
                        <span className="main-name-subtitle" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>
                            {getMainName(selectedAccountId) || 'No Main'}
                        </span>
                    )}
                </div>

                {/* Cubes Section */}
                <div className="account-section-card">
                    <h4>CUBES</h4>
                    {renderCubeRow('Solid', solidCubesUsed, setSolidCubesUsed, getAvailableResource('solid_cubes'))}
                    {renderCubeRow('Bright', brightCubesUsed, setBrightCubesUsed, getAvailableResource('bright_cubes'))}
                    {renderCubeRow('Bonus', bonusCubesUsed, setBonusCubesUsed, getAvailableResource('bonus_bright_cubes'))}
                </div>

                {/* Resources Usage Section */}
                <div className="account-section-card">
                    <h4>RESOURCES</h4>
                    {renderResourceUsageRow('PSOK', activeSession?.psok_used || 0, psokConfig, setPsokConfig, 'psok')}
                    {renderResourceUsageRow('Perf. Innoc.', activeSession?.perfect_innoc_used || 0, pInnocConfig, setPInnocConfig, 'perfect_innoc' as any)}
                    {/* Note: 'perfect_innoc' might not be in ResourceType enum perfectly, checking... It is not. 
                       Wait, ResourceType has 'psok', 'guardian_scroll'. 'perfect_innoc' is missing in ResourceType.
                       Let's check types/index.ts. 
                       ResourceType = 'bright_cubes' | 'bonus_bright_cubes' | 'reward_points' | 'psok' | 'guardian_scroll';
                       'perfect_innoc' logic was likely ad-hoc or handled via general props?
                       In V2 state, we have pInnocUsed. 
                       The user wants to use resources. If it's not a resource type, we can't deduct stock effectively if not invalid?
                       Actually, the user requirement mentions: "Mostrar el stock disponible del recurso seleccionado".
                       If 'perfect_innoc' is not in Account, we cannot show stock. 
                       In Account interface: psok, guardian_scroll. NO perfect_innoc!
                       So 'Perfect Innocence' is likely NOT a stock item in Account yet? 
                       Wait, looking at Account type:
                       bright_cubes, bonus_bright_cubes, reward_points, psok, guardian_scroll.
                       So Perfect Innocence is NOT trackable by stock.
                       I should only enable the modal fully for items with stock? Or just show 0 stock?
                       User said: "Mostrar el stock disponible...".
                       If I support it, I treat stock as 0.
                    */}
                    {renderResourceUsageRow('Guardian', activeSession?.gaurdian_scroll_used || 0, gScrollConfig, setGScrollConfig, 'guardian_scroll')}
                </div>

                {/* Price Config Section */}
                <div className="account-section-card">
                    <h4>PRICE</h4>
                    {renderResourceConfigRow('PSOK', psokConfig, setPsokConfig)}
                    {renderResourceConfigRow('Perf. Innoc.', pInnocConfig, setPInnocConfig)}
                    {renderResourceConfigRow('Guardian', gScrollConfig, setGScrollConfig)}
                </div>
            </Card>
        );
    };

    const renderItemColumn = () => {
        if (!editingItem) return <Card className="workspace-column col-item">No Item Selected</Card>;
        const dbInfo = getItemDBInfo(editingItem.name);

        return (
            <Card className="workspace-column col-item highlight-item">
                {/* Item Name removed as requested independently */}
                <div className="item-preview">
                    <ItemTooltip
                        item={editingItem as Item}
                        image={dbInfo.image}
                        baseSlots={dbInfo.slots}
                    />
                </div>

                <div className="ocr-section" style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                        Paste image (Ctrl+V) or use button to scan
                    </p>

                    {/* Hidden file input for button trigger if needed, or just a paste instruction button */}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                            // Focus document so user can paste
                            document.body.focus();
                            // Or simpler: just visually prompt them since we track onPaste globally or on container
                            setMessage({ type: 'info', text: 'Press Ctrl+V to paste screenshot now' });
                        }}
                    >
                        {ocrLoading ? 'Scanning...' : 'Paste Screenshot (Ctrl+V)'}
                    </Button>
                </div>
            </Card>
        );
    };

    const renderPotentialsColumn = () => {
        if (!editingItem) return <Card className="workspace-column col-potentials">No Item Selected</Card>;

        return (
            <Card className="workspace-column col-potentials">

                <div className={`potential-section potential-section--${editingItem.main_potential_tier?.toLowerCase() || 'none'}`}>
                    <h4>MAIN POTENTIAL</h4>
                    <Select
                        value={editingItem.main_potential_tier || ''}
                        onChange={v => handleUpdatePotential('main_potential_tier', v)}
                        options={TIER_OPTIONS}
                        className={editingItem.main_potential_tier ? `text-${editingItem.main_potential_tier.toLowerCase()}` : ''}
                    />
                    <Input value={editingItem.main_potential_1 || ''} onChange={e => handleUpdatePotential('main_potential_1', e.target.value)} placeholder="Line 1" />
                    <Input value={editingItem.main_potential_2 || ''} onChange={e => handleUpdatePotential('main_potential_2', e.target.value)} placeholder="Line 2" />
                    <Input value={editingItem.main_potential_3 || ''} onChange={e => handleUpdatePotential('main_potential_3', e.target.value)} placeholder="Line 3" />
                </div>

                <div className={`potential-section potential-section--${editingItem.bonus_potential_tier?.toLowerCase() || 'none'}`}>
                    <h4>BONUS POTENTIAL</h4>
                    <Select
                        value={editingItem.bonus_potential_tier || ''}
                        onChange={v => handleUpdatePotential('bonus_potential_tier', v)}
                        options={TIER_OPTIONS}
                        className={editingItem.bonus_potential_tier ? `text-${editingItem.bonus_potential_tier.toLowerCase()}` : ''}
                    />
                    <Input value={editingItem.bonus_potential_1 || ''} onChange={e => handleUpdatePotential('bonus_potential_1', e.target.value)} placeholder="Line 1" />
                    <Input value={editingItem.bonus_potential_2 || ''} onChange={e => handleUpdatePotential('bonus_potential_2', e.target.value)} placeholder="Line 2" />
                    <Input value={editingItem.bonus_potential_3 || ''} onChange={e => handleUpdatePotential('bonus_potential_3', e.target.value)} placeholder="Line 3" />
                </div>

                <div className="save-action">
                    <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
                        Save & Deduct Cubes
                    </Button>
                </div>
            </Card>
        );
    };

    return (
        <div className="upgrade-workspace-v2">
            <Header
                title="Upgrade Workspace V2"
                subtitle="Manage Cubing, Sessions & OCR"
                actions={
                    <div className="fast-cubing-header-toggle">
                        <label className="toggle-label" style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            background: isFastCubingActive ? 'rgba(192, 132, 252, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${isFastCubingActive ? '#c084fc' : 'rgba(255, 255, 255, 0.1)'}`,
                            transition: 'all 0.2s ease',
                            color: isFastCubingActive ? '#fff' : '#aaa',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            boxShadow: isFastCubingActive ? '0 0 20px rgba(192, 132, 252, 0.3)' : 'none'
                        }}>
                            <input
                                type="checkbox"
                                checked={isFastCubingActive}
                                onChange={e => {
                                    setIsFastCubingActive(e.target.checked);
                                    if (!e.target.checked) setFastCubingSelection({});
                                }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            ⚡ FAST CUBING MODE
                        </label>
                    </div>
                }
            />

            <div className="page-content">
                {message && (
                    <div className={`workspace-message workspace-message--${message.type}`}>
                        {message.text}
                    </div>
                )}

                {activeSession ? (
                    <div
                        className="session-view"
                        onPaste={handlePaste}
                        tabIndex={0}
                        style={{ outline: 'none' }}
                    >
                        {renderSessionHeader()}

                        {/* Resource Usage History Panel */}
                        <ResourceHistoryPanel
                            sessionId={activeSession?.id}
                            isOpen={historyPanelOpen}
                            onToggle={() => setHistoryPanelOpen(!historyPanelOpen)}
                        />

                        <div className="session-grid-3-col">
                            {renderAccountColumn()}
                            {renderItemColumn()}
                            {renderPotentialsColumn()}
                        </div>

                        {/* Shared Chest */}
                        {sharedChest && (
                            <Card className="shared-chest-section" style={{ marginBottom: '1rem', border: '1px solid #c084fc', background: '#3b0764' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, color: '#e9d5ff' }}>SHARED CHEST</h4>
                                    <div style={{ display: 'flex', gap: '2rem' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#d8b4fe', display: 'block' }}>MESOS (B)</span>
                                            <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{Number(sharedChest.mesos_stock || 0).toFixed(2)}</strong>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#d8b4fe', display: 'block' }}>PERFECT INNOC.</span>
                                            <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{sharedChest.perfect_innocence_stock || 0}</strong>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Available Accounts List */}
                        <Card className="available-accounts-section">
                            <div className="accounts-header-container" style={{ marginBottom: '1rem' }}>
                                <h4>Available Accounts</h4>
                            </div>

                            {isFastCubingActive && (
                                <div className="fast-cubing-summary-badges" style={{ marginBottom: '1.5rem' }}>
                                    {(() => {
                                        const totals = getFastCubingTotals();
                                        return (
                                            <div className="badges-grid" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                                <div className="cube-badge bc-badge">
                                                    <span className="badge-label">BC</span>
                                                    <span className="badge-value">{totals.bc}</span>
                                                </div>
                                                <div className="cube-badge bbc-badge">
                                                    <span className="badge-label">BBC</span>
                                                    <span className="badge-value">{totals.bbc}</span>
                                                </div>
                                                <div className="cube-badge sc-badge">
                                                    <span className="badge-label">SC</span>
                                                    <span className="badge-value">{totals.sc}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            <div className="accounts-table-container">
                                <table className="accounts-table">
                                    <thead>
                                        <tr>
                                            <th>No.</th>
                                            <th>Account</th>
                                            <th>BC</th>
                                            <th>BBC</th>
                                            <th>SC</th>
                                            <th>RP</th>
                                            <th>PSOK</th>
                                            <th>GS</th>
                                            <th>Mesos (B)</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accounts
                                            .filter(acc => {
                                                const bc = acc.bright_cubes || 0;
                                                const bbc = acc.bonus_bright_cubes || 0;
                                                const sc = acc.solid_cubes || 0;
                                                const psok = acc.psok || 0;
                                                const rp = acc.reward_points || 0;
                                                const gs = acc.guardian_scroll || 0;
                                                const mesos = acc.mesos_b || 0;
                                                const isCurrent = acc.id === selectedAccountId;
                                                return isCurrent || bc > 0 || bbc > 0 || sc > 0 || psok > 0 || rp > 0 || gs > 0 || mesos > 0;
                                            })
                                            .sort((a, b) => {
                                                // 1. Current account first
                                                const isCurrentA = a.id === selectedAccountId;
                                                const isCurrentB = b.id === selectedAccountId;
                                                if (isCurrentA && !isCurrentB) return -1;
                                                if (!isCurrentA && isCurrentB) return 1;

                                                // 2. Sort by Account Number (asc)
                                                return (a.number || 0) - (b.number || 0);
                                            })
                                            .map(acc => {
                                                const bc = acc.bright_cubes || 0;
                                                const bbc = acc.bonus_bright_cubes || 0;
                                                const sc = acc.solid_cubes || 0;
                                                const psok = acc.psok || 0;
                                                const rp = acc.reward_points || 0;
                                                const gs = acc.guardian_scroll || 0;
                                                const mesos = acc.mesos_b || 0;
                                                const isCurrent = acc.id === selectedAccountId;

                                                return (
                                                    <tr key={acc.id} className={isCurrent ? 'current-account' : ''}>
                                                        <td>{acc.number}</td>
                                                        <td>
                                                            {getMainName(acc.id) ? (
                                                                <>
                                                                    <strong style={{ color: 'var(--color-text-primary)' }}>{getMainName(acc.id)}</strong> - {acc.email}
                                                                </>
                                                            ) : acc.email}
                                                        </td>
                                                        <td>
                                                            {isFastCubingActive ? (
                                                                <button
                                                                    className={`cube-cell-btn ${fastCubingSelection[acc.id]?.bright_cubes ? 'active' : ''}`}
                                                                    onClick={() => toggleFastCubingSelection(acc.id, 'bright_cubes')}
                                                                    disabled={bc <= 0}
                                                                >
                                                                    {bc}
                                                                </button>
                                                            ) : bc}
                                                        </td>
                                                        <td>
                                                            {isFastCubingActive ? (
                                                                <button
                                                                    className={`cube-cell-btn ${fastCubingSelection[acc.id]?.bonus_bright_cubes ? 'active' : ''}`}
                                                                    onClick={() => toggleFastCubingSelection(acc.id, 'bonus_bright_cubes')}
                                                                    disabled={bbc <= 0}
                                                                >
                                                                    {bbc}
                                                                </button>
                                                            ) : bbc}
                                                        </td>
                                                        <td>
                                                            {isFastCubingActive ? (
                                                                <button
                                                                    className={`cube-cell-btn ${fastCubingSelection[acc.id]?.solid_cubes ? 'active' : ''}`}
                                                                    onClick={() => toggleFastCubingSelection(acc.id, 'solid_cubes')}
                                                                    disabled={sc <= 0}
                                                                >
                                                                    {sc}
                                                                </button>
                                                            ) : sc}
                                                        </td>
                                                        <td>{rp}</td>
                                                        <td>{psok}</td>
                                                        <td>{gs}</td>

                                                        <td>{typeof mesos === 'number' ? mesos.toFixed(2) : mesos}</td>
                                                        <td>
                                                            {isCurrent ? (
                                                                <span className="current-badge">Current</span>
                                                            ) : (
                                                                <Button size="sm" variant="ghost" onClick={() => setShowTransferConfirm({ accountId: acc.id, accountName: acc.email || '' })}>
                                                                    Transfer
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="no-session-placeholder" style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                        <h2>No Active Session</h2>
                        <p>Please start or continue a session from the <a href="/cubing-sessions" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Cubing Sessions</a> page.</p>
                    </div>
                )}

                {/* RESOURCE MODAL */}
                {showResourceModal && selectedResourceForUsage && selectedAccountId && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '600px' }}>
                            <h3>Use {selectedResourceForUsage.label}</h3>

                            <div className="resource-usage-options">
                                <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>Select payment method:</p>

                                {(() => {
                                    const account = accounts.find(a => a.id === selectedAccountId);
                                    if (!account) return null;

                                    // For Perfect Innocence, stock comes from Shared Chest (accessible by all accounts)
                                    const stock = selectedResourceForUsage.type === 'perfect_innoc'
                                        ? (sharedChest?.perfect_innocence_stock || 0)
                                        : (account[selectedResourceForUsage.type as keyof Account] as number || 0);
                                    const rpCost = resourceMetadata[selectedResourceForUsage.type]?.rpCost || 0;

                                    // Determine Meso Price from Config State
                                    let mesoPrice = 0;
                                    if (selectedResourceForUsage.type === 'psok') mesoPrice = psokConfig.price;
                                    else if (selectedResourceForUsage.type === 'perfect_innoc') mesoPrice = pInnocConfig.price;
                                    else if (selectedResourceForUsage.type === 'guardian_scroll') mesoPrice = gScrollConfig.price;

                                    return (
                                        <div className="usage-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            {/* Option 1: Stock */}
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleConfirmResourceUsage('Stock')}
                                                disabled={stock < 1}
                                                style={{ height: 'auto', padding: '1rem', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}
                                            >
                                                <strong>{selectedResourceForUsage.type === 'perfect_innoc' ? 'Shared Chest' : 'Inventory Stock'}</strong>
                                                <span style={{ fontSize: '0.85rem' }}>Available: {stock}</span>
                                                <span style={{ fontSize: '0.85rem', color: '#4ade80' }}>Cost: 1 Stock</span>
                                            </Button>

                                            {/* Option 2: Mesos */}
                                            {(() => {
                                                const accountMesos = account.mesos_b || 0;
                                                const vaultMesos = sharedChest?.mesos_stock || 0;
                                                const totalMesos = accountMesos + vaultMesos;
                                                const hasEnoughMesos = totalMesos >= mesoPrice;

                                                return (
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => handleConfirmResourceUsage('Mesos')}
                                                        disabled={!hasEnoughMesos && mesoPrice > 0}
                                                        style={{ height: 'auto', padding: '1rem', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}
                                                    >
                                                        <strong>Mesos</strong>
                                                        <span style={{ fontSize: '0.85rem' }}>
                                                            Available: <strong>{totalMesos.toFixed(2)}B</strong>
                                                            <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '0.5rem' }}>
                                                                (Account: {accountMesos.toFixed(2)}B | Vault: {vaultMesos.toFixed(2)}B)
                                                            </span>
                                                        </span>
                                                        <span style={{ fontSize: '0.85rem', color: hasEnoughMesos || mesoPrice === 0 ? '#4ade80' : '#f87171' }}>
                                                            Cost: {mesoPrice.toFixed(2)}B Mesos
                                                        </span>
                                                    </Button>
                                                );
                                            })()}

                                            {/* Option 3: Reward Points - Not available for Perfect Innocence */}
                                            {selectedResourceForUsage.type !== 'perfect_innoc' && (
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => handleConfirmResourceUsage('RP')}
                                                    disabled={account.reward_points < rpCost}
                                                    style={{ height: 'auto', padding: '1rem', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}
                                                >
                                                    <strong>Reward Points</strong>
                                                    <span style={{ fontSize: '0.85rem' }}>Available: {account.reward_points.toLocaleString()}</span>
                                                    <span style={{ fontSize: '0.85rem', color: '#c084fc' }}>Cost: {rpCost.toLocaleString()} RP</span>
                                                </Button>
                                            )}

                                            {/* Option 4: Gift */}
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleConfirmResourceUsage('Gift')}
                                                style={{ height: 'auto', padding: '1rem', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}
                                            >
                                                <strong>Gift / Free</strong>
                                                <span style={{ fontSize: '0.85rem' }}>No impact on inventory</span>
                                                <span style={{ fontSize: '0.85rem', color: '#fff' }}>Cost: 0</span>
                                            </Button>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                <Button variant="ghost" onClick={() => setShowResourceModal(false)}>Cancel</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONFIRMATION MODAL */}
                {showTransferConfirm && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Confirm Transfer</h3>
                            <p>Are you sure you want to transfer this item to <strong>{showTransferConfirm.accountName}</strong>?</p>
                            <p>This will change the item's location and available resources.</p>
                            <div className="modal-actions">
                                <Button variant="secondary" onClick={() => setShowTransferConfirm(null)}>Cancel</Button>
                                <Button onClick={handleTransferConfirm}>Confirm Transfer</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpgradeWorkspaceV2;
