import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Header } from '../../components/Layout';
import { Card, Button, Modal, Input, LoadingScreen, AccountCell, ItemCard } from '../../components/UI';
import {
    accountsService,
    charactersService,
    eventsService,
    itemsService,
    itemsDBService,
    transactionsService,
    bossesService,
    bossingService,
    resourcesService,
    classesService,
} from '../../services';
import type { Boss } from '../../services';
import type {
    Account,
    Character,
    CharacterWithAccount,
    ClassItem,
    GameEvent,
    ItemWithCharacter,
    EventAccountProgress,
    ItemDB,
    BossingSession,
    MysticFrontierExpedition,
    MysticFrontierRewardEntry,
    MysticFrontierRewardType,
} from '../../types';
import { EXPIRING_RESOURCE_TYPES, RESOURCE_LABELS } from '../../types';
import { UNLOCK_DEFINITIONS, SEQUENTIAL_UNLOCK_GROUPS, type UnlockDef } from '../../constants/unlocks';
import {
    getExpeditions,
    getRewardHistory,
    setUnlocked,
    CUBE_RESOURCE_KEYS,
} from '../../services/mysticFrontierService';
import { CharacterRow } from '../MysticFrontier/MysticFrontierPage';
import { CharDetailsPanel } from './CharDetailsPanel';
import { ExtraStatsCellPanel } from './ExtraStatsCellPanel';
import { ContentUnlocksCellPanel } from './ContentUnlocksCellPanel';
import './Overview.css';

const BOSS_IMAGE_ALIAS: Record<string, string> = {
    'Slime': 'Guardian Angel Slime',
};

const BOSS_PREQUEST_COL: Record<string, string> = {
    'Cygnus':    'unlock_cygnus',
    'Pink Bean': 'unlock_pink_bean',
    'Magnus':    'unlock_magnus',
    'Slime':     'unlock_slime',
    'Papulatus': 'unlock_papulatus',
};

const BOSS_IMAGE_URL = (bossName: string) => {
    const imgName = BOSS_IMAGE_ALIAS[bossName] ?? bossName;
    return `https://media.maplestorywiki.net/yetidb/Maple_Guide_-_${imgName.replace(/ /g, '_')}.png`;
};

const CATEGORY_COLORS = {
    event: '#4ade80',
    boss: '#f87171',
    system: '#fbbf24'
};

const HIDDEN_GROUPS_KEY = 'dailyCheckup_hiddenGroups';

const loadHiddenGroups = (): Set<string> => {
    try {
        const stored = localStorage.getItem(HIDDEN_GROUPS_KEY);
        if (stored) return new Set(JSON.parse(stored));
    } catch { /* ignore */ }
    return new Set();
};

const HIDDEN_BOSS_NAMES = new Set(['Guardian Angel Slime', 'Lucid']);

const BOSS_NAME_ORDER: Record<string, number> = {
    'Zakum': 10, 'Hilla': 20, 'Papulatus': 30,
    'Von Bon': 40, 'Pierre': 50, 'Crimson Queen': 60, 'Vellum': 70,
    'Cygnus': 80, 'Pink Bean': 90, 'Magnus': 100,
    'Princess No': 110, 'Akechi Mitsuhide': 120, 'Lotus': 130, 'Damien': 140,
    'Will': 150, 'Gloom': 160, 'Darknell': 170, 'Bain': 180,
    'Verus Hilla': 190, 'Chosen Seren': 200, 'Kalos': 210,
    'Kaling': 220, 'Limbo': 230, 'Horntail': 240, 'Arkarium': 250,
};

const Overview: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [allChars, setAllChars] = useState<Character[]>([]);
    const [mainChars, setMainChars] = useState<Character[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
    const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(loadHiddenGroups);
    const [allItems, setAllItems] = useState<ItemWithCharacter[]>([]);
    const [itemsDB, setItemsDB] = useState<ItemDB[]>([]);
    const [eventProgress, setEventProgress] = useState<EventAccountProgress[]>([]);

    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [sellingItem, setSellingItem] = useState<ItemWithCharacter | null>(null);
    const [salePrice, setSalePrice] = useState(0);

    // Panel visibility toggles
    const [showItems, setShowItems] = useState(false);
    const [showBossing, setShowBossing] = useState(false);
    const [showMF, setShowMF] = useState(false);
    const [showCharDetails, setShowCharDetails] = useState(false);
    const [showResources, setShowResources] = useState(false);
    const [showExtraStats, setShowExtraStats] = useState(false);
    const [showContentUnlocks, setShowContentUnlocks] = useState(false);
    const [showAllAccount0Mains, setShowAllAccount0Mains] = useState(false);

    const [activeItemFilters, setActiveItemFilters] = useState<Set<string>>(new Set(['for_sale']));
    const [allBosses, setAllBosses] = useState<Boss[]>([]);
    const [weekSessions, setWeekSessions] = useState<BossingSession[]>([]);
    const [bossStates, setBossStates] = useState<Record<string, Record<string, 0 | 1 | 2>>>({});
    const [accountBalances, setAccountBalances] = useState<Record<string, Record<string, number>>>({});
    const [rpOverrides, setRpOverrides] = useState<Record<string, number | null>>({});
    const [bossDrops, setBossDrops] = useState<Record<string, { solidCubes?: number, papMark?: number }>>({});
    const [registeringAccounts, setRegisteringAccounts] = useState<Set<string>>(new Set());
    const [resourceImages, setResourceImages] = useState<Record<string, string>>({});

    // Mystic Frontier panel data
    const [mfExpeditions, setMfExpeditions] = useState<Record<string, MysticFrontierExpedition[]>>({});
    const [mfHistory, setMfHistory] = useState<Record<string, MysticFrontierRewardEntry[]>>({});
    const [mfDataLoaded, setMfDataLoaded] = useState(false);
    const [mfUnlockLoading, setMfUnlockLoading] = useState<Record<string, boolean>>({});

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const weekStart = useMemo(() => bossingService.getWeekStart(), []);
    const LS_KEY = `bossStates_${weekStart}`;

    useEffect(() => {
        loadData();

        const channel = supabase
            .channel('overview_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_account_progress' }, (payload: any) => {
                setEventProgress(prev => {
                    const newData = payload.new as EventAccountProgress;
                    const oldData = payload.old as EventAccountProgress;
                    if (payload.eventType === 'DELETE') return prev.filter(p => p.id !== oldData.id);
                    const filtered = prev.filter(p => !(p.event_id === newData.event_id && p.account_id === newData.account_id));
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') filtered.push(newData);
                    return filtered;
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'characters' }, (payload) => {
                const updated = payload.new as Character;
                setAllChars(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
                setMainChars(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'accounts' }, (payload) => {
                setAccounts(prev => prev.map(acc => acc.id === (payload.new as any).id ? { ...acc, ...payload.new } : acc));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
                const TRACKED = ['for_sale', 'in_stock', 'bulk'];
                if (payload.eventType === 'UPDATE') {
                    const newItem = payload.new as ItemWithCharacter;
                    if (TRACKED.includes(newItem.status)) {
                        setAllItems(prev => {
                            const exists = prev.some(i => i.id === newItem.id);
                            if (exists) return prev.map(i => i.id === newItem.id ? { ...i, ...newItem } : i);
                            return [...prev, newItem];
                        });
                    } else {
                        setAllItems(prev => prev.filter(i => i.id !== newItem.id));
                    }
                } else if (payload.eventType === 'INSERT') {
                    const newItem = payload.new as ItemWithCharacter;
                    if (TRACKED.includes(newItem.status)) {
                        setAllItems(prev => [...prev, newItem]);
                    }
                } else if (payload.eventType === 'DELETE') {
                    setAllItems(prev => prev.filter(i => i.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        if (Object.keys(bossStates).length > 0) {
            localStorage.setItem(LS_KEY, JSON.stringify(bossStates));
        }
    }, [bossStates, LS_KEY]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                accountsData,
                charsData,
                eventsData,
                forSaleData,
                inStockData,
                bulkData,
                itemsDBData,
                bossesData,
                weekSessionsData,
                resourcesMetadataData,
                classesData,
            ] = await Promise.all([
                accountsService.getAll().catch(e => { console.error(e); return []; }),
                charactersService.getAll().catch(e => { console.error(e); return []; }),
                eventsService.getActive().catch(e => { console.error(e); return []; }),
                itemsService.getByStatus('for_sale').catch(e => { console.error(e); return []; }),
                itemsService.getByStatus('in_stock').catch(e => { console.error(e); return []; }),
                itemsService.getByStatus('bulk').catch(e => { console.error(e); return []; }),
                itemsDBService.getAll().catch(e => { console.error(e); return []; }),
                bossesService.getAll().catch(e => { console.error(e); return []; }),
                bossingService.getWeekSessions(bossingService.getWeekStart()).catch(e => { console.error(e); return []; }),
                resourcesService.getResourceMetadata().catch(e => { console.error(e); return {}; }),
                classesService.getAll().catch(e => { console.error(e); return []; }),
            ]);

            setAccounts(accountsData.sort((a: Account, b: Account) => a.number - b.number));
            setAllChars(charsData);
            setMainChars(charsData.filter((c: Character) => c.main === 'Main'));
            setClasses(classesData);

            const balancesArr = await Promise.all(accountsData.map((acc: Account) => resourcesService.getAllBalances(acc.id)));
            const newBalances: Record<string, Record<string, number>> = {};
            accountsData.forEach((acc: Account, i: number) => { newBalances[acc.id] = balancesArr[i]; });
            setAccountBalances(newBalances);

            const filteredEvents = eventsData.filter((event: GameEvent) => {
                const start = event.start_date.split('T')[0];
                const end = event.end_date.split('T')[0];
                return todayStr >= start && todayStr <= end;
            });
            setActiveEvents(filteredEvents);

            setAllItems([...forSaleData, ...inStockData, ...bulkData]);
            setItemsDB(itemsDBData);
            setAllBosses(bossesData);
            setWeekSessions(weekSessionsData);

            const mapImages: Record<string, string> = {};
            Object.keys(resourcesMetadataData).forEach(k => mapImages[k] = (resourcesMetadataData as any)[k]?.image);
            setResourceImages(mapImages);

            let initialBossStates: Record<string, Record<string, 0 | 1 | 2>> = {};
            const lsStored = localStorage.getItem(LS_KEY);
            if (lsStored) {
                try { initialBossStates = JSON.parse(lsStored); } catch { /* ignore */ }
            }
            weekSessionsData.forEach((session: BossingSession) => {
                if (!initialBossStates[session.account_id]) initialBossStates[session.account_id] = {};
                session.bosses_cleared.forEach((bossId: string) => {
                    initialBossStates[session.account_id][bossId] = 1;
                });
            });
            setBossStates(initialBossStates);

            if (filteredEvents.length > 0) {
                const progressData = await eventsService.getAccountProgress(filteredEvents.map((e: GameEvent) => e.id));
                setEventProgress(progressData);
            }
        } catch (err: any) {
            console.error('Error loading Overview data:', err);
            setError(err.message || 'Error desconocido al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    // Load MF data lazily when the panel is first toggled on
    const loadMFData = useCallback(async (charIds: string[]) => {
        if (charIds.length === 0) return;
        const results = await Promise.all(
            charIds.map(id =>
                Promise.all([getExpeditions(id), getRewardHistory(id)])
                    .then(([exps, hist]) => ({ id, exps, hist }))
            )
        );
        setMfExpeditions(prev => {
            const next = { ...prev };
            results.forEach(r => { next[r.id] = r.exps; });
            return next;
        });
        setMfHistory(prev => {
            const next = { ...prev };
            results.forEach(r => { next[r.id] = r.hist; });
            return next;
        });
    }, []);

    const mfCubeImages = useMemo((): Record<MysticFrontierRewardType, string> => {
        const imgs: Record<string, string> = {};
        for (const [resourceKey, rewardType] of Object.entries(CUBE_RESOURCE_KEYS)) {
            if (resourceImages[resourceKey]) imgs[rewardType] = resourceImages[resourceKey];
        }
        return imgs as Record<MysticFrontierRewardType, string>;
    }, [resourceImages]);

    const indexedEventProgress = useMemo(() => {
        const map = new Map<string, EventAccountProgress>();
        (eventProgress || []).forEach(p => {
            if (p.event_id && p.account_id) map.set(`${p.event_id}-${p.account_id}`, p);
        });
        return map;
    }, [eventProgress]);

    const visibleUnlocks = useMemo(
        () => UNLOCK_DEFINITIONS.filter(def => !hiddenGroups.has(def.group)),
        [hiddenGroups]
    );

    const formatValue = (value: number) => {
        if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
        return value.toString();
    };

    const getItemAccountNumber = (characterId: string | null) => {
        if (!characterId) return null;
        const char = allChars.find(c => c.id === characterId);
        if (!char) return null;
        return accounts.find(a => a.id === char.account_id)?.number ?? null;
    };

    const itemsDBMap = useMemo(() => {
        const map = new Map<string, string>();
        (itemsDB || []).forEach(item => {
            if (item.name && item.image_url) map.set(item.name, item.image_url);
        });
        return map;
    }, [itemsDB]);

    const buildRow = useCallback((acc: Account, mainChar: Character | null) => {
        const accountItems = (allItems || []).filter(item => {
            if (!item || !item.character_id) return false;
            const char = (allChars || []).find(c => c.id === item.character_id);
            return char?.account_id === acc.id;
        });

        const eventStates: Record<string, boolean> = {};
        const eventWeeklyCounts: Record<string, number> = {};
        const eventTotalCounts: Record<string, number> = {};
        (activeEvents || []).forEach(event => {
            const prog = indexedEventProgress.get(`${event.id}-${acc.id}`);
            eventStates[event.id] = prog?.last_completed_date === todayStr;
            eventWeeklyCounts[event.id] = prog?.current_week_count || 0;
            eventTotalCounts[event.id] = prog?.total_count || 0;
        });

        const unlockStates: Record<string, boolean> = {};
        UNLOCK_DEFINITIONS.forEach(def => {
            if (def.level === 'account') {
                unlockStates[def.key] = Boolean((acc as any)[def.key]);
            } else {
                unlockStates[def.key] = Boolean((mainChar as any)?.[def.key]);
            }
        });

        return { account: acc, mainChar, items: accountItems, eventProgress: eventStates, eventWeeklyCounts, eventTotalCounts, unlockProgress: unlockStates };
    }, [allItems, allChars, activeEvents, indexedEventProgress, todayStr]);

    const rows = useMemo(() => {
        if (!accounts || accounts.length === 0) return [];
        try {
            return accounts.flatMap(acc => {
                if (acc.number === 0 && showAllAccount0Mains) {
                    const mains0 = (allChars || []).filter(c => c.account_id === acc.id && c.main === 'Main');
                    if (mains0.length === 0) return [buildRow(acc, null)];
                    return mains0.map(char => buildRow(acc, char));
                }
                const mainChar = acc.number === 0
                    ? (allChars || []).find(c => c.account_id === acc.id && c.name === 'Alvaro') || null
                    : (mainChars || []).find(c => c.account_id === acc.id) || null;
                return [buildRow(acc, mainChar)];
            });
        } catch (e) {
            console.error('Error calculating Overview rows:', e);
            return [];
        }
    }, [accounts, mainChars, allChars, buildRow, showAllAccount0Mains]);

    // Load MF data when panel is toggled on
    useEffect(() => {
        if (!showMF || mfDataLoaded) return;
        const charIds = [...new Set(rows.filter(r => r.mainChar).map(r => r.mainChar!.id))];
        loadMFData(charIds).then(() => setMfDataLoaded(true));
    }, [showMF, mfDataLoaded, rows, loadMFData]);

    // Reset MF loaded flag when toggle changes rows (account 0 mains toggle)
    useEffect(() => {
        setMfDataLoaded(false);
    }, [showAllAccount0Mains]);

    const formattedDate = useMemo(() => {
        try {
            return new Intl.DateTimeFormat('es-ES', {
                weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'
            }).format(new Date()).toUpperCase();
        } catch { return new Date().toISOString().split('T')[0]; }
    }, []);

    const eventProgressCounts = useMemo(() => {
        const counts: Record<string, { completed: number; total: number }> = {};
        activeEvents.forEach(event => {
            const maxPerWeek = event.max_per_week || 7;
            const completed = rows.filter(row => row.eventProgress[event.id]).length;
            const total = rows.filter(row =>
                (row.eventWeeklyCounts[event.id] < maxPerWeek) || row.eventProgress[event.id]
            ).length;
            counts[event.id] = { completed, total };
        });
        return counts;
    }, [activeEvents, rows]);

    const unlockProgressCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        UNLOCK_DEFINITIONS.forEach(def => {
            counts[def.key] = rows.filter(row => row.unlockProgress[def.key]).length;
        });
        return counts;
    }, [rows]);

    const groupedDailyUnlocks = useMemo(() => {
        const groups: { key: string; label: string; category: 'boss' | 'system' | 'event'; items: any[] }[] = [];
        if (activeEvents.length > 0) {
            groups.push({ key: 'events-group', label: 'EVENT', category: 'event', items: activeEvents.map(e => ({ ...e, isEvent: true })) });
        }
        const seen = new Map<string, number>();
        visibleUnlocks.forEach(def => {
            if (seen.has(def.group)) {
                groups[seen.get(def.group)!].items.push({ ...def, isEvent: false });
            } else {
                seen.set(def.group, groups.length);
                groups.push({ key: def.group, label: def.group, category: def.category, items: [{ ...def, isEvent: false }] });
            }
        });
        return groups;
    }, [activeEvents, visibleUnlocks]);

    const allUnlockGroups = useMemo(() => {
        const groups: { name: string; category: 'boss' | 'system'; isVisible: boolean }[] = [];
        const seen = new Set<string>();
        UNLOCK_DEFINITIONS.forEach(def => {
            if (!seen.has(def.group)) {
                seen.add(def.group);
                groups.push({ name: def.group, category: def.category, isVisible: !hiddenGroups.has(def.group) });
            }
        });
        return groups;
    }, [hiddenGroups]);

    const prereqMap = useMemo(() => {
        const map = new Map<string, string | null>();
        groupedDailyUnlocks.forEach(group => {
            if (SEQUENTIAL_UNLOCK_GROUPS.has(group.label)) {
                group.items.forEach((item, idx) => { map.set(item.key, idx > 0 ? group.items[idx - 1].key : null); });
            } else {
                group.items.forEach(item => map.set(item.key ?? item.id, null));
            }
        });
        return map;
    }, [groupedDailyUnlocks]);

    const visibleBosses = useMemo(() => {
        return allBosses
            .filter(b => !HIDDEN_BOSS_NAMES.has(b.name))
            .sort((a, b) => {
                const oa = BOSS_NAME_ORDER[a.name] ?? (a.order_index ?? 999);
                const ob = BOSS_NAME_ORDER[b.name] ?? (b.order_index ?? 999);
                return oa - ob;
            });
    }, [allBosses]);


    if (loading) return <LoadingScreen message="Cargando Overview..." />;

    if (error) {
        return (
            <div className="overview error">
                <h2>Ocurrió un error al cargar los datos</h2>
                <p>{error}</p>
                <Button onClick={loadData}>Reintentar</Button>
            </div>
        );
    }

    if (!accounts || accounts.length === 0) {
        return (
            <div className="overview empty">
                <Header title="Overview" subtitle="No hay cuentas disponibles" />
                <Card>
                    <p style={{ padding: '2rem', textAlign: 'center' }}>
                        No hay cuentas registradas. Por favor, añade cuentas en el módulo de Management.
                    </p>
                </Card>
            </div>
        );
    }

    // ---- Handlers ----

    const handleToggleEvent = async (eventId: string, accountId: string, completed: boolean) => {
        const event = activeEvents.find(e => e.id === eventId);
        if (event && event.type === 'daily_login' && completed) {
            const row = rows.find(r => r.account.id === accountId);
            if (row) {
                const weeklyCount = row.eventWeeklyCounts[eventId] || 0;
                const totalCount = row.eventTotalCounts[eventId] || 0;
                const maxPerWeek = event.max_per_week || 7;
                const maxPerEvent = event.max_per_event;
                if (weeklyCount >= maxPerWeek || (maxPerEvent !== null && totalCount >= maxPerEvent)) return;
            }
        }
        setEventProgress(prev => {
            const existing = prev.find(p => p.event_id === eventId && p.account_id === accountId);
            if (existing) {
                return prev.map(p => p.event_id === eventId && p.account_id === accountId
                    ? { ...p, last_completed_date: completed ? todayStr : null } : p);
            }
            return [...prev, {
                id: '', event_id: eventId, account_id: accountId,
                last_completed_date: completed ? todayStr : null,
                current_week_number: 0, current_week_count: completed ? 1 : 0,
                total_count: completed ? 1 : 0, updated_at: ''
            } as EventAccountProgress];
        });
        try {
            const updated = await eventsService.toggleAccountProgress(eventId, accountId);
            setEventProgress(prev => prev.map(p => p.event_id === eventId && p.account_id === accountId ? updated : p));
        } catch (err) { console.error('Error toggling event progress:', err); }
    };

    const toggleItemFilter = (status: string) => {
        setActiveItemFilters(prev => {
            const next = new Set(prev);
            if (next.has(status)) next.delete(status); else next.add(status);
            return next;
        });
    };

    const handleListAH = async (item: ItemWithCharacter) => {
        try {
            const timestamp = new Date().toISOString();
            await itemsService.updateAHListing(item.id, timestamp);
            setAllItems(prev => prev.map(i => i.id === item.id ? { ...i, ah_listed_at: timestamp } : i));
        } catch (err) { console.error('Error listing on AH:', err); }
    };

    const handleOpenSellModal = (item: ItemWithCharacter) => {
        setSellingItem(item);
        setSalePrice(item.estimated_value || 0);
        setSellModalOpen(true);
    };

    const handleConfirmSale = async () => {
        if (!sellingItem) return;
        try {
            const character = (allChars || []).find(c => c.id === sellingItem.character_id) || sellingItem.character;
            if (character) {
                const account = accounts.find(a => a.id === character.account_id);
                if (account) {
                    const fee = salePrice * 0.05;
                    const netSale = salePrice - fee;
                    await accountsService.update(account.id, { mesos_b: (account.mesos_b || 0) + netSale });
                    await transactionsService.createMeso({ account_id: account.id, type: 'income', amount: salePrice, description: `AH Sale: ${sellingItem.name}`, item_id: sellingItem.id });
                    await transactionsService.createMeso({ account_id: account.id, type: 'expense', amount: fee, description: `Auction House Fee (5%) - ${sellingItem.name}`, item_id: sellingItem.id });
                }
            }
            await itemsService.update(sellingItem.id, { status: 'sold', estimated_value: salePrice });
            setAllItems(prev => prev.filter(i => i.id !== sellingItem.id));
            setSellModalOpen(false);
            setSellingItem(null);
        } catch (err) { console.error('Error processing sale:', err); }
    };

    const handleToggleGroup = (groupName: string, show: boolean) => {
        setHiddenGroups(prev => {
            const next = new Set(prev);
            if (show) next.delete(groupName); else next.add(groupName);
            localStorage.setItem(HIDDEN_GROUPS_KEY, JSON.stringify([...next]));
            return next;
        });
    };

    const handleToggleUnlock = async (def: UnlockDef, accountId: string, charId: string | undefined, value: boolean) => {
        if (def.level === 'account') {
            setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, [def.key]: value } : a));
            try {
                await supabase.from('accounts').update({ [def.key]: value }).eq('id', accountId);
            } catch (err) {
                console.error('Error toggling account unlock:', err);
                setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, [def.key]: !value } : a));
            }
        } else if (charId) {
            setMainChars(prev => prev.map(c => c.id === charId ? { ...c, [def.key]: value } : c));
            try {
                await supabase.from('characters').update({ [def.key]: value }).eq('id', charId);
            } catch (err) {
                console.error('Error toggling character unlock:', err);
                setMainChars(prev => prev.map(c => c.id === charId ? { ...c, [def.key]: !value } : c));
            }
        }
    };

    const handleBossClick = (accountId: string, bossId: string) => {
        setBossStates(prev => {
            const cur = (prev[accountId]?.[bossId] ?? 0) as 0 | 1 | 2;
            const next: 0 | 1 | 2 = cur === 0 ? 1 : cur === 1 ? 2 : 0;
            return { ...prev, [accountId]: { ...(prev[accountId] || {}), [bossId]: next } };
        });
        setRpOverrides(prev => ({ ...prev, [accountId]: null }));
    };

    const handleToggleBossPrequest = async (accountId: string, bossId: string) => {
        const boss = allBosses.find(b => b.id === bossId);
        const unlockCol = boss ? BOSS_PREQUEST_COL[boss.name] : undefined;
        if (!unlockCol) return;
        const row = rows.find(r => r.account.id === accountId);
        const mainChar = row?.mainChar;
        if (!mainChar) return;
        const currentlyDone = !!(mainChar as unknown as Record<string, boolean>)[unlockCol];
        const newState = !currentlyDone;
        setMainChars(prev => prev.map(c => c.id === mainChar.id ? { ...c, [unlockCol]: newState } : c));
        setAllChars(prev => prev.map(c => c.id === mainChar.id ? { ...c, [unlockCol]: newState } : c));
        await supabase.from('characters').update({ [unlockCol]: newState }).eq('id', mainChar.id);
    };

    const handleRegisterBossing = async (accountId: string) => {
        if (registeringAccounts.has(accountId)) return;
        setRegisteringAccounts(prev => new Set([...prev, accountId]));
        try {
            const states = bossStates[accountId] || {};
            const clearedIds = Object.entries(states).filter(([, s]) => s === 1).map(([id]) => id);
            const calculated = clearedIds.length * 200;
            const finalRP = rpOverrides[accountId] ?? calculated;
            const existing = weekSessions.find(s => s.account_id === accountId);
            const delta = finalRP - (existing?.rp_earned || 0);
            const session = await bossingService.registerSession(accountId, clearedIds, finalRP);
            if (delta > 0) {
                await resourcesService.addBatch(accountId, 'reward_points', delta, session.rp_expires_at);
            } else if (delta < 0) {
                await resourcesService.deductCubes(accountId, 'reward_points', Math.abs(delta));
            }
            const drops = bossDrops[accountId];
            if (drops?.solidCubes && drops.solidCubes > 0) {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                const expiry = d.toISOString().split('T')[0] + 'T23:59:59';
                await resourcesService.addBatch(accountId, 'solid_cubes', drops.solidCubes, expiry);
            }
            if (drops?.papMark && drops.papMark > 0) {
                const papDb = itemsDB.find(i => i.name.toLowerCase().includes('papulatus mark'));
                const mainChar = mainChars.find(c => c.account_id === accountId);
                if (papDb && mainChar) {
                    for (let i = 0; i < drops.papMark; i++) {
                        await itemsService.create({
                            character_id: mainChar.id, name: papDb.name, status: 'in_stock',
                            star_force: 0, tradeability: 'Untradeable', remaining_trade_slots: 0,
                            estimated_value: 0, costo_item: 0, costo_cubos: 0, costo_psok: 0,
                            costo_sf: 0, costo_perfect_innoc: 0, costo_guardian_scroll: 0,
                            costo_replacement: 0, costo_total: 0,
                            main_potential_tier: null, main_potential_1: null, main_potential_2: null, main_potential_3: null,
                            bonus_potential_tier: null, bonus_potential_1: null, bonus_potential_2: null, bonus_potential_3: null,
                            delivered: false, ah_listed_at: null
                        });
                    }
                }
            }
            if (delta !== 0) {
                setAccountBalances(prev => ({
                    ...prev,
                    [accountId]: { ...prev[accountId], reward_points: (prev[accountId]?.reward_points || 0) + delta }
                }));
            }
            setWeekSessions(prev => [...prev.filter(s => s.account_id !== accountId), session]);
            setRpOverrides(prev => ({ ...prev, [accountId]: 0 }));
            setBossDrops(prev => { const n = { ...prev }; delete n[accountId]; return n; });
        } catch (err: any) {
            console.error('Error registering bossing:', err);
            alert(`Error al registrar bossing: ${err?.message || 'Error desconocido'}`);
        } finally {
            setRegisteringAccounts(prev => { const n = new Set(prev); n.delete(accountId); return n; });
        }
    };

    const handleCharacterUpdate = (charId: string, col: string, value: number | boolean | string | null) => {
        setAllChars(prev => prev.map(c => c.id === charId ? { ...c, [col]: value } : c));
        setMainChars(prev => prev.map(c => c.id === charId ? { ...c, [col]: value } : c));
    };

    const handleMFRefresh = async (characterId: string) => {
        const [exps, hist] = await Promise.all([getExpeditions(characterId), getRewardHistory(characterId)]);
        setMfExpeditions(prev => ({ ...prev, [characterId]: exps }));
        setMfHistory(prev => ({ ...prev, [characterId]: hist }));
    };

    const handleMFUnlockToggle = async (characterId: string, currentlyUnlocked: boolean) => {
        setMfUnlockLoading(prev => ({ ...prev, [characterId]: true }));
        try {
            await setUnlocked(characterId, !currentlyUnlocked);
            setAllChars(prev => prev.map(c => c.id === characterId ? { ...c, unlock_mf_8_fams: !currentlyUnlocked } : c));
            setMainChars(prev => prev.map(c => c.id === characterId ? { ...c, unlock_mf_8_fams: !currentlyUnlocked } : c));
        } finally {
            setMfUnlockLoading(prev => ({ ...prev, [characterId]: false }));
        }
    };

    // ---- Render helpers ----

    const renderResourcesPanel = (accountId: string, account: Account) => {
        const balances = accountBalances[accountId] || {};
        return (
            <div className="overview-resources-panel">
                <div className="overview-resources-grid">
                    {EXPIRING_RESOURCE_TYPES.map(type => {
                        const amount = balances[type] || 0;
                        const imgSrc = resourceImages[type];
                        const label = RESOURCE_LABELS[type];
                        return (
                            <div key={type} className="overview-resource-chip">
                                {imgSrc
                                    ? <img src={imgSrc} alt={label} title={label} />
                                    : <span style={{ fontSize: '14px' }} title={label}>💎</span>
                                }
                                <span className={`overview-resource-chip-value${amount === 0 ? ' overview-resource-chip-value--zero' : ''}`}>
                                    {amount.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                    <div className="overview-resource-chip overview-resource-mesos">
                        <span style={{ fontSize: '14px' }} title="Mesos">💰</span>
                        <span className="overview-resource-chip-value">
                            {(account.mesos_b || 0).toFixed(2)}B
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="overview">
            <Header
                title="Overview"
                subtitle={`Daily Status — ${formattedDate}`}
                actions={
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Account 0 mains toggle */}
                        <Button
                            variant={showAllAccount0Mains ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setShowAllAccount0Mains(v => !v)}
                            title={showAllAccount0Mains ? 'Showing all mains of account 0' : 'Showing only Alvaro'}
                        >
                            {showAllAccount0Mains ? 'All Mains' : 'Alvaro'}
                        </Button>

                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Panel toggles */}
                        <Button variant={showMF ? 'primary' : 'secondary'} size="sm" onClick={() => setShowMF(v => !v)}>
                            ◈ Mystic Frontier
                        </Button>
                        <Button variant={showCharDetails ? 'primary' : 'secondary'} size="sm" onClick={() => setShowCharDetails(v => !v)}>
                            Char Details
                        </Button>
                        <Button variant={showResources ? 'primary' : 'secondary'} size="sm" onClick={() => setShowResources(v => !v)}>
                            Resources
                        </Button>
                        <Button variant={showExtraStats ? 'primary' : 'secondary'} size="sm" onClick={() => setShowExtraStats(v => !v)}>
                            Extra Stats
                        </Button>
                        <Button variant={showContentUnlocks ? 'primary' : 'secondary'} size="sm" onClick={() => setShowContentUnlocks(v => !v)}>
                            Content Unlocks
                        </Button>

                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Existing toggles */}
                        {!showItems ? (
                            <Button variant="secondary" size="sm" onClick={() => setShowItems(true)}>Show Items</Button>
                        ) : (
                            <>
                                <Button variant="primary" size="sm" onClick={() => { setShowItems(false); setActiveItemFilters(new Set(['for_sale'])); }}>Hide Items</Button>
                                <Button variant={activeItemFilters.has('for_sale') ? 'primary' : 'secondary'} size="sm" onClick={() => toggleItemFilter('for_sale')}>For Sale</Button>
                                <Button variant={activeItemFilters.has('in_stock') ? 'primary' : 'secondary'} size="sm" onClick={() => toggleItemFilter('in_stock')}>In Stock</Button>
                                <Button variant={activeItemFilters.has('bulk') ? 'primary' : 'secondary'} size="sm" onClick={() => toggleItemFilter('bulk')}>Bulk</Button>
                            </>
                        )}
                        <Button variant={showBossing ? 'primary' : 'secondary'} size="sm" onClick={() => setShowBossing(!showBossing)}>
                            {showBossing ? 'Hide Bossing' : 'Bossing'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setConfigModalOpen(true)}>
                            ⚙️ Configure Tasks
                        </Button>
                    </div>
                }
            />

            <div className="daily-content">
                <Card padding="none" className="overview-table-container">
                    <table className="overview-table">
                        <thead>
                            <tr className="header-top-row">
                                <th rowSpan={2} className="col-account">ACCOUNT</th>
                                {groupedDailyUnlocks.map(group => (
                                    <th key={group.key} colSpan={group.items.length} className="header-group-cell" style={{ color: CATEGORY_COLORS[group.category] }}>
                                        {group.label}
                                    </th>
                                ))}
                                {showBossing && <th rowSpan={2} className="col-bossing">BOSSING</th>}
                                {showItems && <th rowSpan={2} colSpan={4} className="col-items">Items</th>}
                                {showResources && <th rowSpan={2} className="col-panel">💎 Resources</th>}
                                {showExtraStats && <th rowSpan={2} className="col-panel">Extra Stats</th>}
                                {showContentUnlocks && <th rowSpan={2} className="col-panel">Content Unlocks</th>}
                                {showCharDetails && <th rowSpan={2} className="col-panel">Details</th>}
                                {showMF && <th rowSpan={2} className="col-panel">◈ MF</th>}
                            </tr>
                            <tr className="header-bottom-row">
                                {groupedDailyUnlocks.map(group =>
                                    group.items.map((item: any) => {
                                        const count = item.isEvent
                                            ? (eventProgressCounts[item.id] || { completed: 0, total: 0 })
                                            : { completed: unlockProgressCounts[item.key] || 0, total: rows.length };
                                        return (
                                            <th key={item.key ?? item.id} className="col-subtask">
                                                <div className="header-stacked">
                                                    <div className="subtask-label">
                                                        {item.isEvent ? (
                                                            <span>{item.name}</span>
                                                        ) : item.category === 'boss' ? (
                                                            <img src={BOSS_IMAGE_URL(item.bossImageName)} alt={item.label} className="header-boss-icon" />
                                                        ) : (
                                                            <span>{item.label}</span>
                                                        )}
                                                    </div>
                                                    <span className="header-counter">{count.completed} / {count.total}</span>
                                                </div>
                                            </th>
                                        );
                                    })
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const rowKey = `${row.account.id}-${row.mainChar?.id ?? 'nomain'}`;
                                const isReadOnly = row.account.number === 0;
                                const charWithAccount: CharacterWithAccount | null = row.mainChar
                                    ? { ...row.mainChar, account: row.account }
                                    : null;

                                const rowJobClass = classes.find(cls => cls.job_1 === row.mainChar?.job || cls.job_2 === row.mainChar?.job);
                                const rowJobIcon = row.mainChar?.class === 'Xenon'
                                    ? '/xenon.png'
                                    : rowJobClass ? (rowJobClass.job_1 === row.mainChar?.job ? rowJobClass.image_1 : rowJobClass.image_2) : null;

                                return (
                                    <React.Fragment key={rowKey}>
                                        {/* Main row */}
                                        <tr>
                                            <td className="col-account">
                                                <AccountCell
                                                    number={row.account.number}
                                                    email={row.account.email}
                                                    tag={row.account.tag}
                                                    charName={row.mainChar?.name}
                                                    charLevel={row.mainChar?.level}
                                                    charExpPercent={row.mainChar?.exp_percent}
                                                    jobIcon={rowJobIcon}
                                                    charClass={row.mainChar?.class}
                                                />
                                            </td>

                                            {/* Events */}
                                            {activeEvents.map(event => {
                                                const isCompleted = row.eventProgress[event.id];
                                                const weeklyCount = row.eventWeeklyCounts[event.id] || 0;
                                                const totalCount = row.eventTotalCounts[event.id] || 0;
                                                const maxPerWeek = event.max_per_week || 7;
                                                const maxPerEvent = event.max_per_event;
                                                const isWeeklyLimitReached = event.type === 'daily_login' && weeklyCount >= maxPerWeek && !isCompleted;
                                                const isEventLimitReached = event.type === 'daily_login' && maxPerEvent !== null && totalCount >= maxPerEvent && !isCompleted;
                                                const isLimitReached = isWeeklyLimitReached || isEventLimitReached;
                                                let tooltip = `${weeklyCount}/${maxPerWeek} esta semana | ${totalCount}/${maxPerEvent || '-'} total`;
                                                if (isEventLimitReached) tooltip = `Límite total alcanzado (${totalCount}/${maxPerEvent})`;
                                                else if (isWeeklyLimitReached) tooltip = `Límite semanal alcanzado (${weeklyCount}/${maxPerWeek})`;
                                                return (
                                                    <td key={event.id} className="col-action">
                                                        <label className={`daily-checkbox ${isLimitReached ? 'limit-reached' : ''}`} title={tooltip}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isCompleted}
                                                                disabled={isLimitReached}
                                                                onChange={(e) => handleToggleEvent(event.id, row.account.id, e.target.checked)}
                                                            />
                                                            <span className="checkmark"></span>
                                                            {(maxPerWeek < 7 || maxPerEvent !== null) && (
                                                                <span className="weekly-mini-counter">{`${weeklyCount}/${maxPerWeek}`}</span>
                                                            )}
                                                        </label>
                                                    </td>
                                                );
                                            })}

                                            {/* Unlocks */}
                                            {visibleUnlocks.map(def => {
                                                const isCompleted = !!row.unlockProgress[def.key];
                                                const prereqKey = prereqMap.get(def.key);
                                                const isLocked = !!(prereqKey && !row.unlockProgress[prereqKey]);
                                                return (
                                                    <td key={def.key} className="col-action">
                                                        <label className={`daily-checkbox ${isLocked || isReadOnly ? 'is-locked' : ''}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isCompleted}
                                                                disabled={isLocked || isReadOnly}
                                                                onChange={(e) => !isReadOnly && handleToggleUnlock(def, row.account.id, row.mainChar?.id, e.target.checked)}
                                                            />
                                                            <span className="checkmark"></span>
                                                        </label>
                                                    </td>
                                                );
                                            })}

                                            {/* Bossing */}
                                            {showBossing && (() => {
                                                const accountId = row.account.id;
                                                const session = weekSessions.find(s => s.account_id === accountId);
                                                const states = bossStates[accountId] || {};
                                                const clearedCount = Object.values(states).filter(s => s === 1).length;
                                                const calculated = clearedCount * 200;
                                                const override = rpOverrides[accountId];
                                                const finalRP = override !== null && override !== undefined ? override : calculated;
                                                const isRegistering = registeringAccounts.has(accountId);
                                                const isDone = !!session;
                                                return (
                                                    <td className="col-bossing">
                                                        <div className="bossing-inline">
                                                            <div className="boss-strip">
                                                                {visibleBosses.map(boss => {
                                                                    const unlockCol = BOSS_PREQUEST_COL[boss.name];
                                                                    const locked = boss.needs_prequest && (!unlockCol || !(row.mainChar as unknown as Record<string, boolean>)?.[unlockCol]);
                                                                    const state = states[boss.id] ?? 0;
                                                                    return (
                                                                        <div
                                                                            key={boss.id}
                                                                            className={`boss-icon${locked ? ' boss-icon--locked' : ''}${state === 1 ? ' boss-icon--cleared' : ''}${state === 2 ? ' boss-icon--failed' : ''}`}
                                                                            onClick={() => !locked && handleBossClick(accountId, boss.id)}
                                                                            title={locked ? 'Prequest required' : boss.name}
                                                                        >
                                                                            <img src={boss.image_url || BOSS_IMAGE_URL(boss.name)} alt={boss.name} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                                                                            {state === 1 && <span className="boss-icon-overlay boss-icon-overlay--ok">✓</span>}
                                                                            {state === 2 && <span className="boss-icon-overlay boss-icon-overlay--fail">✗</span>}
                                                                            {locked && (
                                                                                <span className="boss-icon-lock" onClick={e => { e.stopPropagation(); handleToggleBossPrequest(accountId, boss.id); }} title="Mark prequest as done">🔒</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <div className="bossing-right-panel">
                                                                <div className="bossing-action-row">
                                                                    <span className="bossing-current-rp">{(accountBalances[row.account.id]?.reward_points || 0).toLocaleString()} RP</span>
                                                                    {isDone && <span className="bossing-done-badge">✓ DONE</span>}
                                                                    <input
                                                                        type="number" min={0} className="bossing-rp-inline" value={finalRP}
                                                                        onChange={e => setRpOverrides(prev => ({ ...prev, [accountId]: parseInt(e.target.value) || 0 }))}
                                                                        title="RP to register (auto-calculated, editable)"
                                                                    />
                                                                    <button
                                                                        className={`bossing-register-btn${isDone ? ' bossing-register-btn--update' : ''}`}
                                                                        onClick={() => handleRegisterBossing(accountId)}
                                                                        disabled={isRegistering || finalRP === 0}
                                                                        title={isDone ? "Update this week's session" : 'Register bossing RP'}
                                                                    >
                                                                        {isRegistering ? '...' : isDone ? '↺' : 'Register'}
                                                                    </button>
                                                                </div>
                                                                <div className="bossing-drops-row">
                                                                    <span className="bossing-drops-label">Drops:</span>
                                                                    <div
                                                                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 6px', borderRadius: '4px', gap: '4px' }}
                                                                        onClick={() => setBossDrops(prev => ({ ...prev, [accountId]: { ...prev[accountId], solidCubes: (prev[accountId]?.solidCubes || 0) + 1 } }))}
                                                                        title="Add Solid Cube (Expires in 7 Days)"
                                                                    >
                                                                        {resourceImages['solid_cubes'] ? <img src={resourceImages['solid_cubes']} alt="SC" style={{ width: 14, height: 14 }} /> : <span>📦</span>}
                                                                        <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>x{bossDrops[accountId]?.solidCubes || 0}</span>
                                                                    </div>
                                                                    <div
                                                                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', gap: '4px' }}
                                                                        onClick={() => setBossDrops(prev => ({ ...prev, [accountId]: { ...prev[accountId], papMark: (prev[accountId]?.papMark || 0) + 1 } }))}
                                                                        title="Add Papulatus Mark (In Stock)"
                                                                    >
                                                                        {(() => { const url = itemsDB.find(i => i.name.toLowerCase().includes('papulatus mark'))?.image_url; return url ? <img src={url} alt="Pap" style={{ width: 14, height: 14 }} /> : <span>⚙️</span>; })()}
                                                                        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>x{bossDrops[accountId]?.papMark || 0}</span>
                                                                    </div>
                                                                    {(bossDrops[accountId]?.solidCubes || bossDrops[accountId]?.papMark) ? (
                                                                        <span style={{ fontSize: '10px', color: '#f87171', cursor: 'pointer', marginLeft: 'auto' }} onClick={() => setBossDrops(prev => { const n = { ...prev }; delete n[accountId]; return n; })}>Reset</span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })()}

                                            {/* Items */}
                                            {showItems && (() => {
                                                const visibleItems = row.items.filter(item => activeItemFilters.has(item.status));
                                                return (
                                                    <td colSpan={4} className="cell-items-group">
                                                        {visibleItems.length > 0 ? (
                                                            <div className="daily-items-grid">
                                                                {visibleItems.map(item => (
                                                                    <ItemCard
                                                                        key={item.id}
                                                                        item={item}
                                                                        imageUrl={itemsDBMap.get(item.name)}
                                                                        accountNumber={getItemAccountNumber(item.character_id)}
                                                                        charName={allChars.find(c => c.id === item.character_id)?.name}
                                                                        itemsDB={itemsDB}
                                                                        filterStatus={item.status as any}
                                                                        formatValue={formatValue}
                                                                        onEdit={() => {}}
                                                                        onSell={() => handleOpenSellModal(item as ItemWithCharacter)}
                                                                        onListAH={async () => { await handleListAH(item); }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="items-v6-empty">—</div>
                                                        )}
                                                    </td>
                                                );
                                            })()}
                                            {/* Resources column */}
                                            {showResources && (
                                                <td className="col-panel-cell">
                                                    {renderResourcesPanel(row.account.id, row.account)}
                                                </td>
                                            )}

                                            {/* Extra Stats column */}
                                            {showExtraStats && (
                                                <td className="col-panel-cell">
                                                    {charWithAccount
                                                        ? <ExtraStatsCellPanel character={charWithAccount} onCharacterUpdate={handleCharacterUpdate} />
                                                        : <span className="overview-panel-empty">—</span>
                                                    }
                                                </td>
                                            )}

                                            {/* Content Unlocks column */}
                                            {showContentUnlocks && (
                                                <td className="col-panel-cell">
                                                    {charWithAccount
                                                        ? <ContentUnlocksCellPanel character={charWithAccount} onCharacterUpdate={handleCharacterUpdate} />
                                                        : <span className="overview-panel-empty">—</span>
                                                    }
                                                </td>
                                            )}

                                            {/* Char Details column */}
                                            {showCharDetails && (
                                                <td className="col-panel-cell">
                                                    {charWithAccount
                                                        ? <CharDetailsPanel character={charWithAccount} classes={classes} onCharacterUpdate={handleCharacterUpdate} />
                                                        : <span className="overview-panel-empty">—</span>
                                                    }
                                                </td>
                                            )}

                                            {/* Mystic Frontier column */}
                                            {showMF && (
                                                <td className="col-panel-cell overview-mf-col">
                                                    {charWithAccount
                                                        ? !mfDataLoaded
                                                            ? <div className="overview-mf-loading">Loading…</div>
                                                            : <CharacterRow
                                                                character={charWithAccount}
                                                                expeditions={mfExpeditions[charWithAccount.id] ?? []}
                                                                history={mfHistory[charWithAccount.id] ?? []}
                                                                cubeImages={mfCubeImages}
                                                                onRefresh={handleMFRefresh}
                                                                onUnlockToggle={handleMFUnlockToggle}
                                                                unlockLoading={!!mfUnlockLoading[charWithAccount.id]}
                                                            />
                                                        : <span className="overview-panel-empty">—</span>
                                                    }
                                                </td>
                                            )}
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </Card>
            </div>

            {/* Configure Tasks Modal */}
            <Modal isOpen={configModalOpen} onClose={() => setConfigModalOpen(false)} title="Configure Daily Tasks">
                <div className="config-tasks-list">
                    {activeEvents.map(event => (
                        <div key={event.id} className="config-task-item group-locked">
                            <label className="config-checkbox">
                                <input type="checkbox" checked={true} disabled />
                                <span className="checkmark"></span>
                                <div className="task-label-container">
                                    <span className="task-category-tag" style={{ color: CATEGORY_COLORS.event }}>[EVENT]</span>
                                    <span className="task-label">{event.name}</span>
                                </div>
                            </label>
                        </div>
                    ))}
                    {allUnlockGroups.map(group => (
                        <div key={group.name} className="config-task-item">
                            <label className="config-checkbox">
                                <input type="checkbox" checked={group.isVisible} onChange={(e) => handleToggleGroup(group.name, e.target.checked)} />
                                <span className="checkmark"></span>
                                <div className="task-label-container">
                                    <span className="task-category-tag" style={{ color: CATEGORY_COLORS[group.category] }}>
                                        [{group.category === 'boss' ? 'BOSS' : group.name.toUpperCase()}]
                                    </span>
                                    <span className="task-label">{group.name}</span>
                                </div>
                            </label>
                        </div>
                    ))}
                </div>
                <div className="modal-actions">
                    <Button variant="primary" onClick={() => setConfigModalOpen(false)}>Done</Button>
                </div>
            </Modal>

            {/* Sell Modal */}
            <Modal isOpen={sellModalOpen} onClose={() => setSellModalOpen(false)} title="Confirm Sale">
                <div className="sell-form">
                    <div className="sell-field">
                        <label>Sale Price (b Mesos)</label>
                        <Input type="number" value={salePrice} onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setSellModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleConfirmSale}>Confirm Sale</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Overview;
