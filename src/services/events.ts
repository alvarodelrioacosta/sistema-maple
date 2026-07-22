// =============================================
// EVENTS SERVICE - Game Events Management
// =============================================

import supabase from '../lib/supabase';
import type {
    GameEvent,
    GameEventInsert,
    EventDailyReward,
    EventDailyRewardInsert,
    EventDailyProgress,
    EventAccountProgress,
    EventDailyClaim,
    EventDailyClaimInsert,
    EventBoss,
    EventBossInsert,
    EventShopItem,
    EventShopItemInsert,
    EventBossingProgress,
    EventBossingProgressInsert,
    EventShopPurchase,
    EventShopPurchaseInsert
} from '../types';

function getISOWeekKey(): number {
    const d = new Date();
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return date.getUTCFullYear() * 100 + week;
}

export const eventsService = {
    // ===== EVENTS =====
    async getAll(): Promise<GameEvent[]> {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('is_favorite', { ascending: false })
            .order('start_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getActive(): Promise<GameEvent[]> {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_finished', false)
            .order('is_favorite', { ascending: false })
            .order('start_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getById(id: string): Promise<GameEvent | null> {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(event: GameEventInsert): Promise<GameEvent> {
        const { data, error } = await supabase
            .from('events')
            .insert(event)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: Partial<GameEventInsert>): Promise<GameEvent> {
        const { data, error } = await supabase
            .from('events')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async setFavorite(id: string): Promise<void> {
        // First, unset any existing favorite
        const { error: unsetError } = await supabase
            .from('events')
            .update({ is_favorite: false })
            .eq('is_favorite', true);

        if (unsetError) throw unsetError;

        // Set the new favorite
        const { error: setError } = await supabase
            .from('events')
            .update({ is_favorite: true })
            .eq('id', id);

        if (setError) throw setError;
    },

    async markAsFinished(id: string): Promise<void> {
        const { error } = await supabase
            .from('events')
            .update({
                is_finished: true,
                is_favorite: false // Cannot be favorite if finished
            })
            .eq('id', id);

        if (error) throw error;
    },

    // ===== DAILY REWARDS =====
    async getDailyRewards(eventId: string): Promise<EventDailyReward[]> {
        const { data, error } = await supabase
            .from('event_daily_rewards')
            .select('*')
            .eq('event_id', eventId)
            .order('days_required', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async createDailyReward(reward: EventDailyRewardInsert): Promise<EventDailyReward> {
        const { data, error } = await supabase
            .from('event_daily_rewards')
            .insert(reward)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ===== DAILY PROGRESS =====
    async getDailyProgress(eventId: string, date?: string, startDate?: string, endDate?: string): Promise<EventDailyProgress[]> {
        let query = supabase
            .from('event_daily_progress')
            .select('*, account:accounts!inner(status)')
            .eq('event_id', eventId)
            .neq('account.status', 'banned');

        if (date) {
            query = query.eq('date', date);
        } else if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query.limit(5000);
        if (error) throw error;
        return data || [];
    },

    async getDailyProgressByAccount(eventId: string, accountId: string): Promise<EventDailyProgress[]> {
        const { data, error } = await supabase
            .from('event_daily_progress')
            .select('*')
            .eq('event_id', eventId)
            .eq('account_id', accountId);

        if (error) throw error;
        return data || [];
    },

    async toggleDailyProgress(eventId: string, accountId: string, date: string, completed: boolean): Promise<EventDailyProgress> {
        const { data, error } = await supabase
            .from('event_daily_progress')
            .upsert({
                event_id: eventId,
                account_id: accountId,
                date,
                completed
            }, {
                onConflict: 'event_id,account_id,date'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ===== DAILY CLAIMS =====
    async getDailyClaims(eventId: string): Promise<EventDailyClaim[]> {
        const { data, error } = await supabase
            .from('event_daily_claims')
            .select('*, account:accounts!inner(status)')
            .eq('event_id', eventId)
            .neq('account.status', 'banned')
            .limit(5000);

        if (error) throw error;
        return data || [];
    },

    async claimReward(claim: EventDailyClaimInsert): Promise<EventDailyClaim> {
        const { data, error } = await supabase
            .from('event_daily_claims')
            .insert(claim)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ===== BOSSES =====
    async getBosses(eventId: string): Promise<EventBoss[]> {
        const { data, error } = await supabase
            .from('event_bosses')
            .select('*')
            .eq('event_id', eventId)
            .order('points', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async createBoss(boss: EventBossInsert): Promise<EventBoss> {
        const { data, error } = await supabase
            .from('event_bosses')
            .insert(boss)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ===== SHOP ITEMS =====
    async getShopItems(eventId: string): Promise<EventShopItem[]> {
        const { data, error } = await supabase
            .from('event_shop_items')
            .select('*')
            .eq('event_id', eventId);

        if (error) throw error;
        return data || [];
    },

    async createShopItem(item: EventShopItemInsert): Promise<EventShopItem> {
        const { data, error } = await supabase
            .from('event_shop_items')
            .insert(item)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ===== BOSSING PROGRESS =====
    async getBossingProgress(eventId: string): Promise<EventBossingProgress[]> {
        const { data, error } = await supabase
            .from('event_bossing_progress')
            .select('*, account:accounts!inner(status)')
            .eq('event_id', eventId)
            .neq('account.status', 'banned')
            .limit(5000);

        if (error) throw error;
        return data || [];
    },

    async updateBossingProgress(
        eventId: string,
        accountId: string,
        weekNumber: number,
        bossId: string,
        points: number
    ): Promise<EventBossingProgress> {
        // Check if record exists
        const { data: existing } = await supabase
            .from('event_bossing_progress')
            .select('*')
            .eq('event_id', eventId)
            .eq('account_id', accountId)
            .eq('week_number', weekNumber)
            .single();

        if (existing) {
            // Update only if new points are higher
            if (points > existing.points_earned) {
                const { data, error } = await supabase
                    .from('event_bossing_progress')
                    .update({ highest_boss_id: bossId, points_earned: points })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
            return existing;
        } else {
            // Create new
            const { data, error } = await supabase
                .from('event_bossing_progress')
                .insert({
                    event_id: eventId,
                    account_id: accountId,
                    week_number: weekNumber,
                    highest_boss_id: bossId,
                    points_earned: points
                } as EventBossingProgressInsert)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // ===== SHOP PURCHASES =====
    async getShopPurchases(eventId: string): Promise<EventShopPurchase[]> {
        const { data, error } = await supabase
            .from('event_shop_purchases')
            .select('*, account:accounts!inner(status)')
            .eq('event_id', eventId)
            .neq('account.status', 'banned')
            .limit(5000);

        if (error) throw error;
        return data || [];
    },

    async getWeeklyPurchases(eventId: string, accountId: string, weekNumber: number): Promise<EventShopPurchase[]> {
        const { data, error } = await supabase
            .from('event_shop_purchases')
            .select('*')
            .eq('event_id', eventId)
            .eq('account_id', accountId)
            .eq('week_number', weekNumber);

        if (error) throw error;
        return data || [];
    },

    async purchaseShopItem(purchase: EventShopPurchaseInsert): Promise<EventShopPurchase> {
        const { data, error } = await supabase
            .from('event_shop_purchases')
            .insert(purchase)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ===== BULK UPDATES =====
    async bulkToggleDailyProgress(eventId: string, accountIds: string[], date: string, completed: boolean): Promise<void> {
        const records = accountIds.map(accountId => ({
            event_id: eventId,
            account_id: accountId,
            date,
            completed
        }));

        const { error } = await supabase
            .from('event_daily_progress')
            .upsert(records, {
                onConflict: 'event_id,account_id,date'
            });

        if (error) throw error;
    },

    async bulkClaimRewards(claims: EventDailyClaimInsert[]): Promise<void> {
        if (claims.length === 0) return;

        const { error } = await supabase
            .from('event_daily_claims')
            .insert(claims);

        if (error) throw error;
    },

    async updateDailyRewards(eventId: string, rewards: EventDailyRewardInsert[]): Promise<void> {
        // Simple approach: Delete all and re-insert
        const { error: deleteError } = await supabase
            .from('event_daily_rewards')
            .delete()
            .eq('event_id', eventId);

        if (deleteError) throw deleteError;

        if (rewards.length > 0) {
            const { error: insertError } = await supabase
                .from('event_daily_rewards')
                .insert(rewards.map(r => ({ ...r, event_id: eventId })));
            if (insertError) throw insertError;
        }
    },

    async updateBosses(eventId: string, bosses: EventBossInsert[]): Promise<void> {
        const { error: deleteError } = await supabase
            .from('event_bosses')
            .delete()
            .eq('event_id', eventId);

        if (deleteError) throw deleteError;

        if (bosses.length > 0) {
            const { error: insertError } = await supabase
                .from('event_bosses')
                .insert(bosses.map(b => ({ ...b, event_id: eventId })));
            if (insertError) throw insertError;
        }
    },

    async updateShopItems(eventId: string, items: EventShopItemInsert[]): Promise<void> {
        const { error: deleteError } = await supabase
            .from('event_shop_items')
            .delete()
            .eq('event_id', eventId);

        if (deleteError) throw deleteError;

        if (items.length > 0) {
            const { error: insertError } = await supabase
                .from('event_shop_items')
                .insert(items.map(i => ({ ...i, event_id: eventId })));
            if (insertError) throw insertError;
        }
    },

    // ===== UTILITY FUNCTIONS =====
    getWeekNumber(event: GameEvent, date: Date): number {
        const start = new Date(event.start_date);
        start.setUTCHours(0, 0, 0, 0);

        const target = new Date(date);
        target.setUTCHours(0, 0, 0, 0);

        const diffTime = target.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 0; // Not started
        return Math.floor(diffDays / 7) + 1;
    },

    getWeekDays(event: GameEvent, weekNumber: number): string[] {
        const start = new Date(event.start_date);
        start.setUTCHours(0, 0, 0, 0);

        const eventEnd = new Date(event.end_date);
        eventEnd.setUTCHours(23, 59, 59, 999);

        // Find the start of the specific week
        const weekStart = new Date(start);
        weekStart.setUTCDate(start.getUTCDate() + (weekNumber - 1) * 7);

        // Generate up to 7 days, but filter those outside event range
        const days: string[] = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setUTCDate(weekStart.getUTCDate() + i);

            // Only add if it's within the event range
            if (day >= start && day <= eventEnd) {
                days.push(day.toISOString().split('T')[0]);
            }
        }

        return days;
    },

    getTotalWeeks(event: GameEvent): number {
        const start = new Date(event.start_date);
        const end = new Date(event.end_date);

        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(0, 0, 0, 0);

        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

        return Math.ceil(diffDays / 7);
    },

    // ===== EVENT ACCOUNT PROGRESS (new simplified table) =====
    async getAccountProgress(eventIds: string[]): Promise<EventAccountProgress[]> {
        if (eventIds.length === 0) return [];
        const { data, error } = await supabase
            .from('event_account_progress')
            .select('*, account:accounts!inner(status)')
            .in('event_id', eventIds)
            .neq('account.status', 'banned');
        if (error) throw error;
        return data || [];
    },

    async toggleAccountProgress(eventId: string, accountId: string): Promise<EventAccountProgress> {
        const today = new Date().toISOString().split('T')[0];
        const thisWeek = getISOWeekKey();

        const { data: existing } = await supabase
            .from('event_account_progress')
            .select('*')
            .eq('event_id', eventId)
            .eq('account_id', accountId)
            .single();

        let patch: Partial<EventAccountProgress>;

        if (existing) {
            const doneToday = existing.last_completed_date === today;
            if (doneToday) {
                // Undo
                patch = {
                    last_completed_date: null,
                    current_week_count: Math.max(0, existing.current_week_count - 1),
                    total_count: Math.max(0, existing.total_count - 1),
                    updated_at: new Date().toISOString()
                };
            } else {
                const weekChanged = existing.current_week_number !== thisWeek;
                patch = {
                    last_completed_date: today,
                    current_week_number: thisWeek,
                    current_week_count: weekChanged ? 1 : existing.current_week_count + 1,
                    total_count: existing.total_count + 1,
                    updated_at: new Date().toISOString()
                };
            }
            const { data, error } = await supabase
                .from('event_account_progress')
                .update(patch)
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('event_account_progress')
                .insert({
                    event_id: eventId,
                    account_id: accountId,
                    last_completed_date: today,
                    current_week_number: thisWeek,
                    current_week_count: 1,
                    total_count: 1
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async getEventTotalProgress(eventId: string): Promise<Record<string, number>> {
        const { data, error } = await supabase.rpc('get_event_total_progress', {
            p_event_id: eventId
        });

        if (error) throw error;

        // Transform array of {account_id, total_completed} into a record/map
        const totals: Record<string, number> = {};
        (data as any[]).forEach(item => {
            totals[item.account_id] = item.total_completed;
        });

        return totals;
    }
};


export default eventsService;
