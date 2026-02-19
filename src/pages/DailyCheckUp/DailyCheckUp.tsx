import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Header } from '../../components/Layout';
import { Card, Button, Modal, Input } from '../../components/UI';
import {
    accountsService,
    charactersService,
    eventsService,
    tasksService,
    itemsService,
    itemsDBService,
    transactionsService
} from '../../services';
import type {
    Account,
    Character,
    GameEvent,
    Task,
    ItemWithCharacter,
    EventDailyProgress,
    TaskProgress,
    ItemDB
} from '../../types';
import './DailyCheckUp.css';

const DailyCheckUp: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [allChars, setAllChars] = useState<Character[]>([]);
    const [mainChars, setMainChars] = useState<Character[]>([]);
    const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
    const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [itemsForSale, setItemsForSale] = useState<ItemWithCharacter[]>([]);
    const [itemsDB, setItemsDB] = useState<ItemDB[]>([]);

    // Progress states
    const [eventProgress, setEventProgress] = useState<EventDailyProgress[]>([]);
    const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);

    // UI States
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [sellingItem, setSellingItem] = useState<ItemWithCharacter | null>(null);

    // Sale Modal Form
    const [salePrice, setSalePrice] = useState(0);
    const [showRP, setShowRP] = useState(false);
    const [showItems, setShowItems] = useState(true);

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        loadData();

        // Configurar Realtime
        const channel = supabase
            .channel('daily_checkup_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_daily_progress' }, (payload: any) => {
                console.log('Realtime Event Progress Change:', payload);
                setEventProgress(prev => {
                    const newData = payload.new as EventDailyProgress;
                    const oldData = payload.old as EventDailyProgress;
                    let updated = [...prev];

                    if (payload.eventType === 'DELETE') {
                        return updated.filter(p => p.id !== oldData.id);
                    }

                    // Look for existing by ID or composite key
                    const index = updated.findIndex(p =>
                        (newData.id && p.id === newData.id) ||
                        (p.event_id === newData.event_id &&
                            p.account_id === newData.account_id &&
                            (p.date?.split('T')[0] === newData.date?.split('T')[0]))
                    );

                    if (index > -1) {
                        updated[index] = { ...updated[index], ...newData };
                    } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        updated.push(newData);
                    }
                    return updated;
                });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_progress' }, (payload: any) => {
                console.log('Realtime Task Progress Change:', payload);
                setTaskProgress(prev => {
                    const newData = payload.new as TaskProgress;
                    const oldData = payload.old as TaskProgress;
                    let updated = [...prev];

                    if (payload.eventType === 'DELETE') {
                        return updated.filter(p => p.id !== oldData.id);
                    }

                    const index = updated.findIndex(p =>
                        (newData.id && p.id === newData.id) ||
                        (p.task_id === newData.task_id && p.account_id === newData.account_id)
                    );

                    if (index > -1) {
                        updated[index] = { ...updated[index], ...newData };
                    } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        updated.push(newData);
                    }
                    return updated;
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
                dailyTasksData,
                allTasksData,
                itemsData,
                itemsDBData,
                allTaskProgress
            ] = await Promise.all([
                accountsService.getAll().catch(e => { console.error('Failed to load accounts:', e); return []; }),
                charactersService.getAll().catch(e => { console.error('Failed to load characters:', e); return []; }),
                eventsService.getActive().catch(e => { console.error('Failed to load events:', e); return []; }),
                tasksService.getDailyTasks().catch(e => { console.error('Failed to load daily tasks:', e); return []; }),
                tasksService.getAll().catch(e => { console.error('Failed to load all tasks:', e); return []; }),
                itemsService.getByStatus('for_sale').catch(e => { console.error('Failed to load items:', e); return []; }),
                itemsDBService.getAll().catch(e => { console.error('Failed to load itemsDB:', e); return []; }),
                tasksService.getAllProgress().catch(e => { console.error('Failed to load task progress:', e); return []; })
            ]);

            console.log('DailyCheckUp Data Loaded:', {
                accounts: accountsData.length,
                characters: charsData.length,
                events: eventsData.length,
                dailyTasks: dailyTasksData.length,
                items: itemsData.length
            });

            setAccounts(accountsData.sort((a: Account, b: Account) => a.number - b.number));
            setAllChars(charsData);
            setMainChars(charsData.filter((c: Character) => c.main === 'Main'));

            // Filter events that are currently active (today between start and end date)
            const now = new Date();
            const filteredEvents = eventsData.filter(event => {
                const start = new Date(event.start_date);
                const end = new Date(event.end_date);
                // We adjust end to include the full day in UTC
                end.setUTCHours(23, 59, 59, 999);
                return now >= start && now <= end;
            });
            setActiveEvents(filteredEvents);

            setDailyTasks(dailyTasksData);
            setAllTasks(allTasksData);
            setItemsForSale(itemsData);
            setItemsDB(itemsDBData);
            setTaskProgress(allTaskProgress);

            // Load daily progress for each active event
            if (filteredEvents.length > 0) {
                const eventProgressPromises = filteredEvents.map((event: GameEvent) =>
                    eventsService.getDailyProgress(event.id).catch(e => {
                        console.error(`Failed to load progress for event ${event.id}:`, e);
                        return [];
                    })
                );
                const allEventProgressResults = await Promise.all(eventProgressPromises);
                setEventProgress(allEventProgressResults.flat());
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
        const map = new Map<string, boolean>();
        (eventProgress || []).forEach(p => {
            if (p.event_id && p.account_id && p.date) {
                const dateOnly = p.date.split('T')[0];
                if (dateOnly === todayStr) {
                    map.set(`${p.event_id}-${p.account_id}`, p.completed);
                }
            }
        });
        return map;
    }, [eventProgress, todayStr]);

    const indexedTaskProgress = useMemo(() => {
        const map = new Map<string, boolean>();
        (taskProgress || []).forEach(p => {
            if (p.task_id && p.account_id) {
                map.set(`${p.task_id}-${p.account_id}`, p.completed);
            }
        });
        return map;
    }, [taskProgress]);

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
                const mainChar = (mainChars || []).find(c => c.account_id === acc.id) || null;

                // Filter items for this account's characters
                const accountItems = (itemsForSale || []).filter(item => {
                    if (!item || !item.character_id) return false;
                    const char = (allChars || []).find(c => c.id === item.character_id);
                    return char?.account_id === acc.id;
                });

                // Get progress for each active event
                const eventStates: Record<string, boolean> = {};
                (activeEvents || []).forEach(event => {
                    eventStates[event.id] = indexedEventProgress.get(`${event.id}-${acc.id}`) || false;
                });

                // Get progress for each daily task
                const taskStates: Record<string, boolean> = {};
                (dailyTasks || []).forEach(task => {
                    taskStates[task.id] = indexedTaskProgress.get(`${task.id}-${acc.id}`) || false;
                });

                return {
                    account: acc,
                    mainChar,
                    itemsForSale: accountItems,
                    eventProgress: eventStates,
                    taskProgress: taskStates
                };
            });
        } catch (e) {
            console.error('Error calculating DailyCheckUp rows:', e);
            return [];
        }
    }, [accounts, mainChars, itemsForSale, allChars, activeEvents, dailyTasks, indexedEventProgress, indexedTaskProgress]);
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
        const counts: Record<string, number> = {};
        activeEvents.forEach(event => {
            counts[event.id] = rows.filter(row => row.eventProgress[event.id]).length;
        });
        return counts;
    }, [activeEvents, rows]);

    const taskProgressCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        dailyTasks.forEach(task => {
            counts[task.id] = rows.filter(row => row.taskProgress[task.id]).length;
        });
        return counts;
    }, [dailyTasks, rows]);

    if (loading) {
        return (
            <div className="daily-checkup loading">
                <div className="loading-spinner"></div>
                <span>Cargando Dashboard Diario...</span>
            </div>
        );
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
        try {
            await eventsService.toggleDailyProgress(eventId, accountId, todayStr, completed);
            // Optimistic update
            setEventProgress(prev => {
                const existingIndex = prev.findIndex(p => p.event_id === eventId && p.account_id === accountId && p.date === todayStr);
                if (existingIndex > -1) {
                    const newArr = [...prev];
                    newArr[existingIndex] = { ...newArr[existingIndex], completed };
                    return newArr;
                } else {
                    return [...prev, { event_id: eventId, account_id: accountId, date: todayStr, completed } as EventDailyProgress];
                }
            });
        } catch (error) {
            console.error('Error toggling event progress:', error);
        }
    };

    const handleToggleTask = async (taskId: string, accountId: string, completed: boolean) => {
        try {
            await tasksService.toggleProgress(taskId, accountId, completed);
            // Optimistic update
            setTaskProgress(prev => {
                const existingIndex = prev.findIndex(p => p.task_id === taskId && p.account_id === accountId);
                if (existingIndex > -1) {
                    const newArr = [...prev];
                    newArr[existingIndex] = { ...newArr[existingIndex], completed };
                    return newArr;
                } else {
                    return [...prev, { task_id: taskId, account_id: accountId, completed } as TaskProgress];
                }
            });
        } catch (error) {
            console.error('Error toggling task progress:', error);
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

    const handleToggleDailyTask = async (taskId: string, show: boolean) => {
        try {
            await tasksService.update(taskId, { show_in_daily: show });
            setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, show_in_daily: show } : t));

            // Refresh daily tasks list
            const updatedDaily = await tasksService.getDailyTasks();
            setDailyTasks(updatedDaily);
        } catch (error) {
            console.error('Error toggling daily task:', error);
        }
    };

    const handleRPBlur = async (accountId: string, newValue: number) => {
        try {
            await accountsService.update(accountId, { reward_points: newValue });
            setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, reward_points: newValue } : acc));
        } catch (error) {
            console.error('Error updating RP:', error);
            setError('Error al actualizar Reward Points');
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
                            <tr>
                                <th className="col-hash">#</th>
                                <th className="col-mail">MAIL</th>
                                <th className="col-tag">TAG</th>
                                <th className="col-char">CHAR</th>
                                {activeEvents.map(event => (
                                    <th key={event.id} className="col-action">
                                        <div className="header-stacked">
                                            <span>{event.name}</span>
                                            <span className="header-counter">{eventProgressCounts[event.id] || 0} / {accounts.length}</span>
                                        </div>
                                    </th>
                                ))}
                                {dailyTasks.map(task => (
                                    <th key={task.id} className="col-action">
                                        <div className="header-stacked">
                                            <span>{task.name}</span>
                                            <span className="header-counter">{taskProgressCounts[task.id] || 0} / {accounts.length}</span>
                                        </div>
                                    </th>
                                ))}
                                {showRP && <th className="col-rp">RP</th>}
                                {showItems && (
                                    <>
                                        <th className="col-items">Items For Sale</th>
                                        <th className="col-price">Price</th>
                                        <th className="col-timer">Timer</th>
                                        <th className="col-action-btn">Action</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={row.account.id}>
                                    <td className="col-hash">{index}</td>
                                    <td className="col-mail">{row.account.email}</td>
                                    <td className="col-tag">
                                        <span className={`tag-badge ${row.account.tag?.toLowerCase()}`}>
                                            {row.account.tag}
                                        </span>
                                    </td>
                                    <td className="col-char">{row.mainChar?.name || '-'}</td>

                                    {/* Events Checks */}
                                    {activeEvents.map(event => (
                                        <td key={event.id} className="col-action">
                                            <label className="daily-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={row.eventProgress[event.id]}
                                                    onChange={(e) => handleToggleEvent(event.id, row.account.id, e.target.checked)}
                                                />
                                                <span className="checkmark"></span>
                                            </label>
                                        </td>
                                    ))}

                                    {/* Tasks Checks */}
                                    {dailyTasks.map(task => (
                                        <td key={task.id} className="col-action">
                                            <label className="daily-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={row.taskProgress[task.id]}
                                                    onChange={(e) => handleToggleTask(task.id, row.account.id, e.target.checked)}
                                                />
                                                <span className="checkmark"></span>
                                            </label>
                                        </td>
                                    ))}

                                    {/* Reward Points */}
                                    {showRP && (
                                        <td className="col-rp">
                                            <Input
                                                type="number"
                                                defaultValue={row.account.reward_points}
                                                onBlur={(e) => handleRPBlur(row.account.id, parseInt(e.target.value) || 0)}
                                                className="rp-input-table"
                                            />
                                        </td>
                                    )}

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
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>

            {/* CONFIG MODAL */}
            <Modal
                isOpen={configModalOpen}
                onClose={() => setConfigModalOpen(false)}
                title="Configure Daily Tasks"
            >
                <div className="config-tasks-list">
                    {allTasks.filter(t => !t.is_completed).map(task => (
                        <div key={task.id} className="config-task-item">
                            <label className="config-checkbox">
                                <input
                                    type="checkbox"
                                    checked={task.show_in_daily}
                                    onChange={(e) => handleToggleDailyTask(task.id, e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                <span className="task-label">{task.name}</span>
                            </label>
                            {task.is_core && <span className="badge-core-global">Core</span>}
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
