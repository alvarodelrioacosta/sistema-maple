// =============================================
// RESOURCE HISTORY SERVICE - Historial de uso de recursos
// =============================================

import supabase from '../lib/supabase';
import type { ResourceUsageHistory, ResourceUsageHistoryInsert } from '../types';

export const resourceHistoryService = {
    /**
     * Add a new resource usage entry to history
     */
    async add(entry: ResourceUsageHistoryInsert): Promise<ResourceUsageHistory> {
        const { data, error } = await supabase
            .from('resource_usage_history')
            .insert(entry)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get all history entries for a specific session
     */
    async getBySession(sessionId: string): Promise<ResourceUsageHistory[]> {
        const { data, error } = await supabase
            .from('resource_usage_history')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get all history entries
     */
    async getAll(): Promise<ResourceUsageHistory[]> {
        const { data, error } = await supabase
            .from('resource_usage_history')
            .select('*, account:accounts(status)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return ((data as any[]) || []).filter(
            (row) => !row.account || row.account.status !== 'banned'
        );
    },

    /**
     * Get history entries by account
     */
    async getByAccount(accountId: string): Promise<ResourceUsageHistory[]> {
        const { data, error } = await supabase
            .from('resource_usage_history')
            .select('*')
            .eq('account_id', accountId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
};

export default resourceHistoryService;
