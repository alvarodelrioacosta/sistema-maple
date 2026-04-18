import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Header } from '../../components/Layout';
import { Card, Button, Modal, Input, LoadingScreen, AccountCell, ItemCard } from '../../components/UI';
// Deployment trigger: force fresh commit after Vercel repository reconnection
import {
    accountsService,
    charactersService,
    eventsService,
    contentUnlocksService,
    itemsService,
    itemsDBService,
    transactionsService,
    bossesService,
    bossingService,
    resourcesService
} from '../../services';
import type { ContentUnlock, AccountUnlockProgress, Boss } from '../../services';
import type {
    Account,
    Character,
    GameEvent,
    ItemWithCharacter,
    EventAccountProgress,
    ItemDB,
    BossingSession
} from '../../types';
import './DailyCheckUp.css';

const BOSS_IMAGE_ALIAS: Record<string, string> = {
    'Slime': 'Guardian Angel Slime',
};

const BOSS_IMAGE_URL = (bossName: string) => {
    const imgName = BOSS_IMAGE_ALIAS[bossName] ?? bossName;
    return `https://media.maplestorywiki.net/yetidb/Maple_Guide_-_${imgName.replace(/ /g, '_')}.png`;
};

const CATEGORY_COLORS = {
    event: '#4ade80', // Green
    boss: '#f87171',  // Red
    system: '#fbbf24' // Yellow
};

const GROUP_LABEL_DISPLAY: Record<string, string> = {
    '6TH JOB SKILLS': '6TH JOB',
};

const COLUMN_NAME_DISPLAY: Record<string, string> = {
    '6th Job': '6th Job Prequest',
};

const HIDDEN_BOSS_NAMES = new Set(['Guardian Angel Slime', 'Lucid']);

// Client-side ordering by name. Bosses not listed fall back to order_index.
const BOSS_NAME_ORDER: Record<string, number> = {
    'Zakum': 10, 'Hilla': 20, 'Papulatus': 30,
    'Von Bon': 40, 'Pierre': 50, 'Crimson Queen': 60, 'Vellum': 70,
    'Cygnus': 80, 'Pink Bean': 90, 'Magnus': 100,
    'Princess No': 110, 'Akechi Mitsuhide': 120, 'Lotus': 130, 'Damien': 140,
    'Will': 150, 'Gloom': 160, 'Darknell': 170, 'Bain': 180,
    'Verus Hilla': 190, 'Chosen Seren': 200, 'Kalos': 210,
    'Kaling': 220, 'Limbo': 230, 'Horntail': 240, 'Arkarium': 250,
};

const DailyCheckUp: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [allChars, setAllChars] = useState<Character[]>([]);
    const [mainChars, setMainChars] = useState<Character[]>([]);
    const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
    const [dailyUnlocks, setDailyUnlocks] = useState<ContentUnlock[]>([]);
    const [allUnlocks, setAllUnlocks] = useState<ContentUnlock[]>([]);
    const [unlockProgress, setUnlockProgress] = useState<AccountUnlockProgress[]>([]);
    const [allItems, setAllItems] = useState<ItemWithCharacter[]>([]);
    const [itemsDB, setItemsDB] = useState<ItemDB[]>([]);

    // Progress states
    const [eventProgress, setEventProgress] = useState<EventAccountProgress[]>([]);

    // UI States
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [sellingItem, setSellingItem] = useState<ItemWithCharacter | null>(null);

    // Sale Modal Form
    const [salePrice, setSalePrice] = useState(0);
    const [showRP, setShowRP] = useState(false);
    const [showItems, setShowItems] = useState(false);
    const [activeItemFilters, setActiveItemFilters] = useState<Set<string>>(new Set(['for_sale']));

    // Bossing state
    const [showBossing, setShowBossing] = useState(false);
    const [allBosses, setAllBosses] = useState<Boss[]>([]);
    const [weekSessions, setWeekSessions] = useState<BossingSession[]>([]);
    const [allPrequests, setAllPrequests] = useState<{ account_id: string; boss_id: string }[]>([]);
    // bossStates: accountId → bossId → 0=unselected 1=cleared 2=failed
    const [bossStates, setBossStates] = useState<Record<string, Record<string, 0 | 1 | 2>>>({});

    const [accountBalances, setAccountBalances] = useState<Record<string, Record<string, number>>>({});
    const [rpOverrides, setRpOverrides] = useState<Record<string, number | null>>({});
    const [bossDrops, setBossDrops] = useState<Record<string, { solidCubes?: number, papMark?: number }>>({});
    const [registeringAccounts, setRegisteringAccounts] = useState<Set<string>>(new Set());
    const [resourceImages, setResourceImages] = useState<Record<string, string>>({});

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const weekStart = useMemo(() => bossingService.getWeekStart(), []);
    const LS_KEY = `bossStates_${weekStart}`;

    useEffect(() => {
        loadData();

        // Configurar Realtime
        const channel = supabase
            .channel('daily_checkup_changes')
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'account_unlock_progress' }, (payload: any) => {
                const newData = payload.new as AccountUnlockProgress;
                const oldData = payload.old as AccountUnlockProgress;
                setUnlockProgress(prev => {
                    if (payload.eventType === 'DELETE') return prev.filter(p => p.id !== oldData.id);
                    const filtered = prev.filter(p => !(p.unlock_id === newData.unlock_id && p.account_id === newData.account_id));
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') filtered.push(newData);
                    return filtered;
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'accounts' }, (payload) => {
                console.log('Realtime Account Change:', payload);
                setAccounts(prev => prev.map(acc => acc.id === (payload.new as any).id ? { ...acc, ...payload.new } : acc));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
                console.log('Realtime Item Change:', payload);
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

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Persist boss states for the current week in localStorage (survives refresh)
    useEffect(() => {
        if (Object.keys(bossStates).length > 0) {
            localStorage.setItem(LS_KEY, JSON.stringify(bossStates));
        }
    }, [bossStates, LS_KEY]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        console.log('DailyCheckUp: Starting to load data...');
        try {
            const [
                accountsData,
                charsData,
                eventsData,
                dailyUnlocksData,
                allUnlocksData,
                unlockProgressData,
                forSaleData,
                inStockData,
                bulkData,
                itemsDBData,
                bossesData,
                weekSessionsData,
                prequestsData,
                resourcesMetadataData
            ] = await Promise.all([
                accountsService.getAll().catch(e => { console.error('Failed to load accounts:', e); return []; }),
                charactersService.getAll().catch(e => { console.error('Failed to load characters:', e); return []; }),
                eventsService.getActive().catch(e => { console.error('Failed to load events:', e); return []; }),
                contentUnlocksService.getDailyUnlocks().catch(e => { console.error('Failed to load daily unlocks:', e); return []; }),
                contentUnlocksService.getAll().catch(e => { console.error('Failed to load all unlocks:', e); return []; }),
                contentUnlocksService.getAllProgress().catch(e => { console.error('Failed to load unlock progress:', e); return []; }),
                itemsService.getByStatus('for_sale').catch(e => { console.error('Failed to load items:', e); return []; }),
                itemsService.getByStatus('in_stock').catch(e => { console.error('Failed to load items:', e); return []; }),
                itemsService.getByStatus('bulk').catch(e => { console.error('Failed to load items:', e); return []; }),
                itemsDBService.getAll().catch(e => { console.error('Failed to load itemsDB:', e); return []; }),
                bossesService.getAll().catch(e => { console.error('Failed to load bosses:', e); return []; }),
                bossingService.getWeekSessions(bossingService.getWeekStart()).catch(e => { console.error('Failed to load week sessions:', e); return []; }),
                bossingService.getAllPrequests().catch(e => { console.error('Failed to load prequests:', e); return []; }),
                resourcesService.getResourceMetadata().catch(e => { console.error('Failed to load itemsDB:', e); return {}; })
            ]);

            console.log('DailyCheckUp Data Loaded:', {
                accounts: accountsData.length,
                characters: charsData.length,
                events: eventsData.length,
                dailyUnlocks: dailyUnlocksData.length,
                items: forSaleData.length + inStockData.length + bulkData.length
            });

            setAccounts(accountsData.sort((a: Account, b: Account) => a.number - b.number));
            setAllChars(charsData);
            setMainChars(charsData.filter((c: Character) => c.main === 'Main'));

            const balancesArr = await Promise.all(accountsData.map((acc: Account) => resourcesService.getAllBalances(acc.id)));
            const newBalances: Record<string, Record<string, number>> = {};
            accountsData.forEach((acc: Account, i: number) => {
                newBalances[acc.id] = balancesArr[i];
            });
            setAccountBalances(newBalances);

            // Filter events that are currently active (today between start and end date)
            const filteredEvents = eventsData.filter(event => {
                const start = event.start_date.split('T')[0];
                const end = event.end_date.split('T')[0];
                return todayStr >= start && todayStr <= end;
            });
            setActiveEvents(filteredEvents);

            setDailyUnlocks(dailyUnlocksData);
            setAllUnlocks(allUnlocksData);
            setUnlockProgress(unlockProgressData);
            setAllItems([...forSaleData, ...inStockData, ...bulkData]);
            setItemsDB(itemsDBData);
            setAllBosses(bossesData);
            setWeekSessions(weekSessionsData);
            setAllPrequests(prequestsData);

            const mapImages: Record<string, string> = {};
            Object.keys(resourcesMetadataData).forEach(k => mapImages[k] = (resourcesMetadataData as any)[k]?.image);
            setResourceImages(mapImages);

            // Load persisted boss states from localStorage (preserves failed state 2)
            let initialBossStates: Record<string, Record<string, 0 | 1 | 2>> = {};
            const lsStored = localStorage.getItem(LS_KEY);
            if (lsStored) {
                try { initialBossStates = JSON.parse(lsStored); } catch { /* ignore */ }
            }
            // DB sessions are authoritative for cleared bosses (state 1)
            weekSessionsData.forEach((session: BossingSession) => {
                if (!initialBossStates[session.account_id]) initialBossStates[session.account_id] = {};
                session.bosses_cleared.forEach((bossId: string) => {
                    initialBossStates[session.account_id][bossId] = 1;
                });
            });
            setBossStates(initialBossStates);

            if (filteredEvents.length > 0) {
                const progressData = await eventsService.getAccountProgress(filteredEvents.map(e => e.id));
                setEventProgress(progressData);
            }

        } catch (error: any) {
            console.error('Error loading daily checkup data:', error);
            setError(error.message || 'Error desconocido al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    // Memoized data structures for O(1) lookups
    const indexedEventProgress = useMemo(() => {
        const map = new Map<string, EventAccountProgress>();
        (eventProgress || []).forEach(p => {
            if (p.event_id && p.account_id) {
                map.set(`${p.event_id}-${p.account_id}`, p);
            }
        });
        return map;
    }, [eventProgress]);

    const indexedUnlockProgress = useMemo(() => {
        const map = new Map<string, boolean>();
        (unlockProgress || []).forEach(p => {
            if (p.unlock_id && p.account_id) {
                map.set(`${p.unlock_id}-${p.account_id}`, p.completed);
            }
        });
        return map;
    }, [unlockProgress]);

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

    const rows = useMemo(() => {
        if (!accounts || accounts.length === 0) return [];

        try {
            return accounts.map(acc => {
                const mainChar = acc.number === 0 
                  ? (allChars || []).find(c => c.account_id === acc.id && c.name === 'Alvaro') || null
                  : (mainChars || []).find(c => c.account_id === acc.id) || null;

                // Filter items for this account's characters
                const accountItems = (allItems || []).filter(item => {
                    if (!item || !item.character_id) return false;
                    const char = (allChars || []).find(c => c.id === item.character_id);
                    return char?.account_id === acc.id;
                });

                // Get progress for each active event
                const eventStates: Record<string, boolean> = {};
                const eventWeeklyCounts: Record<string, number> = {};
                const eventTotalCounts: Record<string, number> = {};

                (activeEvents || []).forEach(event => {
                    const prog = indexedEventProgress.get(`${event.id}-${acc.id}`);
                    eventStates[event.id] = prog?.last_completed_date === todayStr;
                    eventWeeklyCounts[event.id] = prog?.current_week_count || 0;
                    eventTotalCounts[event.id] = prog?.total_count || 0;
                });

                // Get progress for each daily unlock
                const unlockStates: Record<string, boolean> = {};
                (dailyUnlocks || []).forEach(unlock => {
                    unlockStates[unlock.id] = indexedUnlockProgress.get(`${unlock.id}-${acc.id}`) || false;
                });

                return {
                    account: acc,
                    mainChar,
                    items: accountItems,
                    eventProgress: eventStates,
                    eventWeeklyCounts,
                    eventTotalCounts,
                    unlockProgress: unlockStates
                };
            });
        } catch (e) {
            console.error('Error calculating DailyCheckUp rows:', e);
            return [];
        }
    }, [accounts, mainChars, allItems, allChars, activeEvents, dailyUnlocks, indexedEventProgress, indexedUnlockProgress]);
    const formattedDate = useMemo(() => {
        try {
            return new Intl.DateTimeFormat('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC'
            }).format(new Date()).toUpperCase();
        } catch (e) {
            return new Date().toISOString().split('T')[0];
        }
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
        dailyUnlocks.forEach(unlock => {
            counts[unlock.id] = rows.filter(row => row.unlockProgress[unlock.id]).length;
        });
        return counts;
    }, [dailyUnlocks, rows]);

    const groupedDailyUnlocks = useMemo(() => {
        const groups: { key: string; label: string; category: 'boss' | 'system' | 'event'; items: any[] }[] = [];
        
        // Add Events first
        if (activeEvents.length > 0) {
            groups.push({
                key: 'events-group',
                label: 'EVENT',
                category: 'event',
                items: activeEvents.map(e => ({ ...e, isEvent: true }))
            });
        }

        // Add Unlocks grouped
        const seen = new Map<string, number>();
        dailyUnlocks.forEach(u => {
            const groupKey = u.category === 'boss' ? `boss_${u.unlocks}` : `sys_${u.unlocks}`;
            if (seen.has(groupKey)) {
                groups[seen.get(groupKey)!].items.push({ ...u, isEvent: false });
            } else {
                seen.set(groupKey, groups.length);
                groups.push({
                    key: groupKey,
                    label: u.unlocks.toUpperCase(),
                    category: u.category,
                    items: [{ ...u, isEvent: false }]
                });
            }
        });
        
        return groups;
    }, [activeEvents, dailyUnlocks]);

    const groupedAllUnlocks = useMemo(() => {
        const groups: { name: string; category: 'boss' | 'system'; ids: string[]; isActive: boolean }[] = [];
        const seen = new Map<string, number>();
        
        allUnlocks.forEach(u => {
            if (seen.has(u.unlocks)) {
                const idx = seen.get(u.unlocks)!;
                groups[idx].ids.push(u.id);
                if (u.show_in_daily) groups[idx].isActive = true;
            } else {
                seen.set(u.unlocks, groups.length);
                groups.push({
                    name: u.unlocks,
                    category: u.category,
                    ids: [u.id],
                    isActive: u.show_in_daily
                });
            }
        });
        
        return groups;
    }, [allUnlocks]);

    const prereqMap = useMemo(() => {
        const map = new Map<string, string | null>();
        groupedDailyUnlocks.forEach(group => {
            if (group.label === 'MYSTIC FRONTIER') {
                group.items.forEach((item, idx) => {
                    if (idx > 0) {
                        map.set(item.id, group.items[idx - 1].id);
                    } else {
                        map.set(item.id, null);
                    }
                });
            } else {
                group.items.forEach(item => map.set(item.id, null));
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

    // accountId → Set of boss IDs where prequest is done
    const prequestMap = useMemo(() => {
        const map: Record<string, Set<string>> = {};
        allPrequests.forEach(({ account_id, boss_id }) => {
            if (!map[account_id]) map[account_id] = new Set();
            map[account_id].add(boss_id);
        });
        return map;
    }, [allPrequests]);

    if (loading) {
        return <LoadingScreen message="Cargando Dashboard Diario..." />;
    }

    if (error) {
        return (
            <div className="daily-checkup error">
                <h2>Ocurrió un error al cargar los datos</h2>
                <p>{error}</p>
                <Button onClick={loadData}>Reintentar</Button>
            </div>
        );
    }

    if (!accounts || accounts.length === 0) {
        return (
            <div className="daily-checkup empty">
                <Header title="Daily Check Up" subtitle="No hay cuentas disponibles" />
                <Card>
                    <p style={{ padding: '2rem', textAlign: 'center' }}>
                        No hay cuentas registradas. Por favor, añade cuentas en el módulo de Management.
                    </p>
                </Card>
            </div>
        );
    }



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

        // Optimistic update
        setEventProgress(prev => {
            const existing = prev.find(p => p.event_id === eventId && p.account_id === accountId);
            if (existing) {
                return prev.map(p => p.event_id === eventId && p.account_id === accountId
                    ? { ...p, last_completed_date: completed ? todayStr : null }
                    : p
                );
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
            setEventProgress(prev => prev.map(p =>
                p.event_id === eventId && p.account_id === accountId ? updated : p
            ));
        } catch (error) {
            console.error('Error toggling event progress:', error);
        }
    };


    const toggleItemFilter = (status: string) => {
        setActiveItemFilters(prev => {
            const next = new Set(prev);
            if (next.has(status)) next.delete(status);
            else next.add(status);
            return next;
        });
    };

    const handleListAH = async (item: ItemWithCharacter) => {
        try {
            const timestamp = new Date().toISOString();
            await itemsService.updateAHListing(item.id, timestamp);
            setAllItems(prev => prev.map(i => i.id === item.id ? { ...i, ah_listed_at: timestamp } : i));
        } catch (error) {
            console.error('Error listing on AH:', error);
        }
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
                    await transactionsService.createMeso({
                        account_id: account.id,
                        type: 'income',
                        amount: salePrice,
                        description: `AH Sale: ${sellingItem.name}`,
                        item_id: sellingItem.id
                    });
                    await transactionsService.createMeso({
                        account_id: account.id,
                        type: 'expense',
                        amount: fee,
                        description: `Auction House Fee (5%) - ${sellingItem.name}`,
                        item_id: sellingItem.id
                    });
                }
            }

            await itemsService.update(sellingItem.id, {
                status: 'sold',
                estimated_value: salePrice
            });

            setAllItems(prev => prev.filter(i => i.id !== sellingItem.id));
            setSellModalOpen(false);
            setSellingItem(null);
        } catch (error) {
            console.error('Error processing sale:', error);
        }
    };



    const handleToggleGroup = async (groupName: string, show: boolean) => {
        const group = groupedAllUnlocks.find(g => g.name === groupName);
        if (!group) return;

        const originalAllUnlocks = [...allUnlocks];
        const originalDailyUnlocks = [...dailyUnlocks];

        // Optimistic update
        setAllUnlocks(prev => prev.map(u => group.ids.includes(u.id) ? { ...u, show_in_daily: show } : u));
        
        if (show) {
            setDailyUnlocks(prev => {
                const newItemsToAdd = allUnlocks.filter(u => group.ids.includes(u.id) && !prev.some(p => p.id === u.id));
                return [...prev, ...newItemsToAdd.map(i => ({ ...i, show_in_daily: true }))];
            });
        } else {
            setDailyUnlocks(prev => prev.filter(u => !group.ids.includes(u.id)));
        }

        try {
            await Promise.all(group.ids.map(id => contentUnlocksService.setShowInDaily(id, show)));
        } catch (error: any) {
            console.error('Error toggling group:', error);
            alert(`Error al guardar grupo: ${error.message}`);
            setAllUnlocks(originalAllUnlocks);
            setDailyUnlocks(originalDailyUnlocks);
        }
    };

    const handleToggleUnlock = async (unlockId: string, accountId: string, completed: boolean) => {
        setUnlockProgress(prev => {
            const existing = prev.find(p => p.unlock_id === unlockId && p.account_id === accountId);
            if (existing) return prev.map(p => p.unlock_id === unlockId && p.account_id === accountId ? { ...p, completed } : p);
            return [...prev, { id: '', unlock_id: unlockId, account_id: accountId, completed, completed_at: null }];
        });
        await contentUnlocksService.toggleProgress(unlockId, accountId, completed);
    };

    const handleRPBlur = async (accountId: string, newValue: number) => {
        try {
            await resourcesService.setAbsoluteBalance(accountId, 'reward_points', newValue);
            setAccountBalances(prev => ({
                ...prev,
                [accountId]: { ...prev[accountId], reward_points: newValue }
            }));
        } catch (error) {
            console.error('Error updating RP:', error);
        }
    };

    const handleBuyPSOK = async (accountId: string) => {
        const bal = accountBalances[accountId] || {};
        const currentRP = bal.reward_points || 0;
        const currentPSOK = bal.psok || 0;
        
        if (currentRP < 4000) return;

        const confirmed = window.confirm(
            `¿Comprar 1 PSOK por 4,000 RP?\n\nRP actual: ${currentRP.toLocaleString()}\nRP después: ${(currentRP - 4000).toLocaleString()}\nPSOKs actuales: ${currentPSOK}`
        );
        if (!confirmed) return;

        // Optimistic update
        setAccountBalances(prev => ({
            ...prev,
            [accountId]: { ...prev[accountId], reward_points: currentRP - 4000, psok: currentPSOK + 1 }
        }));

        try {
            await resourcesService.addBatch(accountId, 'psok', 1, null);
            await resourcesService.addBatch(accountId, 'reward_points', -4000, null);
        } catch (error) {
            console.error('Error buying PSOK:', error);
            // Revert on error
            setAccountBalances(prev => ({
                ...prev,
                [accountId]: { ...prev[accountId], reward_points: currentRP, psok: currentPSOK }
            }));
        }
    };

    // ---- Bossing handlers ----

    // cycle: 0 (unselected) → 1 (cleared ✓) → 2 (failed ✗) → 0
    const handleBossClick = (accountId: string, bossId: string) => {
        setBossStates(prev => {
            const cur = (prev[accountId]?.[bossId] ?? 0) as 0 | 1 | 2;
            const next: 0 | 1 | 2 = cur === 0 ? 1 : cur === 1 ? 2 : 0;
            return { ...prev, [accountId]: { ...(prev[accountId] || {}), [bossId]: next } };
        });
        setRpOverrides(prev => ({ ...prev, [accountId]: null }));
    };

    const handleToggleBossPrequest = async (accountId: string, bossId: string) => {
        const currentlyDone = prequestMap[accountId]?.has(bossId) ?? false;
        const newState = !currentlyDone;
        setAllPrequests(prev =>
            newState
                ? [...prev, { account_id: accountId, boss_id: bossId }]
                : prev.filter(p => !(p.account_id === accountId && p.boss_id === bossId))
        );
        await bossingService.setPrequest(accountId, bossId, newState);
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
                // Expire in exactly 7 days natively
                const d = new Date();
                d.setDate(d.getDate() + 7);
                const expiry = d.toISOString().split('T')[0] + 'T23:59:59';
                await resourcesService.addBatch(accountId, 'solid_cubes', drops.solidCubes, expiry);
            }
            if (drops?.papMark && drops.papMark > 0) {
                const papDb = itemsDB.find(i => i.name.toLowerCase().includes('papulatus mark'));
                const mainChar = mainChars.find(c => c.account_id === accountId);
                if (papDb && mainChar) {
                    for(let i = 0; i < drops.papMark; i++) {
                        await itemsService.create({
                            character_id: mainChar.id,
                            name: papDb.name,
                            status: 'in_stock',
                            star_force: 0,
                            tradeability: 'Untradeable',
                            remaining_trade_slots: 0,
                            estimated_value: 0,
                            costo_item: 0,
                            costo_cubos: 0,
                            costo_psok: 0,
                            costo_sf: 0,
                            costo_perfect_innoc: 0,
                            costo_guardian_scroll: 0,
                            costo_replacement: 0,
                            costo_total: 0,
                            main_potential_tier: null,
                            main_potential_1: null,
                            main_potential_2: null,
                            main_potential_3: null,
                            bonus_potential_tier: null,
                            bonus_potential_1: null,
                            bonus_potential_2: null,
                            bonus_potential_3: null,
                            delivered: false,
                            ah_listed_at: null
                        });
                    }
                }
            }

            if (delta !== 0) {
                setAccountBalances(prev => ({
                    ...prev,
                    [accountId]: {
                        ...prev[accountId],
                        reward_points: (prev[accountId]?.reward_points || 0) + delta
                    }
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




    return (
        <div className="daily-checkup">
            <Header
                title="Daily Check Up"
                subtitle={`Daily Status - ${formattedDate}`}
                actions={
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Button
                            variant={showRP ? "primary" : "secondary"}
                            size="sm"
                            onClick={() => setShowRP(!showRP)}
                        >
                            {showRP ? "Hide RP" : "Show RP"}
                        </Button>
                        {!showItems ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowItems(true)}
                            >
                                Show Items
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => { setShowItems(false); setActiveItemFilters(new Set(['for_sale'])); }}
                                >
                                    Hide Items
                                </Button>
                                <Button
                                    variant={activeItemFilters.has('for_sale') ? "primary" : "secondary"}
                                    size="sm"
                                    onClick={() => toggleItemFilter('for_sale')}
                                >
                                    For Sale
                                </Button>
                                <Button
                                    variant={activeItemFilters.has('in_stock') ? "primary" : "secondary"}
                                    size="sm"
                                    onClick={() => toggleItemFilter('in_stock')}
                                >
                                    In Stock
                                </Button>
                                <Button
                                    variant={activeItemFilters.has('bulk') ? "primary" : "secondary"}
                                    size="sm"
                                    onClick={() => toggleItemFilter('bulk')}
                                >
                                    Bulk
                                </Button>
                            </>
                        )}
                        <Button
                            variant={showBossing ? "primary" : "secondary"}
                            size="sm"
                            onClick={() => setShowBossing(!showBossing)}
                        >
                            {showBossing ? "Hide Bossing" : "Bossing"}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfigModalOpen(true)}
                        >
                            ⚙️ Configure Tasks
                        </Button>
                    </div>
                }
            />

            <div className="daily-content">
                <Card padding="none" className="daily-table-container">
                    <table className="daily-table">
                        <thead>
                            <tr className="header-top-row">
                                <th rowSpan={2} className="col-account">ACCOUNT</th>
                                {groupedDailyUnlocks.map(group => (
                                    <th 
                                        key={group.key} 
                                        colSpan={group.items.length} 
                                        className="header-group-cell"
                                        style={{ color: CATEGORY_COLORS[group.category] }}
                                    >
                                        {GROUP_LABEL_DISPLAY[group.label] || group.label}
                                    </th>
                                ))}
                                {showRP && <th rowSpan={2} className="col-rp">RP / PSOK</th>}
                                {showBossing && <th rowSpan={2} className="col-bossing">BOSSING</th>}
                                {showItems && (
                                    <th rowSpan={2} colSpan={4} className="col-items">Items</th>
                                )}
                            </tr>
                            <tr className="header-bottom-row">
                                {groupedDailyUnlocks.map(group => 
                                    group.items.map(item => {
                                        const count = item.isEvent 
                                            ? (eventProgressCounts[item.id] || { completed: 0, total: 0 })
                                            : { completed: unlockProgressCounts[item.id] || 0, total: accounts.length };
                                        
                                        return (
                                            <th key={item.id} className="col-subtask">
                                                <div className="header-stacked">
                                                    <div className="subtask-label">
                                                        {group.category === 'boss' ? (
                                                            <img src={BOSS_IMAGE_URL(item.unlocks)} alt={group.label} className="header-boss-icon" />
                                                        ) : (
                                                            <span>{COLUMN_NAME_DISPLAY[item.name] || (item.name.includes(' — ') ? item.name.split(' — ')[1] : item.name)}</span>
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
                                // La cuenta 0 (Alvaro) es solo de referencia: sus campos son read-only
                                const isReadOnly = row.account.number === 0;
                                return (
                                <tr key={row.account.id}>
                                    <td className="col-account">
                                        <AccountCell
                                            number={row.account.number}
                                            email={row.account.email}
                                            tag={row.account.tag}
                                            charName={row.mainChar?.name}
                                        />
                                    </td>

                                    {/* Events Checks */}
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
                                        
                                        if (isEventLimitReached) {
                                            tooltip = `Límite total alcanzado (${totalCount}/${maxPerEvent})`;
                                        } else if (isWeeklyLimitReached) {
                                            tooltip = `Límite semanal alcanzado (${weeklyCount}/${maxPerWeek})`;
                                        }

                                        return (
                                            <td key={event.id} className="col-action">
                                                <label
                                                    className={`daily-checkbox ${isLimitReached ? 'limit-reached' : ''}`}
                                                    title={tooltip}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isCompleted}
                                                        disabled={isLimitReached}
                                                        onChange={(e) => handleToggleEvent(event.id, row.account.id, e.target.checked)}
                                                    />
                                                    <span className="checkmark"></span>
                                                    {(maxPerWeek < 7 || maxPerEvent !== null) && (
                                                        <span className="weekly-mini-counter">
                                                            {`${weeklyCount}/${maxPerWeek}`}
                                                        </span>
                                                    )}
                                                </label>
                                            </td>
                                        );
                                    })}

                                    {/* Unlock Checks */}
                                    {dailyUnlocks.map(unlock => {
                                        const isCompleted = !!row.unlockProgress[unlock.id];
                                        const prereqId = prereqMap.get(unlock.id);
                                        const isLocked = !!(prereqId && !row.unlockProgress[prereqId]);

                                        return (
                                            <td key={unlock.id} className="col-action">
                                                <label className={`daily-checkbox ${isLocked || isReadOnly ? 'is-locked' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isCompleted}
                                                        disabled={isLocked || isReadOnly}
                                                        onChange={(e) => !isReadOnly && handleToggleUnlock(unlock.id, row.account.id, e.target.checked)}
                                                    />
                                                    <span className="checkmark"></span>
                                                </label>
                                            </td>
                                        );
                                    })}

                                    {/* Reward Points / PSOK */}
                                    {showRP && (
                                        <td className="col-rp">
                                            <Input
                                                key={accountBalances[row.account.id]?.reward_points || 0}
                                                type="number"
                                                defaultValue={accountBalances[row.account.id]?.reward_points || 0}
                                                onBlur={(e) => handleRPBlur(row.account.id, parseInt(e.target.value) || 0)}
                                                className="rp-input-table"
                                            />
                                            <div className="psok-row">
                                                <button
                                                    className={`psok-btn ${(accountBalances[row.account.id]?.reward_points || 0) >= 4000 ? 'psok-btn--active' : 'psok-btn--disabled'}`}
                                                    onClick={() => handleBuyPSOK(row.account.id)}
                                                    disabled={(accountBalances[row.account.id]?.reward_points || 0) < 4000}
                                                    title={(accountBalances[row.account.id]?.reward_points || 0) >= 4000 ? `Comprar PSOK por 4,000 RP` : `Necesitas ${(4000 - (accountBalances[row.account.id]?.reward_points || 0)).toLocaleString()} RP más`}
                                                >
                                                    PSOK
                                                </button>
                                                <span className={`psok-count ${(accountBalances[row.account.id]?.psok || 0) > 0 ? 'psok-count--positive' : 'psok-count--zero'}`}>{accountBalances[row.account.id]?.psok || 0}</span>
                                            </div>
                                        </td>
                                    )}

                                    {/* Bossing — inline strip */}
                                    {showBossing && (() => {
                                        const accountId = row.account.id;
                                        const session = weekSessions.find(s => s.account_id === accountId);
                                        const accountPreqs = prequestMap[accountId] || new Set<string>();
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
                                                    {/* Boss icon strip */}
                                                    <div className="boss-strip">
                                                        {visibleBosses.map(boss => {
                                                            const locked = boss.needs_prequest && !accountPreqs.has(boss.id);
                                                            const state = states[boss.id] ?? 0;
                                                            return (
                                                                <div
                                                                    key={boss.id}
                                                                    className={`boss-icon${locked ? ' boss-icon--locked' : ''}${state === 1 ? ' boss-icon--cleared' : ''}${state === 2 ? ' boss-icon--failed' : ''}`}
                                                                    onClick={() => !locked && handleBossClick(accountId, boss.id)}
                                                                    title={locked ? 'Prequest required' : boss.name}
                                                                >
                                                                    <img
                                                                        src={boss.image_url || BOSS_IMAGE_URL(boss.name)}
                                                                        alt={boss.name}
                                                                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                                                                    />
                                                                    {state === 1 && <span className="boss-icon-overlay boss-icon-overlay--ok">✓</span>}
                                                                    {state === 2 && <span className="boss-icon-overlay boss-icon-overlay--fail">✗</span>}
                                                                    {locked && (
                                                                        <span
                                                                            className="boss-icon-lock"
                                                                            onClick={e => { e.stopPropagation(); handleToggleBossPrequest(accountId, boss.id); }}
                                                                            title="Mark prequest as done"
                                                                        >🔒</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* RP + Register row */}
                                                    <div className="bossing-action-row">
                                                        <span className="bossing-current-rp">{(accountBalances[row.account.id]?.reward_points || 0).toLocaleString()} RP</span>
                                                        {isDone && <span className="bossing-done-badge">✓ DONE</span>}
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            className="bossing-rp-inline"
                                                            value={finalRP}
                                                            onChange={e => setRpOverrides(prev => ({ ...prev, [accountId]: parseInt(e.target.value) || 0 }))}
                                                            title="RP to register (auto-calculated, editable)"
                                                        />
                                                        <button
                                                            className={`bossing-register-btn${isDone ? ' bossing-register-btn--update' : ''}`}
                                                            onClick={() => handleRegisterBossing(accountId)}
                                                            disabled={isRegistering || finalRP === 0}
                                                            title={isDone ? 'Update this week\'s session' : 'Register bossing RP'}
                                                        >
                                                            {isRegistering ? '...' : isDone ? '↺' : 'Register'}
                                                        </button>
                                                    </div>
                                                    <div className="bossing-action-row" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px' }}>
                                                        <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Drops:</span>
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
                                                            {(() => {
                                                                const url = itemsDB.find(i => i.name.toLowerCase().includes('papulatus mark'))?.image_url;
                                                                return url ? <img src={url} alt="Pap" style={{ width: 14, height: 14 }} /> : <span>⚙️</span>;
                                                            })()}
                                                            <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>x{bossDrops[accountId]?.papMark || 0}</span>
                                                        </div>
                                                        {(bossDrops[accountId]?.solidCubes || bossDrops[accountId]?.papMark) ? (
                                                            <span 
                                                                style={{ fontSize: '10px', color: '#f87171', cursor: 'pointer', marginLeft: 'auto' }}
                                                                onClick={() => setBossDrops(prev => { const n = { ...prev }; delete n[accountId]; return n; })}
                                                            >
                                                                Reset
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })()}

                                    {/* Items Section */}
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
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Card>
            </div>

            <Modal
                isOpen={configModalOpen}
                onClose={() => setConfigModalOpen(false)}
                title="Configure Daily Tasks"
            >
                <div className="config-tasks-list">
                    {/* Events (always visible or also configurable? for now just info or separate?) */}
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

                    {/* Grouped Unlocks */}
                    {groupedAllUnlocks.map(group => (
                        <div key={group.name} className="config-task-item">
                            <label className="config-checkbox">
                                <input
                                    type="checkbox"
                                    checked={group.isActive}
                                    onChange={(e) => handleToggleGroup(group.name, e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                <div className="task-label-container">
                                    <span 
                                        className="task-category-tag" 
                                        style={{ color: CATEGORY_COLORS[group.category] }}
                                    >
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

            <Modal
                isOpen={sellModalOpen}
                onClose={() => setSellModalOpen(false)}
                title="Confirm Sale"
            >
                <div className="sell-form">
                    <div className="sell-field">
                        <label>Sale Price (b Mesos)</label>
                        <Input
                            type="number"
                            value={salePrice}
                            onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                        />
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

export default DailyCheckUp;
