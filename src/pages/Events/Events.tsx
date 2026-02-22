// =============================================
// EVENTS PAGE - Game Events Tracking
// =============================================

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '../../components/Layout';
import { Button, Select } from '../../components/UI';
import CreateEventModal from './CreateEventModal';
import { eventsService, accountsService, charactersService } from '../../services';
import type {
    GameEvent,
    Account,
    Character,
    EventDailyReward,
    EventDailyProgress,
    EventDailyClaim,
    EventDailyClaimInsert,
    EventBoss,
    EventShopItem,
    EventBossingProgress,
    EventShopPurchase
} from '../../types';
import './Events.css';

interface AccountWithChar extends Account {
    mainCharacter?: Character;
}

const Events: React.FC = () => {
    // State
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [accounts, setAccounts] = useState<AccountWithChar[]>([]);
    const [loading, setLoading] = useState(true);

    // Daily Login State
    const [dailyRewards, setDailyRewards] = useState<EventDailyReward[]>([]);
    const [dailyProgress, setDailyProgress] = useState<EventDailyProgress[]>([]);
    const [dailyClaims, setDailyClaims] = useState<EventDailyClaim[]>([]);

    // Bossing State
    const [bosses, setBosses] = useState<EventBoss[]>([]);
    const [shopItems, setShopItems] = useState<EventShopItem[]>([]);
    const [bossingProgress, setBossingProgress] = useState<EventBossingProgress[]>([]);
    const [shopPurchases, setShopPurchases] = useState<EventShopPurchase[]>([]);

    // Event Totals State
    const [totalProgressMap, setTotalProgressMap] = useState<Record<string, number>>({});

    // Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);

    // Week Navigation State
    const [selectedWeek, setSelectedWeek] = useState<number>(1);

    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    const handleNewEvent = () => {
        setEditingEvent(null);
        setShowCreateModal(true);
    };

    const handleEditEvent = () => {
        setEditingEvent(selectedEvent || null);
        setShowCreateModal(true);
    };

    // Get selected event
    const selectedEvent = useMemo(() =>
        events.find(e => e.id === selectedEventId),
        [events, selectedEventId]
    );

    const handleToggleFavorite = async () => {
        if (!selectedEventId) return;
        try {
            await eventsService.setFavorite(selectedEventId);
            await loadData();
        } catch (error) {
            console.error('Error setting favorite:', error);
        }
    };

    const handleMarkAsFinished = async () => {
        if (!selectedEventId) return;
        if (!window.confirm('Are you sure you want to finish this event? It will no longer appear in the active list.')) return;

        try {
            await eventsService.markAsFinished(selectedEventId);
            setSelectedEventId(''); // Clear selection
            await loadData();
        } catch (error) {
            console.error('Error finishing event:', error);
        }
    };

    // Load initial data
    useEffect(() => {
        loadData();
    }, []);

    // Load event-specific data when event changes
    useEffect(() => {
        if (selectedEventId) {
            loadEventData(selectedEventId);
        }
    }, [selectedEventId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [eventsData, accountsData, charactersData] = await Promise.all([
                eventsService.getActive(),
                accountsService.getAll(),
                charactersService.getAll()
            ]);

            // Map accounts with their main characters
            const accountsWithChars: AccountWithChar[] = accountsData.map(account => {
                const chars = charactersData.filter(c => c.account_id === account.id);
                const mainChar = chars.find(c => c.main === 'Main') || chars[0];
                return { ...account, mainCharacter: mainChar };
            });

            setEvents(eventsData);
            setAccounts(accountsWithChars);

            // Favoritos logic: prioritize is_favorite event
            if (eventsData.length > 0 && !selectedEventId) {
                const favorite = eventsData.find(e => e.is_favorite);
                setSelectedEventId(favorite ? favorite.id : eventsData[0].id);
            } else if (selectedEventId) {
                // If an event is already selected, refresh its specific data (rewards, etc.)
                loadEventData(selectedEventId);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadEventData = async (eventId: string) => {
        try {
            const event = events.find(e => e.id === eventId);
            if (!event) return;

            if (event.type === 'daily_login') {
                const rewards = await eventsService.getDailyRewards(eventId);
                setDailyRewards(rewards);
                // Progress and claims will be loaded by the useEffect on selectedWeek
            } else if (event.type === 'bossing') {
                const [bossesData, itemsData] = await Promise.all([
                    eventsService.getBosses(eventId),
                    eventsService.getShopItems(eventId)
                ]);
                setBosses(bossesData);
                setShopItems(itemsData);
                // Progress and purchases will be loaded by the useEffect on selectedWeek
            }

            // Load Global Totals
            const totals = await eventsService.getEventTotalProgress(eventId);
            setTotalProgressMap(totals);

            // Set initial week based on current date (UTC)
            const currentWeekNum = eventsService.getWeekNumber(event, new Date());
            const totalWeeks = eventsService.getTotalWeeks(event);
            const clampedWeek = Math.max(1, Math.min(currentWeekNum, totalWeeks));
            setSelectedWeek(clampedWeek);
        } catch (error) {
            console.error('Error loading event data:', error);
        }
    };

    const loadWeeklyProgress = async (eventId: string, week: number) => {
        try {
            const event = events.find(e => e.id === eventId);
            if (!event) return;

            const weekDays = eventsService.getWeekDays(event, week);
            if (weekDays.length === 0) return;

            const startDate = weekDays[0];
            const endDate = weekDays[weekDays.length - 1];

            if (event.type === 'daily_login') {
                const [progress, claims] = await Promise.all([
                    eventsService.getDailyProgress(eventId, undefined, startDate, endDate),
                    eventsService.getDailyClaims(eventId) // Claims are few, OK to load all or filter by rewards
                ]);
                setDailyProgress(progress);
                setDailyClaims(claims);
            } else if (event.type === 'bossing') {
                const [progressData, purchasesData] = await Promise.all([
                    eventsService.getBossingProgress(eventId), // Bossing is weekly, 1 row per account-week
                    eventsService.getShopPurchases(eventId)
                ]);
                setBossingProgress(progressData);
                setShopPurchases(purchasesData);
            }
        } catch (error) {
            console.error('Error loading weekly progress:', error);
        }
    };

    // Load weekly progress when week or event changes
    useEffect(() => {
        if (selectedEventId && selectedWeek) {
            loadWeeklyProgress(selectedEventId, selectedWeek);
        }
    }, [selectedEventId, selectedWeek]);

    // Calculate progress counts per day (for daily_login)
    const dailyProgressCounts = useMemo(() => {
        if (!selectedEvent || selectedEvent.type !== 'daily_login') return {};
        const weekDays = eventsService.getWeekDays(selectedEvent, selectedWeek);
        const counts: Record<string, number> = {};

        weekDays.forEach(date => {
            counts[date] = dailyProgress.filter(p => p.date === date && p.completed).length;
        });

        return counts;
    }, [selectedEvent, selectedWeek, dailyProgress]);

    // Week Navigation handlers
    const handlePrevWeek = () => {
        setSelectedWeek(prev => Math.max(1, prev - 1));
    };

    const handleNextWeek = () => {
        if (!selectedEvent) return;
        const totalWeeks = eventsService.getTotalWeeks(selectedEvent);
        setSelectedWeek(prev => Math.min(totalWeeks, prev + 1));
    };

    // Get days for selected week
    const getWeekDays = (): string[] => {
        if (!selectedEvent) return [];
        return eventsService.getWeekDays(selectedEvent, selectedWeek);
    };

    // Toggle daily progress
    const handleDailyToggle = async (accountId: string, date: string, currentCompleted: boolean) => {
        if (!selectedEventId) return;

        try {
            const newProgress = await eventsService.toggleDailyProgress(
                selectedEventId,
                accountId,
                date,
                !currentCompleted
            );

            // Update local state
            setDailyProgress(prev => {
                const existing = prev.find(p =>
                    p.account_id === accountId && p.date === date
                );
                if (existing) {
                    return prev.map(p =>
                        p.id === existing.id ? newProgress : p
                    );
                }
                return [...prev, newProgress];
            });

            // Refresh global totals
            const totals = await eventsService.getEventTotalProgress(selectedEventId);
            setTotalProgressMap(totals);
        } catch (error) {
            console.error('Error toggling progress:', error);
        }
    };

    // Bulk Actions
    const handleBulkCompleteToday = async () => {
        if (!selectedEventId) return;

        const accountIds = accounts.map(a => a.id);

        try {
            await eventsService.bulkToggleDailyProgress(selectedEventId, accountIds, today, true);

            // Refresh progress
            const progress = await eventsService.getDailyProgress(selectedEventId);
            setDailyProgress(progress);

            // Refresh global totals
            const totals = await eventsService.getEventTotalProgress(selectedEventId);
            setTotalProgressMap(totals);
        } catch (error) {
            console.error('Error in bulk complete today:', error);
        }
    };

    const handleBulkClaimRewards = async () => {
        if (!selectedEventId || !selectedEvent) return;

        const claimsToCreate: EventDailyClaimInsert[] = [];
        const accountsToUpdate: { id: string, updates: Partial<Account> }[] = [];

        accounts.forEach(account => {
            const totalDays = getTotalDays(account.id);
            dailyRewards.forEach(reward => {
                const claimed = isRewardClaimed(account.id, reward.id);
                const canClaim = totalDays >= reward.days_required && !claimed;

                if (canClaim) {
                    claimsToCreate.push({
                        event_id: selectedEventId,
                        account_id: account.id,
                        reward_id: reward.id
                    });

                    // Prepare resource update
                    const resourceKey = reward.resource_type as keyof Account;
                    const currentValue = (account[resourceKey] as any) || 0;

                    // We need to keep track of cumulative updates per account if multiple rewards are claimed
                    const existingUpdate = accountsToUpdate.find(a => a.id === account.id);
                    if (existingUpdate) {
                        const currentRewardVal = (existingUpdate.updates[resourceKey] as any) || 0;
                        existingUpdate.updates[resourceKey] = (currentRewardVal + reward.quantity) as any;
                    } else {
                        accountsToUpdate.push({
                            id: account.id,
                            updates: { [resourceKey]: (currentValue + reward.quantity) as any }
                        });
                    }
                }
            });
        });

        if (claimsToCreate.length === 0) {
            alert('No pending rewards to claim.');
            return;
        }

        try {
            await eventsService.bulkClaimRewards(claimsToCreate);

            // Update account resources in parallel
            await Promise.all(accountsToUpdate.map(update =>
                accountsService.update(update.id, update.updates)
            ));

            // Refresh events data
            await loadEventData(selectedEventId);
            await loadData(); // Refresh accounts
        } catch (error) {
            console.error('Error in bulk claim rewards:', error);
        }
    };

    // Claim daily reward
    const handleClaimReward = async (accountId: string, rewardId: string, reward: EventDailyReward) => {
        if (!selectedEventId) return;

        try {
            // Create claim
            const claim = await eventsService.claimReward({
                event_id: selectedEventId,
                account_id: accountId,
                reward_id: rewardId
            });

            // Update account resources
            const account = accounts.find(a => a.id === accountId);
            if (account) {
                const resourceKey = reward.resource_type as keyof Account;
                const currentValue = (account[resourceKey] as number) || 0;
                await accountsService.update(accountId, {
                    [resourceKey]: currentValue + reward.quantity
                });
            }

            // Update local state
            setDailyClaims(prev => [...prev, claim]);
        } catch (error) {
            console.error('Error claiming reward:', error);
        }
    };

    // Update boss for account
    const handleBossChange = async (accountId: string, bossId: string) => {
        if (!selectedEventId) return;

        const boss = bosses.find(b => b.id === bossId);
        if (!boss) return;

        const weekNumber = selectedWeek;

        try {
            const progress = await eventsService.updateBossingProgress(
                selectedEventId,
                accountId,
                weekNumber,
                bossId,
                boss.points
            );

            setBossingProgress(prev => {
                const existing = prev.find(p =>
                    p.account_id === accountId && p.week_number === weekNumber
                );
                if (existing) {
                    return prev.map(p => p.id === existing.id ? progress : p);
                }
                return [...prev, progress];
            });
        } catch (error) {
            console.error('Error updating boss:', error);
        }
    };

    // Purchase shop item
    const handlePurchase = async (accountId: string, shopItem: EventShopItem) => {
        if (!selectedEventId) return;

        const weekNumber = selectedWeek;
        const totalPoints = getTotalPoints(accountId);

        if (totalPoints < shopItem.price) return;

        try {
            const purchase = await eventsService.purchaseShopItem({
                event_id: selectedEventId,
                account_id: accountId,
                shop_item_id: shopItem.id,
                week_number: weekNumber,
                quantity: 1
            });

            // Update account resources
            const account = accounts.find(a => a.id === accountId);
            if (account) {
                const resourceKey = shopItem.resource_type as keyof Account;
                const currentValue = (account[resourceKey] as number) || 0;
                await accountsService.update(accountId, {
                    [resourceKey]: currentValue + 1
                });
            }

            setShopPurchases(prev => [...prev, purchase]);
        } catch (error) {
            console.error('Error purchasing item:', error);
        }
    };

    // Get account's total days completed
    const getTotalDays = (accountId: string): number => {
        return totalProgressMap[accountId] || 0;
    };

    const getWeeklyDays = (accountId: string): number => {
        const weekDays = getWeekDays();
        return dailyProgress.filter(p =>
            p.account_id === accountId &&
            p.completed &&
            weekDays.includes(p.date)
        ).length;
    };

    // Check if reward is claimed
    const isRewardClaimed = (accountId: string, rewardId: string): boolean => {
        return dailyClaims.some(c =>
            c.account_id === accountId && c.reward_id === rewardId
        );
    };

    // Get total available points for bossing (earned - spent)
    const getTotalPoints = (accountId: string): number => {
        const earned = bossingProgress
            .filter(p => p.account_id === accountId)
            .reduce((sum, p) => sum + p.points_earned, 0);

        const spent = shopPurchases
            .filter(p => p.account_id === accountId)
            .reduce((sum, p) => {
                const item = shopItems.find(i => i.id === p.shop_item_id);
                return sum + (item ? item.price * p.quantity : 0);
            }, 0);

        return earned - spent;
    };

    const getWeeklyPoints = (accountId: string): number => {
        const weekNumber = selectedWeek;
        const progress = bossingProgress.find(p =>
            p.account_id === accountId && p.week_number === weekNumber
        );
        return progress?.points_earned || 0;
    };

    const getWeeklyPurchases = (accountId: string, shopItemId: string): number => {
        const weekNumber = selectedWeek;
        return shopPurchases
            .filter(p =>
                p.account_id === accountId &&
                p.shop_item_id === shopItemId &&
                p.week_number === weekNumber
            )
            .reduce((sum, p) => sum + p.quantity, 0);
    };

    const renderDailyLoginView = () => {
        if (!selectedEvent) return null;
        const weekDays = getWeekDays();

        // Map day names and dates for headers
        const dayHeaders = weekDays.map(date => {
            const d = new Date(date + 'T00:00:00Z'); // Force UTC
            return {
                name: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase(),
                date: `${d.getUTCDate()} ${d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toLowerCase()}`
            };
        });

        return (
            <>
                <div className="events-table-container">
                    <div className="table-scroll-container">
                        <table className="events-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Mail</th>
                                    <th>Tag</th>
                                    <th>Char</th>
                                    {dayHeaders.map((header, i) => {
                                        const date = weekDays[i];
                                        const count = dailyProgressCounts[date] || 0;
                                        return (
                                            <th key={i} className="day-checkbox-cell header-day">
                                                <div className="day-name">{header.name}</div>
                                                <div className="day-date">{header.date}</div>
                                                <div className="day-counter">{count} / {accounts.length}</div>
                                            </th>
                                        );
                                    })}
                                    <th className="counter-cell">Week</th>
                                    <th className="counter-cell">Total</th>
                                    {dailyRewards.map(reward => {
                                        const shortNameMap: Record<string, string> = {
                                            'bright_cubes': 'Bright',
                                            'bonus_bright_cubes': 'Bonus',
                                            'solid_cubes': 'Solid',
                                            'psok': 'PSOK'
                                        };
                                        const shortName = shortNameMap[reward.resource_type] || reward.resource_type;

                                        return (
                                            <th key={reward.id} className="reward-header">
                                                <span className="days">Day {reward.days_required}</span>
                                                <span className="resource">{reward.quantity} {shortName}</span>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map((account) => {
                                    const totalDays = getTotalDays(account.id);
                                    const weeklyDays = getWeeklyDays(account.id);
                                    const maxPerWeek = selectedEvent?.max_per_week || 7;

                                    return (
                                        <tr key={account.id}>
                                            <td className="account-number">{account.number}</td>
                                            <td className="account-email">{account.email}</td>
                                            <td className="account-tag">{account.tag}</td>
                                            <td className="account-char">{account.mainCharacter?.name || '-'}</td>
                                            {weekDays.map((date, i) => {
                                                const progress = dailyProgress.find(p =>
                                                    p.account_id === account.id && p.date === date
                                                );
                                                const isCompleted = progress?.completed || false;
                                                const isFuture = date > today;
                                                const isDisabled = isFuture || (weeklyDays >= maxPerWeek && !isCompleted && selectedEvent?.type === 'daily_login');

                                                return (
                                                    <td key={i} className="day-checkbox-cell">
                                                        {isFuture ? (
                                                            <span className="day-pending">-</span>
                                                        ) : (
                                                            <input
                                                                type="checkbox"
                                                                className="day-checkbox"
                                                                checked={isCompleted}
                                                                disabled={isDisabled}
                                                                onChange={() => handleDailyToggle(account.id, date, isCompleted)}
                                                            />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="counter-cell week">{weeklyDays}</td>
                                            <td className="counter-cell total">{totalDays}</td>
                                            {dailyRewards.map(reward => {
                                                const claimed = isRewardClaimed(account.id, reward.id);
                                                const canClaim = totalDays >= reward.days_required && !claimed;

                                                return (
                                                    <td key={reward.id} className="reward-cell">
                                                        {claimed ? (
                                                            <span className="reward-claimed">✓</span>
                                                        ) : canClaim ? (
                                                            <input
                                                                type="checkbox"
                                                                className="reward-checkbox"
                                                                onChange={() => handleClaimReward(account.id, reward.id, reward)}
                                                            />
                                                        ) : (
                                                            <span className="reward-progress">
                                                                ({totalDays}/{reward.days_required})
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        );
    };


    // Render Bossing View
    const renderBossingView = () => {
        if (!selectedEvent) return null;
        const weekNumber = selectedWeek;
        const realCurrentWeek = eventsService.getWeekNumber(selectedEvent, new Date());
        const isCurrentWeek = weekNumber === realCurrentWeek;

        return (
            <>
                <div className="shop-prices-bar">
                    <div className="shop-prices-info">
                        <span>Shop Prices:</span>
                        {shopItems.map(item => {
                            const shortNameMap: Record<string, string> = {
                                'bright_cubes': 'Bright',
                                'bonus_bright_cubes': 'Bonus',
                                'solid_cubes': 'Solid',
                                'psok': 'PSOK'
                            };
                            const shortName = shortNameMap[item.resource_type] || item.resource_type;
                            return (
                                <span key={item.id} className="shop-price-item">
                                    <span className="resource-name">{shortName}</span>
                                    = <span className="price">{item.price} pts</span>
                                    <span className="limit">({item.max_per_week}/wk)</span>
                                </span>
                            );
                        })}
                    </div>
                    {!isCurrentWeek && (
                        <div className="shop-closed-notice">
                            ⚠️ Shop only available during current week ({realCurrentWeek})
                        </div>
                    )}
                </div>

                <div className="events-table-container">
                    <div className="table-scroll-container">
                        <table className="events-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Mail</th>
                                    <th>Tag</th>
                                    <th>Char</th>
                                    <th>Boss (Week)</th>
                                    <th className="points-cell">Pts Wk</th>
                                    <th className="points-cell">Pts Tot</th>
                                    {shopItems.map(item => {
                                        const shortNameMap: Record<string, string> = {
                                            'bright_cubes': 'Bright',
                                            'bonus_bright_cubes': 'Bonus',
                                            'solid_cubes': 'Solid',
                                            'psok': 'PSOK'
                                        };
                                        const shortName = shortNameMap[item.resource_type] || item.resource_type;
                                        return (
                                            <th key={item.id} className="shop-cell">
                                                {shortName}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map((account) => {
                                    const weeklyPoints = getWeeklyPoints(account.id);
                                    const totalPoints = getTotalPoints(account.id);
                                    const currentProgress = bossingProgress.find(p =>
                                        p.account_id === account.id && p.week_number === weekNumber
                                    );

                                    return (
                                        <tr key={account.id}>
                                            <td className="account-number">{account.number}</td>
                                            <td className="account-email">{account.email}</td>
                                            <td className="account-tag">{account.tag}</td>
                                            <td className="account-char">{account.mainCharacter?.name || '-'}</td>
                                            <td className="boss-selector">
                                                <select
                                                    value={currentProgress?.highest_boss_id || ''}
                                                    onChange={(e) => handleBossChange(account.id, e.target.value)}
                                                >
                                                    <option value="">None</option>
                                                    {bosses.map(boss => (
                                                        <option key={boss.id} value={boss.id}>
                                                            {boss.boss_name} ({boss.points})
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="points-cell weekly">{weeklyPoints}</td>
                                            <td className="points-cell total">{totalPoints}</td>
                                            {shopItems.map(item => {
                                                const purchased = getWeeklyPurchases(account.id, item.id);
                                                const maxed = purchased >= item.max_per_week;
                                                const canAfford = totalPoints >= item.price;

                                                return (
                                                    <td key={item.id} className="shop-cell">
                                                        {!isCurrentWeek ? (
                                                            <span className="shop-closed">No Disp.</span>
                                                        ) : maxed ? (
                                                            <span className="shop-maxed">✓ {purchased}/{item.max_per_week}</span>
                                                        ) : canAfford ? (
                                                            <button
                                                                className="shop-buy-btn"
                                                                onClick={() => handlePurchase(account.id, item)}
                                                            >
                                                                + {purchased}/{item.max_per_week}
                                                            </button>
                                                        ) : (
                                                            <span className="shop-insufficient" title="Puntos Insuficientes">
                                                                {purchased}/{item.max_per_week}
                                                                <small style={{ display: 'block', fontSize: '10px' }}>Insuficiente</small>
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        );
    };

    if (loading) {
        return (
            <>
                <Header title="Events" />
                <div className="events-page">
                    <p>Loading events...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Events" />
            <div className="events-page">
                <div className="events-header">
                    <div className="events-filters">
                        <Select
                            className="event-selector"
                            value={selectedEventId}
                            onChange={(value) => setSelectedEventId(value)}
                            options={events.map(e => ({
                                value: e.id,
                                label: `${e.name} (${e.type === 'daily_login' ? 'Daily' : 'Bossing'})`
                            }))
                            }
                        />
                    </div>
                    <Button variant="primary" onClick={handleNewEvent}>
                        + New Event
                    </Button>
                </div>

                {selectedEvent && (
                    <>
                        <div className="event-info-bar">
                            <div className="event-info-main">
                                <div className="event-info-title">
                                    <button
                                        className={`favorite-btn ${selectedEvent.is_favorite ? 'active' : ''}`}
                                        onClick={handleToggleFavorite}
                                        title={selectedEvent.is_favorite ? "Quitar Favorito" : "Marcar como Favorito"}
                                    >
                                        ★
                                    </button>
                                    <h2>{selectedEvent.name}</h2>
                                    <div className="header-actions-inline">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleEditEvent}
                                            className="edit-event-btn"
                                        >
                                            Edit
                                        </Button>
                                        {today > (selectedEvent.end_date?.split('T')[0] || '') && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={handleMarkAsFinished}
                                                className="finish-event-btn"
                                            >
                                                Finish
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <span className="event-dates">
                                    {new Date(selectedEvent.start_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })} - {new Date(selectedEvent.end_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                </span>
                            </div>
                            <div className="event-bulk-actions">
                                {selectedEvent.type === 'daily_login' && (
                                    <>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={handleBulkCompleteToday}
                                            className="bulk-btn"
                                        >
                                            ⚡ Complete All Today
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleBulkClaimRewards}
                                            className="bulk-btn"
                                        >
                                            🎁 Claim All Rewards
                                        </Button>
                                    </>
                                )}
                            </div>
                            <div className="week-info week-navigator">
                                <button
                                    className="week-nav-btn"
                                    onClick={handlePrevWeek}
                                    disabled={selectedWeek <= 1}
                                >
                                    ‹
                                </button>
                                <span className="week-label">Week {selectedWeek} / {eventsService.getTotalWeeks(selectedEvent)}</span>
                                <button
                                    className="week-nav-btn"
                                    onClick={handleNextWeek}
                                    disabled={selectedWeek >= eventsService.getTotalWeeks(selectedEvent)}
                                >
                                    ›
                                </button>
                            </div>
                        </div>

                        {selectedEvent.type === 'daily_login' && renderDailyLoginView()}
                        {selectedEvent.type === 'bossing' && renderBossingView()}
                    </>
                )}

                {!selectedEvent && events.length === 0 && (
                    <div className="no-events">
                        <div className="no-events-icon">📅</div>
                        <p>No active events. Create one to get started!</p>
                    </div>
                )}
            </div>

            <CreateEventModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onEventCreated={loadData}
                eventToEdit={editingEvent}
            />
        </>
    );
};

export default Events;
