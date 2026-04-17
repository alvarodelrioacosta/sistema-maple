import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Header } from '../../components/Layout';
import { Card, Button, Modal, Input, LoadingScreen, AccountCell } from '../../components/UI';
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
    const [itemsForSale, setItemsForSale] = useState<ItemWithCharacter[]>([]);
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

    // Bossing state
    const [showBossing, setShowBossing] = useState(false);
    const [allBosses, setAllBosses] = useState<Boss[]>([]);
    const [weekSessions, setWeekSessions] = useState<BossingSession[]>([]);
    const [allPrequests, setAllPrequests] = useState<{ account_id: string; boss_id: string }[]>([]);
    // bossStates: accountId → bossId → 0=unselected 1=cleared 2=failed
    const [bossStates, setBossStates] = useState<Record<string, Record<string, 0 | 1 | 2>>>({});
    const [rpOverrides, setRpOverrides] = useState<Record<string, number | null>>({});
    const [registeringAccounts, setRegisteringAccounts] = useState<Set<string>>(new Set());

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

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
                if (payload.eventType === 'UPDATE') {
                    const newItem = payload.new as ItemWithCharacter;
                    if (newItem.status === 'sold') {
                        setItemsForSale(prev => prev.filter(i => i.id !== newItem.id));
                    } else {
                        setItemsForSale(prev => prev.map(i => i.id === newItem.id ? { ...i, ...newItem } : i));
                    }
                } else if (payload.eventType === 'INSERT') {
                    const newItem = payload.new as ItemWithCharacter;
                    if (newItem.status === 'for_sale') {
                        setItemsForSale(prev => [...prev, newItem]);
                    }
                } else if (payload.eventType === 'DELETE') {
                    setItemsForSale(prev => prev.filter(i => i.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

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
                itemsData,
                itemsDBData,
                bossesData,
                weekSessionsData,
                prequestsData
            ] = await Promise.all([
                accountsService.getAll().catch(e => { console.error('Failed to load accounts:', e); return []; }),
                charactersService.getAll().catch(e => { console.error('Failed to load characters:', e); return []; }),
                eventsService.getActive().catch(e => { console.error('Failed to load events:', e); return []; }),
                contentUnlocksService.getDailyUnlocks().catch(e => { console.error('Failed to load daily unlocks:', e); return []; }),
                contentUnlocksService.getAll().catch(e => { console.error('Failed to load all unlocks:', e); return []; }),
                contentUnlocksService.getAllProgress().catch(e => { console.error('Failed to load unlock progress:', e); return []; }),
                itemsService.getByStatus('for_sale').catch(e => { console.error('Failed to load items:', e); return []; }),
                itemsDBService.getAll().catch(e => { console.error('Failed to load itemsDB:', e); return []; }),
                bossesService.getAll().catch(e => { console.error('Failed to load bosses:', e); return []; }),
                bossingService.getWeekSessions(bossingService.getWeekStart()).catch(e => { console.error('Failed to load week sessions:', e); return []; }),
                bossingService.getAllPrequests().catch(e => { console.error('Failed to load prequests:', e); return []; })
            ]);

            console.log('DailyCheckUp Data Loaded:', {
                accounts: accountsData.length,
                characters: charsData.length,
                events: eventsData.length,
                dailyUnlocks: dailyUnlocksData.length,
                items: itemsData.length
            });

            setAccounts(accountsData.sort((a: Account, b: Account) => a.number - b.number));
            setAllChars(charsData);
            setMainChars(charsData.filter((c: Character) => c.main === 'Main'));

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
            setItemsForSale(itemsData);
            setItemsDB(itemsDBData);
            setAllBosses(bossesData);
            setWeekSessions(weekSessionsData);
            setAllPrequests(prequestsData);
            // Initialize boss selection states from existing sessions (cleared bosses → state 1)
            const initialBossStates: Record<string, Record<string, 0 | 1 | 2>> = {};
            weekSessionsData.forEach((session: BossingSession) => {
                const acct: Record<string, 0 | 1 | 2> = {};
                session.bosses_cleared.forEach((bossId: string) => { acct[bossId] = 1; });
                initialBossStates[session.account_id] = acct;
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
                const accountItems = (itemsForSale || []).filter(item => {
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
                    itemsForSale: accountItems,
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
    }, [accounts, mainChars, itemsForSale, allChars, activeEvents, dailyUnlocks, indexedEventProgress, indexedUnlockProgress]);
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


    const handleListAH = async (item: ItemWithCharacter) => {
        try {
            const timestamp = new Date().toISOString();
            await itemsService.updateAHListing(item.id, timestamp);
            setItemsForSale(prev => prev.map(i => i.id === item.id ? { ...i, ah_listed_at: timestamp } : i));
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

            setItemsForSale(prev => prev.filter(i => i.id !== sellingItem.id));
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
            await accountsService.update(accountId, { reward_points: newValue });
            setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, reward_points: newValue } : acc));
        } catch (error) {
            console.error('Error updating RP:', error);
        }
    };

    const handleBuyPSOK = async (accountId: string) => {
        const account = accounts.find(a => a.id === accountId);
        if (!account || account.reward_points < 4000) return;

        const confirmed = window.confirm(
            `¿Comprar 1 PSOK por 4,000 RP?\n\nRP actual: ${account.reward_points.toLocaleString()}\nRP después: ${(account.reward_points - 4000).toLocaleString()}\nPSOKs actuales: ${account.psok}`
        );
        if (!confirmed) return;

        // Optimistic update
        setAccounts(prev => prev.map(acc =>
            acc.id === accountId
                ? { ...acc, reward_points: acc.reward_points - 4000, psok: (acc.psok || 0) + 1 }
                : acc
        ));

        try {
            await accountsService.update(accountId, {
                reward_points: account.reward_points - 4000,
                psok: (account.psok || 0) + 1
            });
        } catch (error) {
            console.error('Error buying PSOK:', error);
            // Revert on error
            setAccounts(prev => prev.map(acc =>
                acc.id === accountId
                    ? { ...acc, reward_points: account.reward_points, psok: account.psok }
                    : acc
            ));
        }
    };

    // ---- Bossing handlers ----

    // accountId → Set of boss IDs where prequest is done
    const prequestMap = useMemo(() => {
        const map: Record<string, Set<string>> = {};
        allPrequests.forEach(({ account_id, boss_id }) => {
            if (!map[account_id]) map[account_id] = new Set();
            map[account_id].add(boss_id);
        });
        return map;
    }, [allPrequests]);

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

            setWeekSessions(prev => [...prev.filter(s => s.account_id !== accountId), session]);
            setRpOverrides(prev => ({ ...prev, [accountId]: null }));
        } catch (err) {
            console.error('Error registering bossing:', err);
        } finally {
            setRegisteringAccounts(prev => { const n = new Set(prev); n.delete(accountId); return n; });
        }
    };

    // Timer calculation logic from Items.tsx
    const renderTimer = (ahListedAt: string | null) => {
        if (!ahListedAt) return (
            <div className="timer-not-listed">
                <span>Not</span>
                <span>Listed</span>
            </div>
        );

        const listedDate = new Date(ahListedAt);
        const now = new Date();
        const diffMs = now.getTime() - listedDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Assume 24h listing for now, or 48h? 
        // User image shows "27h 35m", so likely 48h? Or it counts UP?
        // Let's count DOWN from 48h as per common Maplestory AH
        const remainingHoursTotal = 48 - diffHours;

        if (remainingHoursTotal <= 0) {
            return <span className="timer-expired">Expired</span>;
        }

        const h = Math.floor(remainingHoursTotal);
        const m = Math.floor((remainingHoursTotal - h) * 60);

        const isLow = remainingHoursTotal < 24;

        return (
            <div className={`ah-timer ${isLow ? 'is-low' : ''}`}>
                <span className="timer-h">{h}h</span>
                <span className="timer-m">{m}m</span>
            </div>
        );
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
                        <Button
                            variant={showItems ? "primary" : "secondary"}
                            size="sm"
                            onClick={() => setShowItems(!showItems)}
                        >
                            {showItems ? "Hide Items" : "Show Items"}
                        </Button>
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
                                    <>
                                        <th rowSpan={2} className="col-items">Items For Sale</th>
                                        <th rowSpan={2} className="col-price">Price</th>
                                        <th rowSpan={2} className="col-timer">Timer</th>
                                        <th rowSpan={2} className="col-actions">Actions</th>
                                    </>
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
                                                key={row.account.reward_points}
                                                type="number"
                                                defaultValue={row.account.reward_points}
                                                onBlur={(e) => handleRPBlur(row.account.id, parseInt(e.target.value) || 0)}
                                                className="rp-input-table"
                                            />
                                            <div className="psok-row">
                                                <button
                                                    className={`psok-btn ${row.account.reward_points >= 4000 ? 'psok-btn--active' : 'psok-btn--disabled'}`}
                                                    onClick={() => handleBuyPSOK(row.account.id)}
                                                    disabled={row.account.reward_points < 4000}
                                                    title={row.account.reward_points >= 4000 ? `Comprar PSOK por 4,000 RP` : `Necesitas ${(4000 - row.account.reward_points).toLocaleString()} RP más`}
                                                >
                                                    PSOK
                                                </button>
                                                <span className={`psok-count ${(row.account.psok || 0) > 0 ? 'psok-count--positive' : 'psok-count--zero'}`}>{row.account.psok || 0}</span>
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
                                                        {allBosses.map(boss => {
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
                                                </div>
                                            </td>
                                        );
                                    })()}

                                    {/* Items Section */}
                                    {showItems && (
                                        <td colSpan={4} className="cell-items-group">
                                            <div className="items-list-vertical">
                                                {row.itemsForSale.length > 0 ? row.itemsForSale.map(item => (
                                                    <div key={item.id} className="ah-item-row">
                                                        <div className="col-items item-info">
                                                            {item && (
                                                                <img
                                                                    src={itemsDBMap.get(item.name) || 'https://via.placeholder.com/32?text=Item'}
                                                                    alt={item.name}
                                                                    className="item-mini-icon"
                                                                />
                                                            )}
                                                            <div className="item-details">
                                                                <span className="item-name">{item.name}</span>
                                                                <span className="item-owner">
                                                                    {allChars.find(c => c.id === item.character_id)?.name || '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="item-price-val">{item.estimated_value}</div>
                                                        <div className="col-timer">{renderTimer(item.ah_listed_at)}</div>
                                                        <div className="col-action-btn">
                                                            <div className="action-stack">
                                                                <button className="btn-list-ah" onClick={() => handleListAH(item)}>List AH</button>
                                                                <button className="btn-sold" onClick={() => handleOpenSellModal(item as ItemWithCharacter)}>Sold</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="no-items">-</div>
                                                )}
                                            </div>
                                        </td>
                                    )}
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
