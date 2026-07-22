
import supabase from '../lib/supabase';
import type { CubeSession, CubeSessionInsert, CubeSessionUpdate } from '../types';

export const cubeSessionsService = {
    async getAll(): Promise<CubeSession[]> {
        const { data, error } = await supabase
            .from('cube_sessions')
            .select('*, account:accounts!inner(status)')
            .neq('account.status', 'banned')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getItemIdsInActiveSessions(): Promise<string[]> {
        const { data, error } = await supabase
            .from('cube_sessions')
            .select('item_id')
            .eq('cubing_session_status', 'Ongoing');

        if (error) throw error;
        return (data || []).map(s => s.item_id);
    },

    async getActiveSessionByItemId(itemId: string): Promise<CubeSession | null> {
        const { data, error } = await supabase
            .from('cube_sessions')
            .select('*')
            .eq('item_id', itemId)
            .eq('cubing_session_status', 'Ongoing')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            throw error;
        }
        return data || null;
    },

    async create(session: CubeSessionInsert): Promise<CubeSession> {
        const { data, error } = await supabase
            .from('cube_sessions')
            .insert(session)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: CubeSessionUpdate): Promise<CubeSession> {
        const { data, error } = await supabase
            .from('cube_sessions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async finalize(id: string): Promise<void> {
        const { error } = await supabase
            .from('cube_sessions')
            .update({ cubing_session_status: 'Finished' })
            .eq('id', id);

        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('cube_sessions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
