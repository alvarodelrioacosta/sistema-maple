import supabase from '../lib/supabase';

export type UnlockCategory = 'boss' | 'system';

export interface ContentUnlock {
    id: string;
    name: string;
    description: string | null;
    unlocks: string;
    category: UnlockCategory;
    order_index: number | null;
    show_in_daily: boolean;
    created_at: string;
}

export interface AccountUnlockProgress {
    id: string;
    unlock_id: string;
    account_id: string;
    completed: boolean;
    completed_at: string | null;
}

export type ContentUnlockInsert = Omit<ContentUnlock, 'id' | 'created_at'>;

export const contentUnlocksService = {
    async getAll(): Promise<ContentUnlock[]> {
        const { data, error } = await supabase
            .from('content_unlocks')
            .select('*')
            .order('category')
            .order('order_index', { nullsFirst: false });
        if (error) throw error;
        return data || [];
    },

    async getDailyUnlocks(): Promise<ContentUnlock[]> {
        const { data, error } = await supabase
            .from('content_unlocks')
            .select('*')
            .eq('show_in_daily', true)
            .order('category')
            .order('order_index', { nullsFirst: false });
        if (error) throw error;
        return data || [];
    },

    async setShowInDaily(id: string, show: boolean): Promise<void> {
        const { error } = await supabase
            .from('content_unlocks')
            .update({ show_in_daily: show })
            .eq('id', id);
        if (error) throw error;
    },

    async create(unlock: ContentUnlockInsert): Promise<ContentUnlock> {
        const { data, error } = await supabase
            .from('content_unlocks')
            .insert(unlock)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('content_unlocks').delete().eq('id', id);
        if (error) throw error;
    },

    async getAllProgress(): Promise<AccountUnlockProgress[]> {
        const { data, error } = await supabase
            .from('account_unlock_progress')
            .select('*');
        if (error) throw error;
        return data || [];
    },

    async toggleProgress(unlockId: string, accountId: string, completed: boolean): Promise<void> {
        const { error } = await supabase
            .from('account_unlock_progress')
            .upsert({
                unlock_id: unlockId,
                account_id: accountId,
                completed,
                completed_at: completed ? new Date().toISOString() : null
            }, { onConflict: 'unlock_id,account_id' });
        if (error) throw error;
    }
};
