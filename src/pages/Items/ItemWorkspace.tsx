// =============================================
// ITEM WORKSPACE — Vista Unificada de Item + Cubing
// Layout: Izq=Controles Cubeo | Centro=Propiedades | Der=Pool Recursos
// =============================================

import React, { useEffect, useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { ocrUtil } from '../../utils/ocr';
import { Button, Select, ResourceHistoryPanel } from '../../components/UI';
import {
    itemsService, clientsService, accountsService, resourcesService,
    charactersService, itemsDBService, cubeSessionsService, sharedInventoryService,
    resourceHistoryService, transactionsService
} from '../../services';
import type {
    Item, Client, Account, ResourceType, Character, ItemDB,
    CubeSession, SharedInventory, PotentialTier, TradeabilityType
} from '../../types';
import './ItemWorkspace.css';

// ========================= CONSTANTS =========================

const TIER_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'Rare', label: 'Rare' },
    { value: 'Epic', label: 'Epic' },
    { value: 'Unique', label: 'Unique' },
    { value: 'Legendary', label: 'Legendary' },
];

const TRADEABILITY_OPTIONS = [
    { value: 'Tradeable', label: 'Tradeable' },
    { value: 'Tradeable Once', label: 'Tradeable Once' },
    { value: 'Untradeable', label: 'Untradeable' },
];

// ========================= TYPES =========================

interface ResourceModalState {
    type: ResourceType | string;
    label: string;
}

interface Props {
    item: Item;
    onBack: () => void;
}

// ========================= COMPONENT =========================

export const ItemWorkspace: React.FC<Props> = ({ item: initialItem, onBack }) => {

    // ---- Data ----
    const [clients, setClients] = useState<Client[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [itemDBs, setItemDBs] = useState<ItemDB[]>([]);
    const [sharedChest, setSharedChest] = useState<SharedInventory | null>(null);
    const [accountBalances, setAccountBalances] = useState<Record<string, Record<string, number>>>({});
    const [resourceMetadata, setResourceMetadata] = useState<Record<string, { image: string; rpCost: number; mesoCost: number }>>({});

    // ---- Item editing ----
    const [editingItem, setEditingItem] = useState<Partial<Item>>(initialItem);

    // ---- Session ----
    const [activeSession, setActiveSession] = useState<CubeSession | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string>('');

    // ---- Account (derived from item's character) ----
    const [itemAccountId, setItemAccountId] = useState<string>('');

    // ---- Cube use counts (manual mode) ----
    const [brightCubesUsed, setBrightCubesUsed] = useState<number>(0);
    const [bonusCubesUsed, setBonusCubesUsed] = useState<number>(0);
    const [solidCubesUsed, setSolidCubesUsed] = useState<number>(0);

    // ---- Fast Cubing ----
    const [isFastCubingActive, setIsFastCubingActive] = useState<boolean>(false);
    const [fastCubingSelection, setFastCubingSelection] = useState<Record<string, { bright_cubes?: boolean; bonus_bright_cubes?: boolean; solid_cubes?: boolean }>>({});

    // ---- Resource filter (right panel) ----
    const [resourceFilters, setResourceFilters] = useState<Record<string, boolean>>({
        solid_cubes: true, bright_cubes: true, bonus_bright_cubes: true,
        psok: false, reward_points: false, guardian_scroll: false,
    });

    // ---- UI state ----
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [ocrLoading, setOcrLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [historyPanelOpen, setHistoryPanelOpen] = useState<boolean>(false);
    const [editingField, setEditingField] = useState<string | null>(null);

    // ---- Modals ----
    const [resourceModal, setResourceModal] = useState<ResourceModalState | null>(null);
    const [transferConfirm, setTransferConfirm] = useState<{ accountId: string; accountName: string } | null>(null);

    // ========================= INIT =========================

    useEffect(() => {
        loadData();
    }, []);

    // Load active session when component mounts
    useEffect(() => {
        cubeSessionsService.getActiveSessionByItemId(initialItem.id)
            .then(setActiveSession)
            .catch(console.error);
    }, [initialItem.id]);

    // Sync selected client when session loads
    useEffect(() => {
        if (activeSession && clients.length > 0) {
            const client = clients.find(c => c.id === activeSession.client_id);
            if (client) {
                setSelectedClientId(client.id);
            }
        }
    }, [activeSession, clients]);

    // Derive item's account id from its character
    useEffect(() => {
        if (characters.length > 0 && editingItem.character_id) {
            const char = characters.find(c => c.id === editingItem.character_id);
            if (char) setItemAccountId(char.account_id);
        }
    }, [characters, editingItem.character_id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [clientsData, accountsData, charsData, dbData, metaData, sharedData] = await Promise.all([
                clientsService.getAll(),
                accountsService.getAll(),
                charactersService.getAll(),
                itemsDBService.getAll(),
                resourcesService.getResourceMetadata(),
                sharedInventoryService.get().catch(() => null),
            ]);

            setClients(clientsData);
            setAccounts(accountsData);
            setCharacters(charsData);
            setItemDBs(dbData);
            setResourceMetadata(metaData);
            if (sharedData) setSharedChest(sharedData);

            // Fetch all account balances
            const balancesArr = await Promise.all(accountsData.map(acc => resourcesService.getAllBalances(acc.id)));
            const newBalances: Record<string, Record<string, number>> = {};
            accountsData.forEach((acc, i) => { newBalances[acc.id] = balancesArr[i]; });
            setAccountBalances(newBalances);
        } catch (err) {
            console.error('Error loading workspace data', err);
        } finally {
            setLoading(false);
        }
    };

    const refreshBalances = useCallback(async () => {
        const balancesArr = await Promise.all(accounts.map(acc => resourcesService.getAllBalances(acc.id)));
        const newBalances: Record<string, Record<string, number>> = {};
        accounts.forEach((acc, i) => { newBalances[acc.id] = balancesArr[i]; });
        setAccountBalances(newBalances);

        const sharedData = await sharedInventoryService.get().catch(() => null);
        if (sharedData) setSharedChest(sharedData);
    }, [accounts]);

    // ========================= HELPERS =========================

    const getItemDBInfo = (name?: string) => {
        if (!name) return { image: null, slots: undefined };
        const match = itemDBs.find(db => db.name === name);
        return { image: match?.image_url || null, slots: match?.slots };
    };

    const getMainName = (accountId: string) => {
        const main = characters.find(c => c.account_id === accountId && c.main === 'Main');
        return main ? main.name : null;
    };

    const getItemBalance = (type: ResourceType | string): number => {
        if (!itemAccountId) return 0;
        return accountBalances[itemAccountId]?.[type] || 0;
    };

    const getActiveClient = (): Client | undefined =>
        clients.find(c => c.id === (activeSession?.client_id || selectedClientId));

    const getFastCubingTotals = () => {
        let bc = 0, bbc = 0, sc = 0;
        Object.entries(fastCubingSelection).forEach(([accId, sel]) => {
            const bal = accountBalances[accId] || {};
            if (sel.bright_cubes) bc += bal.bright_cubes || 0;
            if (sel.bonus_bright_cubes) bbc += bal.bonus_bright_cubes || 0;
            if (sel.solid_cubes) sc += bal.solid_cubes || 0;
        });
        return { bc, bbc, sc };
    };

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    // ========================= SESSION ACTIONS =========================

    const handleStartSession = async () => {
        if (!selectedClientId) { showMessage('error', 'Selecciona un cliente primero'); return; }

        setSaving(true);
        try {
            const client = clients.find(c => c.id === selectedClientId)!;

            const session = await cubeSessionsService.create({
                item_id: initialItem.id,
                client_id: selectedClientId,
                account_id: itemAccountId,
                psok_used: 0, bright_cubes_used: 0, bonus_bright_cubes_used: 0,
                solid_cubes_used: 0, perfect_innoc_used: 0, gaurdian_scroll_used: 0,
                cubing_session_status: 'Ongoing',
            });

            setActiveSession(session);

            showMessage('success', `Sesión iniciada para ${client.name}`);
        } catch (err: any) {
            showMessage('error', err.message || 'Error al iniciar sesión');
        } finally {
            setSaving(false);
        }
    };

    const handleFinalizeSession = async () => {
        if (!activeSession) return;
        if (!window.confirm('¿Finalizar la sesión de cubeo? Podrás crear el Account Receivable desde Cubing History.')) return;

        setSaving(true);
        try {
            await cubeSessionsService.finalize(activeSession.id);

            // Update item status: in_stock → for_sale
            if (editingItem.status === 'in_stock') {
                await itemsService.update(initialItem.id, { status: 'for_sale' });
                setEditingItem(prev => ({ ...prev, status: 'for_sale' }));
            }

            setActiveSession(null);
            showMessage('success', 'Sesión finalizada. Ve a Cubing History para crear el AR.');
        } catch (err: any) {
            showMessage('error', err.message || 'Error al finalizar sesión');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelSession = async () => {
        if (!activeSession) return;
        const hasUsage = (activeSession.bright_cubes_used || 0) > 0 ||
            (activeSession.bonus_bright_cubes_used || 0) > 0 ||
            (activeSession.solid_cubes_used || 0) > 0;

        const msg = hasUsage
            ? 'Esta sesión ya tiene recursos registrados. Cancelar NO revertirá los cubos descontados. ¿Eliminar la sesión de todas formas?'
            : '¿Cancelar y eliminar esta sesión?';

        if (!window.confirm(msg)) return;

        setSaving(true);
        try {
            await cubeSessionsService.delete(activeSession.id);
            setActiveSession(null);
            showMessage('success', 'Sesión cancelada y eliminada.');
        } catch (err: any) {
            showMessage('error', err.message || 'Error al cancelar sesión');
        } finally {
            setSaving(false);
        }
    };

    // ========================= SAVE PROPERTIES =========================

    const handleSaveProperties = async () => {
        setSaving(true);
        try {
            // 1. Save potentials & item stats
            await itemsService.update(initialItem.id, {
                main_potential_tier: editingItem.main_potential_tier,
                main_potential_1: editingItem.main_potential_1,
                main_potential_2: editingItem.main_potential_2,
                main_potential_3: editingItem.main_potential_3,
                bonus_potential_tier: editingItem.bonus_potential_tier,
                bonus_potential_1: editingItem.bonus_potential_1,
                bonus_potential_2: editingItem.bonus_potential_2,
                bonus_potential_3: editingItem.bonus_potential_3,
                tradeability: editingItem.tradeability,
                remaining_trade_slots: editingItem.remaining_trade_slots,
                star_force: editingItem.star_force,
            });

            const client = getActiveClient();
            const bbcMeso = resourceMetadata['bonus_bright_cubes']?.mesoCost || 0;
            const bcMeso = resourceMetadata['bright_cubes']?.mesoCost || 0;
            const scMeso = resourceMetadata['solid_cubes']?.mesoCost || 0.05;

            // 2. Deduct cubes if manual mode
            if (!isFastCubingActive) {
                const totalCubes = brightCubesUsed + bonusCubesUsed + solidCubesUsed;
                if (totalCubes > 0 && itemAccountId) {
                    const balBC = getItemBalance('bright_cubes');
                    const balBBC = getItemBalance('bonus_bright_cubes');
                    const balSC = getItemBalance('solid_cubes');

                    if (brightCubesUsed > balBC) throw new Error(`Bright Cubes insuficientes (disponible: ${balBC})`);
                    if (bonusCubesUsed > balBBC) throw new Error(`Bonus Cubes insuficientes (disponible: ${balBBC})`);
                    if (solidCubesUsed > balSC) throw new Error(`Solid Cubes insuficientes (disponible: ${balSC})`);

                    const deductions: Promise<void>[] = [];
                    if (brightCubesUsed > 0) deductions.push(resourcesService.deductCubes(itemAccountId, 'bright_cubes', brightCubesUsed));
                    if (bonusCubesUsed > 0) deductions.push(resourcesService.deductCubes(itemAccountId, 'bonus_bright_cubes', bonusCubesUsed));
                    if (solidCubesUsed > 0) deductions.push(resourcesService.deductCubes(itemAccountId, 'solid_cubes', solidCubesUsed));
                    await Promise.all(deductions);

                    const historyItems = [
                        { type: 'bright_cubes', qty: brightCubesUsed, meso: bcMeso },
                        { type: 'bonus_bright_cubes', qty: bonusCubesUsed, meso: bbcMeso },
                        { type: 'solid_cubes', qty: solidCubesUsed, meso: scMeso },
                    ].filter(d => d.qty > 0);

                    let mesoCostForAlvaro = 0;

                    for (const d of historyItems) {
                        await resourceHistoryService.add({
                            session_id: activeSession?.id || null,
                            account_id: itemAccountId,
                            item_id: initialItem.id,
                            resource_type: d.type as ResourceType,
                            action_type: 'deduct',
                            quantity: d.qty,
                            payment_method: 'stock',
                            meso_cost: 0, rp_cost: 0,
                            covered_by_me: false, target_account_id: null, notes: null,
                        });
                        mesoCostForAlvaro += d.qty * d.meso;
                    }

                    if (activeSession) {
                        const sessionUpdates = {
                            bright_cubes_used: (activeSession.bright_cubes_used || 0) + brightCubesUsed,
                            bonus_bright_cubes_used: (activeSession.bonus_bright_cubes_used || 0) + bonusCubesUsed,
                            solid_cubes_used: (activeSession.solid_cubes_used || 0) + solidCubesUsed,
                        };
                        await cubeSessionsService.update(activeSession.id, sessionUpdates);
                        setActiveSession(prev => prev ? { ...prev, ...sessionUpdates } : null);
                    }

                    // Update Alvaro costs
                    if (client?.name === 'Alvaro' && mesoCostForAlvaro > 0) {
                        const costUpdates = {
                            costo_cubos: (editingItem.costo_cubos || 0) + mesoCostForAlvaro,
                            costo_total: (editingItem.costo_total || 0) + mesoCostForAlvaro,
                        };
                        await itemsService.update(initialItem.id, costUpdates);
                        setEditingItem(prev => ({ ...prev, ...costUpdates }));
                    }

                    setBrightCubesUsed(0); setBonusCubesUsed(0); setSolidCubesUsed(0);
                }
            } else {
                // Fast Cubing mode
                const deductions: { accId: string; type: ResourceType; qty: number }[] = [];
                Object.entries(fastCubingSelection).forEach(([accId, sel]) => {
                    const bal = accountBalances[accId] || {};
                    if (sel.bright_cubes && (bal.bright_cubes || 0) > 0) deductions.push({ accId, type: 'bright_cubes', qty: bal.bright_cubes });
                    if (sel.bonus_bright_cubes && (bal.bonus_bright_cubes || 0) > 0) deductions.push({ accId, type: 'bonus_bright_cubes', qty: bal.bonus_bright_cubes });
                    if (sel.solid_cubes && (bal.solid_cubes || 0) > 0) deductions.push({ accId, type: 'solid_cubes', qty: bal.solid_cubes });
                });

                if (deductions.length > 0) {
                    let totalMesoCost = 0;
                    const sessionUpdates: any = {
                        bright_cubes_used: activeSession?.bright_cubes_used || 0,
                        bonus_bright_cubes_used: activeSession?.bonus_bright_cubes_used || 0,
                        solid_cubes_used: activeSession?.solid_cubes_used || 0,
                    };

                    for (const d of deductions) {
                        await resourcesService.deductCubes(d.accId, d.type, d.qty);
                        await resourceHistoryService.add({
                            session_id: activeSession?.id || null,
                            account_id: d.accId, item_id: initialItem.id,
                            resource_type: d.type, action_type: 'deduct',
                            quantity: d.qty, payment_method: 'stock',
                            meso_cost: 0, rp_cost: 0,
                            covered_by_me: false, target_account_id: null,
                            notes: 'Fast Cubing',
                        });

                        if (d.type === 'bright_cubes') { sessionUpdates.bright_cubes_used += d.qty; totalMesoCost += d.qty * bcMeso; }
                        else if (d.type === 'bonus_bright_cubes') { sessionUpdates.bonus_bright_cubes_used += d.qty; totalMesoCost += d.qty * bbcMeso; }
                        else if (d.type === 'solid_cubes') { sessionUpdates.solid_cubes_used += d.qty; totalMesoCost += d.qty * scMeso; }
                    }

                    if (activeSession) {
                        await cubeSessionsService.update(activeSession.id, sessionUpdates);
                        setActiveSession(prev => prev ? { ...prev, ...sessionUpdates } : null);
                    }

                    if (client?.name === 'Alvaro' && totalMesoCost > 0) {
                        const costUpdates = {
                            costo_cubos: (editingItem.costo_cubos || 0) + totalMesoCost,
                            costo_total: (editingItem.costo_total || 0) + totalMesoCost,
                        };
                        await itemsService.update(initialItem.id, costUpdates);
                        setEditingItem(prev => ({ ...prev, ...costUpdates }));
                    }

                    setFastCubingSelection({});
                }
            }

            await refreshBalances();
            showMessage('success', 'Cambios guardados correctamente');
        } catch (err: any) {
            showMessage('error', err.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    // ========================= RESOURCE USAGE (PSOK / Guardian / Innoc) =========================

    const handleConfirmResourceUsage = async (method: 'Stock' | 'Mesos' | 'RP' | 'Gift') => {
        if (!resourceModal || !itemAccountId || !activeSession) return;
        const { type, label } = resourceModal;
        const account = accounts.find(a => a.id === itemAccountId);
        if (!account) return;

        setSaving(true);
        try {
            const dbInfo = getItemDBInfo(editingItem.name as string);
            const isInfiniteSlots = dbInfo.slots === 0;
            let mesoPrice = 0;

            if (type === 'psok') {
                if (!isInfiniteSlots && (editingItem.remaining_trade_slots || 0) <= 0)
                    throw new Error('Sin slots disponibles. Usa Perfect Innocence primero.');
                mesoPrice = resourceMetadata['psok']?.mesoCost || 0;
            } else if (type === 'perfect_innoc') {
                if (isInfiniteSlots) throw new Error('Este item no usa Perfect Innocence (slots infinitos).');
                mesoPrice = resourceMetadata['perfect_innoc']?.mesoCost || 0;
            } else if (type === 'guardian_scroll') {
                if (isInfiniteSlots) throw new Error('Este item no usa Guardian Scroll (slots infinitos).');
                mesoPrice = resourceMetadata['guardian_scroll']?.mesoCost || 0;
            }

            const rpPrice = resourceMetadata[type]?.rpCost || 0;

            // Deduct based on method
            if (method === 'Stock') {
                if (type === 'perfect_innoc') {
                    const vaultStock = sharedChest?.perfect_innocence_stock || 0;
                    if (vaultStock < 1) throw new Error('Sin stock de Perfect Innocence en Shared Chest.');
                    await sharedInventoryService.updatePerfectInnocence(vaultStock - 1);
                } else {
                    const stock = accountBalances[itemAccountId]?.[type] || 0;
                    if (stock < 1) throw new Error(`Sin stock de ${label}. Disponible: ${stock}`);
                    await resourcesService.deductCubes(itemAccountId, type as ResourceType, 1);
                }
            } else if (method === 'RP') {
                const balRP = accountBalances[itemAccountId]?.reward_points || 0;
                if (balRP < rpPrice) throw new Error(`RP insuficientes. Costo: ${rpPrice}, Disponible: ${balRP}`);
                await resourcesService.deductCubes(itemAccountId, 'reward_points', rpPrice);
            } else if (method === 'Mesos') {
                const accountMesos = account.mesos_b || 0;
                const vaultMesos = sharedChest?.mesos_stock || 0;
                const totalFunds = accountMesos + vaultMesos;
                if (totalFunds < mesoPrice) throw new Error(`Mesos insuficientes. Costo: ${mesoPrice}B, Disponible: ${totalFunds.toFixed(2)}B`);

                const deductFromAcc = Math.min(accountMesos, mesoPrice);
                const deductFromVault = mesoPrice - deductFromAcc;

                const updatePs: Promise<any>[] = [];
                if (deductFromAcc > 0) updatePs.push(accountsService.update(account.id, { mesos_b: accountMesos - deductFromAcc }));
                if (deductFromVault > 0) updatePs.push(sharedInventoryService.updateMesos(vaultMesos - deductFromVault));
                await Promise.all(updatePs);

                await transactionsService.createMeso({
                    account_id: itemAccountId, type: 'expense', amount: mesoPrice,
                    description: `${label} usado en sesión de cubeo`,
                    item_id: initialItem.id, client_id: activeSession.client_id,
                    session_id: activeSession.id,
                });
            }

            const isCovered = false;

            // Log history
            await resourceHistoryService.add({
                session_id: activeSession.id, account_id: itemAccountId,
                item_id: initialItem.id, resource_type: type,
                action_type: 'use', quantity: 1,
                payment_method: method.toLowerCase() as any,
                meso_cost: mesoPrice, rp_cost: method === 'RP' ? rpPrice : 0,
                covered_by_me: isCovered, target_account_id: null, notes: null,
            });

            // Update session usage counts
            const sessionUpdates: any = {};
            if (type === 'psok') sessionUpdates.psok_used = (activeSession.psok_used || 0) + 1;
            else if (type === 'perfect_innoc') sessionUpdates.perfect_innoc_used = (activeSession.perfect_innoc_used || 0) + 1;
            else if (type === 'guardian_scroll') sessionUpdates.gaurdian_scroll_used = (activeSession.gaurdian_scroll_used || 0) + 1;

            await cubeSessionsService.update(activeSession.id, sessionUpdates);
            setActiveSession(prev => prev ? { ...prev, ...sessionUpdates } : null);

            // Apply item effects
            const itemUpdates: any = {};
            const dbInfoCheck = getItemDBInfo(editingItem.name as string);
            const infiniteSlots2 = dbInfoCheck.slots === 0;

            if (type === 'psok') {
                itemUpdates.tradeability = 'Tradeable Once';
                if (!infiniteSlots2) itemUpdates.remaining_trade_slots = Math.max(0, (editingItem.remaining_trade_slots || 0) - 1);
            } else if (type === 'perfect_innoc' && !infiniteSlots2 && dbInfoCheck.slots !== undefined) {
                itemUpdates.remaining_trade_slots = dbInfoCheck.slots;
            }

            if (Object.keys(itemUpdates).length > 0) {
                await itemsService.update(initialItem.id, itemUpdates);
                setEditingItem(prev => ({ ...prev, ...itemUpdates }));
            }

            // Alvaro cost tracking
            const activeClient = getActiveClient();
            if (activeClient?.name === 'Alvaro' && mesoPrice > 0) {
                const costKey = type === 'psok' ? 'costo_psok' : type === 'guardian_scroll' ? 'costo_guardian_scroll' : 'costo_perfect_innoc';
                const costUpdates: any = {
                    [costKey]: ((editingItem as any)[costKey] || 0) + mesoPrice,
                    costo_total: (editingItem.costo_total || 0) + mesoPrice,
                };
                await itemsService.update(initialItem.id, costUpdates);
                setEditingItem(prev => ({ ...prev, ...costUpdates }));
            }

            await refreshBalances();
            setResourceModal(null);
            showMessage('success', `${label} usado via ${method}`);
        } catch (err: any) {
            showMessage('error', err.message);
        } finally {
            setSaving(false);
        }
    };

    // ========================= ITEM TRANSFER =========================

    const handleTransferConfirm = async () => {
        if (!transferConfirm) return;
        setSaving(true);
        try {
            const { accountId } = transferConfirm;
            const accountChars = characters.filter(c => c.account_id === accountId);
            const targetCharId = accountChars.length > 0 ? accountChars[0].id : null;

            const updates: any = { character_id: targetCharId };
            if (editingItem.tradeability === 'Tradeable Once') updates.tradeability = 'Untradeable';
            await itemsService.update(initialItem.id, updates);

            if (activeSession) {
                await cubeSessionsService.update(activeSession.id, { account_id: accountId });
                setActiveSession(prev => prev ? { ...prev, account_id: accountId } : null);
            }

            await resourceHistoryService.add({
                session_id: activeSession?.id || null,
                account_id: itemAccountId, item_id: initialItem.id,
                resource_type: 'item_transfer', action_type: 'transfer',
                quantity: 1, payment_method: null,
                meso_cost: 0, rp_cost: 0, covered_by_me: false,
                target_account_id: accountId,
                notes: `Transferido a ${transferConfirm.accountName}`,
            });

            setEditingItem(prev => ({ ...prev, ...updates }));
            setItemAccountId(accountId);
            setTransferConfirm(null);
            showMessage('success', `Item transferido a ${transferConfirm.accountName}`);
        } catch (err: any) {
            showMessage('error', err.message || 'Error al transferir item');
        } finally {
            setSaving(false);
        }
    };

    // ========================= OCR =========================

    const handlePaste = async (e: React.ClipboardEvent) => {
        const pasteItems = e.clipboardData.items;
        let blob: Blob | null = null;
        for (let i = 0; i < pasteItems.length; i++) {
            if (pasteItems[i].type.indexOf('image') !== -1) { blob = pasteItems[i].getAsFile(); break; }
        }
        if (!blob) return;

        setOcrLoading(true);
        showMessage('info', 'Analizando imagen...');
        try {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(blob);
            const result = ocrUtil.processItemImageText(ret.data.text, itemDBs, { expectedName: editingItem.name as string });
            await worker.terminate();

            if (!result.success) { showMessage('error', result.error || 'No se pudo escanear el item'); return; }
            const { success, error: _e, ...updates } = result;
            setEditingItem(prev => ({ ...prev, ...updates }));
            showMessage('success', 'Item actualizado desde screenshot!');
        } catch (err: any) {
            showMessage('error', 'Error al procesar imagen');
        } finally {
            setOcrLoading(false);
        }
    };

    // ========================= FAST CUBING TOGGLE =========================

    const toggleFastCubingSelection = (accountId: string, type: 'bright_cubes' | 'bonus_bright_cubes' | 'solid_cubes') => {
        setFastCubingSelection(prev => ({
            ...prev,
            [accountId]: { ...(prev[accountId] || {}), [type]: !(prev[accountId]?.[type]) },
        }));
    };

    // ========================= RENDER HELPERS =========================

    const renderPotentialInput = (
        field: keyof Item,
        placeholder: string,
        value: string | null | undefined,
    ) => {
        const isEditing = editingField === field;
        if (!isEditing) {
            return (
                <div
                    className="maple-potential-line premium-editable"
                    onClick={() => setEditingField(field)}
                >
                    {value || placeholder}
                </div>
            );
        }
        return (
            <input
                autoFocus
                className="premium-input"
                value={value || ''}
                onChange={e => setEditingItem(prev => ({ ...prev, [field]: e.target.value || null }))}
                onBlur={() => setEditingField(null)}
                placeholder={placeholder}
            />
        );
    };

    const StarForceSystem: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
        const stars = Array.from({ length: 30 }, (_, i) => i + 1);

        return (
            <div className="maple-sf-system">
                <div className="maple-stars-grid">
                    {stars.map(s => (
                        <span
                            key={s}
                            className={`maple-star ${s <= value ? 'active' : ''}`}
                            onClick={() => onChange(s)}
                            onDoubleClick={() => onChange(0)}
                            title={`Set to ${s} stars`}
                        >
                            ★
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    // ========================= RENDER =========================

    const dbInfo = getItemDBInfo(editingItem.name as string);
    const fcTotals = getFastCubingTotals();
    const itemBal = accountBalances[itemAccountId] || {};

    if (loading) {
        return (
            <div className="item-workspace">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-secondary)', fontSize: '0.9rem', gap: '0.5rem' }}>
                    <span>⚙️</span> Cargando workspace...
                </div>
            </div>
        );
    }

    return (
        <div className="item-workspace" onPaste={handlePaste} tabIndex={0} style={{ outline: 'none' }}>

            {/* ---- TOPBAR ---- */}
            <div className="workspace-topbar">
                <button className="workspace-back-btn" onClick={onBack}>
                    ← Items
                </button>

                {dbInfo.image ? (
                    <img src={dbInfo.image} alt={editingItem.name as string} className="workspace-item-image" />
                ) : (
                    <div className="workspace-item-image-placeholder">🗡️</div>
                )}

                <div className="workspace-item-info">
                    <span className="workspace-item-name">{editingItem.name}</span>
                    {(editingItem.star_force || 0) > 0 && (
                        <span className="workspace-item-sf">★{editingItem.star_force}</span>
                    )}
                    <span className={`workspace-status-badge ${editingItem.status}`}>
                        {editingItem.status}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
                        {editingItem.tradeability} {editingItem.remaining_trade_slots != null ? `· ${editingItem.remaining_trade_slots} slots` : ''}
                    </span>
                </div>

                {/* Fast Cubing Toggle */}
                <label className={`fast-cubing-toggle ${isFastCubingActive ? 'active' : ''}`}>
                    <input
                        type="checkbox"
                        checked={isFastCubingActive}
                        onChange={e => { setIsFastCubingActive(e.target.checked); if (!e.target.checked) setFastCubingSelection({}); }}
                    />
                    ⚡ FAST CUBING
                </label>
            </div>

            {/* ---- MESSAGE ---- */}
            {message && (
                <div className={`workspace-message-bar ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* ---- 3-COLUMN GRID ---- */}
            <div className="workspace-grid">

                {/* ===== LEFT PANEL: CUBING CONTROLS ===== */}
                <div className="workspace-panel">

                    {/* Start Session / Active Session Header */}
                    {!activeSession ? (
                        <div className="ws-section session-start-panel">
                            <h4>🎲 Cubing Session</h4>
                            <Select
                                label="Cliente"
                                value={selectedClientId}
                                onChange={setSelectedClientId}
                                options={[{ value: '', label: 'Seleccionar cliente...' }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
                            />
                            <button
                                className="start-btn"
                                onClick={handleStartSession}
                                disabled={!selectedClientId || saving}
                            >
                                {saving ? '...' : '▶ Iniciar Sesión'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Active Session Info */}
                            <div className="ws-section">
                                <h4>🔴 Sesión Activa</h4>
                                <div className="session-active-header">
                                    <span className="session-client-name">
                                        {getActiveClient()?.name || 'Sin cliente'}
                                    </span>
                                    <span className="session-meta">
                                        Iniciada: {new Date(activeSession.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Session Metrics */}
                                <div className="session-metrics">
                                    <div className="session-metric-box">
                                        <label>BC</label>
                                        <span>{activeSession.bright_cubes_used || 0}</span>
                                    </div>
                                    <div className="session-metric-box">
                                        <label>BBC</label>
                                        <span>{activeSession.bonus_bright_cubes_used || 0}</span>
                                    </div>
                                    <div className="session-metric-box">
                                        <label>SC</label>
                                        <span>{activeSession.solid_cubes_used || 0}</span>
                                    </div>
                                    <div className="session-metric-box">
                                        <label>PSOK</label>
                                        <span>{activeSession.psok_used || 0}</span>
                                    </div>
                                    <div className="session-metric-box">
                                        <label>P.Innoc</label>
                                        <span>{activeSession.perfect_innoc_used || 0}</span>
                                    </div>
                                    <div className="session-metric-box">
                                        <label>GScroll</label>
                                        <span>{activeSession.gaurdian_scroll_used || 0}</span>
                                    </div>
                                </div>

                                {/* History Panel Toggle */}
                                <button
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem', width: '100%' }}
                                    onClick={() => setHistoryPanelOpen(!historyPanelOpen)}
                                >
                                    📜 {historyPanelOpen ? 'Ocultar historial' : 'Ver historial de recursos'}
                                </button>

                                {historyPanelOpen && (
                                    <ResourceHistoryPanel
                                        sessionId={activeSession.id}
                                        isOpen={historyPanelOpen}
                                        onToggle={() => setHistoryPanelOpen(!historyPanelOpen)}
                                    />
                                )}
                            </div>

                            {/* Cube Usage (Manual Mode) */}
                            {!isFastCubingActive && (
                                <div className="ws-section">
                                    <h4>Cuenta #{accounts.find(a => a.id === itemAccountId)?.number}</h4>

                                    {/* Solid Cubes */}
                                    <div className="cube-stepper-row">
                                        <img
                                            src={resourceMetadata['solid_cubes']?.image}
                                            className="cube-img-btn"
                                            title={`Solid (${itemBal.solid_cubes || 0} disponibles) — click para +1`}
                                            onClick={() => setSolidCubesUsed(Math.min(itemBal.solid_cubes || 0, solidCubesUsed + 1))}
                                        />
                                        <span className="cube-stepper-max">{itemBal.solid_cubes || 0}</span>
                                        <div className="cube-stepper-controls">
                                            <button onClick={() => setSolidCubesUsed(Math.max(0, solidCubesUsed - 1))}>−</button>
                                            <input type="number" value={solidCubesUsed} onChange={e => setSolidCubesUsed(Math.min(itemBal.solid_cubes || 0, Math.max(0, parseInt(e.target.value) || 0)))} />
                                            <button onClick={() => setSolidCubesUsed(Math.min(itemBal.solid_cubes || 0, solidCubesUsed + 1))}>+</button>
                                        </div>
                                    </div>

                                    {/* Bright Cubes */}
                                    <div className="cube-stepper-row">
                                        <img
                                            src={resourceMetadata['bright_cubes']?.image}
                                            className="cube-img-btn"
                                            title={`Bright (${itemBal.bright_cubes || 0} disponibles) — click para +1`}
                                            onClick={() => setBrightCubesUsed(Math.min(itemBal.bright_cubes || 0, brightCubesUsed + 1))}
                                        />
                                        <span className="cube-stepper-max">{itemBal.bright_cubes || 0}</span>
                                        <div className="cube-stepper-controls">
                                            <button onClick={() => setBrightCubesUsed(Math.max(0, brightCubesUsed - 1))}>−</button>
                                            <input type="number" value={brightCubesUsed} onChange={e => setBrightCubesUsed(Math.min(itemBal.bright_cubes || 0, Math.max(0, parseInt(e.target.value) || 0)))} />
                                            <button onClick={() => setBrightCubesUsed(Math.min(itemBal.bright_cubes || 0, brightCubesUsed + 1))}>+</button>
                                        </div>
                                    </div>

                                    {/* Bonus Cubes */}
                                    <div className="cube-stepper-row">
                                        <img
                                            src={resourceMetadata['bonus_bright_cubes']?.image}
                                            className="cube-img-btn"
                                            title={`Bonus (${itemBal.bonus_bright_cubes || 0} disponibles) — click para +1`}
                                            onClick={() => setBonusCubesUsed(Math.min(itemBal.bonus_bright_cubes || 0, bonusCubesUsed + 1))}
                                        />
                                        <span className="cube-stepper-max">{itemBal.bonus_bright_cubes || 0}</span>
                                        <div className="cube-stepper-controls">
                                            <button onClick={() => setBonusCubesUsed(Math.max(0, bonusCubesUsed - 1))}>−</button>
                                            <input type="number" value={bonusCubesUsed} onChange={e => setBonusCubesUsed(Math.min(itemBal.bonus_bright_cubes || 0, Math.max(0, parseInt(e.target.value) || 0)))} />
                                            <button onClick={() => setBonusCubesUsed(Math.min(itemBal.bonus_bright_cubes || 0, bonusCubesUsed + 1))}>+</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Fast Cubing Totals */}
                            {isFastCubingActive && (
                                <div className="ws-section">
                                    <h4>⚡ Fast Cubing — Seleccionado</h4>
                                    <div className="fast-cubing-totals">
                                        <div className="fc-total-badge"><span className="fc-label">BC</span><span className="fc-value">{fcTotals.bc}</span></div>
                                        <div className="fc-total-badge"><span className="fc-label">BBC</span><span className="fc-value">{fcTotals.bbc}</span></div>
                                        <div className="fc-total-badge"><span className="fc-label">SC</span><span className="fc-value">{fcTotals.sc}</span></div>
                                    </div>
                                    <small style={{ color: 'var(--color-text-tertiary)', fontSize: '0.72rem', textAlign: 'center', display: 'block' }}>
                                        Haz click en los cubos del panel derecho para seleccionarlos
                                    </small>
                                </div>
                            )}

                            {/* Resources (PSOK, Innoc, Guardian) */}
                            <div className="ws-section">
                                <h4>Recursos Especiales</h4>

                                <div className="resource-usage-row">
                                    <img
                                        src={resourceMetadata['psok']?.image}
                                        className="resource-img-btn"
                                        title="PSOK — click para usar"
                                        onClick={() => setResourceModal({ type: 'psok', label: 'PSOK' })}
                                    />
                                    <span className="resource-count-badge">{activeSession.psok_used || 0}</span>
                                </div>

                                <div className="resource-usage-row">
                                    <img
                                        src={resourceMetadata['perfect_innoc']?.image}
                                        className="resource-img-btn"
                                        title="Perfect Innoc. — click para usar"
                                        onClick={() => setResourceModal({ type: 'perfect_innoc', label: 'Perfect Innoc.' })}
                                    />
                                    <span className="resource-count-badge">{activeSession.perfect_innoc_used || 0}</span>
                                </div>

                                <div className="resource-usage-row">
                                    <img
                                        src={resourceMetadata['guardian_scroll']?.image}
                                        className="resource-img-btn"
                                        title="Guardian Scroll — click para usar"
                                        onClick={() => setResourceModal({ type: 'guardian_scroll', label: 'Guardian Scroll' })}
                                    />
                                    <span className="resource-count-badge">{activeSession.gaurdian_scroll_used || 0}</span>
                                </div>
                            </div>

                            {/* Session Actions */}
                            <div className="session-actions-row">
                                <Button variant="secondary" size="sm" onClick={handleCancelSession} disabled={saving}>
                                    Cancelar Sesión
                                </Button>
                                <Button variant="danger" size="sm" onClick={handleFinalizeSession} disabled={saving} loading={saving}>
                                    Finalizar
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                {/* ===== CENTER PANEL: ITEM PROPERTIES (MAPLE TOOLTIP) ===== */}
                <div className="workspace-panel">
                    <div className="maple-tooltip-container">

                        {/* Star Force Section */}
                        <StarForceSystem
                            value={editingItem.star_force || 0}
                            onChange={v => setEditingItem(prev => ({ ...prev, star_force: v }))}
                        />

                        {/* Item Header */}
                        <div className="maple-item-header">
                            {editingField === 'name' ? (
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    <input
                                        autoFocus
                                        className="premium-input maple-item-name"
                                        style={{ width: 'auto' }}
                                        value={editingItem.name || ''}
                                        onChange={e => setEditingItem(prev => ({ ...prev, name: e.target.value }))}
                                        onBlur={() => setEditingField(null)}
                                    />
                                    <input
                                        type="number"
                                        className="premium-input maple-item-name"
                                        style={{ width: '50px', color: '#facc15' }}
                                        value={editingItem.star_force || 0}
                                        onChange={e => setEditingItem(prev => ({ ...prev, star_force: parseInt(e.target.value) || 0 }))}
                                        onBlur={() => setEditingField(null)}
                                    />
                                </div>
                            ) : (
                                <h2 className="maple-item-name premium-editable" onClick={() => setEditingField('name')}>
                                    {editingItem.name}
                                    <span className="maple-item-sf-suffix">★ {editingItem.star_force || 0}</span>
                                </h2>
                            )}

                            <div className="maple-item-icon-container">
                                <div className="maple-item-icon-border">
                                    {dbInfo.image ? (
                                        <img src={dbInfo.image} alt={editingItem.name as string} className="maple-item-icon" />
                                    ) : (
                                        <div style={{ fontSize: '2rem' }}>🗡️</div>
                                    )}
                                </div>
                            </div>

                            <div className="maple-stats-bar">
                                {editingField === 'tradeability' ? (
                                    <Select
                                        autoFocus
                                        value={editingItem.tradeability || 'Tradeable'}
                                        onChange={v => {
                                            setEditingItem(prev => ({ ...prev, tradeability: v as TradeabilityType }));
                                            setEditingField(null);
                                        }}
                                        options={TRADEABILITY_OPTIONS}
                                    />
                                ) : (
                                    <span className="premium-editable" onClick={() => setEditingField('tradeability')}>
                                        {editingItem.tradeability}
                                    </span>
                                )}

                                {editingField === 'remaining_trade_slots' ? (
                                    <input
                                        autoFocus
                                        type="number"
                                        className="premium-input"
                                        style={{ width: '40px' }}
                                        value={editingItem.remaining_trade_slots ?? 0}
                                        onChange={e => setEditingItem(prev => ({ ...prev, remaining_trade_slots: parseInt(e.target.value) || 0 }))}
                                        onBlur={() => setEditingField(null)}
                                    />
                                ) : (
                                    <span className="premium-editable" onClick={() => setEditingField('remaining_trade_slots')}>
                                        Slots: {editingItem.remaining_trade_slots ?? 0}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Main Potential */}
                        <div className="maple-potential-section">
                            <div className="maple-potential-header">
                                <div className="maple-potential-tier-icon">P</div>
                                <span>Main Potential</span>
                                {editingField === 'main_tier' ? (
                                    <Select
                                        autoFocus
                                        value={editingItem.main_potential_tier || ''}
                                        onChange={v => {
                                            setEditingItem(prev => ({ ...prev, main_potential_tier: (v || null) as PotentialTier | null }));
                                            setEditingField(null);
                                        }}
                                        options={TIER_OPTIONS}
                                    />
                                ) : (
                                    <span className={`premium-editable text-${editingItem.main_potential_tier?.toLowerCase() || 'none'}`} onClick={() => setEditingField('main_tier')}>
                                        [{editingItem.main_potential_tier || 'None'}]
                                    </span>
                                )}
                            </div>
                            <div className="maple-potential-lines">
                                {renderPotentialInput('main_potential_1', 'Line 1', editingItem.main_potential_1)}
                                {renderPotentialInput('main_potential_2', 'Line 2', editingItem.main_potential_2)}
                                {renderPotentialInput('main_potential_3', 'Line 3', editingItem.main_potential_3)}
                            </div>
                        </div>

                        {/* Bonus Potential */}
                        <div className="maple-potential-section" style={{ borderTop: '1px dashed #555', paddingTop: '0.5rem' }}>
                            <div className="maple-potential-header">
                                <div className="maple-potential-tier-icon" style={{ background: '#60a5fa' }}>A</div>
                                <span style={{ color: '#60a5fa' }}>Bonus Potential</span>
                                {editingField === 'bonus_tier' ? (
                                    <Select
                                        autoFocus
                                        value={editingItem.bonus_potential_tier || ''}
                                        onChange={v => {
                                            setEditingItem(prev => ({ ...prev, bonus_potential_tier: (v || null) as PotentialTier | null }));
                                            setEditingField(null);
                                        }}
                                        options={TIER_OPTIONS}
                                    />
                                ) : (
                                    <span className={`premium-editable text-${editingItem.bonus_potential_tier?.toLowerCase() || 'none'}`} onClick={() => setEditingField('bonus_tier')}>
                                        [{editingItem.bonus_potential_tier || 'None'}]
                                    </span>
                                )}
                            </div>
                            <div className="maple-potential-lines">
                                {renderPotentialInput('bonus_potential_1', 'Line 1', editingItem.bonus_potential_1)}
                                {renderPotentialInput('bonus_potential_2', 'Line 2', editingItem.bonus_potential_2)}
                                {renderPotentialInput('bonus_potential_3', 'Line 3', editingItem.bonus_potential_3)}
                            </div>
                        </div>

                        {/* Save Actions */}
                        <button className="save-properties-btn" onClick={handleSaveProperties} disabled={saving}>
                            {saving ? '...' : '💾 Guardar Cambios' + ((!isFastCubingActive && (brightCubesUsed + bonusCubesUsed + solidCubesUsed) > 0) ? ` & Descontar ${brightCubesUsed + bonusCubesUsed + solidCubesUsed} cubos` : '')}
                        </button>
                    </div>

                    {isFastCubingActive && (fcTotals.bc + fcTotals.bbc + fcTotals.sc) > 0 && (
                        <button className="save-properties-btn" onClick={handleSaveProperties} disabled={saving} style={{ background: 'linear-gradient(135deg, rgba(192,132,252,0.18), rgba(139,92,246,0.18))', borderColor: 'rgba(192,132,252,0.4)', color: '#e9d5ff' }}>
                            ⚡ Guardar & Descontar Fast Cubing ({fcTotals.bc + fcTotals.bbc + fcTotals.sc} cubos)
                        </button>
                    )}

                    <div
                        className="ocr-paste-zone"
                        style={{ marginTop: '1rem' }}
                        tabIndex={0}
                        title="Pega un screenshot con Ctrl+V para escanear potenciales"
                        onClick={() => showMessage('info', 'Presiona Ctrl+V para pegar un screenshot del item')}
                    >
                        {ocrLoading ? '⏳ Analizando...' : '📋 OCR Paste Zone (Ctrl+V)'}
                    </div>
                </div>

                {/* ===== RIGHT PANEL: RESOURCE POOL ===== */}
                <div className="workspace-panel">

                    {/* Filter Header */}
                    <div className="ws-section">
                        <div className="resource-pool-header">
                            <h4 style={{ margin: 0 }}>Pool de Recursos</h4>
                        </div>
                        <div className="resource-filter-toggles">
                            {[
                                { key: 'solid_cubes', label: 'SC' },
                                { key: 'bright_cubes', label: 'BC' },
                                { key: 'bonus_bright_cubes', label: 'BBC' },
                                { key: 'reward_points', label: 'RP' },
                                { key: 'psok', label: 'PSOK' },
                                { key: 'guardian_scroll', label: 'GS' },
                            ].map(f => (
                                <span
                                    key={f.key}
                                    className={`filter-chip ${resourceFilters[f.key] ? 'active' : ''}`}
                                    onClick={() => setResourceFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                                >
                                    {f.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Shared Chest */}
                    {sharedChest && (
                        <div className="ws-section shared-chest-pool">
                            <h4>🗄️ Shared Chest</h4>
                            <div className="shared-chest-row">
                                <div className="shared-chest-stat">
                                    <span className="sc-label">Mesos (B)</span>
                                    <span className="sc-value">{(sharedChest.mesos_stock || 0).toFixed(2)}</span>
                                </div>
                                <div className="shared-chest-stat">
                                    <span className="sc-label">P. Innoc.</span>
                                    <span className="sc-value">{sharedChest.perfect_innocence_stock || 0}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Account Rows */}
                    {accounts
                        .filter(acc => {
                            const bal = accountBalances[acc.id] || {};
                            const isCurrent = acc.id === itemAccountId;
                            if (isCurrent) return true;
                            return (resourceFilters.solid_cubes && (bal.solid_cubes || 0) > 0) ||
                                (resourceFilters.bright_cubes && (bal.bright_cubes || 0) > 0) ||
                                (resourceFilters.bonus_bright_cubes && (bal.bonus_bright_cubes || 0) > 0) ||
                                (resourceFilters.reward_points && (bal.reward_points || 0) > 0) ||
                                (resourceFilters.psok && (bal.psok || 0) > 0) ||
                                (resourceFilters.guardian_scroll && (bal.guardian_scroll || 0) > 0);
                        })
                        .sort((a, b) => {
                            if (a.id === itemAccountId) return -1;
                            if (b.id === itemAccountId) return 1;
                            return (a.number || 0) - (b.number || 0);
                        })
                        .map(acc => {
                            const bal = accountBalances[acc.id] || {};
                            const isCurrent = acc.id === itemAccountId;

                            return (
                                <div key={acc.id} className={`account-pool-row ${isCurrent ? 'is-current' : ''}`}>
                                    <div className="account-pool-row-header">
                                        <span className="pool-acc-number">#{acc.number}</span>
                                        <span className="pool-acc-name">{getMainName(acc.id) || acc.email || acc.id.slice(0, 8)}</span>
                                        {isCurrent && <span className="pool-current-badge">Actual</span>}
                                    </div>

                                    <div className="pool-resources-grid">
                                        {/* SC */}
                                        <div
                                            className={`pool-resource-cell sc ${isFastCubingActive ? 'fast-selectable' : ''} ${fastCubingSelection[acc.id]?.solid_cubes ? 'fast-selected' : ''}`}
                                            onClick={isFastCubingActive ? () => toggleFastCubingSelection(acc.id, 'solid_cubes') : undefined}
                                        >
                                            <span className="pool-resource-label">SC</span>
                                            <span className={`pool-resource-value ${(bal.solid_cubes || 0) === 0 ? 'zero' : ''}`}>{bal.solid_cubes || 0}</span>
                                        </div>

                                        {/* BC */}
                                        <div
                                            className={`pool-resource-cell bc ${isFastCubingActive ? 'fast-selectable' : ''} ${fastCubingSelection[acc.id]?.bright_cubes ? 'fast-selected' : ''}`}
                                            onClick={isFastCubingActive ? () => toggleFastCubingSelection(acc.id, 'bright_cubes') : undefined}
                                        >
                                            <span className="pool-resource-label">BC</span>
                                            <span className={`pool-resource-value ${(bal.bright_cubes || 0) === 0 ? 'zero' : ''}`}>{bal.bright_cubes || 0}</span>
                                        </div>

                                        {/* BBC */}
                                        <div
                                            className={`pool-resource-cell bbc ${isFastCubingActive ? 'fast-selectable' : ''} ${fastCubingSelection[acc.id]?.bonus_bright_cubes ? 'fast-selected' : ''}`}
                                            onClick={isFastCubingActive ? () => toggleFastCubingSelection(acc.id, 'bonus_bright_cubes') : undefined}
                                        >
                                            <span className="pool-resource-label">BBC</span>
                                            <span className={`pool-resource-value ${(bal.bonus_bright_cubes || 0) === 0 ? 'zero' : ''}`}>{bal.bonus_bright_cubes || 0}</span>
                                        </div>

                                        {/* RP */}
                                        {resourceFilters.reward_points && (
                                            <div className="pool-resource-cell rp">
                                                <span className="pool-resource-label">RP</span>
                                                <span className={`pool-resource-value ${(bal.reward_points || 0) === 0 ? 'zero' : ''}`}>{(bal.reward_points || 0).toLocaleString()}</span>
                                            </div>
                                        )}

                                        {/* PSOK */}
                                        {resourceFilters.psok && (
                                            <div className="pool-resource-cell psok">
                                                <span className="pool-resource-label">PSOK</span>
                                                <span className={`pool-resource-value ${(bal.psok || 0) === 0 ? 'zero' : ''}`}>{bal.psok || 0}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="pool-actions-row">
                                        {isCurrent ? (
                                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>📍 Item en esta cuenta</span>
                                        ) : (
                                            <button
                                                className="pool-action-btn transfer"
                                                onClick={() => setTransferConfirm({ accountId: acc.id, accountName: getMainName(acc.id) || acc.email || `#${acc.number}` })}
                                            >
                                                ⇄ Transferir Item Aquí
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* ===== RESOURCE USAGE MODAL ===== */}
            {resourceModal && itemAccountId && activeSession && (
                <div className="ws-modal-overlay" onClick={() => setResourceModal(null)}>
                    <div className="ws-modal-box" onClick={e => e.stopPropagation()}>
                        <h3>Usar {resourceModal.label}</h3>

                        {(() => {
                            const account = accounts.find(a => a.id === itemAccountId);
                            if (!account) return null;
                            const stockVal = resourceModal.type === 'perfect_innoc'
                                ? (sharedChest?.perfect_innocence_stock || 0)
                                : (accountBalances[itemAccountId]?.[resourceModal.type] || 0);
                            const rpCost = resourceMetadata[resourceModal.type]?.rpCost || 0;
                            const mesoPrice = resourceMetadata[resourceModal.type]?.mesoCost || 0;

                            const accMesos = account.mesos_b || 0;
                            const vaultMesos = sharedChest?.mesos_stock || 0;
                            const totalMesosAvail = accMesos + vaultMesos;
                            const hasEnoughMesos = totalMesosAvail >= mesoPrice;
                            const balRP = accountBalances[itemAccountId]?.reward_points || 0;

                            return (
                                <div className="ws-modal-options">
                                    <button className="ws-modal-option-btn" onClick={() => handleConfirmResourceUsage('Stock')} disabled={stockVal < 1}>
                                        <strong>{resourceModal.type === 'perfect_innoc' ? 'Shared Chest' : 'Inventario'}</strong>
                                        <small>Disponible: {stockVal}</small>
                                        <span className="option-cost">Costo: 1 Stock</span>
                                    </button>

                                    <button className="ws-modal-option-btn" onClick={() => handleConfirmResourceUsage('Mesos')} disabled={!hasEnoughMesos && mesoPrice > 0}>
                                        <strong>Mesos</strong>
                                        <small>Disponible: {totalMesosAvail.toFixed(2)}B</small>
                                        <span className={`option-cost ${!hasEnoughMesos && mesoPrice > 0 ? 'insufficient' : ''}`}>
                                            Costo: {mesoPrice.toFixed(2)}B
                                        </span>
                                    </button>

                                    {resourceModal.type !== 'perfect_innoc' && (
                                        <button className="ws-modal-option-btn" onClick={() => handleConfirmResourceUsage('RP')} disabled={balRP < rpCost}>
                                            <strong>Reward Points</strong>
                                            <small>Disponible: {balRP.toLocaleString()}</small>
                                            <span className={`option-cost ${balRP < rpCost ? 'insufficient' : ''}`}>
                                                Costo: {rpCost.toLocaleString()} RP
                                            </span>
                                        </button>
                                    )}

                                    <button className="ws-modal-option-btn" onClick={() => handleConfirmResourceUsage('Gift')}>
                                        <strong>Gift / Free</strong>
                                        <small>Sin impacto en inventario</small>
                                        <span className="option-cost">Costo: 0</span>
                                    </button>
                                </div>
                            );
                        })()}

                        <div className="ws-modal-cancel-row">
                            <Button variant="ghost" size="sm" onClick={() => setResourceModal(null)}>Cancelar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== TRANSFER CONFIRM MODAL ===== */}
            {transferConfirm && (
                <div className="ws-modal-overlay" onClick={() => setTransferConfirm(null)}>
                    <div className="ws-modal-box" onClick={e => e.stopPropagation()}>
                        <h3>Confirmar Transferencia</h3>
                        <p className="transfer-confirm-text">
                            ¿Transferir <strong>{editingItem.name}</strong> a la cuenta de <strong>{transferConfirm.accountName}</strong>?
                            {editingItem.tradeability === 'Tradeable Once' && (
                                <><br /><span style={{ color: '#f87171' }}>⚠️ El item pasará a ser Untradeable tras la transferencia.</span></>
                            )}
                        </p>
                        <div className="session-actions-row">
                            <Button variant="secondary" onClick={() => setTransferConfirm(null)}>Cancelar</Button>
                            <Button variant="primary" onClick={handleTransferConfirm} loading={saving}>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemWorkspace;
